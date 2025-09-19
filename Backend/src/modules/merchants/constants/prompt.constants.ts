/**
 * Prompt Templates
 */
export const PROMPT_TEMPLATES = {
  DEFAULT: 'default',
  FRIENDLY: 'friendly',
  PROFESSIONAL: 'professional',
  CASUAL: 'casual',
  FORMAL: 'formal',
  CUSTOM: 'custom',
} as const;

export type PromptTemplate =
  (typeof PROMPT_TEMPLATES)[keyof typeof PROMPT_TEMPLATES];

/**
 * Target Audiences
 */
export const TARGET_AUDIENCES = {
  GENERAL: 'general',
  YOUNG_ADULTS: 'young_adults',
  FAMILIES: 'families',
  PROFESSIONALS: 'professionals',
  SENIORS: 'seniors',
  STUDENTS: 'students',
} as const;

export type TargetAudience =
  (typeof TARGET_AUDIENCES)[keyof typeof TARGET_AUDIENCES];

/**
 * Prompt Version Status
 */
export const PROMPT_VERSION_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  ARCHIVED: 'archived',
} as const;

export type PromptVersionStatus =
  (typeof PROMPT_VERSION_STATUS)[keyof typeof PROMPT_VERSION_STATUS];

/**
 * Communication Styles
 */
export const COMMUNICATION_STYLES = {
  HELPFUL: 'helpful',
  ENTHUSIASTIC: 'enthusiastic',
  INFORMATIVE: 'informative',
  EMPATHETIC: 'empathetic',
  DIRECT: 'direct',
} as const;

export type CommunicationStyle =
  (typeof COMMUNICATION_STYLES)[keyof typeof COMMUNICATION_STYLES];

/**
 * Default Prompt Settings
 */
export const PROMPT_DEFAULTS = {
  MAX_RESPONSE_LENGTH: 500,
  DEFAULT_LANGUAGE: 'ar',
  DEFAULT_TONE: 'friendly',
  CONTEXT_WINDOW_SIZE: 4000,
  MAX_VERSIONS_PER_MERCHANT: 10,
} as const;

/**
 * Prompt Building Variables
 */
export const PROMPT_VARIABLES = {
  BUSINESS_NAME: '{{businessName}}',
  BUSINESS_TYPE: '{{businessType}}',
  TARGET_AUDIENCE: '{{targetAudience}}',
  COMMUNICATION_STYLE: '{{communicationStyle}}',
  PRODUCTS: '{{products}}',
  SERVICES: '{{services}}',
  WORKING_HOURS: '{{workingHours}}',
  CONTACT_INFO: '{{contactInfo}}',
  POLICIES: '{{policies}}',
  USER_MESSAGE: '{{userMessage}}',
} as const;

/**
 * Prompt Validation Rules
 */
export const PROMPT_VALIDATION = {
  MIN_TEMPLATE_LENGTH: 10,
  MAX_TEMPLATE_LENGTH: 2000,
  MAX_CUSTOMIZATION_FIELDS: 20,
  REQUIRED_VARIABLES: [
    PROMPT_VARIABLES.BUSINESS_NAME,
    PROMPT_VARIABLES.USER_MESSAGE,
  ],
} as const;
