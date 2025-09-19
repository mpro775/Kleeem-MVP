/**
 * Merchant Status Constants
 */
export const MERCHANT_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
  SUSPENDED: 'suspended',
  ONBOARDING: 'onboarding',
} as const;

export type MerchantStatus =
  (typeof MERCHANT_STATUS)[keyof typeof MERCHANT_STATUS];

/**
 * Business Types
 */
export const BUSINESS_TYPES = {
  RETAIL: 'retail',
  ECOMMERCE: 'ecommerce',
  RESTAURANT: 'restaurant',
  SERVICES: 'services',
  HEALTHCARE: 'healthcare',
  EDUCATION: 'education',
  TECHNOLOGY: 'technology',
  OTHER: 'other',
} as const;

export type BusinessType = (typeof BUSINESS_TYPES)[keyof typeof BUSINESS_TYPES];

/**
 * Subscription Plans
 */
export const SUBSCRIPTION_PLANS = {
  FREE: 'free',
  BASIC: 'basic',
  PROFESSIONAL: 'professional',
  ENTERPRISE: 'enterprise',
} as const;

export type SubscriptionPlan =
  (typeof SUBSCRIPTION_PLANS)[keyof typeof SUBSCRIPTION_PLANS];

/**
 * Onboarding Steps
 */
export const ONBOARDING_STEPS = {
  BASIC_INFO: 'basic_info',
  BUSINESS_DETAILS: 'business_details',
  PRODUCTS_SETUP: 'products_setup',
  PAYMENT_SETUP: 'payment_setup',
  STOREFRONT_DESIGN: 'storefront_design',
  COMPLETED: 'completed',
} as const;

export type OnboardingStep =
  (typeof ONBOARDING_STEPS)[keyof typeof ONBOARDING_STEPS];

/**
 * Working Days
 */
export const WORKING_DAYS = {
  SUNDAY: 'sunday',
  MONDAY: 'monday',
  TUESDAY: 'tuesday',
  WEDNESDAY: 'wednesday',
  THURSDAY: 'thursday',
  FRIDAY: 'friday',
  SATURDAY: 'saturday',
} as const;

export type WorkingDay = (typeof WORKING_DAYS)[keyof typeof WORKING_DAYS];

/**
 * Default Values
 */
export const MERCHANT_DEFAULTS = {
  LOGO_UPLOAD_PATH: './uploads/merchants/logos',
  MAX_LOGO_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_LOGO_TYPES: ['image/jpeg', 'image/png', 'image/gif'],
  DEFAULT_CURRENCY: 'SAR',
  DEFAULT_LANGUAGE: 'ar',
  DEFAULT_TIMEZONE: 'Asia/Riyadh',
} as const;

/**
 * Validation Limits
 */
export const MERCHANT_LIMITS = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
  DESCRIPTION_MAX_LENGTH: 500,
  SLUG_MIN_LENGTH: 3,
  SLUG_MAX_LENGTH: 50,
  PHONE_MIN_LENGTH: 10,
  PHONE_MAX_LENGTH: 15,
} as const;
