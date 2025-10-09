// src/modules/merchants/services/merchant-checklist.service.ts
import { Inject, Injectable } from '@nestjs/common';

import {
  ChannelProvider,
  ChannelStatus,
} from '../channels/schemas/channel.schema';
import { StorefrontService } from '../storefront/storefront.service';

import { MerchantChecklistRepository } from './repositories/merchant-checklist.repository';
import {
  ACTION_PATHS,
  CHECK_KEYS,
  ChecklistGroup,
  ChecklistItem,
  hasNonEmptyString,
} from './types/merchant-checklist.types';
import {
  MinimalChannel,
  MinimalMerchant,
  ProductSource,
} from './types/merchant-checklist.types';

/** ثوابت المعاني لتجنّب الأرقام/النصوص السحرية */
const MIN_SLUG_LENGTH = 3 as const;
const QUICK_DEFAULTS = {
  dialect: 'خليجي',
  tone: 'ودّي',
  includeClosingPhrase: true,
  closingText: 'هل أقدر أساعدك بشي ثاني؟ 😊',
} as const;

type CountsAndChannels = {
  productCount: number;
  categoryCount: number;
  tgCh: MinimalChannel | null;
  waQrCh: MinimalChannel | null;
  waApiCh: MinimalChannel | null;
  webCh: MinimalChannel | null;
};

function isConnected(c?: MinimalChannel | null): boolean {
  return Boolean(c?.enabled) && c?.status === ChannelStatus.CONNECTED;
}

function inferSource(m: MinimalMerchant): ProductSource {
  const sallaActive = Boolean(m.productSourceConfig?.salla?.active);
  const zidActive = Boolean(m.productSourceConfig?.zid?.active);
  if (zidActive) return 'zid';
  if (sallaActive) return 'salla';
  return 'internal';
}

function getPublicSlugStatus(m: MinimalMerchant): {
  slug: string;
  has: boolean;
  enabled: boolean;
} {
  const slug = (m.publicSlug ?? '').trim();
  const enabled = m.publicSlugEnabled !== false;
  const has = slug.length >= MIN_SLUG_LENGTH;
  return { slug, has, enabled };
}

function isNonDefaultString(v: string | undefined, def: string): boolean {
  const a = (v ?? '').trim();
  const b = (def ?? '').trim();
  return a.length > 0 && a !== b;
}

function getStorefrontBannersCount(storefront: unknown): number {
  if (
    storefront &&
    typeof storefront === 'object' &&
    'banners' in storefront &&
    Array.isArray((storefront as { banners: unknown }).banners)
  ) {
    return (storefront as { banners: unknown[] }).banners.length;
  }
  return 0;
}

function hasValidAddress(m: MinimalMerchant): boolean {
  if (!Array.isArray(m.addresses) || m.addresses.length === 0) return false;
  const a = m.addresses[0];
  return (
    hasNonEmptyString(a?.street) &&
    hasNonEmptyString(a?.city) &&
    hasNonEmptyString(a?.country)
  );
}

/** يبني عناصر "معلومات المتجر" */
function buildStoreInfo(
  m: MinimalMerchant,
  skipped: readonly string[],
): ChecklistItem[] {
  const slugState = getPublicSlugStatus(m);

  return [
    (() => {
      const item: ChecklistItem = {
        key: CHECK_KEYS.logo,
        title: 'شعار المتجر',
        isComplete: hasNonEmptyString(m.logoUrl),
        isSkipped: skipped.includes(CHECK_KEYS.logo),
        actionPath: ACTION_PATHS.merchantInfo,
        skippable: true,
      };
      if (!hasNonEmptyString(m.logoUrl)) {
        item.message = 'ارفع شعار المتجر';
      }
      return item;
    })(),
    (() => {
      const item: ChecklistItem = {
        key: CHECK_KEYS.address,
        title: 'عنوان المتجر',
        isComplete: hasValidAddress(m),
        isSkipped: skipped.includes(CHECK_KEYS.address),
        actionPath: ACTION_PATHS.merchantInfo,
        skippable: true,
        message: 'اكمل حقول العنوان (الشارع، المدينة، الدولة)',
      };
      return item;
    })(),
    (() => {
      const item: ChecklistItem = {
        key: CHECK_KEYS.publicSlug,
        title: 'السلاج الموحّد (الرابط العام)',
        isComplete: slugState.has && slugState.enabled,
        isSkipped: skipped.includes(CHECK_KEYS.publicSlug),
        actionPath: ACTION_PATHS.merchantInfo,
        skippable: false,
      };
      if (!slugState.has) {
        item.message = 'عيِّن السلاج العام من "معلومات المتجر"';
      } else if (!slugState.enabled) {
        item.message = 'فعّل الرابط العام للسلاج';
      }
      return item;
    })(),
  ];
}

/** يبني عناصر "القنوات" */
function buildChannels(
  channels: Pick<CountsAndChannels, 'tgCh' | 'waQrCh' | 'waApiCh' | 'webCh'>,
  skipped: readonly string[],
): ChecklistItem[] {
  const { tgCh, waQrCh, waApiCh, webCh } = channels;
  return [
    (() => {
      const item: ChecklistItem = {
        key: CHECK_KEYS.channelWhatsappQr,
        title: 'واتساب (QR / Evolution)',
        isComplete: isConnected(waQrCh),
        isSkipped: skipped.includes(CHECK_KEYS.channelWhatsappQr),
        actionPath: ACTION_PATHS.channels,
        skippable: true,
      };
      if (!isConnected(waQrCh)) {
        item.message = 'اربط جلسة Evolution وفعّل الويبهوك';
      }
      return item;
    })(),
    (() => {
      const item: ChecklistItem = {
        key: CHECK_KEYS.channelWhatsappApi,
        title: 'واتساب الرسمي (Cloud API)',
        isComplete: isConnected(waApiCh),
        isSkipped: skipped.includes(CHECK_KEYS.channelWhatsappApi),
        actionPath: ACTION_PATHS.channels,
        skippable: true,
      };
      if (!isConnected(waApiCh)) {
        item.message =
          'أدخل بيانات WABA (Access Token / Phone Number ID / App Secret)';
      }
      return item;
    })(),
    (() => {
      const item: ChecklistItem = {
        key: CHECK_KEYS.channelTelegram,
        title: 'تيليجرام',
        isComplete: isConnected(tgCh),
        isSkipped: skipped.includes(CHECK_KEYS.channelTelegram),
        actionPath: ACTION_PATHS.channels,
        skippable: true,
      };
      if (!isConnected(tgCh)) {
        item.message = 'أدخل توكن البوت واضبط Webhook تلقائياً';
      }
      return item;
    })(),
    (() => {
      const item: ChecklistItem = {
        key: CHECK_KEYS.channelWebchat,
        title: 'الويب شات',
        isComplete: isConnected(webCh),
        isSkipped: skipped.includes(CHECK_KEYS.channelWebchat),
        actionPath: ACTION_PATHS.channels,
        skippable: true,
      };
      if (!isConnected(webCh)) {
        item.message = 'فعّل الويب شات واستخرج كود الويدجت';
      }
      return item;
    })(),
  ];
}

/** يبني عناصر "إعدادات البرومبت" */
function buildQuickConfig(
  m: MinimalMerchant,
  skipped: readonly string[],
): ChecklistItem[] {
  const qc = m.quickConfig ?? {};
  const dialectCustomized = isNonDefaultString(
    qc.dialect,
    QUICK_DEFAULTS.dialect,
  );
  const toneCustomized = isNonDefaultString(qc.tone, QUICK_DEFAULTS.tone);
  const closingCustomized =
    qc.includeClosingPhrase === false ||
    isNonDefaultString(qc.closingText, QUICK_DEFAULTS.closingText);
  const hasCustomInstructions =
    Array.isArray(qc.customInstructions) &&
    qc.customInstructions.some((s) => hasNonEmptyString(s));

  return [
    (() => {
      const item: ChecklistItem = {
        key: CHECK_KEYS.quickDialect,
        title: 'اختيار اللهجة (غير الافتراضي)',
        isComplete: dialectCustomized,
        isSkipped: skipped.includes(CHECK_KEYS.quickDialect),
        actionPath: ACTION_PATHS.prompt,
        skippable: false,
      };
      if (!dialectCustomized) {
        item.message = `القيمة الافتراضية "${QUICK_DEFAULTS.dialect}" — غيّرها إن أردت`;
      }
      return item;
    })(),
    (() => {
      const item: ChecklistItem = {
        key: CHECK_KEYS.quickTone,
        title: 'اختيار الأسلوب (غير الافتراضي)',
        isComplete: toneCustomized,
        isSkipped: skipped.includes(CHECK_KEYS.quickTone),
        actionPath: ACTION_PATHS.prompt,
        skippable: false,
      };
      if (!toneCustomized) {
        item.message = `القيمة الافتراضية "${QUICK_DEFAULTS.tone}" — غيّرها إن أردت`;
      }
      return item;
    })(),
    (() => {
      const item: ChecklistItem = {
        key: CHECK_KEYS.quickClosing,
        title: 'الرسالة الختامية',
        isComplete: closingCustomized,
        isSkipped: skipped.includes(CHECK_KEYS.quickClosing),
        actionPath: ACTION_PATHS.prompt,
        skippable: true,
      };
      if (!closingCustomized) {
        item.message = 'حرّر نص الرسالة الختامية أو عطّل إضافتها.';
      }
      return item;
    })(),
    (() => {
      const item: ChecklistItem = {
        key: CHECK_KEYS.quickCustomInstructions,
        title: 'تعليمات مخصّصة للذكاء الاصطناعي',
        isComplete: hasCustomInstructions,
        isSkipped: skipped.includes(CHECK_KEYS.quickCustomInstructions),
        actionPath: ACTION_PATHS.prompt,
        skippable: true,
      };
      if (!hasCustomInstructions) {
        item.message = 'أضف تعليمات مخصّصة لتحسين إجابات البوت.';
      }
      return item;
    })(),
  ];
}

function createWorkingHoursItem(m: MinimalMerchant): ChecklistItem {
  return {
    key: CHECK_KEYS.workingHours,
    title: 'مواعيد العمل',
    isComplete:
      Array.isArray(m.workingHours) &&
      m.workingHours.every(
        (w) =>
          hasNonEmptyString(w?.openTime) && hasNonEmptyString(w?.closeTime),
      ),
    message: 'اضبط مواعيد عمل المتجر',
    actionPath: ACTION_PATHS.merchantInfo,
    skippable: true,
  };
}

function createPoliciesItems(m: MinimalMerchant): ChecklistItem[] {
  return [
    {
      key: CHECK_KEYS.returnPolicy,
      title: 'سياسة الاسترجاع',
      isComplete: hasNonEmptyString(m.returnPolicy),
      message: 'أضف سياسة الاسترجاع',
      actionPath: ACTION_PATHS.merchantInfo,
      skippable: true,
    },
    {
      key: CHECK_KEYS.exchangePolicy,
      title: 'سياسة الاستبدال',
      isComplete: hasNonEmptyString(m.exchangePolicy),
      message: 'أضف سياسة الاستبدال',
      actionPath: ACTION_PATHS.merchantInfo,
      skippable: true,
    },
    {
      key: CHECK_KEYS.shippingPolicy,
      title: 'سياسة الشحن',
      isComplete: hasNonEmptyString(m.shippingPolicy),
      message: 'أضف سياسة الشحن',
      actionPath: ACTION_PATHS.merchantInfoShipping,
      skippable: true,
    },
  ];
}

/** يبني عناصر "متفرقات" بحسب مصدر المنتجات */
function buildMisc(
  m: MinimalMerchant,
  source: ProductSource,
  productCount: number,
  categoryCount: number,
  storefrontBannersCount: number,
): ChecklistItem[] {
  const items: ChecklistItem[] = [];

  if (source === 'internal') {
    items.push(
      {
        key: CHECK_KEYS.categories,
        title: 'تصنيفات المتجر',
        isComplete: categoryCount > 0,
        message: 'حدد تصنيفات المنتجات',
        actionPath: ACTION_PATHS.category,
        skippable: true,
      },
      (() => {
        const item: ChecklistItem = {
          key: CHECK_KEYS.configureProducts,
          title: 'اضافة منتجات',
          isComplete: productCount > 0,
          actionPath: ACTION_PATHS.createProduct,
          skippable: false,
        };
        if (productCount === 0) {
          item.message = 'أضف منتجًا واحدًا على الأقل';
        }
        return item;
      })(),
      {
        key: CHECK_KEYS.banners,
        title: 'البانرات',
        isComplete: storefrontBannersCount > 0,
        message: 'أضف بانرات لمتجرك',
        actionPath: ACTION_PATHS.banners,
        skippable: true,
      },
    );
  } else {
    items.push(
      (() => {
        const item: ChecklistItem = {
          key: CHECK_KEYS.syncExternal,
          title: 'مزامنة المنتجات الخارجية',
          isComplete: productCount > 0,
          actionPath: ACTION_PATHS.sync,
          skippable: true,
        };
        if (productCount === 0) {
          item.message = 'قم بمزامنة المنتجات من المزوّد';
        }
        return item;
      })(),
    );
  }

  items.push(createWorkingHoursItem(m));
  items.push(...createPoliciesItems(m));

  return items;
}

/** يجلب العدادات والقنوات بشكل متوازي */
async function fetchCountsAndChannels(
  repo: MerchantChecklistRepository,
  merchantId: string,
): Promise<CountsAndChannels> {
  const [productCount, categoryCount, tgCh, waQrCh, waApiCh, webCh] =
    await Promise.all([
      repo.countProducts(merchantId),
      repo.countCategories(merchantId),
      repo.getDefaultOrEnabledOrAnyChannel(
        merchantId,
        ChannelProvider.TELEGRAM,
      ),
      repo.getDefaultOrEnabledOrAnyChannel(
        merchantId,
        ChannelProvider.WHATSAPP_QR,
      ),
      repo.getDefaultOrEnabledOrAnyChannel(
        merchantId,
        ChannelProvider.WHATSAPP_CLOUD,
      ),
      repo.getDefaultOrEnabledOrAnyChannel(merchantId, ChannelProvider.WEBCHAT),
    ]);

  return { productCount, categoryCount, tgCh, waQrCh, waApiCh, webCh };
}

@Injectable()
export class MerchantChecklistService {
  constructor(
    private readonly storefrontService: StorefrontService,
    @Inject('MerchantChecklistRepository')
    private readonly repo: MerchantChecklistRepository,
  ) {}

  /** يُرجع مجموعات قائمة التحقق للمتجر المحدّد. */
  async getChecklist(merchantId: string): Promise<ChecklistGroup[]> {
    const m = await this.repo.findMerchantLean(merchantId);
    if (!m) return [];

    const merchant: MinimalMerchant = m;
    const source = inferSource(merchant);
    const skipped: readonly string[] = Array.isArray(
      merchant.skippedChecklistItems,
    )
      ? merchant.skippedChecklistItems
      : [];

    const storefront = (await this.storefrontService.findByMerchant(
      merchantId,
    )) as unknown;
    const countsAndChannels: CountsAndChannels = await fetchCountsAndChannels(
      this.repo,
      merchantId,
    );
    const { productCount, categoryCount, tgCh, waQrCh, waApiCh, webCh } =
      countsAndChannels;

    const storeInfo = buildStoreInfo(merchant, skipped);
    const channels = buildChannels({ tgCh, waQrCh, waApiCh, webCh }, skipped);
    const quickConfig = buildQuickConfig(merchant, skipped);
    const misc = buildMisc(
      merchant,
      source,
      productCount,
      categoryCount,
      getStorefrontBannersCount(storefront),
    );

    return [
      { key: 'storeInfo', title: 'معلومات المتجر', items: storeInfo },
      { key: 'channels', title: 'قنوات التواصل', items: channels },
      { key: 'quickConfig', title: 'إعدادات البرومبت', items: quickConfig },
      { key: 'misc', title: 'متفرقات', items: misc },
    ];
  }
}
