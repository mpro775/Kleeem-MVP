import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { of } from 'rxjs';

import {
  ZID_INTEGRATION_REPOSITORY,
  ZID_MERCHANT_REPOSITORY,
} from '../../zid/tokens';
import { ZidService, type ZidOAuthTokenResponse } from '../../zid/zid.service';

import type { IntegrationRepository } from '../../zid/repositories/integration.repository';
import type { MerchantRepository } from '../../zid/repositories/merchant.repository';

describe('ZidService', () => {
  let service: ZidService;

  const integRepo: jest.Mocked<IntegrationRepository> = {
    findZidByMerchant: jest.fn(),
    upsertZid: jest.fn(),
  };

  const merchRepo: jest.Mocked<MerchantRepository> = {
    updateProductSourceZid: jest.fn(),
  };

  const httpMock = {
    get: jest.fn(),
    post: jest.fn(),
  } as unknown as jest.Mocked<HttpService>;

  const configMock = {
    get: jest.fn((k: string) => {
      const map: Record<string, string> = {
        ZID_CLIENT_ID: 'cid',
        ZID_CLIENT_SECRET: 'sec',
        ZID_REDIRECT_URI: 'https://app.example.com/callback',
        ZID_WEBHOOK_URL: 'https://api.example.com/webhooks/zid',
      };
      return map[k];
    }),
  } as unknown as jest.Mocked<ConfigService>;

  const merchantId = new Types.ObjectId();

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ZidService,
        { provide: ZID_INTEGRATION_REPOSITORY, useValue: integRepo },
        { provide: ZID_MERCHANT_REPOSITORY, useValue: merchRepo },
        { provide: HttpService, useValue: httpMock },
        { provide: ConfigService, useValue: configMock },
      ],
    }).compile();

    service = module.get(ZidService);
  });

  it('getOAuthUrl should build URL with state', () => {
    const url = service.getOAuthUrl('state123');
    expect(url).toContain('client_id=cid');
    expect(url).toContain('state=state123');
  });

  it('getValidAccessToken returns cached token if not expiring', async () => {
    integRepo.findZidByMerchant.mockResolvedValue({
      _id: new Types.ObjectId(),
      merchantId,
      provider: 'zid',
      accessToken: 'tokenA',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // > 60s
    } as any);

    const tok = await service.getValidAccessToken(merchantId);
    expect(tok).toBe('tokenA');
  });

  it('getValidAccessToken refreshes when near expiry', async () => {
    integRepo.findZidByMerchant
      .mockResolvedValueOnce({
        _id: new Types.ObjectId(),
        merchantId,
        provider: 'zid',
        refreshToken: 'r1',
        expiresAt: new Date(Date.now() + 30 * 1000), // <= 60s
      } as any)
      .mockResolvedValueOnce({
        // after refresh, for getZidCreds or other calls if needed
        _id: new Types.ObjectId(),
        merchantId,
        provider: 'zid',
        accessToken: 'tokenB',
        refreshToken: 'r1',
        expiresAt: new Date(Date.now() + 3600 * 1000),
      } as any);

    const tokenResp: ZidOAuthTokenResponse = {
      access_token: 'tokenB',
      refresh_token: 'r1',
      store_id: 's1',
      token_type: 'Bearer',
      expires_in: 3600,
    };

    (httpMock.post as any).mockReturnValue(of({ data: tokenResp }));

    const tok = await service.getValidAccessToken(merchantId);
    expect(integRepo.upsertZid.bind(integRepo)).toHaveBeenCalled();
    expect(tok).toBe('tokenB');
  });

  it('fetchZidProducts should paginate and map results', async () => {
    // creds
    integRepo.findZidByMerchant
      .mockResolvedValueOnce({
        _id: new Types.ObjectId(),
        merchantId,
        provider: 'zid',
        managerToken: 'M',
        authorizationToken: 'Bearer A',
        storeId: 'SID',
        expiresAt: new Date(Date.now() + 3600_000),
      } as any)
      .mockResolvedValueOnce({
        // fresh after possible refresh
        _id: new Types.ObjectId(),
        merchantId,
        provider: 'zid',
        managerToken: 'M',
        authorizationToken: 'Bearer A',
        storeId: 'SID',
        expiresAt: new Date(Date.now() + 3600_000),
      } as any);

    (httpMock.get as any)
      .mockReturnValueOnce(
        of({
          data: {
            results: [
              {
                id: 1,
                name: { ar: 'سلعة' },
                price: 10,
                currency: 'SAR',
                quantity: 5,
                updated_at: '2024-01-01T00:00:00Z',
              },
            ],
            next: 'next',
          },
        }),
      )
      .mockReturnValueOnce(
        of({
          data: {
            results: [
              {
                id: 2,
                name: 'Item',
                price: 20,
                currency: 'SAR',
                quantity: 0,
                updated_at: null,
              },
            ],
            next: null,
          },
        }),
      );

    const res = await service.fetchZidProducts(merchantId);
    expect(res).toHaveLength(2);
    expect(res[0].externalId).toBe('1');
    expect(res[1].title).toBe('Item');
  });

  it('registerDefaultWebhooks should only create missing ones', async () => {
    // creds
    integRepo.findZidByMerchant.mockResolvedValue({
      _id: new Types.ObjectId(),
      merchantId,
      provider: 'zid',
      managerToken: 'M',
      authorizationToken: 'Bearer A',
      storeId: 'SID',
      expiresAt: new Date(Date.now() + 3600_000),
    } as any);

    (httpMock.get as any).mockReturnValue(
      of({
        data: {
          results: [
            {
              event: 'product.create',
              target_url: 'https://api.example.com/webhooks/zid',
            },
          ],
        },
      }),
    );

    (httpMock.post as any).mockReturnValue(of({ data: { ok: true } }));

    await service.registerDefaultWebhooks(merchantId);

    const calls = (httpMock.post as any).mock.calls;
    // There are 6 events; one already registered, so expect 5 posts
    expect(calls.length).toBe(5);
  });
});
