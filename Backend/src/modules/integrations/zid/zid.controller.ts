// src/integrations/zid/zid.controller.ts
import {
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
  Req,
  Post,
  Body,
  Headers,
  HttpCode,
  Logger,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { Response, Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { Model, Types } from 'mongoose';
import { RabbitService } from 'src/infra/rabbit/rabbit.service';
import { CatalogService } from 'src/modules/catalog/catalog.service';

import { Public } from '../../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import {
  Merchant,
  MerchantDocument,
} from '../../merchants/schemas/merchant.schema';
import { WebhookLoggingInterceptor } from '../../webhooks/interceptors/webhook-logging.interceptor';

import { ZidService } from './zid.service';

interface ZidWebhookPayload {
  event?: string;
  data?: unknown;
  // لو زد يمرر store_id داخل data:
  // data?: { store_id?: string; id?: string; [k: string]: unknown };
}
@ApiTags('تكامل زد')
@ApiBearerAuth()
@UseInterceptors(WebhookLoggingInterceptor)
@Controller('integrations/zid')
export class ZidController {
  private readonly logger = new Logger(ZidController.name);
  constructor(
    private readonly zid: ZidService,
    private readonly config: ConfigService,
    private readonly rabbit: RabbitService, // 👈
    private readonly catalog: CatalogService,
    @InjectModel(Merchant.name) private merchantModel: Model<MerchantDocument>,
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private handleWebhookEvent(event: string, data: unknown): void {
    switch (event) {
      case 'product.create':
      case 'product.update':
        // await this.productsService.createOrUpdateFromZid(storeId, data);
        break;
      case 'product.delete':
        // await this.productsService.removeByExternalId(storeId, productId);
        break;
      case 'order.create':
      case 'order.update':
      case 'order.status.update':
        // await this.ordersService.upsertFromZid(storeId, data);
        break;
      default:
        this.logger.warn(`Unhandled Zid event: ${event}`);
    }
  }

  private async performSync(
    merchantId: string,
    requestedBy: string | null,
    syncMode: string,
  ): Promise<void> {
    if (syncMode === 'background') {
      try {
        await this.rabbit.publish('catalog.sync', 'requested', {
          merchantId,
          requestedBy,
          source: 'zid',
        });
      } catch {
        await this.catalog.syncForMerchant(merchantId);
      }
    } else {
      await this.catalog.syncForMerchant(merchantId);
    }
  }

  private generateCallbackHtml(
    tokens: { store_id?: string },
    publicAppOrigin: string,
  ): string {
    const storeId = tokens.store_id || '';
    return `<!doctype html>
<meta charset="utf-8"/>
<title>Connected</title>
<script>
  try {
    if (window.opener) {
      window.opener.postMessage({ provider: 'zid', connected: true }, "${publicAppOrigin}");
      window.close();
    } else {
      window.location.replace("/dashboard/integrations?provider=zid&connected=1&store_id=${storeId}");
    }
  } catch (e) {
    window.location.replace("/dashboard/integrations?provider=zid&connected=1&store_id=${storeId}");
  }
</script>`;
  }

  @UseGuards(JwtAuthGuard)
  @Get('connect')
  async connect(@Req() req: Request, @Res() res: Response): Promise<void> {
    const user: Record<string, unknown> = (
      req as Request & { user: Record<string, unknown> }
    ).user;
    const merchant = await this.merchantModel
      .findOne({ userId: user.userId })
      .lean();
    if (!merchant) {
      res.status(400).send('No merchant for user');
      return;
    }

    // 👈 نحمل معلومات تكفينا بعد العودة
    const payload = {
      merchantId: String(merchant.id),
      userId: String(user.userId),
      n: Date.now(),
      sync: 'background' as const, // أو 'immediate' لو حاب
    };
    const secret = this.config.get<string>('JWT_SECRET')!;
    const state = jwt.sign(payload, secret, { expiresIn: '10m' });

    const url = this.zid.getOAuthUrl(state); // يبني authorize مع redirect_uri من env
    return res.redirect(url);
  }

  @Public()
  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ): Promise<void> {
    try {
      if (!code || !state) {
        res.status(400).send('Missing code/state');
        return;
      }

      const secret = this.config.get<string>('JWT_SECRET')!;
      const decoded = jwt.verify(state, secret) as {
        merchantId: string;
        userId?: string;
        sync?: 'background' | 'immediate';
      };
      const merchantId = decoded.merchantId;

      // تبادل التوكنات وحفظها
      const tokens = await this.zid.exchangeCodeForToken(code);
      await this.zid.upsertIntegration(new Types.ObjectId(merchantId), tokens);

      // تسجيل ويبهوكات المتجر
      await this.zid.registerDefaultWebhooks(new Types.ObjectId(merchantId));

      // تشغيل مزامنة تلقائية
      const requestedBy = decoded.userId || null;
      const syncMode = decoded.sync || 'background';
      await this.performSync(merchantId, requestedBy, syncMode);

      // ارجع HTML بسيط يُغلق نافذة الأوث ويبلغ الصفحة الأصلية
      const publicAppOrigin =
        this.config.get<string>('PUBLIC_APP_ORIGIN') ?? '*';
      const html = this.generateCallbackHtml(tokens, publicAppOrigin);
      res.type('html').send(html);
    } catch (err: unknown) {
      this.logger.error(
        'ZID CALLBACK ERROR',
        err instanceof Error ? err.stack : err,
      );
      res.redirect(
        `/dashboard/integrations?provider=zid&connected=0&error=${encodeURIComponent(err instanceof Error ? err.message : String(err))}`,
      );
    }
  }

  @Public()
  @Post('webhook')
  @HttpCode(200)
  @ApiOperation({
    summary: 'ويبهوك زد',
    description: 'استقبال الأحداث من منصة زد',
  })
  @ApiBody({
    description: 'بيانات الحدث من زد',
    schema: {
      type: 'object',
      properties: {
        event: { type: 'string', description: 'نوع الحدث' },
        data: { type: 'object', description: 'بيانات الحدث' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'تم استلام الحدث بنجاح' })
  @ApiResponse({ status: 500, description: 'خطأ في معالجة الحدث' })
  webhook(
    @Body() body: ZidWebhookPayload,
    @Headers() headers: Record<string, string>,
    @Res() res: Response,
  ): void {
    try {
      const event = body?.event ?? '';
      this.logger.log(`Zid webhook: ${event || 'unknown'}`);

      this.handleWebhookEvent(event, body?.data);

      res.json({ ok: true });
    } catch (err: unknown) {
      this.logger.error(
        `Zid webhook error: ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err.stack : err,
      );
      res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}
