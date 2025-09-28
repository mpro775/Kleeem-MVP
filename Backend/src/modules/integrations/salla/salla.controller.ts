// src/integrations/salla/salla.controller.ts
import * as crypto from 'crypto';

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
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { Response, Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { Model } from 'mongoose';
import { Types } from 'mongoose';
import { RabbitService } from 'src/infra/rabbit/rabbit.service';
import { CatalogService } from 'src/modules/catalog/catalog.service';

import { Public } from '../../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import {
  Merchant,
  MerchantDocument,
} from '../../merchants/schemas/merchant.schema';
import { WebhookLoggingInterceptor } from '../../webhooks/interceptors/webhook-logging.interceptor';

import { SallaService } from './salla.service';

@ApiTags('تكامل سلة')
@ApiBearerAuth()
@UseInterceptors(WebhookLoggingInterceptor)
@Controller('integrations/salla')
export class SallaController {
  private readonly logger = new Logger(SallaController.name);

  constructor(
    private readonly salla: SallaService,
    private readonly config: ConfigService,
    private readonly catalog: CatalogService,
    private readonly rabbit: RabbitService,
    @InjectModel(Merchant.name) private merchantModel: Model<MerchantDocument>,
  ) {}

  private validateWebhookToken(
    headers: Record<string, string>,
    query: Record<string, unknown>,
  ): boolean {
    const sent =
      headers['x-salla-token'] || headers['salla-token'] || query?.token;
    return !(!sent || sent !== process.env.SALLA_WEBHOOK_TOKEN);
  }

  private validateWebhookSignature(
    headers: Record<string, string>,
    body: Record<string, unknown>,
    req: Request,
  ): boolean {
    const sig = headers['x-salla-signature'] || headers['salla-signature'];
    const secret = process.env.SALLA_WEBHOOK_SECRET || '';
    if (!sig || !secret) return false;

    const raw: Buffer =
      (req as Request & { rawBody: Buffer }).rawBody ||
      Buffer.from(JSON.stringify(body));

    const h1 = crypto.createHmac('sha256', secret).update(raw).digest('hex');
    const h2 = crypto.createHmac('sha256', secret).update(raw).digest('base64');

    return sig === h1 || sig === h2;
  }

  private authenticateWebhook(
    mode: string,
    headers: Record<string, string>,
    body: Record<string, unknown>,
    req: Request,
  ): boolean {
    if (mode === 'token') {
      return this.validateWebhookToken(
        headers,
        (req as Request & { query: Record<string, unknown> }).query,
      );
    }
    if (mode === 'signature') {
      return this.validateWebhookSignature(headers, body, req);
    }
    return true; // 'none' mode
  }

  @UseGuards(JwtAuthGuard)
  @Get('connect')
  @ApiOperation({
    summary: 'اتصال بحساب سلة',
    description: 'توجيه المستخدم إلى صفحة تفويض سلة',
  })
  @ApiResponse({
    status: 302,
    description: 'يتم توجيه المستخدم إلى صفحة تفويض سلة',
  })
  @ApiResponse({ status: 400, description: 'خطأ في بيانات الطلب' })
  async connect(@Req() req: Request, @Res() res: Response): Promise<void> {
    const user = (req as Request & { user: { userId: string } }).user;
    const merchant = await this.merchantModel
      .findOne({ userId: user.userId })
      .lean();
    if (!merchant) {
      res.status(400).send('No merchant for user');
      return;
    }

    const state = jwt.sign(
      {
        merchantId: String(merchant.id),
        userId: String(user.userId),
        n: Date.now(),
        sync: 'background' as const,
      },
      this.config.get<string>('JWT_SECRET')!,
      { expiresIn: '10m' },
    );
    return res.redirect(this.salla.getOAuthUrl(state));
  }
  @Public()
  @Get('callback')
  @ApiOperation({
    summary: 'رد الاتصال من سلة',
    description: 'معالجة رد الاتصال بعد تفويض حساب سلة',
  })
  @ApiQuery({ name: 'code', description: 'رمز التخويل من سلة', required: true })
  @ApiQuery({
    name: 'state',
    description: 'حالة الطلب المشفرة',
    required: true,
  })
  @ApiResponse({
    status: 302,
    description: 'يتم توجيه المستخدم إلى لوحة التحكم مع نتيجة الاتصال',
  })
  @ApiResponse({ status: 400, description: 'بيانات غير صالحة' })
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
      const decoded = jwt.verify(
        state,
        this.config.get<string>('JWT_SECRET')!,
      ) as {
        merchantId: string;
        userId?: string;
        sync?: 'background' | 'immediate';
      };

      const tokens = await this.salla.exchangeCodeForToken(code);
      await this.salla.upsertIntegration(
        new Types.ObjectId(decoded.merchantId),
        tokens,
      );
      await this.salla.registerDefaultWebhooks(
        new Types.ObjectId(decoded.merchantId),
      );

      // مزامنة تلقائية
      try {
        if ((decoded.sync || 'background') === 'background') {
          await this.rabbit.publish('catalog.sync', 'requested', {
            merchantId: decoded.merchantId,
            requestedBy: decoded.userId || null,
            source: 'salla',
          });
        } else {
          await this.catalog.syncForMerchant(decoded.merchantId);
        }
      } catch {
        // احتياط لو Rabbit غير متاح:
        await this.catalog.syncForMerchant(decoded.merchantId);
      }

      // أغلق نافذة OAuth وأبلغ الصفحة الأصلية
      res.type('html').send(`<!doctype html><meta charset="utf-8"/>
  <title>Connected</title>
  <script>
    try {
      if (window.opener) {
        window.opener.postMessage({ provider:'salla', connected:true }, "${this.config.get<string>('PUBLIC_APP_ORIGIN') ?? '*'}");
        window.close();
      } else {
        window.location.replace("/dashboard/integrations?provider=salla&connected=1");
      }
    } catch(e){
      window.location.replace("/dashboard/integrations?provider=salla&connected=1");
    }
  </script>`);
    } catch (err: unknown) {
      this.logger.error(
        'SALLA CALLBACK ERROR',
        err instanceof Error ? err.stack : err,
      );
      res.redirect(
        `/dashboard/integrations?provider=salla&connected=0&error=${encodeURIComponent(err instanceof Error ? err.message : 'failed')}`,
      );
    }
  }

  @Public()
  @Post('webhook')
  @HttpCode(200)
  @ApiOperation({
    summary: 'ويبهوك سلة',
    description: 'استقبال الأحداث من منصة سلة',
  })
  @ApiBody({
    description: 'بيانات الحدث من سلة',
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
    @Req() req: Request,
    @Body() body: Record<string, unknown>,
    @Headers() headers: Record<string, string>,
    @Res() res: Response,
  ): void {
    try {
      const mode = (
        process.env.SALLA_WEBHOOK_PROTECTION || 'none'
      ).toLowerCase();

      if (!this.authenticateWebhook(mode, headers, body, req)) {
        this.logger.warn(
          `Invalid Salla webhook ${mode === 'token' ? 'token' : 'signature'}`,
        );
        res.status(401).json({ ok: false });
        return;
      }

      this.logger.log(`Salla webhook: ${(body?.event as string) ?? 'unknown'}`);

      res.json({ ok: true });
      return;
    } catch (e: unknown) {
      this.logger.error(
        `Salla webhook error: ${e instanceof Error ? e.message : 'unknown'}`,
        e instanceof Error ? e.stack : undefined,
      );
      res.status(500).json({ ok: false });
    }
  }
}
