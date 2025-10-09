// src/modules/merchants/repositories/mongo-merchants.repository.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  Model,
  Types,
  FilterQuery,
  ProjectionType,
  UpdateQuery,
} from 'mongoose';

import {
  CreateMerchantDto,
  UpdateMerchantDto,
  QuickConfigDto,
  OnboardingBasicDto,
} from '../dto';
import { Merchant, MerchantDocument } from '../schemas/merchant.schema';
import { QuickConfig } from '../schemas/quick-config.schema';
import {
  PlanTier,
  SubscriptionPlan,
} from '../schemas/subscription-plan.schema';
import { MerchantStatusResponse } from '../types/types';

import { MerchantsRepository } from './merchants.repository';

// ========= Constants =========
const INVALID_ID_MSG = 'Merchant not found' as const;
const FORBIDDEN_MSG = 'غير مخوّل' as const;
const HARD_DELETE_FOR_ADMINS_ONLY = 'الحذف الإجباري للمشرفين فقط' as const;

const SLUG_RE = /^[a-z](?:[a-z0-9-]{1,48}[a-z0-9])$/;
const SLUG_MAX = 50;

// ========= Types =========
type RoleName = 'ADMIN' | 'MERCHANT' | 'MEMBER';

interface Actor {
  userId: string;
  role: RoleName;
  merchantId?: string;
}

type MerchantStatusLiteral = 'active' | 'inactive' | 'suspended';

// ========= Helpers =========
function normalizeSlug(v: string): string {
  const base = (v ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX);
  return base;
}

function isValidObjectIdLike(id: string): boolean {
  return Types.ObjectId.isValid(id);
}

@Injectable()
export class MongoMerchantsRepository implements MerchantsRepository {
  constructor(
    @InjectModel(Merchant.name)
    private readonly merchantModel: Model<MerchantDocument>,
  ) {}

  // ---------- Create ----------
  async create(createDto: CreateMerchantDto): Promise<MerchantDocument> {
    const merchant = new this.merchantModel(createDto);
    return merchant.save();
  }

  // ---------- Read ----------
  async findAll(): Promise<MerchantDocument[]> {
    return this.merchantModel.find().exec();
  }

  async findOne(id: string): Promise<MerchantDocument> {
    const merchant = await this.merchantModel.findById(id).exec();
    if (!merchant) throw new NotFoundException(INVALID_ID_MSG);
    return merchant;
  }

  // ---------- Update ----------
  async update(id: string, dto: UpdateMerchantDto): Promise<MerchantDocument> {
    const existing = await this.merchantModel.findById(id).exec();
    if (!existing) throw new NotFoundException(INVALID_ID_MSG);

    // publicSlug normalization/validation
    const normalizedPublicSlug = await this.prepareNormalizedSlugIfAny(id, dto);

    // build $set shape safely (no any)
    const updateData = this.buildUpdateShape(dto, normalizedPublicSlug);

    const updated = await this.merchantModel
      .findByIdAndUpdate(
        id,
        { $set: updateData } as UpdateQuery<MerchantDocument>,
        { new: true, runValidators: true },
      )
      .select('+publicSlug' as ProjectionType<MerchantDocument>)
      .exec();

    if (!updated) {
      throw new InternalServerErrorException('Failed to update merchant');
    }
    return updated;
  }

  private async prepareNormalizedSlugIfAny(
    id: string,
    dto: UpdateMerchantDto,
  ): Promise<string | undefined> {
    if (!Object.prototype.hasOwnProperty.call(dto, 'publicSlug'))
      return undefined;

    const raw = (dto.publicSlug ?? '').trim().toLowerCase();
    if (!raw) {
      // حذف الـ slug إن أُرسل فارغًا
      return '';
    }

    const normalized = normalizeSlug(raw);
    if (!SLUG_RE.test(normalized)) {
      throw new BadRequestException('سلاج غير صالح');
    }

    const taken = await this.existsByPublicSlug(normalized, id);
    if (taken) throw new BadRequestException('السلاج محجوز');

    return normalized;
  }

  private buildUpdateShape(
    dto: UpdateMerchantDto,
    normalizedPublicSlug?: string,
  ): Partial<Merchant> {
    const updateData: Partial<Merchant> = {};

    // publicSlug (قد يكون طلب حذف عبر إرسال قيمة فارغة)
    if (normalizedPublicSlug !== undefined) {
      if (normalizedPublicSlug === '') {
        // إزالة
        (updateData as Record<string, unknown>).publicSlug = undefined;
      } else {
        (updateData as Record<string, unknown>).publicSlug =
          normalizedPublicSlug;
      }
    }

    // باقي الحقول
    for (const [key, value] of Object.entries(dto)) {
      if (value === undefined) continue;
      if (key === 'publicSlug') continue; // تمت معالجته أعلاه

      if (key === 'subscription' && value) {
        const sub = value as SubscriptionPlan;
        (updateData as Record<string, unknown>).subscription = {
          ...sub,
          startDate: sub.startDate ? new Date(sub.startDate) : undefined,
          endDate: sub.endDate ? new Date(sub.endDate) : undefined,
        };
        continue;
      }

      (updateData as Record<string, unknown>)[key] = value as unknown;
    }

    return updateData;
  }

  // ---------- Delete ----------
  async remove(id: string): Promise<{ message: string }> {
    const deleted = await this.merchantModel.findByIdAndDelete(id).exec();
    if (!deleted) throw new NotFoundException(INVALID_ID_MSG);
    return { message: 'Merchant deleted successfully' };
  }

  // ---------- Slug existence ----------
  async existsByPublicSlug(slug: string, excludeId?: string): Promise<boolean> {
    const filter: FilterQuery<MerchantDocument> = { publicSlug: slug };
    if (excludeId && isValidObjectIdLike(excludeId)) {
      filter._id = {
        $ne: new Types.ObjectId(excludeId),
      } as unknown as Types.ObjectId;
    }
    const exists = await this.merchantModel.exists(filter);
    return !!exists;
  }

  // ---------- Onboarding ----------
  async saveBasicInfo(
    merchantId: string,
    dto: OnboardingBasicDto,
  ): Promise<MerchantDocument> {
    const m = await this.merchantModel.findById(merchantId).exec();
    if (!m) throw new NotFoundException(INVALID_ID_MSG);

    // نُسند الحقول المسموح بها فقط
    Object.assign(m, dto);
    await m.save();
    return m;
  }

  // ---------- Soft delete / restore / purge ----------
  async softDelete(
    id: string,
    actor: Actor,
    reason?: string,
  ): Promise<{ message: string; at: Date }> {
    const merchant = await this.merchantModel.findById(id);
    if (!merchant) throw new NotFoundException(INVALID_ID_MSG);

    const sameMerchant =
      actor.merchantId && String(actor.merchantId) === String(id);
    if (actor.role !== 'ADMIN' && !sameMerchant) {
      throw new ForbiddenException(FORBIDDEN_MSG);
    }

    if (merchant.deletedAt) {
      return { message: 'Already soft-deleted', at: merchant.deletedAt };
    }

    merchant.active = false;
    merchant.deletedAt = new Date();
    const deletionData: {
      requestedAt: Date;
      requestedBy: Types.ObjectId;
      reason?: string;
      forcedAt?: Date;
      forcedBy?: Types.ObjectId;
    } = {
      ...(merchant.deletion || {}),
      requestedAt: new Date(),
      requestedBy: new Types.ObjectId(actor.userId),
    };

    if (reason) {
      deletionData.reason = reason;
    }

    merchant.deletion = deletionData;
    await merchant.save();

    return { message: 'Merchant soft-deleted', at: merchant.deletedAt };
  }

  async restore(id: string, actor: Actor): Promise<{ message: string }> {
    const merchant = await this.merchantModel.findById(id);
    if (!merchant) throw new NotFoundException(INVALID_ID_MSG);

    const sameMerchant =
      actor.merchantId && String(actor.merchantId) === String(id);
    if (actor.role !== 'ADMIN' && !sameMerchant) {
      throw new ForbiddenException(FORBIDDEN_MSG);
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

  async purge(id: string, actor: Actor): Promise<{ message: string }> {
    const merchant = await this.merchantModel.findById(id);
    if (!merchant) throw new NotFoundException(INVALID_ID_MSG);

    if (actor.role !== 'ADMIN') {
      throw new ForbiddenException(HARD_DELETE_FOR_ADMINS_ONLY);
    }

    await this.merchantModel.findByIdAndDelete(id).exec();
    return { message: 'Merchant permanently deleted' };
  }

  // ---------- Status & subscription ----------
  async isSubscriptionActive(id: string): Promise<boolean> {
    const m = await this.findOne(id);
    if (!m.subscription.endDate) return true;
    return m.subscription.endDate.getTime() > Date.now();
  }

  async getStatus(id: string): Promise<MerchantStatusResponse> {
    const merchant = await this.merchantModel.findById(id).exec();
    if (!merchant) throw new NotFoundException(INVALID_ID_MSG);

    const active = merchant.subscription.endDate
      ? merchant.subscription.endDate > new Date()
      : true;

    const subscription: {
      tier: PlanTier;
      status: 'active' | 'expired' | 'pending';
      startDate: Date;
      endDate?: Date;
    } = {
      tier: merchant.subscription.tier,
      status: active ? 'active' : 'expired',
      startDate: merchant.subscription.startDate,
    };

    if (merchant.subscription.endDate) {
      subscription.endDate = merchant.subscription.endDate;
    }

    const result: MerchantStatusResponse = {
      status: merchant.status as MerchantStatusLiteral,
      subscription,
      promptStatus: {
        configured: !!merchant.finalPromptTemplate,
        lastUpdated: merchant.updatedAt,
      },
    };

    if (merchant.lastActivity) {
      result.lastActivity = merchant.lastActivity;
    }

    return result;
  }

  // ---------- Prompts / advanced config ----------
  async buildFinalPrompt(id: string): Promise<string> {
    const m = await this.merchantModel.findById(id).exec();
    if (!m) throw new NotFoundException(INVALID_ID_MSG);
    return m.finalPromptTemplate;
  }

  async saveAdvancedVersion(
    id: string,
    newTpl: string,
    note?: string,
  ): Promise<void> {
    const m = await this.findOne(id);
    const configData: {
      template: string;
      updatedAt: Date;
      note?: string;
    } = { template: newTpl, updatedAt: new Date() };

    if (note) {
      configData.note = note;
    }

    m.currentAdvancedConfig = configData;
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

  // ---------- Quick Config ----------
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

    if (!updatedDoc) throw new NotFoundException(INVALID_ID_MSG);
    return updatedDoc.quickConfig;
  }

  // ---------- Ensure for user ----------
  async ensureForUser(
    userId: Types.ObjectId,
    opts?: { name?: string; slugBase?: string },
  ): Promise<MerchantDocument> {
    const existing = await this.merchantModel.findOne({ userId }).exec();
    if (existing) return existing;

    const now = new Date();

    const dto: CreateMerchantDto = {
      userId: userId.toString(),
      name: opts?.name ?? 'متجر جديد',
      // يُفضّل أن تكون التواريخ Date في الـ schema
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
      // يمكن توليد slug مبدئي عند توفر slugBase
      ...(opts?.slugBase ? { publicSlug: normalizeSlug(opts.slugBase) } : {}),
    };

    return this.create(dto);
  }
}
