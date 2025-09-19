import { Injectable, Logger, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Types } from 'mongoose';
import { firstValueFrom } from 'rxjs';

import { toDateOrNull } from '../utils/date';
import { ExternalProduct } from '../types';
import {
  SALLA_INTEGRATION_REPOSITORY,
  SALLA_MERCHANT_REPOSITORY,
} from './tokens';
import { SallaIntegrationRepository } from './repositories/integration.repository';
import { SallaMerchantRepository } from './repositories/merchant.repository';

interface SallaTokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires: number;
  scope?: string;
}
type SallaProductsResponse = {
  data?: { products?: unknown[] };
  links?: { next?: string | null };
};

@Injectable()
export class SallaService {
  private readonly logger = new Logger(SallaService.name);

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
    @Inject(SALLA_INTEGRATION_REPOSITORY)
    private readonly integrations: SallaIntegrationRepository,
    @Inject(SALLA_MERCHANT_REPOSITORY)
    private readonly merchants: SallaMerchantRepository,
  ) {}

  getOAuthUrl(state: string) {
    const clientId = this.config.get<string>('SALLA_CLIENT_ID')!;
    const redirectUri = this.config.get<string>('SALLA_REDIRECT_URI')!;
    const scope = this.config.get<string>('SALLA_SCOPE') || 'offline_access';
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope,
      state,
    });
    return `https://accounts.salla.sa/oauth2/auth?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<SallaTokenResponse> {
    const clientId = this.config.get<string>('SALLA_CLIENT_ID')!;
    const clientSecret = this.config.get<string>('SALLA_CLIENT_SECRET')!;
    const redirectUri = this.config.get<string>('SALLA_REDIRECT_URI')!;
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    });
    const { data } = await firstValueFrom(
      this.http.post<SallaTokenResponse>(
        'https://accounts.salla.sa/oauth2/token',
        body,
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      ),
    );
    return data;
  }

  async upsertIntegration(
    merchantId: Types.ObjectId,
    tokens: SallaTokenResponse,
  ) {
    const expiresAt = new Date(Date.now() + (tokens.expires ?? 1209600) * 1000); // ~14 days
    await this.integrations.upsert(merchantId, {
      provider: 'salla',
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenType: tokens.token_type,
      expiresIn: tokens.expires,
      expiresAt,
      lastSync: new Date(),
    });
    await this.merchants.updateProductSourceSalla(merchantId, {
      lastSync: new Date(),
    });
  }

  async refreshAccessToken(merchantId: Types.ObjectId) {
    const integ = await this.integrations.findByMerchant(merchantId);
    if (!integ?.refreshToken) throw new Error('No refresh token');

    const clientId = this.config.get<string>('SALLA_CLIENT_ID')!;
    const clientSecret = this.config.get<string>('SALLA_CLIENT_SECRET')!;
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: String(integ.refreshToken),
    });
    const { data } = await firstValueFrom(
      this.http.post<SallaTokenResponse>(
        'https://accounts.salla.sa/oauth2/token',
        body,
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      ),
    );
    await this.upsertIntegration(merchantId, data);
    return data.access_token;
  }

  async getValidAccessToken(merchantId: Types.ObjectId) {
    const integ = await this.integrations.findByMerchant(merchantId);
    if (!integ) throw new Error('Integration not found');
    if (integ.expiresAt && integ.expiresAt.getTime() - Date.now() > 60_000)
      return integ.accessToken!;
    return this.refreshAccessToken(merchantId);
  }

  async fetchSallaProducts(
    merchantId: Types.ObjectId,
  ): Promise<ExternalProduct[]> {
    const accessToken = await this.getValidAccessToken(merchantId);
    const base =
      this.config.get<string>('SALLA_API_BASE') || 'https://api.salla.dev';

    const results: ExternalProduct[] = [];
    let page = 1;

    for (;;) {
      const { data } = await firstValueFrom(
        this.http.get<SallaProductsResponse>(
          `${base}/admin/v2/products?page=${page}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          },
        ),
      );

      const items = Array.isArray(data?.data?.products)
        ? (data.data?.products ?? [])
        : [];
      for (const item of items) {
        const obj = item as Record<string, unknown>;

        const id = obj['id'] ?? obj['product_id'];
        const titleRaw = obj['name'] ?? obj['title'];
        const title = typeof titleRaw === 'string' ? titleRaw : '';

        // price/currency
        let price: number | null = null;
        let currency: string | undefined;
        const priceField = obj['price'] ?? (obj['pricing'] as any)?.price;
        if (typeof priceField === 'number') price = priceField;
        else if (priceField && typeof priceField === 'object') {
          const pr = priceField as Record<string, unknown>;
          if (typeof pr['amount'] === 'number') price = pr['amount'];
          if (typeof pr['currency'] === 'string') currency = pr['currency'];
        }

        // stock
        let stock: number | null = null;
        const stockField =
          obj['stock'] ??
          obj['quantity'] ??
          (obj['inventory'] as any)?.quantity;
        if (typeof stockField === 'number') stock = stockField;

        const updatedAt = toDateOrNull(obj['updated_at'] ?? obj['updatedAt']);

        results.push({
          externalId: String(id),
          title,
          price,
          currency,
          stock,
          updatedAt,
          raw: item,
        });
      }

      if (!data?.links?.next) break;
      page += 1;
    }

    return results;
  }

  async registerDefaultWebhooks(merchantId: Types.ObjectId) {
    const accessToken = await this.getValidAccessToken(merchantId);
    const targetUrl = this.config.get<string>('SALLA_WEBHOOK_URL')!;
    await firstValueFrom(
      this.http.post(
        'https://api.salla.dev/admin/v2/webhooks/subscribe',
        { url: targetUrl, event: 'product.created' },
        { headers: { Authorization: `Bearer ${accessToken}` } },
      ),
    );
    // أضف أحداثًا أخرى إذا لزم
  }
}
