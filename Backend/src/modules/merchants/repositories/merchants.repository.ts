import type {
  CreateMerchantDto,
  UpdateMerchantDto,
  QuickConfigDto,
  OnboardingBasicDto,
} from '../dto';
import type { MerchantDocument } from '../schemas/merchant.schema';
import type { QuickConfig } from '../schemas/quick-config.schema';
import type { MerchantStatusResponse } from '../types/types';
import type { Types } from 'mongoose';

/** معاملات قائمة التجار للأدمن */
export interface ListAllAdminParams {
  limit: number;
  page: number;
  status?: 'active' | 'inactive' | 'suspended';
  active?: boolean;
  /** تضمين المحذوفين (deletedAt != null) */
  includeDeleted?: boolean;
  /** بحث نصي في الاسم والوصف */
  search?: string;
  /** ترتيب حسب */
  sortBy?: 'createdAt' | 'name' | 'status' | 'updatedAt';
  /** اتجاه الترتيب */
  sortOrder?: 'asc' | 'desc';
  /** فلترة حسب مستوى الاشتراك */
  subscriptionTier?: string;
}

/** نتيجة إحصائيات التجار للأدمن */
export interface StatsAdminResult {
  total: number;
  activeCount: number;
  inactiveCount: number;
  byStatus: Record<string, number>;
}

/** شكل تاجر مختصر لقائمة الأدمن */
export type MerchantAdminLean = {
  _id: Types.ObjectId;
  name?: string;
  userId: Types.ObjectId;
  status: string;
  active: boolean;
  deletedAt: Date | null;
  publicSlug?: string;
  subscription?: { tier: string; endDate?: Date };
  createdAt: Date;
  updatedAt: Date;
};

export interface MerchantsRepository {
  create(createDto: CreateMerchantDto): Promise<MerchantDocument>;
  existsByPublicSlug(slug: string, excludeId?: string): Promise<boolean>;
  update(id: string, dto: UpdateMerchantDto): Promise<MerchantDocument>;
  findAll(): Promise<MerchantDocument[]>;
  findOne(id: string): Promise<MerchantDocument>;
  saveBasicInfo(
    merchantId: string,
    dto: OnboardingBasicDto,
  ): Promise<MerchantDocument>;
  remove(id: string): Promise<{ message: string }>;
  softDelete(
    id: string,
    actor: { userId: string; role: string },
    reason?: string,
  ): Promise<{ message: string; at: Date }>;
  restore(
    id: string,
    actor: { userId: string; role: string },
  ): Promise<{ message: string }>;
  purge(
    id: string,
    actor: { userId: string; role: string },
  ): Promise<{ message: string }>;
  isSubscriptionActive(id: string): Promise<boolean>;
  buildFinalPrompt(id: string): Promise<string>;
  saveAdvancedVersion(id: string, newTpl: string, note?: string): Promise<void>;
  listAdvancedVersions(id: string): Promise<unknown>;
  revertAdvancedVersion(id: string, index: number): Promise<void>;
  updateQuickConfig(id: string, dto: QuickConfigDto): Promise<QuickConfig>;
  getStatus(id: string): Promise<MerchantStatusResponse>;
  ensureForUser(
    userId: Types.ObjectId,
    opts?: { name?: string; slugBase?: string },
  ): Promise<MerchantDocument>;
  findByUserId(userId: string): Promise<MerchantDocument | null>;

  listAllAdmin(
    params: ListAllAdminParams,
  ): Promise<{ items: MerchantAdminLean[]; total: number }>;
  statsAdmin(): Promise<StatsAdminResult>;
  getTrendsAdmin(
    period: '7d' | '30d',
  ): Promise<{ date: string; count: number }[]>;
  getTrendsByDateRange(
    from: string,
    to: string,
  ): Promise<{ date: string; count: number }[]>;

  /** تحديث حقول إدارية فقط (active, status) */
  updateAdmin(
    id: string,
    dto: { active?: boolean; status?: 'active' | 'inactive' | 'suspended' },
  ): Promise<MerchantDocument>;

  /** تعليق تاجر من الأدمن مع سبب */
  suspend(
    id: string,
    actor: { userId: string },
    reason?: string,
  ): Promise<MerchantDocument>;

  /** إعادة تفعيل تاجر معلّق */
  unsuspend(id: string, actor: { userId: string }): Promise<MerchantDocument>;
}
