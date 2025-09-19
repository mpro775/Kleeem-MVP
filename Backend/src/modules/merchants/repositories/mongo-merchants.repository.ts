import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Merchant, MerchantDocument } from '../schemas/merchant.schema';
import { MerchantsRepository } from './merchants.repository';

import { QuickConfig } from '../schemas/quick-config.schema';
import { MerchantStatusResponse } from '../types/types';
import { PlanTier } from '../schemas/subscription-plan.schema';
import {
  CreateMerchantDto,
  UpdateMerchantDto,
  QuickConfigDto,
  OnboardingBasicDto,
} from '../dto';

const SLUG_RE = /^[a-z](?:[a-z0-9-]{1,48}[a-z0-9])$/;

const normalizeSlug = (v: string) =>
  v
    ?.trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50) || '';

@Injectable()
export class MongoMerchantsRepository implements MerchantsRepository {
  constructor(
    @InjectModel(Merchant.name)
    private readonly merchantModel: Model<MerchantDocument>,
  ) {}

  async create(createDto: CreateMerchantDto): Promise<MerchantDocument> {
    const merchant = new this.merchantModel(createDto);
    return merchant.save();
  }

  async existsByPublicSlug(slug: string, excludeId?: string) {
    const q: any = { publicSlug: slug };
    if (excludeId && Types.ObjectId.isValid(excludeId))
      q._id = { $ne: excludeId };
    return !!(await this.merchantModel.exists(q));
  }

  async update(id: string, dto: UpdateMerchantDto): Promise<MerchantDocument> {
    const existing = await this.merchantModel.findById(id).exec();
    if (!existing) throw new NotFoundException('Merchant not found');

    if ('publicSlug' in dto) {
      const raw = (dto.publicSlug ?? '').trim().toLowerCase();
      if (!raw) {
        delete (dto as any).publicSlug;
      } else {
        const normalized = normalizeSlug(raw);
        if (!SLUG_RE.test(normalized))
          throw new BadRequestException('سلاج غير صالح');
        const taken = await this.existsByPublicSlug(normalized, id);
        if (taken) throw new BadRequestException('السلاج محجوز');
        (dto as any).publicSlug = normalized;
      }
    }

    const updateData: Record<string, any> = {};
    for (const [k, v] of Object.entries(dto)) {
      if (v !== undefined) {
        if (k === 'subscription' && v) {
          const sub = v as any;
          updateData.subscription = {
            ...v,
            startDate: sub.startDate ? new Date(sub.startDate) : undefined,
            endDate: sub.endDate ? new Date(sub.endDate) : undefined,
          };
        } else {
          updateData[k] = v;
        }
      }
    }

    const updated = await this.merchantModel
      .findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true },
      )
      .select('+publicSlug')
      .exec();

    if (!updated)
      throw new InternalServerErrorException('Failed to update merchant');
    return updated;
  }

  async findAll(): Promise<MerchantDocument[]> {
    return this.merchantModel.find().exec();
  }

  async findOne(id: string): Promise<MerchantDocument> {
    const merchant = await this.merchantModel.findById(id).exec();
    if (!merchant) throw new NotFoundException('Merchant not found');
    return merchant;
  }

  async saveBasicInfo(
    merchantId: string,
    dto: OnboardingBasicDto,
  ): Promise<MerchantDocument> {
    const m = await this.merchantModel.findById(merchantId).exec();
    if (!m) throw new NotFoundException('Merchant not found');

    Object.assign(m, dto);
    await m.save();
    return m;
  }

  async remove(id: string): Promise<{ message: string }> {
    const deleted = await this.merchantModel.findByIdAndDelete(id).exec();
    if (!deleted) throw new NotFoundException('Merchant not found');
    return { message: 'Merchant deleted successfully' };
  }

  async softDelete(
    id: string,
    actor: { userId: string; role: string },
    reason?: string,
  ) {
    const merchant = await this.merchantModel.findById(id);
    if (!merchant) throw new NotFoundException('Merchant not found');

    if (
      actor.role !== 'ADMIN' &&
      String((actor as any).merchantId) !== String(id)
    ) {
      throw new ForbiddenException('غير مخوّل');
    }

    if (merchant.deletedAt) {
      return { message: 'Already soft-deleted', at: merchant.deletedAt };
    }

    merchant.active = false;
    merchant.deletedAt = new Date();
    merchant.deletion = {
      ...(merchant.deletion || {}),
      requestedAt: new Date(),
      requestedBy: new Types.ObjectId(actor.userId),
      reason,
    };
    await merchant.save();

    return { message: 'Merchant soft-deleted', at: merchant.deletedAt };
  }

  async restore(id: string, actor: { userId: string; role: string }) {
    const merchant = await this.merchantModel.findById(id);
    if (!merchant) throw new NotFoundException('Merchant not found');

    if (
      actor.role !== 'ADMIN' &&
      String((actor as any).merchantId) !== String(id)
    ) {
      throw new ForbiddenException('غير مخوّل');
    }

    if (!merchant.deletedAt) {
      return { message: 'Merchant is not soft-deleted' };
    }

    merchant.active = true;
    merchant.deletedAt = null;
    merchant.deletion = {};
    await merchant.save();

    return { message: 'Merchant restored' };
  }

  async purge(id: string, actor: { userId: string; role: string }) {
    const merchant = await this.merchantModel.findById(id);
    if (!merchant) throw new NotFoundException('Merchant not found');

    if (actor.role !== 'ADMIN') {
      throw new ForbiddenException('الحذف الإجباري للمشرفين فقط');
    }

    await this.merchantModel.findByIdAndDelete(id).exec();
    return { message: 'Merchant permanently deleted' };
  }

  async isSubscriptionActive(id: string): Promise<boolean> {
    const m = await this.findOne(id);
    if (!m.subscription.endDate) return true;
    return m.subscription.endDate.getTime() > Date.now();
  }

  async buildFinalPrompt(id: string): Promise<string> {
    const m = await this.merchantModel.findById(id).exec();
    if (!m) throw new NotFoundException('Merchant not found');
    return m.finalPromptTemplate;
  }

  async saveAdvancedVersion(
    id: string,
    newTpl: string,
    note?: string,
  ): Promise<void> {
    const m = await this.findOne(id);
    m.currentAdvancedConfig = { template: newTpl, note, updatedAt: new Date() };
    await m.save();
  }

  async listAdvancedVersions(id: string): Promise<unknown> {
    const m = await this.findOne(id);
    return m.advancedConfigHistory;
  }

  async revertAdvancedVersion(id: string, index: number): Promise<void> {
    const m = await this.findOne(id);
    const v = m.advancedConfigHistory[index];
    if (v) {
      m.currentAdvancedConfig = v;
      await m.save();
    }
  }

  async updateQuickConfig(
    id: string,
    dto: QuickConfigDto,
  ): Promise<QuickConfig> {
    const updatedDoc = await this.merchantModel
      .findByIdAndUpdate<MerchantDocument>(
        id,
        { $set: { quickConfig: dto } },
        { new: true, runValidators: true },
      )
      .exec();

    if (!updatedDoc) throw new NotFoundException('Merchant not found');
    return updatedDoc.quickConfig;
  }

  async getStatus(id: string): Promise<MerchantStatusResponse> {
    const merchant = await this.merchantModel.findById(id).exec();
    if (!merchant) throw new NotFoundException('Merchant not found');

    const isSubscriptionActive = merchant.subscription.endDate
      ? merchant.subscription.endDate > new Date()
      : true;

    return {
      status: merchant.status as 'active' | 'inactive' | 'suspended',
      subscription: {
        tier: merchant.subscription.tier,
        status: isSubscriptionActive ? 'active' : 'expired',
        startDate: merchant.subscription.startDate,
        endDate: merchant.subscription.endDate,
      },
      lastActivity: merchant.lastActivity,
      promptStatus: {
        configured: !!merchant.finalPromptTemplate,
        lastUpdated: merchant.updatedAt,
      },
    };
  }

  async ensureForUser(
    userId: Types.ObjectId,
    opts?: { name?: string; slugBase?: string },
  ): Promise<MerchantDocument> {
    const existing = await this.merchantModel.findOne({ userId }).exec();
    if (existing) return existing;

    const now = new Date();
    const dto: CreateMerchantDto = {
      userId,
      name: opts?.name || 'متجر جديد',
      subscription: {
        tier: PlanTier.Free,
        startDate: now.toISOString(),
        features: [],
      },
      addresses: [],
      categories: [],
      quickConfig: {
        dialect: 'خليجي',
        tone: 'ودّي',
        customInstructions: [],
        includeClosingPhrase: true,
        customerServicePhone: '',
        customerServiceWhatsapp: '',
        closingText: 'هل أقدر أساعدك بشي ثاني؟ 😊',
      },
    } as any;

    return this.create(dto);
  }
}
