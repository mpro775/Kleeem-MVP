import {
  Injectable,
  Inject,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';

import { TranslationService } from '../../../common/services/translation.service';
import { BusinessMetrics } from '../../../metrics/business.metrics';
import { N8nWorkflowService } from '../../n8n-workflow/n8n-workflow.service';
import { StorefrontService } from '../../storefront/storefront.service';
import { CreateMerchantDto } from '../dto/requests/create-merchant.dto';
import { MerchantsRepository } from '../repositories/merchants.repository';
import { MerchantDocument } from '../schemas/merchant.schema';

import { PromptBuilderService } from './prompt-builder.service';

@Injectable()
export class MerchantProvisioningService {
  private readonly logger = new Logger(MerchantProvisioningService.name);

  constructor(
    @Inject('MerchantsRepository')
    private readonly merchantsRepository: MerchantsRepository,
    private readonly n8n: N8nWorkflowService,
    private readonly storefrontService: StorefrontService,
    private readonly promptBuilder: PromptBuilderService,
    private readonly businessMetrics: BusinessMetrics,
    private readonly translationService: TranslationService,
  ) {}

  /**
   * إنشاء التاجر + تهيئة الـ n8n + إنشاء Storefront
   * مع Rollback نظيف عند الفشل.
   */
  async create(dto: CreateMerchantDto): Promise<MerchantDocument> {
    const merchant = await this.merchantsRepository.create(dto);

    // Metrics
    this.businessMetrics.incMerchantCreated();
    this.businessMetrics.incN8nWorkflowCreated();

    let wfId: string | null = null;
    let storefrontCreated = false;

    try {
      // 1) n8n workflow
      wfId = await this.n8n.createForMerchant(String(merchant._id));
      merchant.workflowId = wfId;

      // 2) Compile final prompt
      merchant.finalPromptTemplate =
        await this.promptBuilder.compileTemplate(merchant);
      await merchant.save?.();

      // 3) Storefront افتراضي
      await this.storefrontService.create({
        merchant: String(merchant._id),
        primaryColor: '#FF8500',
        secondaryColor: '#1976d2',
        buttonStyle: 'rounded',
        banners: [],
        featuredProductIds: [],
        slug: String(merchant._id),
      });
      storefrontCreated = true;

      return merchant;
    } catch (err) {
      // Rollback
      try {
        if (wfId) {
          try {
            await this.n8n.setActive(wfId, false);
          } catch {
            this.logger.warn(`Failed to deactivate workflow ${wfId}`);
          }
          try {
            await this.n8n.delete(wfId);
          } catch {
            this.logger.warn(`Failed to delete workflow ${wfId}`);
          }
        }
      } catch {
        this.logger.warn(`Failed to rollback workflow ${wfId}`);
      }

      if (storefrontCreated) {
        try {
          await this.storefrontService.deleteByMerchant(String(merchant._id));
        } catch {
          this.logger.warn(`Failed to delete storefront ${merchant.id}`);
        }
      }

      // احذف التاجر الذي أنشأناه للتو
      try {
        await this.merchantsRepository.remove(String(merchant._id));
      } catch {
        //Ignore
      }

      this.logger.error('Merchant initialization failed', err as Error);
      throw new InternalServerErrorException(
        this.translationService.translate(
          'merchants.errors.initializationFailed',
        ),
      );
    }
  }

  /**
   * ضمان وجود Workflow للتاجر.
   * (نفس السلوك السابق: يعيد placeholder إن لم يوجد.)
   */
  async ensureWorkflow(merchantId: string): Promise<string> {
    const merchant = await this.merchantsRepository.findOne(merchantId);
    const doc = merchant;
    if (!doc.workflowId) {
      // ضع منطق إنشاء فعلي هنا إن رغبت لاحقًا
      return 'wf_placeholder';
    }
    return String(doc.workflowId);
  }
}
