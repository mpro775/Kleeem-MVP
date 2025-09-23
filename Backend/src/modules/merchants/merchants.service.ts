import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { Types } from 'mongoose';

import { CreateMerchantDto } from './dto/requests/create-merchant.dto';
import { OnboardingBasicDto } from './dto/requests/onboarding-basic.dto';
import { PreviewPromptDto } from './dto/requests/preview-prompt.dto';
import { QuickConfigDto } from './dto/requests/quick-config.dto';
import { UpdateMerchantDto } from './dto/requests/update-merchant.dto';
import { MerchantsRepository } from './repositories/merchants.repository';
import { MerchantDocument } from './schemas/merchant.schema';
import { QuickConfig } from './schemas/quick-config.schema';
import { MerchantCacheService } from './services/merchant-cache.service';
import { MerchantDeletionService } from './services/merchant-deletion.service';
import { MerchantProfileService } from './services/merchant-profile.service';
import { MerchantPromptService } from './services/merchant-prompt.service';
import { MerchantProvisioningService } from './services/merchant-provisioning.service';
import { PromptBuilderService } from './services/prompt-builder.service';
import { MerchantStatusResponse } from './types/types';

@Injectable()
export class MerchantsService {
  private readonly logger = new Logger(MerchantsService.name);

  constructor(
    @Inject('MerchantsRepository')
    private readonly merchantsRepository: MerchantsRepository,
    private readonly promptBuilder: PromptBuilderService,

    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,

    // ⬇️ جديدة
    private readonly provisioning: MerchantProvisioningService,
    private readonly cacheSvc: MerchantCacheService,
    private readonly promptSvc: MerchantPromptService,
    private readonly profileSvc: MerchantProfileService,
    private readonly deletionSvc: MerchantDeletionService,
  ) {}

  async create(dto: CreateMerchantDto): Promise<MerchantDocument> {
    return this.provisioning.create(dto);
  }

  async update(id: string, dto: UpdateMerchantDto): Promise<MerchantDocument> {
    return this.profileSvc.update(id, dto);
  }

  // Cache invalidation helper
  private async invalidateMerchantCache(merchantId: string) {
    await this.cacheSvc.invalidate(merchantId);
  }

  async findAll(): Promise<MerchantDocument[]> {
    return this.merchantsRepository.findAll();
  }

  async findOne(id: string): Promise<MerchantDocument> {
    return this.cacheSvc.findOne(id);
  }

  async saveBasicInfo(
    merchantId: string,
    dto: OnboardingBasicDto,
  ): Promise<MerchantDocument> {
    return this.profileSvc.saveBasicInfo(merchantId, dto);
  }

  async remove(id: string): Promise<{ message: string }> {
    return this.deletionSvc.remove(id);
  }

  async softDelete(
    id: string,
    actor: { userId: string; role: string },
    reason?: string,
  ): Promise<{ message: string; at: Date }> {
    return this.deletionSvc.softDelete(id, actor, reason);
  }

  async restore(
    id: string,
    actor: { userId: string; role: string },
  ): Promise<{ message: string }> {
    return this.deletionSvc.restore(id, actor);
  }

  async purge(
    id: string,
    actor: { userId: string; role: string },
  ): Promise<{ message: string }> {
    return this.deletionSvc.purge(id, actor);
  }

  async isSubscriptionActive(id: string): Promise<boolean> {
    return this.merchantsRepository.isSubscriptionActive(id);
  }

  async buildFinalPrompt(id: string): Promise<string> {
    return this.cacheSvc.buildFinalPrompt(id);
  }

  async saveAdvancedVersion(
    id: string,
    newTpl: string,
    note?: string,
  ): Promise<void> {
    await this.promptSvc.saveAdvancedVersion(id, newTpl, note);
    await this.invalidateMerchantCache(id);
  }

  async listAdvancedVersions(id: string): Promise<unknown> {
    return this.promptSvc.listAdvancedVersions(id);
  }

  async revertAdvancedVersion(id: string, index: number): Promise<void> {
    return this.promptSvc.revertAdvancedVersion(id, index);
  }

  async updateQuickConfig(
    id: string,
    dto: QuickConfigDto,
  ): Promise<QuickConfig> {
    const quickConfig = await this.merchantsRepository.updateQuickConfig(
      id,
      dto,
    );
    const updatedDoc = await this.merchantsRepository.findOne(id);

    const newPrompt = await this.promptBuilder.compileTemplate(updatedDoc);
    updatedDoc.finalPromptTemplate = newPrompt;
    await updatedDoc.save?.();

    // Invalidate cache after quick config update
    await this.invalidateMerchantCache(id);

    return quickConfig;
  }

  async previewPromptV2(id: string, dto: PreviewPromptDto): Promise<string> {
    return this.promptSvc.previewPromptV2(id, dto);
  }

  async getStatus(id: string): Promise<MerchantStatusResponse> {
    return this.cacheSvc.getStatus(id);
  }

  async getAdvancedTemplateForEditor(
    id: string,
    testVars: Record<string, string> = {},
  ): Promise<{ template: string; note?: string }> {
    return this.promptSvc.getAdvancedTemplateForEditor(id, testVars);
  }

  async ensureForUser(
    userId: Types.ObjectId,
    opts?: { name?: string; slugBase?: string },
  ): Promise<MerchantDocument> {
    return this.merchantsRepository.ensureForUser(userId, opts);
  }

  // Check if public slug exists
  async existsByPublicSlug(slug: string): Promise<boolean> {
    return this.profileSvc.existsByPublicSlug(slug);
  }

  // Upload logo to MinIO
  async uploadLogoToMinio(
    merchantId: string,
    file: Express.Multer.File,
  ): Promise<string> {
    return this.profileSvc.uploadLogoToMinio(merchantId, file);
  }

  // Ensure workflow exists for merchant
  async ensureWorkflow(merchantId: string): Promise<string> {
    return this.provisioning.ensureWorkflow(merchantId);
  }

  // Get store context for AI
  async getStoreContext(merchantId: string): Promise<unknown> {
    return this.cacheSvc.getStoreContext(merchantId);
  }

  // Set product source for merchant
  async setProductSource(
    merchantId: string,
    source: 'internal' | 'salla' | 'zid',
  ): Promise<unknown> {
    return this.profileSvc.setProductSource(merchantId, source);
  }
}
