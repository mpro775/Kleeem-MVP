// src/features/onboarding/constants.ts
export const BUSINESS_TYPES = [
  { label: 'متاجر', value: 'store', available: true },
  { label: 'مطاعم', value: 'restaurant', available: false },
  { label: 'فنادق', value: 'hotel', available: false },
  { label: 'صيدليات', value: 'pharmacy', available: false },
  { label: 'جامعات', value: 'university', available: false },
  { label: 'مدارس', value: 'school', available: false },
] as const;

export const STORE_CATEGORIES = [
  { label: 'ملابس', value: 'clothing' },
  { label: 'إلكترونيات وهواتف', value: 'electronics' },
  { label: 'اكسسوارات', value: 'accessories' },
  { label: 'عطور', value: 'perfumes' },
  { label: 'سوبرماركت', value: 'supermarket' },
  { label: 'هدايا', value: 'gifts' },
  { label: 'أخرى', value: 'other' },
] as const;

