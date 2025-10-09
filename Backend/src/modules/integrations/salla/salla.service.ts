import { HttpService } from '@nestjs/axios';
import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Types } from 'mongoose';
import { firstValueFrom } from 'rxjs';
import { DAYS_PER_TWO_WEEK, MS_PER_SECOND } from 'src/common/constants/common';

import { ExternalProduct } from '../types';
import { toDateOrNull } from '../utils/date';

import { SallaIntegrationRepository } from './repositories/integration.repository';
import { SallaMerchantRepository } from './repositories/merchant.repository';
import {
  SALLA_INTEGRATION_REPOSITORY,
  SALLA_MERCHANT_REPOSITORY,
} from './tokens';

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
  private readonly DEFAULT_TOKEN_EXPIRY_SECONDS =
    DAYS_PER_TWO_WEEK * 24 * 60 * 60; // 14 days in seconds

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
    @Inject(SALLA_INTEGRATION_REPOSITORY)
    private readonly integrations: SallaIntegrationRepository,
    @Inject(SALLA_MERCHANT_REPOSITORY)
    private readonly merchants: SallaMerchantRepository,
  ) {}

  private extractProductPrice(obj: Record<string, unknown>): {
    price: number | null;
    currency: string | undefined;
  } {
    let price: number | null = null;
    let currency: string | undefined;
    const priceField =
      obj['price'] ?? (obj['pricing'] as Record<string, unknown>)?.price;

    if (typeof priceField === 'number') {
      price = priceField;
    } else if (priceField && typeof priceField === 'object') {
      const pr = priceField as Record<string, unknown>;
      if (typeof pr['amount'] === 'number') price = pr['amount'];
      if (typeof pr['currency'] === 'string') currency = pr['currency'];
    }

    return { price, currency };
  }

  private extractProductStock(obj: Record<string, unknown>): number | null {
    const stockField =
      obj['stock'] ??
      obj['quantity'] ??
      (obj['inventory'] as Record<string, unknown>)?.quantity;

    return typeof stockField === 'number' ? stockField : null;
  }

  private processProductItem(item: unknown): ExternalProduct {
    const obj = item as Record<string, unknown>;

    const id = obj['id'] ?? obj['product_id'];
    const titleRaw = obj['name'] ?? obj['title'];
    const title = typeof titleRaw === 'string' ? titleRaw : '';

    const { price, currency } = this.extractProductPrice(obj);
    const stock = this.extractProductStock(obj);
    const updatedAt = toDateOrNull(obj['updated_at'] ?? obj['updatedAt']);

    const result: ExternalProduct = {
      externalId: String(id),
      title,
      price,
      stock,
      updatedAt,
      raw: item,
    };

    if (currency) {
      result.currency = currency;
    }

    return result;
  }

  getOAuthUrl(state: string): string {
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
  ): Promise<void> {
    const expiresAt = new Date(
      Date.now() +
        (tokens.expires ?? this.DEFAULT_TOKEN_EXPIRY_SECONDS) * MS_PER_SECOND,
    );
    const integrationData: {
      provider: 'salla';
      accessToken: string;
      tokenType: string;
      expiresIn: number;
      expiresAt: Date;
      lastSync: Date;
      refreshToken?: string;
    } = {
      provider: 'salla',
      accessToken: tokens.access_token,
      tokenType: tokens.token_type,
      expiresIn: tokens.expires,
      expiresAt,
      lastSync: new Date(),
    };

    if (tokens.refresh_token) {
      integrationData.refreshToken = tokens.refresh_token;
    }

    await this.integrations.upsert(merchantId, integrationData);
    await this.merchants.updateProductSourceSalla(merchantId, {
      lastSync: new Date(),
    });
  }

  async refreshAccessToken(merchantId: Types.ObjectId): Promise<string> {
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

  async getValidAccessToken(merchantId: Types.ObjectId): Promise<string> {
    const integ = await this.integrations.findByMerchant(merchantId);
    if (!integ) throw new Error('Integration not found');
    if (
      integ.expiresAt &&
      integ.expiresAt.getTime() - Date.now() > MS_PER_SECOND * 60
    )
      return integ.accessToken!;
    return this.refreshAccessToken(merchantId);
  }

  private async fetchProductsPage(
    base: string,
    accessToken: string,
    page: number,
  ): Promise<{ products: ExternalProduct[]; hasNext: boolean }> {
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

    const products = items.map((item) => this.processProductItem(item));
    const hasNext = !!data?.links?.next;

    return { products, hasNext };
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
      const { products, hasNext } = await this.fetchProductsPage(
        base,
        accessToken,
        page,
      );
      results.push(...products);

      if (!hasNext) break;
      page += 1;
    }

    return results;
  }

  async registerDefaultWebhooks(merchantId: Types.ObjectId): Promise<void> {
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
