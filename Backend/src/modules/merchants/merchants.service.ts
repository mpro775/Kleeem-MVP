import {
  Injectable,
  Inject,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { TranslationService } from '../../common/services/translation.service';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { MerchantsRepository } from './repositories/merchants.repository';
import { CreateMerchantDto } from './dto/requests/create-merchant.dto';
import { UpdateMerchantDto } from './dto/requests/update-merchant.dto';
import { QuickConfigDto } from './dto/requests/quick-config.dto';
import { OnboardingBasicDto } from './dto/requests/onboarding-basic.dto';
import { PreviewPromptDto } from './dto/requests/preview-prompt.dto';
import { QuickConfig } from './schemas/quick-config.schema';
import { MerchantStatusResponse } from './types/types';
import { Types } from 'mongoose';
import { N8nWorkflowService } from '../n8n-workflow/n8n-workflow.service';
import { ConfigService } from '@nestjs/config';
import { PromptVersionService } from './services/prompt-version.service';
import { PromptPreviewService } from './services/prompt-preview.service';
import { PromptBuilderService } from './services/prompt-builder.service';
import { StorefrontService } from '../storefront/storefront.service';
import { ChatWidgetService } from '../chat/chat-widget.service';
import { CleanupCoordinatorService } from './cleanup-coordinator.service';
import { BusinessMetrics } from '../../metrics/business.metrics';
import * as Handlebars from 'handlebars';
import { buildHbsContext, stripGuardSections } from './services/prompt-utils';
import { MerchantProvisioningService } from './services/merchant-provisioning.service';
import { MerchantCacheService } from './services/merchant-cache.service';
import { MerchantPromptService } from './services/merchant-prompt.service';
import { MerchantProfileService } from './services/merchant-profile.service';
import { MerchantDeletionService } from './services/merchant-deletion.service';

@Injectable()
export class MerchantsService {
  private readonly logger = new Logger(MerchantsService.name);

  constructor(
    @Inject('MerchantsRepository')
    private readonly merchantsRepository: MerchantsRepository,
    private readonly config: ConfigService,
    private readonly promptBuilder: PromptBuilderService,
    private readonly versionSvc: PromptVersionService,
    private readonly storefrontService: StorefrontService,
    private readonly previewSvc: PromptPreviewService,
    private readonly cleanupCoordinator: CleanupCoordinatorService,
    private readonly n8n: N8nWorkflowService,
    private readonly businessMetrics: BusinessMetrics,
    private readonly chatWidgetService: ChatWidgetService,
    private readonly i18n: I18nService,
    private readonly translationService: TranslationService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,

    // ⬇️ جديدة
    private readonly provisioning: MerchantProvisioningService,
    private readonly cacheSvc: MerchantCacheService,
    private readonly promptSvc: MerchantPromptService,
    private readonly profileSvc: MerchantProfileService,
    private readonly deletionSvc: MerchantDeletionService,
  ) {}

  async create(dto: CreateMerchantDto) {
    return this.provisioning.create(dto);
  }

  async update(id: string, dto: UpdateMerchantDto) {
    return this.profileSvc.update(id, dto);
  }

  // Cache invalidation helper
  private async invalidateMerchantCache(merchantId: string) {
    await this.cacheSvc.invalidate(merchantId);
  }

  async findAll() {
    return this.merchantsRepository.findAll();
  }

  async findOne(id: string) {
    return this.cacheSvc.findOne(id);
  }

  async saveBasicInfo(merchantId: string, dto: OnboardingBasicDto) {
    return this.profileSvc.saveBasicInfo(merchantId, dto);
  }

  async remove(id: string) {
    return this.deletionSvc.remove(id);
  }

  async softDelete(
    id: string,
    actor: { userId: string; role: string },
    reason?: string,
  ) {
    return this.deletionSvc.softDelete(id, actor, reason);
  }

  async restore(id: string, actor: { userId: string; role: string }) {
    return this.deletionSvc.restore(id, actor);
  }

  async purge(id: string, actor: { userId: string; role: string }) {
    return this.deletionSvc.purge(id, actor);
  }

  async isSubscriptionActive(id: string): Promise<boolean> {
    return this.merchantsRepository.isSubscriptionActive(id);
  }

  async buildFinalPrompt(id: string): Promise<string> {
    return this.cacheSvc.buildFinalPrompt(id);
  }

  async saveAdvancedVersion(id: string, newTpl: string, note?: string) {
    await this.promptSvc.saveAdvancedVersion(id, newTpl, note);
    await this.invalidateMerchantCache(id);
  }

  async listAdvancedVersions(id: string) {
    return this.promptSvc.listAdvancedVersions(id);
  }

  async revertAdvancedVersion(id: string, index: number) {
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
  ) {
    return this.promptSvc.getAdvancedTemplateForEditor(id, testVars);
  }

  async ensureForUser(
    userId: Types.ObjectId,
    opts?: { name?: string; slugBase?: string },
  ) {
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
  async getStoreContext(merchantId: string): Promise<any> {
    return this.cacheSvc.getStoreContext(merchantId);
  }

  // Set product source for merchant
  async setProductSource(merchantId: string, source: string): Promise<any> {
    return this.profileSvc.setProductSource(merchantId, source);
  }
}
