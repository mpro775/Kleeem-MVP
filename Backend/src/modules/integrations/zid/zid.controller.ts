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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { Response, Request } from 'express';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { Public } from '../../../common/decorators/public.decorator';
import { ZidService } from './zid.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Merchant,
  MerchantDocument,
} from '../../merchants/schemas/merchant.schema';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import { CatalogService } from 'src/modules/catalog/catalog.service';
import { RabbitService } from 'src/infra/rabbit/rabbit.service';
interface ZidWebhookPayload {
  event?: string;
  data?: unknown;
  // لو زد يمرر store_id داخل data:
  // data?: { store_id?: string; id?: string; [k: string]: unknown };
}
@ApiTags('تكامل زد')
@ApiBearerAuth()
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

  @UseGuards(JwtAuthGuard)
  @Get('connect')
  async connect(@Req() req: Request, @Res() res: Response) {
    const user: any = (req as any).user;
    const merchant = await this.merchantModel
      .findOne({ userId: user.userId })
      .lean();
    if (!merchant) return res.status(400).send('No merchant for user');

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
  ) {
    try {
      if (!code || !state) return res.status(400).send('Missing code/state');
      const secret = this.config.get<string>('JWT_SECRET')!;
      const decoded = jwt.verify(state, secret) as {
        merchantId: string;
        userId?: string;
        sync?: 'background' | 'immediate';
      };
      const merchantId = decoded.merchantId;

      // 1) تبادل التوكنات وحفظها
      const tokens = await this.zid.exchangeCodeForToken(code);
      await this.zid.upsertIntegration(new Types.ObjectId(merchantId), tokens);

      // 2) تسجيل ويبهوكات المتجر
      await this.zid.registerDefaultWebhooks(new Types.ObjectId(merchantId));

      // 3) تشغيل مزامنة تلقائية
      const requestedBy = decoded.userId || null;
      const syncMode = decoded.sync || 'background';

      if (syncMode === 'background') {
        // ننشر حدث إلى Rabbit ليستلمه CatalogConsumer عندك
        try {
          await this.rabbit.publish('catalog.sync', 'requested', {
            merchantId,
            requestedBy,
            source: 'zid',
          });
        } catch {
          // احتياط: نفّذ المزامنة مباشرة إن فشل Rabbit
          await this.catalog.syncForMerchant(merchantId);
        }
      } else {
        // immediate: نفّذ الآن
        await this.catalog.syncForMerchant(merchantId);
      }

      // 4) ارجع HTML بسيط يُغلق نافذة الأوث ويبلغ الصفحة الأصلية
      return res.type('html').send(`<!doctype html>
<meta charset="utf-8"/>
<title>Connected</title>
<script>
  try {
    if (window.opener) {
      window.opener.postMessage({ provider: 'zid', connected: true }, "${this.config.get<string>('PUBLIC_APP_ORIGIN') ?? '*'}");
      window.close();
    } else {
      // fallback: افتح لوحة التحكم
      window.location.replace("/dashboard/integrations?provider=zid&connected=1&store_id=${tokens.store_id || ''}");
    }
  } catch (e) {
    window.location.replace("/dashboard/integrations?provider=zid&connected=1&store_id=${tokens.store_id || ''}");
  }
</script>`);
    } catch (err: any) {
      this.logger.error('ZID CALLBACK ERROR', err?.stack || err);
      return res.redirect(
        `/dashboard/integrations?provider=zid&connected=0&error=${encodeURIComponent(err?.message || 'failed')}`,
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
  ) {
    try {
      this.logger.log(`Zid webhook: ${body?.event || 'unknown'}`);

      // TODO: إن كان لدى زد توقيع مخصص، تحقّق هنا (header + secret)
      // راجع صفحات ويبهوكات زد لمعرفة الأحداث المدعومة. :contentReference[oaicite:0]{index=0}

      const event = body?.event ?? '';
      switch (event) {
        case 'product.create':
        case 'product.update':
          // await this.productsService.createOrUpdateFromZid(storeId, body.data);
          break;
        case 'product.delete':
          // await this.productsService.removeByExternalId(storeId, productId);
          break;
        case 'order.create':
        case 'order.update':
        case 'order.status.update':
          // await this.ordersService.upsertFromZid(storeId, body.data);
          break;
        default:
          this.logger.warn(`Unhandled Zid event: ${event}`);
      }

      return res.json({ ok: true });
    } catch (err: any) {
      this.logger.error(`Zid webhook error: ${err?.message}`, err?.stack);
      return res.status(500).json({ ok: false, error: err?.message });
    }
  }
}
