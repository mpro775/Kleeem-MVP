// src/merchants/merchant-checklist.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { MerchantDocument } from './schemas/merchant.schema';
import { ProductDocument } from '../products/schemas/product.schema';
import { CategoryDocument } from '../categories/schemas/category.schema';
import { StorefrontService } from '../storefront/storefront.service';

export type ChecklistItem = {
  key: string;
  title: string;
  isComplete: boolean;
  isSkipped?: boolean;
  skippable?: boolean;
  message?: string;
  actionPath?: string;
};

export type ChecklistGroup = {
  key: string;
  title: string;
  items: ChecklistItem[];
};

@Injectable()
export class MerchantChecklistService {
  constructor(
    @InjectModel('Merchant') private merchantModel: Model<MerchantDocument>,
    @InjectModel('Product') private productModel: Model<ProductDocument>,
    @InjectModel('Category') private categoryModel: Model<CategoryDocument>,
    private readonly storefrontService: StorefrontService,
  ) {}

  private inferSource(m: MerchantDocument | any): 'internal' | 'salla' | 'zid' {
    // بدون حقل productSource صريح، نستنتج من config:
    const sallaActive = !!m?.productSourceConfig?.salla?.active;
    const zidActive = !!m?.productSourceConfig?.zid?.active;
    if (zidActive) return 'zid';
    if (sallaActive) return 'salla';
    return 'internal';
  }

  async getChecklist(merchantId: string): Promise<ChecklistGroup[]> {
    const m = await this.merchantModel.findById(merchantId).lean();
    if (!m) return [];

    const source = this.inferSource(m);
    const isInternal = source === 'internal';

    const skipped = Array.isArray(m.skippedChecklistItems)
      ? m.skippedChecklistItems
      : [];

    const storefront = await this.storefrontService.findByMerchant(merchantId);

    const [productCount, categoryCount] = await Promise.all([
      this.productModel.countDocuments({
        merchantId: new Types.ObjectId(merchantId),
      }),
      this.categoryModel.countDocuments({
        merchantId: new Types.ObjectId(merchantId),
      }),
    ]);

    // 1) معلومات المتجر (تظهر للجميع)
    const storeInfo: ChecklistItem[] = [
      {
        key: 'logo',
        title: 'شعار المتجر',
        isComplete: !!m.logoUrl,
        isSkipped: skipped.includes('logo'),
        message: m.logoUrl ? undefined : 'ارفع شعار المتجر',
        actionPath: '/dashboard/marchinfo',
        skippable: true,
      },
      {
        key: 'storeUrl',
        title: 'رابط المتجر',
        isComplete: !!storefront?.storefrontUrl,
        isSkipped: skipped.includes('storeUrl'),
        message: storefront?.storefrontUrl
          ? undefined
          : 'أضف رابط المتجر لعرضه للعملاء',
        actionPath: '/dashboard/marchinfo',
        skippable: true,
      },
      {
        key: 'address',
        title: 'عنوان المتجر',
        isComplete:
          !!m.addresses?.length &&
          !!m.addresses[0]?.street &&
          !!m.addresses[0]?.city &&
          !!m.addresses[0]?.country,
        isSkipped: skipped.includes('address'),
        message: 'اكمل حقول العنوان (الشارع، المدينة، الدولة)',
        actionPath: '/dashboard/marchinfo',
        skippable: true,
      },
    ];

    // 2) قنوات التواصل (تظهر للجميع)
    const channels: ChecklistItem[] = [
      {
        key: 'channel_whatsapp',
        title: 'واتساب',
        isComplete: !!m.channels?.whatsapp?.enabled,
        isSkipped: skipped.includes('channel_whatsapp'),
        message: m.channels?.whatsapp?.enabled
          ? undefined
          : 'فعّل واتساب وأضف رقم الجوال وربط الـ webhook',
        actionPath: '/settings/merchant/channels/whatsapp',
        skippable: true,
      },
      {
        key: 'channel_telegram',
        title: 'تيليجرام',
        isComplete: !!m.channels?.telegram?.enabled,
        isSkipped: skipped.includes('channel_telegram'),
        message: m.channels?.telegram?.enabled
          ? undefined
          : 'فعّل تيليجرام وأنشئ بوت وربطه بالتطبيق',
        actionPath: '/settings/merchant/channels/telegram',
        skippable: true,
      },
      {
        key: 'channel_webchat',
        title: 'الويب شات',
        isComplete: !!m.channels?.webchat?.enabled,
        isSkipped: skipped.includes('channel_webchat'),
        message: m.channels?.webchat?.enabled
          ? undefined
          : 'فعّل الويب شات واختر الـ theme وربط الـ webhook',
        actionPath: '/settings/merchant/channels/webchat',
        skippable: true,
      },
    ];

    // 3) إعدادات البرومبت (تظهر للجميع)
    const quickConfig: ChecklistItem[] = [
      {
        key: 'quickConfig_dialect',
        title: 'اختيار اللهجة',
        isComplete: !!m.quickConfig?.dialect,
        isSkipped: skipped.includes('quickConfig_dialect'),
        message: m.quickConfig?.dialect ? undefined : 'اختر لهجة البوت',
        actionPath: '/onboarding/step3',
        skippable: false,
      },
      {
        key: 'quickConfig_tone',
        title: 'اختيار النغمة',
        isComplete: !!m.quickConfig?.tone,
        isSkipped: skipped.includes('quickConfig_tone'),
        message: m.quickConfig?.tone ? undefined : 'حدد نغمة الردود',
        actionPath: '/onboarding/step3',
        skippable: false,
      },
    ];

    // 4) متفرقات — تتغير حسب المصدر
    const misc: ChecklistItem[] = [];

    if (isInternal) {
      // عناصر كليم الداخلية فقط
      misc.push(
        {
          key: 'configureProducts',
          title: 'تهيئة المنتجات',
          isComplete: productCount > 0,
          message: productCount > 0 ? undefined : 'أضف منتجًا واحدًا على الأقل',
          actionPath: '/dashboard/products/new',
          skippable: false,
        },
        {
          key: 'categories',
          title: 'تصنيفات المتجر',
          isComplete: categoryCount > 0,
          message: 'حدد تصنيفات المنتجات',
          actionPath: '/dashboard/category',
          skippable: true,
        },
        {
          key: 'banners',
          title: 'البانرات',
          isComplete: !!storefront?.banners?.length,
          message: 'أضف بانرات لمتجرك',
          actionPath: '/dashboard/banners',
          skippable: true,
        },
        {
          key: 'offers',
          title: 'العروض',
          isComplete: false, // حسب منطقك لاحقاً
          message: 'أضف عرضًا ترويجيًا',
          actionPath: '/dashboard/offers',
          skippable: true,
        },
      );
    } else {
      // مصدر خارجي → لا نُظهر "إضافة منتجات" الخ...
      // ممكن نظهر "مزامنة المنتجات" فقط
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

    // سياسات (تظهر للجميع)
    misc.push(
      {
        key: 'workingHours',
        title: 'مواعيد العمل',
        isComplete:
          Array.isArray(m.workingHours) &&
          m.workingHours.every((w: any) => w.openTime && w.closeTime),
        message: 'اضبط مواعيد عمل المتجر',
        actionPath: '/settings/merchant/schedule',
        skippable: true,
      },
      {
        key: 'returnPolicy',
        title: 'سياسة الاسترجاع',
        isComplete: !!m.returnPolicy && m.returnPolicy.trim().length > 0,
        message: 'أضف سياسة الاسترجاع',
        actionPath: '/settings/merchant/policies',
        skippable: true,
      },
      {
        key: 'exchangePolicy',
        title: 'سياسة الاستبدال',
        isComplete: !!m.exchangePolicy && m.exchangePolicy.trim().length > 0,
        message: 'أضف سياسة الاستبدال',
        actionPath: '/settings/merchant/policies',
        skippable: true,
      },
      {
        key: 'shippingPolicy',
        title: 'سياسة الشحن',
        isComplete: !!m.shippingPolicy && m.shippingPolicy.trim().length > 0,
        message: 'أضف سياسة الشحن',
        actionPath: '/settings/merchant/policies',
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
