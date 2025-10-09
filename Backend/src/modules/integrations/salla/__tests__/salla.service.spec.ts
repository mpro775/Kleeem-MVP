import { Types } from 'mongoose';
import { firstValueFrom } from 'rxjs';

import { SallaService } from '../salla.service';

jest.mock('rxjs', () => {
  const actual = jest.requireActual('rxjs');
  return { ...actual, firstValueFrom: jest.fn() };
});

const firstValueFromMock = firstValueFrom as jest.MockedFunction<
  typeof firstValueFrom
>;

describe('SallaService', () => {
  const makeDeps = () => {
    const http = {
      post: jest.fn(),
      get: jest.fn(),
    } as any;
    const configValues: Record<string, unknown> = {
      SALLA_CLIENT_ID: 'client-id',
      SALLA_CLIENT_SECRET: 'client-secret',
      SALLA_REDIRECT_URI: 'https://app/callback',
      SALLA_SCOPE: 'offline_access',
      SALLA_API_BASE: 'https://api.salla.dev',
      SALLA_WEBHOOK_URL: 'https://webhook',
    };
    const config = {
      get: jest.fn((key: string) => configValues[key]),
    } as any;
    const integrations = {
      upsert: jest.fn(),
      findByMerchant: jest.fn(),
    } as any;
    const merchants = {
      updateProductSourceSalla: jest.fn(),
    } as any;

    return { http, config, integrations, merchants };
  };

  const makeService = () => {
    const deps = makeDeps();
    const svc = new SallaService(
      deps.http,
      deps.config,
      deps.integrations,
      deps.merchants,
    );
    return { ...deps, svc };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('builds OAuth URL with state', () => {
    const { svc } = makeService();
    const url = svc.getOAuthUrl('state-123');
    expect(url).toContain('client_id=client-id');
    expect(url).toContain('state=state-123');
  });

  it('exchanges code for token', async () => {
    const { svc, http } = makeService();
    http.post.mockReturnValue('OBS');
    firstValueFromMock.mockResolvedValueOnce({
      data: {
        access_token: 'token',
        token_type: 'bearer',
        expires: 3600,
      },
    });

    const token = await svc.exchangeCodeForToken('code');
    expect(token.access_token).toBe('token');
    expect(http.post).toHaveBeenCalledWith(
      'https://accounts.salla.sa/oauth2/token',
      expect.any(URLSearchParams),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );
  });

  it('upserts integration and updates merchant', async () => {
    const { svc, integrations, merchants } = makeService();
    const merchantId = new Types.ObjectId();
    await svc.upsertIntegration(merchantId, {
      access_token: 'acc',
      token_type: 'bearer',
      expires: 10,
    });
    expect(integrations.upsert).toHaveBeenCalledWith(
      merchantId,
      expect.objectContaining({ provider: 'salla', accessToken: 'acc' }),
    );
    expect(merchants.updateProductSourceSalla).toHaveBeenCalledWith(
      merchantId,
      expect.objectContaining({ lastSync: expect.any(Date) }),
    );
  });

  it('refreshAccessToken fetches new token from API', async () => {
    const { svc, integrations, http } = makeService();
    const merchantId = new Types.ObjectId();
    integrations.findByMerchant.mockResolvedValueOnce({ refreshToken: 'ref' });
    http.post.mockReturnValue('OBS');
    firstValueFromMock.mockResolvedValueOnce({
      data: {
        access_token: 'new-access',
        token_type: 'bearer',
        expires: 3600,
      },
    });
    integrations.upsert.mockResolvedValueOnce(undefined);

    const token = await svc.refreshAccessToken(merchantId);
    expect(token).toBe('new-access');
    expect(integrations.upsert).toHaveBeenCalled();
  });

  it('getValidAccessToken reuses valid token', async () => {
    const { svc, integrations } = makeService();
    const merchantId = new Types.ObjectId();
    integrations.findByMerchant.mockResolvedValueOnce({
      accessToken: 'still-valid',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    const token = await svc.getValidAccessToken(merchantId);
    expect(token).toBe('still-valid');
  });

  it('getValidAccessToken refreshes when near expiry', async () => {
    const { svc, integrations } = makeService();
    const merchantId = new Types.ObjectId();
    const refreshSpy = jest
      .spyOn(svc, 'refreshAccessToken')
      .mockResolvedValueOnce('refreshed');
    integrations.findByMerchant.mockResolvedValueOnce({
      accessToken: 'old',
      expiresAt: new Date(Date.now() + 30 * 1000),
      refreshToken: 'refresh',
    });

    const token = await svc.getValidAccessToken(merchantId);
    expect(refreshSpy).toHaveBeenCalled();
    expect(token).toBe('refreshed');
  });

  it('fetchProductsPage returns processed products and pagination flag', async () => {
    const { svc, http } = makeService();
    http.get.mockReturnValue('OBS');
    firstValueFromMock.mockResolvedValueOnce({
      data: {
        data: {
          products: [
            {
              id: 1,
              name: 'Product 1',
              price: { amount: 10, currency: 'SAR' },
              stock: 5,
              updated_at: '2024-01-01T00:00:00Z',
            },
          ],
        },
        links: { next: 'next-link' },
      },
    });

    const { products, hasNext } = await (svc as any).fetchProductsPage(
      'https://api.salla.dev',
      'token',
      1,
    );
    expect(products[0]).toMatchObject({
      externalId: '1',
      title: 'Product 1',
      price: 10,
      stock: 5,
    });
    expect(hasNext).toBe(true);
    expect(http.get).toHaveBeenCalledWith(
      'https://api.salla.dev/admin/v2/products?page=1',
      { headers: { Authorization: 'Bearer token' } },
    );
  });

  it('fetchSallaProducts loops pages until no next', async () => {
    const { svc } = makeService();
    const fetchPage = jest
      .spyOn(svc as any, 'fetchProductsPage')
      .mockResolvedValueOnce({ products: [{ externalId: '1' }], hasNext: true })
      .mockResolvedValueOnce({
        products: [{ externalId: '2' }],
        hasNext: false,
      });
    jest.spyOn(svc, 'getValidAccessToken').mockResolvedValueOnce('token');

    const result = await svc.fetchSallaProducts(new Types.ObjectId());
    expect(result).toEqual([{ externalId: '1' }, { externalId: '2' }]);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it('registerDefaultWebhooks posts subscription', async () => {
    const { svc, http } = makeService();
    http.post.mockReturnValue('OBS');
    firstValueFromMock.mockResolvedValueOnce({ data: {} });
    jest.spyOn(svc, 'getValidAccessToken').mockResolvedValueOnce('token');

    await svc.registerDefaultWebhooks(new Types.ObjectId());
    expect(http.post).toHaveBeenCalledWith(
      'https://api.salla.dev/admin/v2/webhooks/subscribe',
      { url: 'https://webhook', event: 'product.created' },
      { headers: { Authorization: 'Bearer token' } },
    );
  });
});
