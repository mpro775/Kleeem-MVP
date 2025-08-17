// src/integrations/zid/zid.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import {
  Merchant,
  MerchantDocument,
} from '../../merchants/schemas/merchant.schema';
import {
  Integration,
  IntegrationDocument,
} from '../schemas/integration.schema';
import { ExternalProduct, ZidProductsResponse } from '../types';
import { toDateOrNull } from '../utils/date';

export interface ZidOAuthTokenResponse {
  access_token: string;
  refresh_token: string;
  store_id: string;
  token_type: string;
  expires_in: number;
  [key: string]: any;
}

@Injectable()
export class ZidService {
  private readonly logger = new Logger(ZidService.name);
  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
    @InjectModel(Merchant.name) private merchantModel: Model<MerchantDocument>,
    @InjectModel(Integration.name)
    private integrationModel: Model<IntegrationDocument>,
  ) {}

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
      state, // 👈 نحمل merchantId + nonce
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
  ) {
    const now = Date.now();
    const expiresAt = new Date(now + (tokens.expires_in ?? 3600) * 1000);

    await this.integrationModel.updateOne(
      { merchantId, provider: 'zid' },
      {
        $set: {
          active: true,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          tokenType: tokens.token_type,
          expiresIn: tokens.expires_in,
          expiresAt,
          storeId: tokens.store_id,
          lastSync: new Date(),
        },
      },
      { upsert: true },
    );

    // حدّث merchant (مصدر المنتجات + حالة مصدر زد)
    await this.merchantModel.updateOne(
      { _id: merchantId },
      {
        $set: {
          productSource: 'zid',
          'productSourceConfig.internal.enabled': false,
          'productSourceConfig.zid.active': true,
          'productSourceConfig.zid.storeId': tokens.store_id,
          'productSourceConfig.zid.lastSync': new Date(),
        },
      },
    );
  }

  async refreshAccessToken(merchantId: Types.ObjectId) {
    const integ = await this.integrationModel
      .findOne({ merchantId, provider: 'zid' })
      .lean();
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

  async getValidAccessToken(merchantId: Types.ObjectId) {
    const integ = await this.integrationModel.findOne({
      merchantId,
      provider: 'zid',
    });
    if (!integ) throw new Error('Integration not found');
    if (integ.expiresAt && integ.expiresAt.getTime() - Date.now() > 60_000) {
      return integ.accessToken!;
    }
    return this.refreshAccessToken(merchantId);
  }

  async fetchZidProducts(
    merchantId: Types.ObjectId,
  ): Promise<ExternalProduct[]> {
    const accessToken = await this.getValidAccessToken(merchantId);
    const results: ExternalProduct[] = [];
    let page = 1;

    for (;;) {
      const { data } = await firstValueFrom(
        this.http.get<ZidProductsResponse>(
          `https://api.zid.sa/v1/products?page=${page}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          },
        ),
      );

      const items = Array.isArray(data?.data) ? data.data : [];
      for (const item of items) {
        const obj = item as Record<string, unknown>; // 👈 هنا نعرّف obj

        const id = obj['id'] ?? obj['product_id'];
        const titleRaw = obj['name'] ?? obj['title'];
        const title = typeof titleRaw === 'string' ? titleRaw : '';

        // price + currency
        let price: number | null = null;
        let currency: string | undefined;
        const priceField = obj['price'];
        if (typeof priceField === 'number') {
          price = priceField;
        } else if (priceField && typeof priceField === 'object') {
          const pr = priceField as Record<string, unknown>;
          if (typeof pr['amount'] === 'number') price = pr['amount'];
          if (typeof pr['currency'] === 'string') currency = pr['currency'];
        }

        // stock
        let stock: number | null = null;
        if (typeof obj['stock'] === 'number') stock = obj['stock'];
        else if (typeof obj['quantity'] === 'number') stock = obj['quantity'];

        // updatedAt (بدون String() على كائن)
        const updatedRaw = obj['updated_at'] ?? obj['updatedAt'];
        const updatedAt = toDateOrNull(updatedRaw);

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
      page++;
    }

    return results; // ✅ ليس any[]
  }
  async registerDefaultWebhooks(merchantId: Types.ObjectId) {
    const accessToken = await this.getValidAccessToken(merchantId);
    const targetUrl = this.config.get<string>('ZID_WEBHOOK_URL')!;
    const events = [
      'product.create',
      'product.update',
      'product.delete',
      'order.create',
      'order.update',
      'order.status.update',
    ];
    for (const event of events) {
      await firstValueFrom(
        this.http.post(
          'https://api.zid.sa/v1/webhooks',
          { target_url: targetUrl, event },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );
    }
  }
}
