// src/merchants/merchants.service.ts

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Merchant, MerchantDocument } from './schemas/merchant.schema';
import { CreateMerchantDto } from './dto/create-merchant.dto';
import { UpdateMerchantDto } from './dto/update-merchant.dto';
import { QuickConfigDto } from './dto/quick-config.dto';
import { N8nWorkflowService } from '../n8n-workflow/n8n-workflow.service';
import { ConfigService } from '@nestjs/config';
import { PromptVersionService } from './services/prompt-version.service';
import { PromptPreviewService } from './services/prompt-preview.service';
import { PromptBuilderService } from './services/prompt-builder.service';
import { MerchantStatusResponse } from './types/types';
import { QuickConfig } from './schemas/quick-config.schema';
import { OnboardingBasicDto } from './dto/onboarding-basic.dto';
import { BusinessMetrics } from 'src/metrics/business.metrics';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Client as MinioClient } from 'minio';
import { unlink } from 'fs/promises';
import { buildHbsContext, stripGuardSections } from './services/prompt-utils';
import { PreviewPromptDto } from './dto/preview-prompt.dto';
import { StorefrontService } from '../storefront/storefront.service';
import { ChatWidgetService } from '../chat/chat-widget.service';
import { CleanupCoordinatorService } from './cleanup-coordinator.service';
import { PlanTier } from './schemas/subscription-plan.schema';

function toRecord(input: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (input instanceof Map) {
    for (const [key, value] of input as Map<unknown, unknown>) {
      if (typeof value !== 'string') continue;
      if (typeof key === 'string') out[key] = value;
      else if (typeof key === 'number') out[String(key)] = value;
    }
    return out;
  }
  if (typeof input === 'object' && input !== null && !Array.isArray(input)) {
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      if (typeof v === 'string') out[k] = v;
    }
  }
  return out;
}
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
const normUrl = (u?: string) =>
  u && u.trim()
    ? /^https?:\/\//i.test(u)
      ? u.trim()
      : `https://${u.trim()}`
    : undefined;

@Injectable()
export class MerchantsService {
  private readonly logger = new Logger(MerchantsService.name);
  public minio: MinioClient;

  constructor(
    @InjectModel(Merchant.name)
    private readonly merchantModel: Model<MerchantDocument>,
    private readonly config: ConfigService,
    private readonly promptBuilder: PromptBuilderService,
    private readonly versionSvc: PromptVersionService,
    private readonly storefrontService: StorefrontService,
    private readonly previewSvc: PromptPreviewService,
    private readonly cleanupCoordinator: CleanupCoordinatorService,
    private readonly n8n: N8nWorkflowService,
    private readonly businessMetrics: BusinessMetrics,
    private readonly chatWidgetService: ChatWidgetService,
  ) {
    this.minio = new MinioClient({
      endPoint: process.env.MINIO_ENDPOINT!,
      port: parseInt(process.env.MINIO_PORT ?? '9000', 10),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY!,
      secretKey: process.env.MINIO_SECRET_KEY!,
    });
  }

  async create(createDto: CreateMerchantDto): Promise<MerchantDocument> {
    const subscription = {
      tier: createDto.subscription.tier,
      startDate: new Date(createDto.subscription.startDate),
      endDate: createDto.subscription.endDate
        ? new Date(createDto.subscription.endDate)
        : undefined,
      features: createDto.subscription.features,
    };

    const doc: Partial<MerchantDocument> = {
      userId: createDto.userId,
      name: createDto.name,
      logoUrl: createDto.logoUrl ?? '',
      addresses: createDto.addresses ?? [],
      subscription,
      categories: createDto.categories ?? [],
      customCategory: createDto.customCategory ?? undefined,
      businessType: createDto.businessType,
      businessDescription: createDto.businessDescription,
      workingHours: createDto.workingHours ?? [],
      returnPolicy: createDto.returnPolicy ?? '',
      exchangePolicy: createDto.exchangePolicy ?? '',
      shippingPolicy: createDto.shippingPolicy ?? '',
      quickConfig: {
        dialect: createDto.quickConfig?.dialect ?? 'خليجي',
        tone: createDto.quickConfig?.tone ?? 'ودّي',
        customInstructions: createDto.quickConfig?.customInstructions ?? [],
        includeClosingPhrase:
          createDto.quickConfig?.includeClosingPhrase ?? true,
        customerServicePhone: createDto.quickConfig?.customerServicePhone ?? '',
        customerServiceWhatsapp:
          createDto.quickConfig?.customerServiceWhatsapp ?? '',
        closingText:
          createDto.quickConfig?.closingText ?? 'هل أقدر أساعدك بشي ثاني؟ 😊',
      },
      currentAdvancedConfig: {
        template: createDto.currentAdvancedConfig?.template ?? '',
        note: createDto.currentAdvancedConfig?.note ?? '',
        updatedAt: new Date(),
      },
      advancedConfigHistory: (createDto.advancedConfigHistory ?? []).map(
        (v) => ({
          template: v.template,
          note: v.note,
          updatedAt: v.updatedAt ? new Date(v.updatedAt) : new Date(),
        }),
      ),
    } as any;

    const merchant = new this.merchantModel(doc);
    await merchant.save();

    this.businessMetrics.incMerchantCreated();
    this.businessMetrics.incN8nWorkflowCreated();

    let wfId: string | null = null;
    let storefrontCreated = false;

    try {
      // n8n فقط
      wfId = await this.n8n.createForMerchant(merchant.id);
      merchant.workflowId = wfId;

      // ابنِ الـ prompt واحفظ
      merchant.finalPromptTemplate =
        await this.promptBuilder.compileTemplate(merchant);
      await merchant.save();

      // Storefront
      await this.storefrontService.create({
        merchant: merchant.id,
        primaryColor: '#FF8500',
        secondaryColor: '#1976d2',
        buttonStyle: 'rounded',
        banners: [],
        featuredProductIds: [],
        slug: merchant.id.toString(),
      });
      storefrontCreated = true;

      return merchant;
    } catch (err: any) {
      // Rollback خارجي فقط (n8n, storefront). لا شيء مرتبط بالقنوات هنا
      try {
        if (wfId) {
          try {
            await this.n8n.setActive(wfId, false);
          } catch {}
          try {
            await this.n8n.delete(wfId);
          } catch {}
        }
        if (storefrontCreated) {
          try {
            await this.storefrontService.deleteByMerchant(merchant.id);
          } catch {}
        }
      } finally {
        await this.merchantModel.findByIdAndDelete(merchant.id).exec();
      }
      throw new InternalServerErrorException(
        `Initialization failed: ${err?.message || 'unknown'}`,
      );
    }
  }
  async existsByPublicSlug(slug: string, excludeId?: string) {
    const q: any = { publicSlug: slug };
    if (excludeId && Types.ObjectId.isValid(excludeId))
      q._id = { $ne: excludeId };
    return !!(await this.merchantModel.exists(q));
  }
  /** تحديث تاجر */
  async update(id: string, dto: UpdateMerchantDto): Promise<MerchantDocument> {
    const existing = await this.merchantModel.findById(id).exec();
    if (!existing) throw new NotFoundException('Merchant not found');

    if ('publicSlug' in dto) {
      const raw = (dto.publicSlug ?? '').trim().toLowerCase();
      if (!raw) {
        delete (dto as any).publicSlug; // ← لا تحدّثها بقيمة فاضية
      } else {
        const normalized = normalizeSlug(raw);
        if (!SLUG_RE.test(normalized))
          throw new BadRequestException('سلاج غير صالح');
        const taken = await this.existsByPublicSlug(normalized, id);
        if (taken) throw new BadRequestException('السلاج محجوز');
        (dto as any).publicSlug = normalized;
      }
    }

    // حضّر updateData بدون undefined
    const updateData: Record<string, any> = {};
    for (const [k, v] of Object.entries(dto)) {
      if (v !== undefined) {
        if (k === 'subscription' && v) {
          updateData.subscription = {
            ...v,
            startDate: v.startDate ? new Date(v.startDate) : undefined,
            endDate: v.endDate ? new Date(v.endDate) : undefined,
          };
        } else {
          updateData[k] = v;
        }
      }
    }

    // طبّق التحديث
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
    if (updateData.publicSlug) {
      await this.chatWidgetService.syncWidgetSlug(id, updateData.publicSlug);
    }

    // حدّث finalPromptTemplate بدون تشغيل validate (حتى لا يعبث pre('validate') بالسلاج)
    try {
      const compiled = await this.promptBuilder.compileTemplate(updated);
      updated.set('finalPromptTemplate', compiled);
      await updated.save();
    } catch (e) {
      this.logger.error('Error compiling prompt template after update', e);
    }

    return updated;
  }
  private async buildLogoUrl(key: string): Promise<string> {
    const cdn = (
      process.env.ASSETS_CDN_BASE_URL ||
      process.env.MINIO_PUBLIC_URL ||
      ''
    ).replace(/\/+$/, '');

    if (cdn) {
      return `${cdn}/${process.env.MINIO_BUCKET}/${key}`;
    }

    // fallback: presigned URL
    return await this.minio.presignedGetObject(
      process.env.MINIO_BUCKET!,
      key,
      3600,
    );
  }

  private async ensureBucket(bucket: string) {
    try {
      const exists = await this.minio.bucketExists(bucket);
      if (!exists) {
        await this.minio.makeBucket(
          bucket,
          process.env.MINIO_REGION || 'us-east-1',
        );
        this.logger.log(`Created MinIO bucket: ${bucket}`);
      }
    } catch (e) {
      this.logger.error(`MinIO bucket check/creation failed for ${bucket}`, e);
      throw new InternalServerErrorException('STORAGE_INIT_FAILED');
    }
  }
  async previewPromptV2(id: string, dto: PreviewPromptDto): Promise<string> {
    const m = await this.findOne(id);
    const merged = m.toObject ? m.toObject() : m;

    // دمج quickConfig مؤقتًا (إن وُجد) للمعاينة فقط
    if (dto.quickConfig && Object.keys(dto.quickConfig).length) {
      merged.quickConfig = { ...merged.quickConfig, ...dto.quickConfig };
    }

    const ctx = buildHbsContext(merged, dto.testVars ?? {});
    const audience = dto.audience ?? 'merchant';

    if (audience === 'agent') {
      // Final بالحارس (لا نعرضه في لوحة التاجر عادةً)
      const withGuard = await this.promptBuilder.compileTemplate(merged);
      return Handlebars.compile(withGuard)(ctx);
    }

    // merchant: Final بدون الحارس
    const withGuard = await this.promptBuilder.compileTemplate(merged);
    const noGuard = stripGuardSections(withGuard);
    return Handlebars.compile(noGuard)(ctx);
  }
  async uploadLogoToMinio(
    merchantId: string,
    file: Express.Multer.File,
  ): Promise<string> {
    const merchant = await this.merchantModel.findById(merchantId).exec();
    if (!merchant) throw new NotFoundException('التاجر غير موجود');

    const bucket = process.env.MINIO_BUCKET!;
    await this.ensureBucket(bucket);

    const ext = this.extFromMime(file.mimetype);
    const key = `merchants/${merchantId}/logo-${Date.now()}.${ext}`;

    this.logger.log(`Uploading merchant logo to MinIO: ${bucket}/${key}`);

    try {
      // لو multer memoryStorage:
      if (file.buffer) {
        await this.minio.putObject(bucket, key, file.buffer, file.size, {
          'Content-Type': file.mimetype,
        });
      } else if (file.path) {
        await this.minio.fPutObject(bucket, key, file.path, {
          'Content-Type': file.mimetype,
        });
      } else {
        throw new Error('Empty file');
      }

      // خزّن المفتاح في قاعدة البيانات
      merchant.logoKey = key;
      merchant.logoUrl = await this.buildLogoUrl(key); // 👈 خزّنه كمان للعرض
      await merchant.save();

      this.logger.log(`Logo uploaded. key=${key} url=${merchant.logoUrl}`);

      return merchant.logoUrl!;
    } catch (e) {
      this.logger.error('MinIO upload failed', e);
      throw new InternalServerErrorException('STORAGE_UPLOAD_FAILED');
    } finally {
      // احذف الملف لو multer diskStorage
      if (file.path) {
        try {
          await unlink(file.path);
        } catch {}
      }
    }
  }

  /** جلب كل التجار */
  async findAll(): Promise<MerchantDocument[]> {
    return this.merchantModel.find().exec();
  }

  async saveBasicInfo(
    merchantId: string,
    dto: OnboardingBasicDto,
  ): Promise<MerchantDocument> {
    const m = await this.merchantModel.findById(merchantId).exec();
    if (!m) throw new NotFoundException('Merchant not found');

    m.name = dto.name ?? m.name;
    m.logoUrl = dto.logoUrl ?? m.logoUrl;
    m.businessType = dto.businessType ?? m.businessType;
    m.businessDescription = dto.businessDescription ?? m.businessDescription;
    if (dto.phone !== undefined) m.phone = dto.phone;
    if (dto.categories) m.categories = dto.categories;
    if (dto.customCategory) m.customCategory = dto.customCategory;
    if (dto.addresses) m.addresses = dto.addresses;

    await m.save();

    // (اختياري) أعِد بناء prompt بعد اكتمال الأساسيات
    try {
      m.finalPromptTemplate = await this.promptBuilder.compileTemplate(m);
      await m.save();
    } catch {
      this.logger.warn('Prompt compile skipped after basic info');
    }

    return m;
  }
  /** جلب تاجر واحد */
  async findOne(id: string): Promise<MerchantDocument & { logoUrl?: string }> {
    const merchant = await this.merchantModel.findById(id).exec();
    if (!merchant) throw new NotFoundException('Merchant not found');

    merchant.finalPromptTemplate =
      await this.promptBuilder.compileTemplate(merchant);

    // توليد رابط الشعار من logoKey
    const url = await this.buildLogoUrl(merchant.logoKey ?? '');
    // نُضيف حقلًا عابرًا (لن يُحفظ بالـ DB)
    (merchant as any).logoUrl = url;

    return merchant as any;
  }

  private extFromMime(m: string): string {
    if (m === 'image/png') return 'png';
    if (m === 'image/jpeg') return 'jpg';
    if (m === 'image/webp') return 'webp';
    return 'bin';
  }
  async uploadLogo(id: string, file: Express.Multer.File): Promise<string> {
    const merchant = await this.merchantModel.findById(id).exec();
    if (!merchant) throw new NotFoundException('التاجر غير موجود');

    // حفظ محليًا داخل public/uploads/merchants/:id
    const uploadDir = path.join(
      process.cwd(),
      'public',
      'uploads',
      'merchants',
      id,
    );
    await fs.mkdir(uploadDir, { recursive: true });

    const ext = this.extFromMime(file.mimetype);
    const filename = `logo-${Date.now()}.${ext}`;
    const full = path.join(uploadDir, filename);
    await fs.writeFile(full, file.buffer);

    // حدّد الـ Base URL (بيئة) — إن عندك CDN استخدمه
    const base = process.env.CDN_BASE_URL || process.env.APP_BASE_URL || '';

    const publicPath = `/uploads/merchants/${id}/${filename}`;
    const url = base ? `${base}${publicPath}` : publicPath;

    merchant.logoUrl = url;
    await merchant.save();

    return url;
  }
  /** حذف تاجر */
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

    // صلاحيات: أدمن أو مالك التاجر
    // (لو عندك ربط user.merchantId == id)
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

    // تعطيل سريع داخلي (اختياري): إيقاف وصول مستخدمي التاجر، إبطال مفاتيح API...
    // await this.disableAccessForMerchantUsers(id);

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
    merchant.deletion = {
      ...(merchant.deletion || {}),
      requestedAt: undefined,
      requestedBy: undefined,
      reason: undefined,
    };
    await merchant.save();

    // إعادة التمكين (اختياري): إعادة فتح الوصول/المفاتيح...
    return { message: 'Merchant restored' };
  }

  /** الحذف الإجباري + تنظيف كامل ثم حذف المستند */
  async purge(id: string, actor: { userId: string; role: string }) {
    const merchant = await this.merchantModel.findById(id);
    if (!merchant) throw new NotFoundException('Merchant not found');

    if (actor.role !== 'ADMIN') {
      throw new ForbiddenException('الحذف الإجباري للمشرفين فقط');
    }

    // تشغيل التنظيف الكامل (خارجي + داخلي)
    await this.cleanupCoordinator.purgeAll(id);

    // تحديث بيانات الحذف (توثيق)
    merchant.deletion = {
      ...(merchant.deletion || {}),
      forcedAt: new Date(),
      forcedBy: new Types.ObjectId(actor.userId),
    };
    await merchant.save();

    // حذف صلب بعد التنظيف
    await this.merchantModel.findByIdAndDelete(id).exec();

    return { message: 'Merchant permanently deleted' };
  }
  /** تحقق من نشاط الاشتراك */
  async isSubscriptionActive(id: string): Promise<boolean> {
    const m = await this.findOne(id);
    // إذا لم يُحدد endDate => اشتراك دائم
    if (!m.subscription.endDate) return true;
    return m.subscription.endDate.getTime() > Date.now();
  }

  /** إعادة بناء وحفظ finalPromptTemplate */
  async buildFinalPrompt(id: string): Promise<string> {
    const m = await this.merchantModel.findById(id).exec();
    if (!m) throw new NotFoundException('Merchant not found');
    const tpl = await this.promptBuilder.compileTemplate(m);
    m.finalPromptTemplate = tpl;
    await m.save();
    return tpl;
  }

  /** حفظ نسخة متقدمة جديدة */
  async saveAdvancedVersion(
    id: string,
    newTpl: string,
    note?: string,
  ): Promise<void> {
    await this.versionSvc.snapshot(id, note);
    const m = await this.findOne(id);
    m.currentAdvancedConfig.template = newTpl;
    await m.save();
  }

  /** قائمة النسخ المتقدمة */
  async listAdvancedVersions(id: string): Promise<unknown> {
    return this.versionSvc.list(id);
  }
  /** استرجاع نسخة متقدمة */
  async revertAdvancedVersion(id: string, index: number): Promise<void> {
    await this.versionSvc.revert(id, index);
  }

  /** تحديث الإعداد السريع */
  async updateQuickConfig(
    id: string,
    dto: QuickConfigDto,
  ): Promise<QuickConfig> {
    // جهّز partial التحديث
    const partial: Partial<QuickConfig> = { ...dto };
    Object.keys(partial).forEach(
      (k) =>
        partial[k as keyof QuickConfig] === undefined &&
        delete partial[k as keyof QuickConfig],
    );

    // حدِّث quickConfig وأرجع المستند المحدث من النوع MerchantDocument
    const updatedDoc = await this.merchantModel
      .findByIdAndUpdate<MerchantDocument>(
        id,
        { $set: { quickConfig: partial } },
        { new: true, runValidators: true },
      )
      .select([
        'quickConfig',
        'categories',
        'addresses',
        'workingHours',
        'returnPolicy',
        'exchangePolicy',
        'shippingPolicy',
        'name',
        'currentAdvancedConfig.template',
      ])
      .exec();

    if (!updatedDoc) {
      throw new NotFoundException('Merchant not found');
    }

    // أعد بناء finalPromptTemplate
    const newPrompt = await this.promptBuilder.compileTemplate(updatedDoc);

    await this.merchantModel
      .findByIdAndUpdate(id, { $set: { finalPromptTemplate: newPrompt } })
      .exec();

    // الآن updatedDoc.quickConfig مُعرّفة من MerchantDocument
    return updatedDoc.quickConfig;
  }

  async getStoreContext(merchantId: string) {
    const m = await this.merchantModel
      .findById(merchantId)
      .select([
        'addresses',
        'workingHours',
        'returnPolicy',
        'exchangePolicy',
        'shippingPolicy',
        'phone',
        'socialLinks',
        'productSourceConfig.salla.storeUrl',
        'storefront',
      ])
      .lean();

    if (!m) throw new NotFoundException('Merchant not found');

    const raw = toRecord((m as any).socialLinks);
    const socials: Record<string, string> = {};
    const SIMPLE = [
      'facebook',
      'twitter',
      'instagram',
      'linkedin',
      'youtube',
      'website',
    ];
    for (const key of SIMPLE) {
      const v = normUrl(raw[key]);
      if (v) socials[key] = v;
    }

    // ❌ تيليجرام من القنوات — احذفه هنا
    // ✅ واتساب من رقم التاجر كـ fallback
    const waNum = m?.phone ? String(m.phone) : '';
    if (waNum) {
      const digits = waNum.replace(/\D/g, '');
      if (digits) socials.whatsapp = `https://wa.me/${digits}`;
    }

    if (!socials.website && m?.productSourceConfig?.salla?.storeUrl) {
      const u = normUrl(m.productSourceConfig.salla.storeUrl);
      if (u) socials.website = u;
    }

    let website: string | undefined = socials.website;
    try {
      if (!website && m.storefront) {
        const sf = await this.storefrontService.findByMerchant(merchantId);
        const fromDoc = (sf as any)?.storefrontUrl as string | undefined;
        if (fromDoc) website = normUrl(fromDoc);
        if (!website && (sf as any)?.slug) {
          const base = this.config.get<string>('PUBLIC_STOREFRONT_BASE');
          if (base)
            website = `${base.replace(/\/+$/, '')}/s/${(sf as any).slug}`;
        }
      }
    } catch {}

    if (website && !socials.website) socials.website = website;

    return {
      merchantId,
      addresses: m.addresses ?? [],
      workingHours: m.workingHours ?? [],
      policies: {
        returnPolicy: m.returnPolicy || '',
        exchangePolicy: m.exchangePolicy || '',
        shippingPolicy: m.shippingPolicy || '',
      },
      website: website || null,
      socials,
    };
  }

  /** معاينة برومبت */
  async previewPrompt(
    id: string,
    testVars: Record<string, string>,
    useAdvanced: boolean,
    quickOverride?: Partial<QuickConfig>, // ← جديد اختياري
  ): Promise<string> {
    const m = await this.findOne(id);

    // إن أرسلت quickOverride ندمجه مؤقتًا للمعاينة
    const mergedMerchant = m.toObject ? m.toObject() : m;
    if (quickOverride && Object.keys(quickOverride).length) {
      mergedMerchant.quickConfig = {
        ...mergedMerchant.quickConfig,
        ...quickOverride,
      };
    }

    const rawTpl =
      useAdvanced && mergedMerchant.currentAdvancedConfig?.template
        ? mergedMerchant.currentAdvancedConfig.template
        : this.promptBuilder.buildFromQuickConfig(
            mergedMerchant as MerchantDocument,
          );

    return this.previewSvc.preview(rawTpl, testVars);
  }

  async ensureWorkflow(merchantId: string): Promise<string> {
    const m = await this.merchantModel
      .findById(merchantId)
      .select('workflowId')
      .exec();
    if (!m) throw new NotFoundException('Merchant not found');
    if (m.workflowId) return String(m.workflowId);
    const wfId = await this.n8n.createForMerchant(merchantId);
    await this.merchantModel
      .updateOne({ _id: merchantId }, { $set: { workflowId: wfId } })
      .exec();
    return wfId;
  }

  async setProductSource(id: string, source: 'internal' | 'salla' | 'zid') {
    const m = await this.merchantModel.findById(id);
    if (!m) throw new NotFoundException('Merchant not found');

    m.productSource = source as any;
    m.productSourceConfig = m.productSourceConfig || {};

    if (source === 'internal') {
      m.productSourceConfig.internal = { enabled: true };
      // عطّل الباقي
      if (m.productSourceConfig.salla)
        m.productSourceConfig.salla.active = false;
      if (m.productSourceConfig.zid) m.productSourceConfig.zid.active = false;
    } else if (source === 'salla') {
      m.productSourceConfig.internal = { enabled: false };
      m.productSourceConfig.salla = {
        ...(m.productSourceConfig.salla || {}),
        active: true,
      };
    } else {
      m.productSourceConfig.internal = { enabled: false };
      m.productSourceConfig.zid = {
        ...(m.productSourceConfig.zid || {}),
        active: true,
      };
    }

    await m.save();
    return m;
  }
  // في merchants.service.ts
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

  async getAdvancedTemplateForEditor(
    id: string,
    testVars: Record<string, string> = {},
  ) {
    const m = await this.findOne(id);

    const current = m.currentAdvancedConfig?.template?.trim() ?? '';
    if (current) {
      return { template: current, note: m.currentAdvancedConfig?.note ?? '' };
    }

    // لا يوجد قالب متقدّم → نبني اقتراح من Final بدون الحارس
    const finalWithGuard = await this.promptBuilder.compileTemplate(m);
    const noGuard = stripGuardSections(finalWithGuard);

    // نمرّره على Handlebars لتعبئة المتغيرات (إن وجدت)
    const filled = Handlebars.compile(noGuard)(buildHbsContext(m, testVars));

    return { template: filled, note: 'Generated from final (no guard)' };
  }
  // MerchantsService
  async ensureForUser(
    userId: Types.ObjectId,
    opts?: { name?: string; slugBase?: string },
  ) {
    const existing = await this.merchantModel.findOne({ userId }).exec();
    if (existing) return existing;

    // جهّز CreateMerchantDto بالحد الأدنى + الافتراضيات
    const now = new Date();
    const name = opts?.name || 'متجر جديد';
    const publicSlug = opts?.slugBase || `m-${String(userId)}`; // ثابت ومميز

    const dto: CreateMerchantDto = {
      userId,
      name,
      logoUrl: '',
      addresses: [],
      subscription: {
        tier: PlanTier.Free,
        startDate: now.toISOString(),
        endDate: undefined,
        features: [
          'basic_support',
          'chat_bot',
          'analytics',
          'multi_channel',
          'api_access',
          'webhook_integration',
        ],
      },
      categories: [],
      customCategory: undefined,
      businessType: 'general',
      businessDescription: '',
      workingHours: [],
      returnPolicy: '',
      exchangePolicy: '',
      shippingPolicy: '',
      quickConfig: {
        dialect: 'خليجي',
        tone: 'ودّي',
        customInstructions: [],
        includeClosingPhrase: true,
        customerServicePhone: '',
        customerServiceWhatsapp: '',
        closingText: 'هل أقدر أساعدك بشي ثاني؟ 😊',
      },
      currentAdvancedConfig: {
        template: '',
        note: '',
        updatedAt: now.toISOString(),
      },
      advancedConfigHistory: [],
      // 👇 أضف هذا الحقل إن لم يكن موجودًا ضمن CreateMerchantDto
      // أو اجعله يُولد داخل MerchantsService.create إذا لم يُمرَّر
      publicSlug,
      // .. بقية الافتراضيات (subscription/quickConfig/..)
    } as any;

    // هذه الدالة تبني: merchant + n8n workflow + finalPrompt + storefront
    return this.create(dto);
  }
}
