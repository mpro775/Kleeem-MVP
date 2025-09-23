import {
  Controller,
  Get,
  Req,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request } from 'express';
import { Model, Types } from 'mongoose';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  Merchant,
  MerchantDocument,
} from '../merchants/schemas/merchant.schema';

import { Integration, IntegrationDocument } from './schemas/integration.schema';

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

type AuthenticatedRequest = Request & {
  user: { userId: string; merchantId?: string };
};

const toIso = (v: unknown): string | null => {
  if (v instanceof Date) return v.toISOString();
  // يدعم حالات lean() حيث lastSync قد يكون string أصلاً:
  if (typeof v === 'string') return v;
  // يدعم Mongoose Date-like:
  const maybe = (v as { toISOString?: () => string })?.toISOString?.();
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

  private async findMerchant(user: { userId: string; merchantId?: string }) {
    const byId = user?.merchantId && Types.ObjectId.isValid(user.merchantId);
    return byId
      ? await this.merchantModel.findById(user.merchantId).lean()
      : await this.merchantModel.findOne({ userId: user.userId }).lean();
  }

  private isConnected(integ?: Integration): boolean {
    if (!integ) return false;
    const anyToken = integ.managerToken || integ.accessToken;
    if (!anyToken) return false;
    if (!integ.expiresAt) return true;
    return integ.expiresAt > new Date();
  }

  private async getIntegrations(merchantId: Types.ObjectId) {
    const [sallaInteg, zidInteg] = await Promise.all([
      this.integModel.findOne({ merchantId, provider: 'salla' }).lean(),
      this.integModel.findOne({ merchantId, provider: 'zid' }).lean(),
    ]);
    return { sallaInteg, zidInteg };
  }

  private buildProviderStatus(
    merchant: {
      productSourceConfig?: {
        [key: string]: { active?: boolean; lastSync?: unknown };
      };
    },
    provider: 'salla' | 'zid',
    integ: { lastSync?: unknown },
    connected: boolean,
  ): ProviderState {
    return {
      active: !!merchant.productSourceConfig?.[provider]?.active,
      connected,
      lastSync:
        toIso(merchant.productSourceConfig?.[provider]?.lastSync) ??
        toIso(integ?.lastSync),
    };
  }

  @Get('status')
  @ApiOperation({
    summary: 'الحصول على حالة التكاملات',
    description: 'استرجاع حالة التكاملات المتاحة (سلة، زد) للتاجر',
  })
  @ApiResponse({ status: 200, description: 'تم استرجاع حالة التكاملات بنجاح' })
  @ApiResponse({ status: 404, description: 'لم يتم العثور على التاجر' })
  async status(@Req() req: AuthenticatedRequest): Promise<StatusResp> {
    const user = req.user;
    const merchant = await this.findMerchant(user);

    if (!merchant) throw new NotFoundException('Merchant not found');

    const source = merchant.productSource ?? 'internal';

    if (source === 'internal') {
      return { productSource: 'internal', skipped: true };
    }

    const { sallaInteg, zidInteg } = await this.getIntegrations(
      merchant._id as Types.ObjectId,
    );
    const sallaConnected = this.isConnected(sallaInteg as Integration);
    const zidConnected = this.isConnected(zidInteg as Integration);

    return {
      productSource: source,
      salla: this.buildProviderStatus(
        merchant as {
          productSourceConfig?: {
            [key: string]: { active?: boolean; lastSync?: unknown };
          };
        },
        'salla',
        sallaInteg as Integration,
        sallaConnected,
      ),
      zid: this.buildProviderStatus(
        merchant as {
          productSourceConfig?: {
            [key: string]: { active?: boolean; lastSync?: unknown };
          };
        },
        'zid',
        zidInteg as Integration,
        zidConnected,
      ),
    };
  }
}
