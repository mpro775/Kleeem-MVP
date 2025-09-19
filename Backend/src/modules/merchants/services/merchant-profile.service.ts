import { Injectable, Inject, Logger } from '@nestjs/common';
import { MerchantsRepository } from '../repositories/merchants.repository';
import { UpdateMerchantDto } from '../dto/requests/update-merchant.dto';
import { OnboardingBasicDto } from '../dto/requests/onboarding-basic.dto';
import { PromptBuilderService } from './prompt-builder.service';
import { ChatWidgetService } from '../../chat/chat-widget.service';
import { MerchantCacheService } from './merchant-cache.service';

@Injectable()
export class MerchantProfileService {
  private readonly logger = new Logger(MerchantProfileService.name);

  constructor(
    @Inject('MerchantsRepository')
    private readonly repo: MerchantsRepository,
    private readonly promptBuilder: PromptBuilderService,
    private readonly chatWidgetService: ChatWidgetService,
    private readonly cacheSvc: MerchantCacheService,
  ) {}

  async update(id: string, dto: UpdateMerchantDto) {
    const updated = await this.repo.update(id, dto);

    if ((dto as any).publicSlug) {
      try {
        await this.chatWidgetService.syncWidgetSlug(
          id,
          (dto as any).publicSlug,
        );
      } catch (e) {
        this.logger.warn(`syncWidgetSlug failed for merchant ${id}`, e as any);
      }
    }

    try {
      const compiled = await this.promptBuilder.compileTemplate(updated as any);
      (updated as any).set?.('finalPromptTemplate', compiled);
      await (updated as any).save?.();
    } catch (e) {
      this.logger.error(
        'Error compiling prompt template after update',
        e as any,
      );
    }

    await this.cacheSvc.invalidate(id);
    return updated;
  }

  async saveBasicInfo(merchantId: string, dto: OnboardingBasicDto) {
    const m = await this.repo.saveBasicInfo(merchantId, dto);

    try {
      (m as any).finalPromptTemplate = await this.promptBuilder.compileTemplate(
        m as any,
      );
      await (m as any).save?.();
    } catch {
      this.logger.warn('Prompt compile skipped after basic info');
    }

    await this.cacheSvc.invalidate(merchantId);
    return m;
  }

  // وجود السلاج العام (غير مُنفّذ في الريبو حاليًا)
  async existsByPublicSlug(slug: string): Promise<boolean> {
    // TODO: نفّذ findByPublicSlug في الريبو ثم استخدمه هنا
    // const merchant = await this.repo.findByPublicSlug(slug);
    // return !!merchant;
    return false;
  }

  // رفع الشعار إلى MinIO (Placeholder)
  async uploadLogoToMinio(
    merchantId: string,
    file: Express.Multer.File,
  ): Promise<string> {
    // TODO: اربط مع media service الفعلي
    return `https://minio.example.com/logos/${merchantId}/${file.originalname}`;
  }

  // تغيير مصدر المنتجات
  async setProductSource(merchantId: string, source: string): Promise<any> {
    const merchant = await this.repo.findOne(merchantId);
    const doc = merchant as any;
    doc.productSource = source;
    await this.repo.update(merchantId, { productSource: source } as any);
    await this.cacheSvc.invalidate(merchantId);
    return merchant;
  }
}
