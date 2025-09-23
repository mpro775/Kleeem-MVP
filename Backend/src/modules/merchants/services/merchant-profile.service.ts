import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';

import { ChatWidgetService } from '../../chat/chat-widget.service';
import { OnboardingBasicDto } from '../dto/requests/onboarding-basic.dto';
import { UpdateMerchantDto } from '../dto/requests/update-merchant.dto';
import { MerchantsRepository } from '../repositories/merchants.repository';
import { MerchantDocument } from '../schemas/merchant.schema';

import { MerchantCacheService } from './merchant-cache.service';
import { PromptBuilderService } from './prompt-builder.service';

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

  async update(id: string, dto: UpdateMerchantDto): Promise<MerchantDocument> {
    const updated = await this.repo.update(id, dto);

    if (dto.publicSlug) {
      try {
        await this.chatWidgetService.syncWidgetSlug(id, dto.publicSlug);
      } catch (e) {
        this.logger.warn(`syncWidgetSlug failed for merchant ${id}`, e);
      }
    }

    try {
      const compiled = await this.promptBuilder.compileTemplate(updated);
      updated.set?.('finalPromptTemplate', compiled);
      await updated.save?.();
    } catch (e) {
      this.logger.error('Error compiling prompt template after update', e);
    }

    await this.cacheSvc.invalidate(id);
    return updated;
  }

  async saveBasicInfo(
    merchantId: string,
    dto: OnboardingBasicDto,
  ): Promise<MerchantDocument> {
    const m = await this.repo.saveBasicInfo(merchantId, dto);

    try {
      m.finalPromptTemplate = await this.promptBuilder.compileTemplate(m);
      await m.save?.();
    } catch {
      this.logger.warn('Prompt compile skipped after basic info');
    }

    await this.cacheSvc.invalidate(merchantId);
    return m;
  }

  // وجود السلاج العام (غير مُنفّذ في الريبو حاليًا)
  async existsByPublicSlug(slug: string): Promise<boolean> {
    await Promise.resolve(); // Placeholder for future async implementation
    // TODO: نفّذ findByPublicSlug في الريبو ثم استخدمه هنا
    // const merchant = await this.repo.findByPublicSlug(slug);
    // return !!merchant;
    void slug; // Prevent unused parameter warning
    return false;
  }

  // رفع الشعار إلى MinIO (Placeholder)
  async uploadLogoToMinio(
    merchantId: string,
    file: Express.Multer.File,
  ): Promise<string> {
    // TODO: اربط مع media service الفعلي
    await Promise.resolve(); // Placeholder for future async implementation
    return `https://minio.example.com/logos/${merchantId}/${file.originalname}`;
  }

  // تغيير مصدر المنتجات
  async setProductSource(
    merchantId: string,
    source: 'internal' | 'salla' | 'zid',
  ): Promise<MerchantDocument> {
    const merchant = await this.repo.findOne(merchantId);
    if (!merchant) throw new NotFoundException('Merchant not found');
    merchant.productSource = source;
    await this.repo.update(merchantId, {
      productSource: source,
    } as UpdateMerchantDto);
    await this.cacheSvc.invalidate(merchantId);
    return merchant;
  }
}
