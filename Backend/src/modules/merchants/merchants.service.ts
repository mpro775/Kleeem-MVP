// src/merchants/merchants.service.ts

import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';

import { Merchant, MerchantDocument } from './schemas/merchant.schema';
import { CreateMerchantDto } from './dto/create-merchant.dto';
import { UpdateMerchantDto } from './dto/update-merchant.dto';
import { OnboardingDto } from './dto/onboarding.dto';
import { QuickConfigDto } from './dto/quick-config.dto';
import { N8nWorkflowService } from '../n8n-workflow/n8n-workflow.service';
import { ConfigService } from '@nestjs/config';
import { PromptVersionService } from './services/prompt-version.service';
import { PromptPreviewService } from './services/prompt-preview.service';
import { PromptBuilderService } from './services/prompt-builder.service';
import { ChannelDetailsDto, ChannelsDto } from './dto/channel.dto';
import { mapToChannelConfig } from './utils/channel-mapper';
import { MerchantStatusResponse } from './types/types';
import { QuickConfig } from './schemas/quick-config.schema';
import { EvolutionService } from '../integrations/evolution.service';
import { randomUUID } from 'crypto';
import { StorefrontService } from '../storefront/storefront.service';
import { OnboardingBasicDto } from './dto/onboarding-basic.dto';
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
const normUrl = (u?: string) =>
  u && u.trim()
    ? /^https?:\/\//i.test(u)
      ? u.trim()
      : `https://${u.trim()}`
    : undefined;

@Injectable()
export class MerchantsService {
  private readonly logger = new Logger(MerchantsService.name);

  constructor(
    @InjectModel(Merchant.name)
    private readonly merchantModel: Model<MerchantDocument>,
    private readonly http: HttpService,
    private readonly config: ConfigService,
    private readonly promptBuilder: PromptBuilderService,
    private readonly versionSvc: PromptVersionService,
    private readonly evoService: EvolutionService,
    private readonly storefrontService: StorefrontService,

    private readonly previewSvc: PromptPreviewService,
    private readonly n8n: N8nWorkflowService,
  ) {}

  async create(createDto: CreateMerchantDto): Promise<MerchantDocument> {
    // 1) حوّل SubscriptionPlanDto إلى SubscriptionPlan
    const subscription = {
      tier: createDto.subscription.tier,
      startDate: new Date(createDto.subscription.startDate),
      endDate: createDto.subscription.endDate
        ? new Date(createDto.subscription.endDate)
        : undefined,
      features: createDto.subscription.features, // مصفوفة الميزات
    };

    // 2) جهّز المستند مع تزويد جميع الحقول الافتراضية
    const doc: any = {
      userId: createDto.userId,
      name: createDto.name,
      logoUrl: createDto.logoUrl ?? '',
      addresses: createDto.addresses ?? [],

      subscription,
      categories: createDto.categories ?? [],
      customCategory: createDto.customCategory ?? undefined,

      businessType: createDto.businessType,
      businessDescription: createDto.businessDescription,

      // ساعات العمل
      workingHours: createDto.workingHours ?? [],

      // القنوات تُنشأ فارغة ثم تُملأ لاحقاً
      channels: {},

      // السياسات
      returnPolicy: createDto.returnPolicy ?? '',
      exchangePolicy: createDto.exchangePolicy ?? '',
      shippingPolicy: createDto.shippingPolicy ?? '',

      // إعدادات البرومبت السريعة مع الحقول الجديدة
      quickConfig: {
        dialect: createDto.quickConfig?.dialect ?? 'خليجي',
        tone: createDto.quickConfig?.tone ?? 'ودّي',
        customInstructions: createDto.quickConfig?.customInstructions ?? [],
        sectionOrder: createDto.quickConfig?.sectionOrder ?? [
          'products',
          'policies',
          'custom',
        ],
        includeStoreUrl: createDto.quickConfig?.includeStoreUrl ?? true,
        includeAddress: createDto.quickConfig?.includeAddress ?? true,
        includePolicies: createDto.quickConfig?.includePolicies ?? true,
        includeWorkingHours: createDto.quickConfig?.includeWorkingHours ?? true,
        includeClosingPhrase:
          createDto.quickConfig?.includeClosingPhrase ?? true,
        closingText:
          createDto.quickConfig?.closingText ?? 'هل أقدر أساعدك بشي ثاني؟ 😊',
      },

      // الإعداد المتقدّم الحالي
      currentAdvancedConfig: {
        template: createDto.currentAdvancedConfig?.template ?? '',
        note: createDto.currentAdvancedConfig?.note ?? '',
        updatedAt: new Date(),
      },

      // تاريخ الإصدارات السابقة
      advancedConfigHistory: (createDto.advancedConfigHistory ?? []).map(
        (v) => ({
          template: v.template,
          note: v.note,
          updatedAt: v.updatedAt ? new Date(v.updatedAt) : new Date(),
        }),
      ),
    };

    // 3) أنشئ الميرشانت واحفظه
    const merchant = new this.merchantModel(doc);
    await merchant.save();

    try {
      // 4) أنشئ الـ workflow
      const wfId = await this.n8n.createForMerchant(merchant.id);
      merchant.workflowId = wfId;

      // 5) دمج القنوات إذا وجدت في DTO
      if (createDto.channels) {
        merchant.channels = {
          whatsapp: mapToChannelConfig(createDto.channels.whatsapp),
          telegram: mapToChannelConfig(createDto.channels.telegram),
          webchat: mapToChannelConfig(createDto.channels.webchat),
        };
      }

      // 6) أعد بناء وحفظ finalPromptTemplate
      merchant.finalPromptTemplate =
        await this.promptBuilder.compileTemplate(merchant);
      await merchant.save();

      await this.storefrontService.create({
        merchant: merchant.id,
        primaryColor: '#FF8500',
        secondaryColor: '#1976d2',
        buttonStyle: 'rounded',
        banners: [],
        featuredProductIds: [],
        slug: merchant.id.toString(),
      });
      // 7) تسجيل ويبهوك تيليجرام إن وُجد توكن
      const tgCfg = merchant.channels.telegram;
      if (tgCfg?.token) {
        const { hookUrl } = await this.registerTelegramWebhook(
          merchant.id,
          tgCfg.token,
        );
        merchant.channels.telegram = {
          ...tgCfg,
          enabled: true,
          webhookUrl: hookUrl,
        };
        await merchant.save();
      }

      return merchant;
    } catch (err) {
      // 8) في حال فشل أي خطوة فرعية، احذف الميرشانت
      await this.merchantModel.findByIdAndDelete(merchant.id).exec();
      throw new InternalServerErrorException(
        `Initialization failed: ${err.message}`,
      );
    }
  }

  /** تحديث تاجر */
  async update(id: string, dto: UpdateMerchantDto): Promise<MerchantDocument> {
    // 1) تأكد من وجود التاجر
    const existing = await this.merchantModel.findById(id).exec();
    if (!existing) {
      throw new NotFoundException('Merchant not found');
    }

    // 2) حضّر كائن التحديث بالتخلص من الحقول undefined
    const updateData: Partial<
      Omit<MerchantDocument, 'createdAt' | 'updatedAt'>
    > = {};
    for (const [key, value] of Object.entries(dto) as [
      keyof typeof dto,
      any,
    ][]) {
      if (value !== undefined) {
        // إذا كان الاشتراك، حوّل التواريخ
        if (key === 'subscription') {
          updateData.subscription = {
            ...value,
            startDate: new Date(value.startDate),
            endDate: value.endDate ? new Date(value.endDate) : undefined,
          };
        }
        // خلاف ذلك انسخ القيمة كما هي
        else {
          (updateData as any)[key] = value;
        }
      }
    }

    // 3) طبق التحديث عبر findByIdAndUpdate لتفعيل runValidators
    const updated = await this.merchantModel
      .findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true },
      )
      .exec();

    if (!updated) {
      throw new InternalServerErrorException('Failed to update merchant');
    }

    // 4) أعد بناء finalPromptTemplate بحذر
    try {
      updated.finalPromptTemplate =
        await this.promptBuilder.compileTemplate(updated);
      await updated.save();
    } catch (err) {
      this.logger.error('Error compiling prompt template after update', err);
      // لا ترمي الاستثناء، فقط سجلّ الخطأ
    }

    return updated;
  }
  /** جلب كل التجار */
  async findAll(): Promise<MerchantDocument[]> {
    return this.merchantModel.find().exec();
  }
  async updateLeadsSettings(merchantId: string, settings: any[]): Promise<any> {
    return this.merchantModel.findByIdAndUpdate(
      merchantId,
      { leadsSettings: settings },
      { new: true },
    );
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
  async findOne(id: string): Promise<MerchantDocument> {
    const merchant = await this.merchantModel.findById(id).exec();
    if (!merchant) throw new NotFoundException('Merchant not found');
    // تأكد من تحديث الـ finalPromptTemplate
    merchant.finalPromptTemplate =
      await this.promptBuilder.compileTemplate(merchant);
    return merchant;
  }

  /** حذف تاجر */
  async remove(id: string): Promise<{ message: string }> {
    const deleted = await this.merchantModel.findByIdAndDelete(id).exec();
    if (!deleted) throw new NotFoundException('Merchant not found');
    return { message: 'Merchant deleted successfully' };
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
        'channels',
        'phone',
        'socialLinks',
        'productSourceConfig.salla.storeUrl',
        'storefront', // لقراءة الـ storefront
      ])
      .lean();

    if (!m) throw new NotFoundException('Merchant not found');

    // 1) socials من map
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

    // 2) telegram
    const tg = m?.channels?.telegram?.chatId;
    if (tg) socials.telegram = `https://t.me/${String(tg).replace(/^@/, '')}`;

    // 3) whatsapp (من القناة أو الهاتف)
    const waNum = m?.channels?.whatsapp?.phone
      ? String(m.channels.whatsapp.phone)
      : m?.phone
        ? String(m.phone)
        : '';
    if (waNum) {
      const digits = waNum.replace(/\D/g, '');
      if (digits) socials.whatsapp = `https://wa.me/${digits}`;
    }

    // 4) website من سلة إذا غير موجود
    if (!socials.website && m?.productSourceConfig?.salla?.storeUrl) {
      const u = normUrl(m.productSourceConfig.salla.storeUrl);
      if (u) socials.website = u;
    }

    // 5) website من الـ Storefront (إن وُجد وكان عندك URL جاهز)
    // نحاول جلب مستند الـ storefront وإخراج رابط جاهز إن متاح
    let website: string | undefined = socials.website;
    try {
      if (!website && m.storefront) {
        const sf = await this.storefrontService.findByMerchant(merchantId); // عندك بالخدمة
        // إن كان لدى الـ storefront حقل جاهز:
        const fromDoc = (sf as any)?.storefrontUrl as string | undefined;
        if (fromDoc) website = normUrl(fromDoc);
        // أو ابنه من base + slug:
        if (!website && (sf as any)?.slug) {
          const base = this.config.get<string>('PUBLIC_STOREFRONT_BASE'); // مثلاً: https://shop.kaleem-ai.com
          if (base)
            website = `${base.replace(/\/+$/, '')}/s/${(sf as any).slug}`;
        }
      }
    } catch {
      // تجاهُل أي خطأ غير مهم هنا
    }

    // إن حصلنا website عبر storefront ولم يكن في socials، انسخه هناك أيضاً
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
      website: website || null, // ← سهل على الـ Agent
      socials, // وفيه website أيضاً لو موجود
    };
  }
  /** معاينة برومبت */
  async previewPrompt(
    id: string,
    testVars: Record<string, string>,
    useAdvanced: boolean,
  ): Promise<string> {
    const m = await this.findOne(id);
    const rawTpl =
      useAdvanced && m.currentAdvancedConfig.template
        ? m.currentAdvancedConfig.template
        : this.promptBuilder.buildFromQuickConfig(m);
    return this.previewSvc.preview(rawTpl, testVars);
  }

  /** تحديث القنوات */
  async updateChannels(
    id: string,
    channelType: string,
    channelDetails: ChannelDetailsDto,
  ): Promise<MerchantDocument> {
    const channelsDto: ChannelsDto = {
      [channelType]: channelDetails, // تحديث القناة المحددة فقط
    };
    return this.update(id, { channels: channelsDto });
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
  /** إكمال onboarding (شمل الحقول الجديدة) */
  async completeOnboarding(
    merchantId: string,
    dto: OnboardingDto,
  ): Promise<{ merchant: MerchantDocument; webhookInfo?: any }> {
    const merchant = await this.merchantModel.findById(merchantId).exec();
    if (!merchant) throw new NotFoundException('Merchant not found');

    if (!merchant.workflowId) {
      merchant.workflowId = await this.n8n.createForMerchant(merchantId);
    }

    // خريطة الحقول
    merchant.name = dto.name;
    merchant.logoUrl = dto.logoUrl;
    merchant.businessType = dto.businessType;
    merchant.businessDescription = dto.businessDescription;
    if (dto.addresses) {
      merchant.addresses = dto.addresses;
    }
    if (dto.subscription) {
      merchant.subscription = {
        ...dto.subscription,
        startDate: new Date(dto.subscription.startDate),
        endDate: dto.subscription.endDate
          ? new Date(dto.subscription.endDate)
          : undefined,
      };
    }
    if (dto.phone !== undefined) {
      merchant.phone = dto.phone;
    }
    if (dto.customCategory) merchant.customCategory = dto.customCategory;

    await merchant.save();

    let webhookInfo;
    if (dto.channels?.telegram?.token) {
      merchant.channels.telegram = {
        ...merchant.channels.telegram,
        enabled: true,
        token: dto.channels.telegram.token,
      };
      await merchant.save();
      webhookInfo = await this.registerTelegramWebhook(
        merchantId,
        dto.channels?.telegram?.token,
      );
    }

    return { merchant, webhookInfo };
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
  /** تسجيل Webhook لتليجرام */
  // merchants.service.ts
  public async registerTelegramWebhook(merchantId: string, botToken: string) {
    const m = await this.merchantModel.findById(merchantId).exec();
    if (!m) throw new BadRequestException('merchant not found');

    const hookUrl = `${this.config.get('PUBLIC_WEBHOOK_BASE')}/incoming/${merchantId}`;
    this.logger.log(`Setting Telegram webhook: ${hookUrl}`);

    try {
      await firstValueFrom(
        this.http.get(
          `https://api.telegram.org/bot${botToken}/setWebhook?url=${encodeURIComponent(hookUrl)}`,
        ),
      );
    } catch (err) {
      this.logger.error(
        `Failed to set Telegram webhook: ${err.message}`,
        err.stack,
      );
    }

    await this.merchantModel
      .findByIdAndUpdate(
        merchantId,
        { 'channels.telegram.webhookUrl': hookUrl },
        { new: true },
      )
      .exec();

    return { hookUrl };
  }

  // في merchants.service.ts
  // في merchants.service.ts
  async getStatus(id: string): Promise<MerchantStatusResponse> {
    const merchant = await this.merchantModel.findById(id).exec();
    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

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
      channels: {
        whatsapp: {
          enabled: merchant.channels.whatsapp?.enabled || false,
          connected: !!merchant.channels.whatsapp?.token,
        },
        telegram: {
          enabled: merchant.channels.telegram?.enabled || false,
          connected: !!merchant.channels.telegram?.token,
        },
        webchat: {
          enabled: merchant.channels.webchat?.enabled || false,
          connected: !!merchant.channels.webchat?.widgetSettings,
        },
      },
      lastActivity: merchant.lastActivity,
      promptStatus: {
        configured: !!merchant.finalPromptTemplate,
        lastUpdated: merchant.updatedAt,
      },
    };
  }
  // merchants.service.ts
  async connectWhatsapp(merchantId: string): Promise<{ qr: string }> {
    const merchant = await this.merchantModel.findById(merchantId);
    if (!merchant) throw new NotFoundException('Merchant not found');

    const instanceName = `whatsapp_${merchantId}`;
    const token = merchant.channels.whatsapp?.token ?? randomUUID();

    await this.evoService.deleteInstance(instanceName);

    const { qr, instanceId } = await this.evoService.startSession(
      instanceName,
      token,
    );

    const webhookUrl = `${this.config.get('PUBLIC_WEBHOOK_BASE')}/incoming/${merchantId}`;

    await this.evoService.setWebhook(
      instanceName,
      webhookUrl,
      ['MESSAGES_UPSERT'],
      true,
      true,
    );

    merchant.channels.whatsapp = {
      ...merchant.channels.whatsapp,
      enabled: true,
      sessionId: instanceName,
      instanceId,
      webhookUrl,
      qr,
      token,
      status: 'pending',
    };
    await merchant.save();

    return { qr };
  }

  async updateWhatsappWebhook(merchantId: string, newWebhookUrl: string) {
    const merchant = await this.merchantModel.findById(merchantId);
    if (!merchant || !merchant.channels.whatsapp?.sessionId)
      throw new NotFoundException('No whatsapp session');

    await this.evoService.setWebhook(
      merchant.channels.whatsapp.sessionId,
      newWebhookUrl,
      ['MESSAGES_UPSERT'],
      true,
      true,
    );

    merchant.channels.whatsapp.webhookUrl = newWebhookUrl;
    await merchant.save();
    return { ok: true };
  }
  // جلب حالة الجلسة
  async getWhatsappStatus(merchantId: string) {
    const merchant = await this.merchantModel.findById(merchantId);
    if (!merchant || !merchant.channels.whatsapp?.sessionId)
      throw new NotFoundException('No whatsapp session');

    const instanceInfo = await this.evoService.getStatus(
      merchant.channels.whatsapp.sessionId,
    );

    if (!instanceInfo) return { status: 'unknown' };

    // هنا صار كل شيء typesafe
    return {
      status: instanceInfo.status || 'unknown',
      instanceName: instanceInfo.instanceName,
      instanceId: instanceInfo.instanceId,
      integration: instanceInfo.integration,
      // أضف أي حقول أخرى تحتاجها للفرونت
    };
  }

  // إرسال رسالة (اختياري)
  async sendWhatsappMessage(merchantId: string, to: string, text: string) {
    const merchant = await this.merchantModel.findById(merchantId);
    if (!merchant || !merchant.channels.whatsapp?.sessionId)
      throw new NotFoundException('No whatsapp session');
    await this.evoService.sendMessage(
      merchant.channels.whatsapp.sessionId,
      to,
      text,
    );
    return { ok: true };
  }
}
