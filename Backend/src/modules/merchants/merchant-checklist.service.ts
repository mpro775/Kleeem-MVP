import { Injectable, Inject } from '@nestjs/common';
import { Types } from 'mongoose';
import { StorefrontService } from '../storefront/storefront.service';
import {
  ChannelProvider,
  ChannelStatus,
  ChannelDocument,
} from '../channels/schemas/channel.schema';
import {
  ChecklistGroup,
  ChecklistItem,
} from './types/merchant-checklist.service.types'; // ← ملف أنواع بسيط سنضيفه بالأسفل
import { MerchantChecklistRepository } from './repositories/merchant-checklist.repository';

@Injectable()
export class MerchantChecklistService {
  constructor(
    private readonly storefrontService: StorefrontService,
    // ✅ الاعتماد على الريبو بدل InjectModel
    @Inject('MerchantChecklistRepository')
    private readonly repo: MerchantChecklistRepository,
  ) {}

  private readonly quickDefaults = {
    dialect: 'خليجي',
    tone: 'ودّي',
    includeClosingPhrase: true,
    closingText: 'هل أقدر أساعدك بشي ثاني؟ 😊',
  };

  private isNonDefaultString(v?: string, def?: string) {
    const a = (v || '').trim();
    const b = (def || '').trim();
    return a.length > 0 && a !== b;
  }

  private inferSource(m: any): 'internal' | 'salla' | 'zid' {
    const sallaActive = !!m?.productSourceConfig?.salla?.active;
    const zidActive = !!m?.productSourceConfig?.zid?.active;
    if (zidActive) return 'zid';
    if (sallaActive) return 'salla';
    return 'internal';
  }

  private isConnected(c?: Pick<ChannelDocument, 'enabled' | 'status'> | null) {
    if (!c) return false;
    return !!c.enabled && c.status === ChannelStatus.CONNECTED;
  }

  private getPublicSlugStatus(m: any) {
    const slug = (m?.publicSlug || '').trim();
    const enabled = m?.publicSlugEnabled !== false;
    const has = slug.length >= 3;
    return { slug, has, enabled };
  }

  async getChecklist(merchantId: string): Promise<ChecklistGroup[]> {
    const m = await this.repo.findMerchantLean(merchantId);
    if (!m) return [];

    const source = this.inferSource(m);
    const skipped: string[] = Array.isArray((m as any).skippedChecklistItems)
      ? (m as any).skippedChecklistItems
      : [];

    const storefront = await this.storefrontService.findByMerchant(merchantId);

    const [productCount, categoryCount, tgCh, waQrCh, waApiCh, webCh] =
      await Promise.all([
        this.repo.countProducts(merchantId),
        this.repo.countCategories(merchantId),
        this.repo.getDefaultOrEnabledOrAnyChannel(
          merchantId,
          ChannelProvider.TELEGRAM,
        ),
        this.repo.getDefaultOrEnabledOrAnyChannel(
          merchantId,
          ChannelProvider.WHATSAPP_QR,
        ),
        this.repo.getDefaultOrEnabledOrAnyChannel(
          merchantId,
          ChannelProvider.WHATSAPP_CLOUD,
        ),
        this.repo.getDefaultOrEnabledOrAnyChannel(
          merchantId,
          ChannelProvider.WEBCHAT,
        ),
      ]);

    const slugState = this.getPublicSlugStatus(m);

    // 1) معلومات المتجر
    const storeInfo: ChecklistItem[] = [
      {
        key: 'logo',
        title: 'شعار المتجر',
        isComplete: !!(m as any).logoUrl,
        isSkipped: skipped.includes('logo'),
        message: (m as any).logoUrl ? undefined : 'ارفع شعار المتجر',
        actionPath: '/dashboard/marchinfo',
        skippable: true,
      },
      {
        key: 'address',
        title: 'عنوان المتجر',
        isComplete:
          !!(m as any).addresses?.length &&
          !!(m as any).addresses[0]?.street &&
          !!(m as any).addresses[0]?.city &&
          !!(m as any).addresses[0]?.country,
        isSkipped: skipped.includes('address'),
        message: 'اكمل حقول العنوان (الشارع، المدينة، الدولة)',
        actionPath: '/dashboard/marchinfo',
        skippable: true,
      },
      {
        key: 'publicSlug',
        title: 'السلاج الموحّد (الرابط العام)',
        isComplete: slugState.has && slugState.enabled,
        isSkipped: skipped.includes('publicSlug'),
        message: slugState.has
          ? slugState.enabled
            ? undefined
            : 'فعّل الرابط العام للسلاج'
          : 'عيِّن السلاج العام من "معلومات المتجر"',
        actionPath: '/dashboard/marchinfo',
        skippable: false,
      },
    ];

    // 2) قنوات التواصل
    const channels: ChecklistItem[] = [
      {
        key: 'channel_whatsapp_qr',
        title: 'واتساب (QR / Evolution)',
        isComplete: this.isConnected(waQrCh || undefined),
        isSkipped: skipped.includes('channel_whatsapp_qr'),
        message: this.isConnected(waQrCh || undefined)
          ? undefined
          : 'اربط جلسة Evolution وفعّل الويبهوك',
        actionPath: '/dashboard/channels',
        skippable: true,
      },
      {
        key: 'channel_whatsapp_api',
        title: 'واتساب الرسمي (Cloud API)',
        isComplete: this.isConnected(waApiCh || undefined),
        isSkipped: skipped.includes('channel_whatsapp_api'),
        message: this.isConnected(waApiCh || undefined)
          ? undefined
          : 'أدخل بيانات WABA (Access Token / Phone Number ID / App Secret)',
        actionPath: '/dashboard/channels',
        skippable: true,
      },
      {
        key: 'channel_telegram',
        title: 'تيليجرام',
        isComplete: this.isConnected(tgCh || undefined),
        isSkipped: skipped.includes('channel_telegram'),
        message: this.isConnected(tgCh || undefined)
          ? undefined
          : 'أدخل توكن البوت واضبط Webhook تلقائياً',
        actionPath: '/dashboard/channels',
        skippable: true,
      },
      {
        key: 'channel_webchat',
        title: 'الويب شات',
        isComplete: this.isConnected(webCh || undefined),
        isSkipped: skipped.includes('channel_webchat'),
        message: this.isConnected(webCh || undefined)
          ? undefined
          : 'فعّل الويب شات واستخرج كود الويدجت',
        actionPath: '/dashboard/channels',
        skippable: true,
      },
    ];

    // 3) إعدادات البرومبت
    const qc = (m as any).quickConfig || {};
    const dialectCustomized = this.isNonDefaultString(
      qc.dialect,
      this.quickDefaults.dialect,
    );
    const toneCustomized = this.isNonDefaultString(
      qc.tone,
      this.quickDefaults.tone,
    );
    const closingCustomized =
      qc.includeClosingPhrase === false ||
      this.isNonDefaultString(qc.closingText, this.quickDefaults.closingText);
    const hasCustomInstructions =
      Array.isArray(qc.customInstructions) &&
      qc.customInstructions.some((s: string) => (s || '').trim().length > 0);

    const quickConfig: ChecklistItem[] = [
      {
        key: 'quickConfig_dialect',
        title: 'اختيار اللهجة (غير الافتراضي)',
        isComplete: dialectCustomized,
        isSkipped: skipped.includes('quickConfig_dialect'),
        message: dialectCustomized
          ? undefined
          : `القيمة الافتراضية "${this.quickDefaults.dialect}" — غيّرها إن أردت`,
        actionPath: '/dashboard/prompt',
        skippable: false,
      },
      {
        key: 'quickConfig_tone',
        title: 'اختيار الأسلوب (غير الافتراضي)',
        isComplete: toneCustomized,
        isSkipped: skipped.includes('quickConfig_tone'),
        message: toneCustomized
          ? undefined
          : `القيمة الافتراضية "${this.quickDefaults.tone}" — غيّرها إن أردت`,
        actionPath: '/dashboard/prompt',
        skippable: false,
      },
      {
        key: 'quickConfig_closing',
        title: 'الرسالة الختامية',
        isComplete: closingCustomized,
        isSkipped: skipped.includes('quickConfig_closing'),
        message: closingCustomized
          ? undefined
          : 'حرّر نص الرسالة الختامية أو عطّل إضافتها.',
        actionPath: '/dashboard/prompt',
        skippable: true,
      },
      {
        key: 'quickConfig_customInstructions',
        title: 'تعليمات مخصّصة للذكاء الاصطناعي',
        isComplete: hasCustomInstructions,
        isSkipped: skipped.includes('quickConfig_customInstructions'),
        message: hasCustomInstructions
          ? undefined
          : 'أضف تعليمات مخصّصة لتحسين إجابات البوت.',
        actionPath: '/dashboard/prompt',
        skippable: true,
      },
    ];

    // 4) متفرقات
    const misc: ChecklistItem[] = [];

    if (source === 'internal') {
      // للداخلية: نستخدم إحصاءات الكاتيجوري والمنتجات
      misc.push(
        {
          key: 'categories',
          title: 'تصنيفات المتجر',
          isComplete: categoryCount > 0,
          message: 'حدد تصنيفات المنتجات',
          actionPath: '/dashboard/category',
          skippable: true,
        },
        {
          key: 'configureProducts',
          title: 'اضافة منتجات',
          isComplete: productCount > 0,
          message: productCount > 0 ? undefined : 'أضف منتجًا واحدًا على الأقل',
          actionPath: '/dashboard/products/new',
          skippable: false,
        },
        {
          key: 'banners',
          title: 'البانرات',
          isComplete: !!(storefront as any)?.banners?.length,
          message: 'أضف بانرات لمتجرك',
          actionPath: '/dashboard/banners',
          skippable: true,
        },
      );
    } else {
      misc.push({
        key: 'syncExternal',
        title: 'مزامنة المنتجات الخارجية',
        isComplete: productCount > 0,
        message:
          productCount > 0 ? undefined : 'قم بمزامنة المنتجات من المزوّد',
        actionPath: '/onboarding/sync',
        skippable: true,
      });
    }

    misc.push(
      {
        key: 'workingHours',
        title: 'مواعيد العمل',
        isComplete:
          Array.isArray((m as any).workingHours) &&
          (m as any).workingHours.every((w: any) => w.openTime && w.closeTime),
        message: 'اضبط مواعيد عمل المتجر',
        actionPath: '/dashboard/marchinfo',
        skippable: true,
      },
      {
        key: 'returnPolicy',
        title: 'سياسة الاسترجاع',
        isComplete:
          !!(m as any).returnPolicy &&
          (m as any).returnPolicy.trim().length > 0,
        message: 'أضف سياسة الاسترجاع',
        actionPath: '/dashboard/marchinfo',
        skippable: true,
      },
      {
        key: 'exchangePolicy',
        title: 'سياسة الاستبدال',
        isComplete:
          !!(m as any).exchangePolicy &&
          (m as any).exchangePolicy.trim().length > 0,
        message: 'أضف سياسة الاستبدال',
        actionPath: '/dashboard/marchinfo',
        skippable: true,
      },
      {
        key: 'shippingPolicy',
        title: 'سياسة الشحن',
        isComplete:
          !!(m as any).shippingPolicy &&
          (m as any).shippingPolicy.trim().length > 0,
        message: 'أضف سياسة الشحن',
        actionPath: '/dashboard/marchinfos', // كما كان لديك
        skippable: true,
      },
    );

    const groups: ChecklistGroup[] = [
      { key: 'storeInfo', title: 'معلومات المتجر', items: storeInfo },
      { key: 'channels', title: 'قنوات التواصل', items: channels },
      { key: 'quickConfig', title: 'إعدادات البرومبت', items: quickConfig },
      { key: 'misc', title: 'متفرقات', items: misc },
    ];

    return groups;
  }
}
