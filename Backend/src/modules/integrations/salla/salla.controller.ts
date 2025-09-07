// src/integrations/salla/salla.controller.ts
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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { Response, Request } from 'express';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { Public } from '../../../common/decorators/public.decorator';
import { SallaService } from './salla.service';
import { InjectModel } from '@nestjs/mongoose';
import {
  Merchant,
  MerchantDocument,
} from '../../merchants/schemas/merchant.schema';
import { Model } from 'mongoose';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import { Types } from 'mongoose';
import { CatalogService } from 'src/modules/catalog/catalog.service';
import { RabbitService } from 'src/infra/rabbit/rabbit.service';
import * as crypto from 'crypto';

@ApiTags('تكامل سلة')
@ApiBearerAuth()
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
  async connect(@Req() req: Request, @Res() res: Response) {
    const user: any = (req as any).user;
    const merchant = await this.merchantModel
      .findOne({ userId: user.userId })
      .lean();
    if (!merchant) return res.status(400).send('No merchant for user');

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
  ) {
    try {
      if (!code || !state) return res.status(400).send('Missing code/state');
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
      return res.type('html').send(`<!doctype html><meta charset="utf-8"/>
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
    } catch (err: any) {
      this.logger.error('SALLA CALLBACK ERROR', err?.stack || err);
      return res.redirect(
        `/dashboard/integrations?provider=salla&connected=0&error=${encodeURIComponent(err?.message || 'failed')}`,
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
    @Req() req: any,
    @Body() body: any,
    @Headers() headers: Record<string, string>,
    @Res() res: Response,
  ) {
    try {
      const mode = (
        process.env.SALLA_WEBHOOK_PROTECTION || 'none'
      ).toLowerCase();

      if (mode === 'token') {
        const sent =
          headers['x-salla-token'] ||
          headers['salla-token'] ||
          req.query?.token;
        if (!sent || sent !== process.env.SALLA_WEBHOOK_TOKEN) {
          this.logger.warn('Invalid Salla webhook token');
          return res.status(401).json({ ok: false });
        }
      } else if (mode === 'signature') {
        const sig = headers['x-salla-signature'] || headers['salla-signature'];
        const secret = process.env.SALLA_WEBHOOK_SECRET || '';
        if (!sig || !secret) return res.status(401).json({ ok: false });

        // HMAC-SHA256(rawBody, secret) hex/base64 — جرّب الطريقتين إن لزم
        const raw: Buffer = req.rawBody || Buffer.from(JSON.stringify(body));
        const h1 = crypto
          .createHmac('sha256', secret)
          .update(raw)
          .digest('hex');
        const h2 = crypto
          .createHmac('sha256', secret)
          .update(raw)
          .digest('base64');

        if (sig !== h1 && sig !== h2) {
          this.logger.warn('Invalid Salla webhook signature');
          return res.status(401).json({ ok: false });
        }
      }

      this.logger.log(`Salla webhook: ${body?.event || 'unknown'}`);
      // TODO: سوّ المعالجة حسب event (product.created / order.created ...)

      return res.json({ ok: true });
    } catch (e: any) {
      this.logger.error(`Salla webhook error: ${e?.message}`, e?.stack);
      return res.status(500).json({ ok: false });
    }
  }
}
