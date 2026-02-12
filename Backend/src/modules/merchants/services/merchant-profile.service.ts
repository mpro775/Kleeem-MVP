import * as fs from 'fs/promises';

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { HOUR_IN_SECONDS } from '../../../common/constants/common';
import { S3_CLIENT_TOKEN } from '../../../common/storage/s3-client.provider';
import { ChatWidgetService } from '../../chat/chat-widget.service';
import { OnboardingBasicDto } from '../dto/requests/onboarding-basic.dto';
import { UpdateMerchantDto } from '../dto/requests/update-merchant.dto';
import { MerchantsRepository } from '../repositories/merchants.repository';
import { MerchantDocument } from '../schemas/merchant.schema';

import { MerchantCacheService } from './merchant-cache.service';
import { PromptBuilderService } from './prompt-builder.service';

function cdnBase(): string {
  return (
    process.env.ASSETS_CDN_BASE_URL ||
    process.env.MINIO_PUBLIC_URL ||
    ''
  ).replace(/\/+$/, '');
}

@Injectable()
export class MerchantProfileService {
  private readonly logger = new Logger(MerchantProfileService.name);

  constructor(
    @Inject('MerchantsRepository')
    private readonly repo: MerchantsRepository,
    private readonly promptBuilder: PromptBuilderService,
    private readonly chatWidgetService: ChatWidgetService,
    private readonly cacheSvc: MerchantCacheService,
    @Inject(S3_CLIENT_TOKEN) private readonly s3: S3Client,
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

  // رفع الشعار إلى S3/R2
  async uploadLogoToMinio(
    merchantId: string,
    file: Express.Multer.File,
  ): Promise<string> {
    // 1. تجهيز محتوى الملف (Buffer)
    let fileBody: Buffer;

    try {
      if (file.buffer) {
        // الحالة A: الرفع عبر الذاكرة (MemoryStorage)
        fileBody = file.buffer;
      } else if (file.path) {
        // الحالة B: الرفع عبر القرص (DiskStorage - حالتك الحالية)
        fileBody = await fs.readFile(file.path);
      } else {
        throw new Error('File buffer and path are missing');
      }
    } catch (error) {
      // حل مشكلة TypeScript هنا
      const err = error as Error;
      this.logger.error(`Failed to read file: ${err.message}`);
      throw new BadRequestException('File read error');
    }

    // 2. التحقق من أن الملف ليس فارغاً
    if (!fileBody || fileBody.length === 0) {
      throw new Error('File content is empty');
    }

    const bucket = process.env.S3_BUCKET_NAME || process.env.MINIO_BUCKET || '';
    const safeName = file.originalname.replace(/[^\w.-]+/g, '_');
    const storageKey = `logos/${merchantId}/${Date.now()}-${safeName}`;

    try {
      // 3. الرفع إلى S3/R2
      await this.s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: storageKey,
          Body: fileBody, // 👈 نستخدم المتغير الذي جهزناه
          ContentType: file.mimetype,
          ContentLength: fileBody.length, // مهم جداً لـ R2
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      );

      // 4. تنظيف الملف المؤقت من السيرفر (مهم جداً لتوفير المساحة)
      if (file.path) {
        try {
          await fs.unlink(file.path);
        } catch (e) {
          const err = e as Error;
          this.logger.warn(`Failed to delete temp file: ${file.path}`, err);
        }
      }
    } catch (error) {
      // حل مشكلة TypeScript هنا
      const err = error as Error;
      this.logger.error(`S3 Upload Error: ${err.message}`, err);
      throw new Error(`Upload failed: ${err.message}`);
    }

    // 5. إرجاع الرابط
    const cdn = cdnBase();
    if (cdn) {
      return `${cdn}/${storageKey}`;
    }

    return await getSignedUrl(
      this.s3,
      new GetObjectCommand({ Bucket: bucket, Key: storageKey }),
      { expiresIn: HOUR_IN_SECONDS },
    );
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
