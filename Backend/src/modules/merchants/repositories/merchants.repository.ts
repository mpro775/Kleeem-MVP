import { MerchantDocument } from '../schemas/merchant.schema';
import {
  CreateMerchantDto,
  UpdateMerchantDto,
  QuickConfigDto,
  OnboardingBasicDto,
} from '../dto';
import { QuickConfig } from '../schemas/quick-config.schema';
import { MerchantStatusResponse } from '../types/types';
import { Types } from 'mongoose';

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
  ): Promise<{ message: string; at?: Date }>;
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
}
