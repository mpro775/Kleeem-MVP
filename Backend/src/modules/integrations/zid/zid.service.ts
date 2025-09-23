import { HttpService } from '@nestjs/axios';
import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Types } from 'mongoose';
import { firstValueFrom } from 'rxjs';
import { MS_PER_SECOND } from 'src/common/constants/common';

import { ExternalProduct, ZidProductsResponse } from '../types';

import { IntegrationRepository } from './repositories/integration.repository';
import { MerchantRepository } from './repositories/merchant.repository';
import { ZID_INTEGRATION_REPOSITORY, ZID_MERCHANT_REPOSITORY } from './tokens';
import { ZidWebhookResponse } from './zid.model';

export interface ZidOAuthTokenResponse {
  access_token: string;
  refresh_token: string;
  store_id: string;
  token_type: string;
  expires_in: number;
  [key: string]: unknown;
}

@Injectable()
export class ZidService {
  private readonly logger = new Logger(ZidService.name);

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
    @Inject(ZID_INTEGRATION_REPOSITORY)
    private readonly integrations: IntegrationRepository,
    @Inject(ZID_MERCHANT_REPOSITORY)
    private readonly merchants: MerchantRepository,
  ) {}

  private extractProductName(obj: Record<string, unknown>): string {
    if (typeof obj?.name === 'string') {
      return obj.name;
    }
    const nameObj = obj?.name as Record<string, unknown> | undefined;
    return (nameObj?.ar ?? nameObj?.en ?? '') as string;
  }

  private processZidProduct(item: unknown): ExternalProduct {
    const obj = item as Record<string, unknown>;
    const name = this.extractProductName(obj);

    return {
      externalId: String(obj.id),
      title: name,
      price: typeof obj.price === 'number' ? obj.price : null,
      currency: typeof obj.currency === 'string' ? obj.currency : undefined,
      stock: typeof obj.quantity === 'number' ? obj.quantity : null,
      updatedAt: obj.updated_at ? new Date(obj.updated_at as string) : null,
      raw: item,
    };
  }

  private async fetchProductsPage(
    authorizationHeader: string,
    managerToken: string,
    storeId: string,
    page: number,
  ): Promise<{ products: ExternalProduct[]; hasNext: boolean }> {
    const { data } = await firstValueFrom(
      this.http.get<ZidProductsResponse>(
        `https://api.zid.sa/v1/products/?page=${page}&page_size=100`,
        {
          headers: {
            Authorization: authorizationHeader,
            'X-Manager-Token': managerToken,
            'Store-Id': storeId,
            Role: 'Manager',
          },
        },
      ),
    );

    const items = Array.isArray(data?.data) ? data.data : [];
    const products = items.map((item) => this.processZidProduct(item));
    const hasNext = !!data?.links?.next;

    return { products, hasNext };
  }

  private async getZidCreds(merchantId: Types.ObjectId): Promise<{
    managerToken: string;
    authorizationHeader: string;
    storeId: string;
  }> {
    const integ = await this.integrations.findZidByMerchant(merchantId);
    if (!integ) throw new Error('Integration not found');

    // جدّد لو قارب الانتهاء
    if (
      integ.expiresAt &&
      integ.expiresAt.getTime() - Date.now() <= MS_PER_SECOND * 60
    ) {
      await this.refreshAccessToken(merchantId);
    }

    const fresh = await this.integrations.findZidByMerchant(merchantId);
    if (!fresh?.managerToken) throw new Error('Missing manager token');

    return {
      managerToken: fresh.managerToken, // لـ X-Manager-Token / Access-Token
      authorizationHeader:
        fresh.authorizationToken || `Bearer ${fresh.managerToken}`, // fallback
      storeId: fresh.storeId || '',
    };
  }

  getOAuthUrl(state: string): string {
    const clientId = this.config.get<string>('ZID_CLIENT_ID');
    const redirectUri = this.config.get<string>('ZID_REDIRECT_URI');
    const scopes = [
      'store.products.read',
      'store.orders.read',
      'store.categories.read',
      'store.account.read',
      'store.coupons.read',
      'store.countries_cities.read',
      'store.webhooks.read',
      'store.webhooks.write',
      'store.product_inventory_stock.read',
      'store.reverse_orders.read',
      'store.product_availability_notifications.read',
      'store.vats.read',
    ].join(' ');
    const base = 'https://oauth.zid.sa/oauth/authorize';
    const q = new URLSearchParams({
      client_id: String(clientId),
      redirect_uri: String(redirectUri),
      response_type: 'code',
      scope: scopes,
      state,
    });
    return `${base}?${q.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<ZidOAuthTokenResponse> {
    const clientId = this.config.get<string>('ZID_CLIENT_ID')!;
    const clientSecret = this.config.get<string>('ZID_CLIENT_SECRET')!;
    const redirectUri = this.config.get<string>('ZID_REDIRECT_URI')!;
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    });

    const { data } = await firstValueFrom(
      this.http.post<ZidOAuthTokenResponse>(
        'https://oauth.zid.sa/oauth/token',
        body,
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
      ),
    );
    return data;
  }

  async upsertIntegration(
    merchantId: Types.ObjectId,
    tokens: ZidOAuthTokenResponse,
  ): Promise<void> {
    const now = Date.now();
    const expiresAt = new Date(
      now + (tokens.expires_in ?? MS_PER_SECOND * 60 * 60), // 1 hour
    );

    await this.integrations.upsertZid(merchantId, {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenType: tokens.token_type,
      expiresIn: tokens.expires_in,
      expiresAt,
      storeId: tokens.store_id,
      lastSync: new Date(),
    });

    await this.merchants.updateProductSourceZid(merchantId, {
      storeId: tokens.store_id,
      lastSync: new Date(),
    });
  }

  async refreshAccessToken(merchantId: Types.ObjectId): Promise<string> {
    const integ = await this.integrations.findZidByMerchant(merchantId);
    if (!integ?.refreshToken) throw new Error('No refresh token');

    const clientId = this.config.get<string>('ZID_CLIENT_ID')!;
    const clientSecret = this.config.get<string>('ZID_CLIENT_SECRET')!;
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: String(integ.refreshToken),
    });

    const { data } = await firstValueFrom(
      this.http.post<ZidOAuthTokenResponse>(
        'https://oauth.zid.sa/oauth/token',
        body,
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
      ),
    );
    await this.upsertIntegration(merchantId, data);
    return data.access_token;
  }

  async getValidAccessToken(merchantId: Types.ObjectId): Promise<string> {
    const integ = await this.integrations.findZidByMerchant(merchantId);
    if (!integ) throw new Error('Integration not found');
    if (
      integ.expiresAt &&
      integ.expiresAt.getTime() - Date.now() > MS_PER_SECOND * 60
    ) {
      return integ.accessToken!;
    }
    return this.refreshAccessToken(merchantId);
  }

  async fetchZidProducts(
    merchantId: Types.ObjectId,
  ): Promise<ExternalProduct[]> {
    const { managerToken, authorizationHeader, storeId } =
      await this.getZidCreds(merchantId);
    const results: ExternalProduct[] = [];
    let page = 1;

    for (;;) {
      const { products, hasNext } = await this.fetchProductsPage(
        authorizationHeader,
        managerToken,
        storeId,
        page,
      );

      results.push(...products);

      if (!hasNext) break;
      page += 1;
    }
    return results;
  }

  async registerDefaultWebhooks(merchantId: Types.ObjectId): Promise<void> {
    const { managerToken, authorizationHeader, storeId } =
      await this.getZidCreds(merchantId);
    const base = 'https://api.zid.sa/v1/managers/webhooks';
    const targetUrl = this.config.get<string>('ZID_WEBHOOK_URL')!;

    const list = await firstValueFrom(
      this.http.get<ZidWebhookResponse>(base, {
        headers: {
          Authorization: authorizationHeader,
          'X-Manager-Token': managerToken,
          'Store-Id': storeId,
          Role: 'Manager',
        },
      }),
    );

    const webhooks = list.data?.data ?? list.data ?? [];
    const registeredKeys = Array.isArray(webhooks)
      ? webhooks
          .map((w: unknown) => {
            const webhook = w as Record<string, unknown>;
            const event =
              typeof webhook.event === 'string' ? webhook.event : '';
            const targetUrl =
              typeof webhook.target_url === 'string' ? webhook.target_url : '';
            return event && targetUrl ? `${event}|${targetUrl}` : '';
          })
          .filter(Boolean)
      : [];
    const registered: Set<string> = new Set(registeredKeys);

    const events = [
      'product.create',
      'product.update',
      'product.delete',
      'order.create',
      'order.update',
      'order.status.update',
    ];

    for (const event of events) {
      const key = `${event}|${targetUrl}`;
      if (registered.has(key)) continue;

      await firstValueFrom(
        this.http.post(
          base,
          {
            event,
            target_url: targetUrl,
            subscriber: 'Kleem',
            original_id: `kleem-${event}`,
          },
          {
            headers: {
              Authorization: authorizationHeader,
              'X-Manager-Token': managerToken,
              'Store-Id': storeId,
              Role: 'Manager',
              'Content-Type': 'application/json',
            },
          },
        ),
      );
    }
  }
}
