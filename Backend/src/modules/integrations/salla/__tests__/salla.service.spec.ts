import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { of } from 'rxjs';

import { SallaService } from '../../salla/salla.service';
import {
  SALLA_INTEGRATION_REPOSITORY,
  SALLA_MERCHANT_REPOSITORY,
} from '../../salla/tokens';

import type { SallaIntegrationRepository } from '../../salla/repositories/integration.repository';
import type { SallaMerchantRepository } from '../../salla/repositories/merchant.repository';

describe('SallaService', () => {
  let service: SallaService;

  const integRepo: jest.Mocked<SallaIntegrationRepository> = {
    findByMerchant: jest.fn(),
    upsert: jest.fn(),
  };

  const merchRepo: jest.Mocked<SallaMerchantRepository> = {
    updateProductSourceSalla: jest.fn(),
  };

  const httpMock = {
    get: jest.fn(),
    post: jest.fn(),
  } as unknown as jest.Mocked<HttpService>;

  const configMock = {
    get: jest.fn((k: string) => {
      const map: Record<string, string> = {
        SALLA_CLIENT_ID: 'cid',
        SALLA_CLIENT_SECRET: 'sec',
        SALLA_REDIRECT_URI: 'https://app.example.com/callback',
        SALLA_WEBHOOK_URL: 'https://api.example.com/webhooks/salla',
        SALLA_API_BASE: 'https://api.salla.dev',
      };
      return map[k];
    }),
  } as unknown as jest.Mocked<ConfigService>;

  const merchantId = new Types.ObjectId();

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SallaService,
        { provide: SALLA_INTEGRATION_REPOSITORY, useValue: integRepo },
        { provide: SALLA_MERCHANT_REPOSITORY, useValue: merchRepo },
        { provide: HttpService, useValue: httpMock },
        { provide: ConfigService, useValue: configMock },
      ],
    }).compile();

    service = module.get(SallaService);
  });

  it('getOAuthUrl includes client_id and state', () => {
    const url = service.getOAuthUrl('state123');
    expect(url).toContain('client_id=cid');
    expect(url).toContain('state=state123');
  });

  it('getValidAccessToken returns cached token when not expiring', async () => {
    integRepo.findByMerchant.mockResolvedValue({
      _id: new Types.ObjectId(),
      merchantId,
      provider: 'salla',
      accessToken: 'tA',
      expiresAt: new Date(Date.now() + 5 * 60_000),
    } as any);

    const tok = await service.getValidAccessToken(merchantId);
    expect(tok).toBe('tA');
  });

  it('getValidAccessToken refreshes when near expiry', async () => {
    integRepo.findByMerchant
      .mockResolvedValueOnce({
        _id: new Types.ObjectId(),
        merchantId,
        provider: 'salla',
        refreshToken: 'r1',
        expiresAt: new Date(Date.now() + 30_000),
      } as any)
      .mockResolvedValueOnce({
        _id: new Types.ObjectId(),
        merchantId,
        provider: 'salla',
        accessToken: 'tB',
        refreshToken: 'r1',
        expiresAt: new Date(Date.now() + 3600_000),
      } as any);

    (httpMock.post as any).mockReturnValue(
      of({
        data: {
          access_token: 'tB',
          refresh_token: 'r1',
          token_type: 'Bearer',
          expires: 3600,
        },
      }),
    );

    const tok = await service.getValidAccessToken(merchantId);
    const upsertCall = expect(integRepo.upsert.bind(integRepo));
    upsertCall.toHaveBeenCalled();
    expect(tok).toBe('tB');
  });

  it('fetchSallaProducts paginates and maps results', async () => {
    integRepo.findByMerchant.mockResolvedValue({
      _id: new Types.ObjectId(),
      merchantId,
      provider: 'salla',
      accessToken: 't',
      expiresAt: new Date(Date.now() + 3600_000),
    } as any);

    (httpMock.get as any)
      .mockReturnValueOnce(
        of({
          data: {
            data: {
              products: [
                {
                  id: 1,
                  name: 'سلعة',
                  price: { amount: 10, currency: 'SAR' },
                  stock: 3,
                  updated_at: '2024-01-01T00:00:00Z',
                },
              ],
            },
            links: { next: 'next' },
          },
        }),
      )
      .mockReturnValueOnce(
        of({
          data: {
            data: {
              products: [
                {
                  product_id: 2,
                  title: 'Item',
                  pricing: { price: 20 },
                  inventory: { quantity: 0 },
                  updatedAt: null,
                },
              ],
            },
            links: { next: null },
          },
        }),
      );

    const res = await service.fetchSallaProducts(merchantId);
    expect(res).toHaveLength(2);
    expect(res[0].externalId).toBe('1');
    expect(res[1].title).toBe('Item');
  });

  it('registerDefaultWebhooks posts subscribe', async () => {
    integRepo.findByMerchant.mockResolvedValue({
      _id: new Types.ObjectId(),
      merchantId,
      provider: 'salla',
      accessToken: 't',
      expiresAt: new Date(Date.now() + 3600_000),
    } as any);

    (httpMock.post as any).mockReturnValue(of({ data: { ok: true } }));

    await service.registerDefaultWebhooks(merchantId);
    expect((httpMock.post as any).mock.calls[0][0]).toContain(
      '/webhooks/subscribe',
    );
  });
});
