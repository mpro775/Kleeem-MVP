import {
  Controller,
  Get,
  Req,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Integration, IntegrationDocument } from './schemas/integration.schema';
import {
  Merchant,
  MerchantDocument,
} from '../merchants/schemas/merchant.schema';

type ProviderState = {
  active: boolean;
  connected: boolean;
  lastSync: string | null;
};
type StatusResp = {
  productSource: 'internal' | 'salla' | 'zid';
  skipped?: true; // موجودة فقط عند internal
  salla?: ProviderState;
  zid?: ProviderState;
};

const toIso = (v: unknown): string | null => {
  if (v instanceof Date) return v.toISOString();
  // يدعم حالات lean() حيث lastSync قد يكون string أصلاً:
  if (typeof v === 'string') return v;
  // يدعم Mongoose Date-like:
  const maybe = (v as any)?.toISOString?.();
  return typeof maybe === 'string' ? maybe : null;
};

@ApiTags('التكاملات')
@ApiBearerAuth()
@Controller('integrations')
@UseGuards(JwtAuthGuard)
export class IntegrationsController {
  constructor(
    @InjectModel(Integration.name)
    private integModel: Model<IntegrationDocument>,
    @InjectModel(Merchant.name) private merchantModel: Model<MerchantDocument>,
  ) {}

  @Get('status')
  @ApiOperation({
    summary: 'الحصول على حالة التكاملات',
    description: 'استرجاع حالة التكاملات المتاحة (سلة، زد) للتاجر',
  })
  @ApiResponse({ status: 200, description: 'تم استرجاع حالة التكاملات بنجاح' })
  @ApiResponse({ status: 404, description: 'لم يتم العثور على التاجر' })
  async status(@Req() req): Promise<StatusResp> {
    const user = req.user as { userId: string; merchantId?: string };
    const byId = user?.merchantId && Types.ObjectId.isValid(user.merchantId);

    const merchant = byId
      ? await this.merchantModel.findById(user.merchantId).lean()
      : await this.merchantModel.findOne({ userId: user.userId }).lean();

    if (!merchant) throw new NotFoundException('Merchant not found');

    const source = merchant.productSource ?? 'internal';

    // ✅ لو داخلي: لا نحسب أي تكاملات ونرجّع skipped
    if (source === 'internal') {
      return { productSource: 'internal', skipped: true };
    }
    const isConnected = (integ?: Integration) => {
      if (!integ) return false;
      // Zid: المعيار الأساسي managerToken (أو accessToken كـ fallback)
      const anyToken = integ.managerToken || integ.accessToken;
      if (!anyToken) return false;
      if (!integ.expiresAt) return true;
      return integ.expiresAt > now;
    };

    // غير داخلي → نحسب حالة سلة/زد
    const [sallaInteg, zidInteg] = await Promise.all([
      this.integModel
        .findOne({ merchantId: merchant._id, provider: 'salla' })
        .lean(),
      this.integModel
        .findOne({ merchantId: merchant._id, provider: 'zid' })
        .lean(),
    ]);

    const now = new Date();
    const sallaConnected = isConnected(sallaInteg as any);
    const zidConnected = isConnected(zidInteg as any);
    return {
      productSource: source,
      salla: {
        active: !!merchant.productSourceConfig?.salla?.active,
        connected: sallaConnected,
        lastSync:
          toIso((merchant.productSourceConfig as any)?.salla?.lastSync) ??
          toIso(sallaInteg?.lastSync),
      },
      zid: {
        active: !!merchant.productSourceConfig?.zid?.active,
        connected: zidConnected,
        lastSync:
          toIso((merchant.productSourceConfig as any)?.zid?.lastSync) ??
          toIso(zidInteg?.lastSync),
      },
    };
  }
}
