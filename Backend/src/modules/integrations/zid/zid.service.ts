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
  private async getZidCreds(merchantId: Types.ObjectId) {
    const integ = await this.integrationModel.findOne({
      merchantId,
      provider: 'zid',
    });
    if (!integ) throw new Error('Integration not found');

    // جدّد لو قارب الانتهاء
    if (integ.expiresAt && integ.expiresAt.getTime() - Date.now() <= 60_000) {
      await this.refreshAccessToken(merchantId);
    }

    const fresh = await this.integrationModel
      .findOne({ merchantId, provider: 'zid' })
      .lean();
    if (!fresh?.managerToken) throw new Error('Missing manager token');

    return {
      managerToken: fresh.managerToken, // لـ X-Manager-Token / Access-Token
      authorizationHeader:
        fresh.authorizationToken || `Bearer ${fresh.managerToken}`, // fallback مؤقت إن لزم
      storeId: fresh.storeId,
    };
  }

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
    const { managerToken, authorizationHeader, storeId } =
      await this.getZidCreds(merchantId);
    const results: ExternalProduct[] = [];
    let page = 1;

    for (;;) {
      const { data } = await firstValueFrom(
        this.http.get<any>(
          `https://api.zid.sa/v1/products/?page=${page}&page_size=100`,
          {
            headers: {
              Authorization: authorizationHeader, // Bearer ... (من Authorization token)
              'X-Manager-Token': managerToken, // أو 'Access-Token'
              'Store-Id': storeId,
              Role: 'Manager',
            },
          },
        ),
      );

      const items = Array.isArray(data?.results) ? data.results : [];
      for (const item of items) {
        const name =
          typeof item?.name === 'string'
            ? item.name
            : (item?.name?.ar ?? item?.name?.en ?? '');
        results.push({
          externalId: String(item.id),
          title: name,
          price: typeof item.price === 'number' ? item.price : null,
          currency:
            typeof item.currency === 'string' ? item.currency : undefined,
          stock: typeof item.quantity === 'number' ? item.quantity : null,
          updatedAt: item.updated_at ? new Date(item.updated_at) : null,
          raw: item,
        });
      }

      if (!data?.next) break;
      page += 1;
    }
    return results;
  }

  async registerDefaultWebhooks(merchantId: Types.ObjectId) {
    const { managerToken, authorizationHeader, storeId } =
      await this.getZidCreds(merchantId);
    const base = 'https://api.zid.sa/v1/managers/webhooks';
    const targetUrl = this.config.get<string>('ZID_WEBHOOK_URL')!; // احرص يطابق راوت الاستقبال

    // 1) اقرأ المسجّل لتفادي التكرار
    const list = await firstValueFrom(
      this.http.get<any>(base, {
        headers: {
          Authorization: authorizationHeader,
          'X-Manager-Token': managerToken,
          'Store-Id': storeId,
          Role: 'Manager',
        },
      }),
    );

    const registered: Set<string> = new Set(
      (list.data?.results ?? list.data ?? []).map(
        (w: any) => `${w.event}|${w.target_url}`,
      ),
    );

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
