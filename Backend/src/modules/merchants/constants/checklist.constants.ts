/**
 * Checklist Item Status
 */
export const CHECKLIST_ITEM_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  SKIPPED: 'skipped',
} as const;

export type ChecklistItemStatus =
  (typeof CHECKLIST_ITEM_STATUS)[keyof typeof CHECKLIST_ITEM_STATUS];

/**
 * Checklist Group IDs
 */
export const CHECKLIST_GROUPS = {
  BASIC_SETUP: 'basic_setup',
  BUSINESS_INFO: 'business_info',
  PRODUCTS: 'products',
  PAYMENT: 'payment',
  STOREFRONT: 'storefront',
  MARKETING: 'marketing',
  ADVANCED: 'advanced',
} as const;

export type ChecklistGroupId =
  (typeof CHECKLIST_GROUPS)[keyof typeof CHECKLIST_GROUPS];

/**
 * Checklist Item IDs
 */
export const CHECKLIST_ITEMS = {
  // Basic Setup
  BASIC_INFO: 'basic_info',
  LOGO_UPLOAD: 'logo_upload',
  CONTACT_INFO: 'contact_info',

  // Business Info
  BUSINESS_DESCRIPTION: 'business_description',
  WORKING_HOURS: 'working_hours',
  LOCATION: 'location',

  // Products
  ADD_PRODUCTS: 'add_products',
  PRODUCT_CATEGORIES: 'product_categories',
  PRODUCT_IMAGES: 'product_images',
  PRICING: 'pricing',

  // Payment
  PAYMENT_METHODS: 'payment_methods',
  SHIPPING_OPTIONS: 'shipping_options',
  TAX_SETTINGS: 'tax_settings',

  // Storefront
  THEME_SELECTION: 'theme_selection',
  CUSTOMIZATION: 'customization',
  DOMAIN_SETUP: 'domain_setup',

  // Marketing
  SEO_SETUP: 'seo_setup',
  SOCIAL_MEDIA: 'social_media',
  EMAIL_MARKETING: 'email_marketing',

  // Advanced
  ANALYTICS: 'analytics',
  INTEGRATIONS: 'integrations',
  AUTOMATION: 'automation',
} as const;

export type ChecklistItemId =
  (typeof CHECKLIST_ITEMS)[keyof typeof CHECKLIST_ITEMS];

/**
 * Checklist Item Priorities
 */
export const CHECKLIST_PRIORITIES = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
} as const;

export type ChecklistPriority =
  (typeof CHECKLIST_PRIORITIES)[keyof typeof CHECKLIST_PRIORITIES];

/**
 * Default Checklist Configuration
 */
export const CHECKLIST_DEFAULTS = {
  AUTO_MARK_COMPLETED: true,
  SHOW_PROGRESS_BAR: true,
  ALLOW_SKIP_ITEMS: true,
  MAX_ITEMS_PER_GROUP: 20,
} as const;
