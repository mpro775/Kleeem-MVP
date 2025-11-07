/**
 * أنواع الكوبونات والعروض الترويجية
 */

// نوع الكوبون
export type CouponType = 'percentage' | 'fixed_amount' | 'free_shipping';

// واجهة الكوبون
export interface Coupon {
  _id: string;
  merchantId: string;
  code: string;
  description: string;
  type: CouponType;
  value: number; // النسبة أو المبلغ
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  usageLimit?: number;
  usageCount: number;
  oneTimePerCustomer: boolean;
  allowedCustomers?: string[]; // أرقام الهواتف
  storeWide: boolean;
  products?: string[]; // Product IDs
  categories?: string[]; // Category IDs
  startDate: string | Date;
  endDate: string | Date;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

// DTO لإنشاء كوبون
export interface CreateCouponDto {
  code: string;
  description: string;
  type: CouponType;
  value: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  usageLimit?: number;
  oneTimePerCustomer?: boolean;
  allowedCustomers?: string[];
  storeWide?: boolean;
  products?: string[];
  categories?: string[];
  startDate: string | Date;
  endDate: string | Date;
  isActive?: boolean;
}

// DTO للتحديث
export interface UpdateCouponDto extends Partial<CreateCouponDto> {}

// DTO للتحقق من الكوبون
export interface ValidateCouponDto {
  code: string;
  merchantId: string;
  customerPhone?: string;
  cartItems: {
    productId: string;
    categoryId?: string;
    price: number;
    quantity: number;
  }[];
  totalAmount: number;
}

// نتيجة التحقق
export interface CouponValidationResult {
  valid: boolean;
  coupon?: Coupon;
  discountAmount?: number;
  message?: string;
}

// إحصائيات الكوبون
export interface CouponStats {
  totalCoupons: number;
  activeCoupons: number;
  expiredCoupons: number;
  totalUsage: number;
  totalDiscountGiven: number;
}

// فلتر الكوبونات
export interface CouponsFilterParams {
  merchantId: string;
  status?: 'active' | 'expired' | 'all';
  search?: string;
  page?: number;
  limit?: number;
}

// نوع العرض الترويجي
export type PromotionType = 'percentage' | 'fixed_amount' | 'cart_threshold';

// نطاق تطبيق العرض
export type PromotionApplyTo = 'all' | 'categories' | 'products';

// واجهة العرض الترويجي
export interface Promotion {
  _id: string;
  merchantId: string;
  name: string;
  description: string;
  type: PromotionType;
  discountValue: number;
  maxDiscountAmount?: number;
  minCartAmount?: number;
  applyTo: PromotionApplyTo;
  productIds?: string[];
  categoryIds?: string[];
  priority: number;
  countdownTimer: boolean;
  usageLimit?: number;
  usageCount: number;
  startDate: string | Date;
  endDate: string | Date;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

// DTO لإنشاء عرض ترويجي
export interface CreatePromotionDto {
  name: string;
  description: string;
  type: PromotionType;
  discountValue: number;
  maxDiscountAmount?: number;
  minCartAmount?: number;
  applyTo: PromotionApplyTo;
  productIds?: string[];
  categoryIds?: string[];
  priority?: number;
  countdownTimer?: boolean;
  usageLimit?: number;
  startDate: string | Date;
  endDate: string | Date;
  isActive?: boolean;
}

// DTO للتحديث
export interface UpdatePromotionDto extends Partial<CreatePromotionDto> {}

// إحصائيات العروض
export interface PromotionStats {
  totalPromotions: number;
  activePromotions: number;
  expiredPromotions: number;
  totalUsage: number;
  totalDiscountGiven: number;
}

// فلتر العروض
export interface PromotionsFilterParams {
  merchantId: string;
  status?: 'active' | 'expired' | 'all';
  search?: string;
  page?: number;
  limit?: number;
}

// إعدادات العملات
export interface CurrencySettings {
  baseCurrency: string;
  supportedCurrencies: string[];
  exchangeRates: Record<string, number>;
  roundingStrategy: 'none' | 'round' | 'ceil' | 'floor';
  roundToNearest: number;
}

// سياسة الخصومات
export interface DiscountPolicy {
  stackCouponsWithPromotions: boolean;
  applyOrder: 'product_first' | 'promotion_first' | 'coupon_first';
}

// تحديث إعدادات العملات
export interface UpdateCurrencySettingsDto {
  baseCurrency?: string;
  supportedCurrencies?: string[];
  exchangeRates?: Record<string, number>;
  roundingStrategy?: 'none' | 'round' | 'ceil' | 'floor';
  roundToNearest?: number;
}

// تحديث سياسة الخصومات
export interface UpdateDiscountPolicyDto {
  stackCouponsWithPromotions?: boolean;
  applyOrder?: 'product_first' | 'promotion_first' | 'coupon_first';
}

// نتيجة حساب الأسعار
export interface PricingResult {
  pricing: {
    subtotal: number;
    promotions: Array<{ id: string; name: string; amount: number }>;
    coupon: { code: string; amount: number } | null;
    products: Array<{ id: string; name: string; amount: number }>;
    totalDiscount: number;
    shippingCost: number;
    shippingDiscount: number;
    total: number;
  };
  currency: string;
  exchangeRate?: number;
  discountPolicy: string;
  appliedCouponCode?: string;
}

