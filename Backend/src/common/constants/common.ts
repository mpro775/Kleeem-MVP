export const METRICS_PORT = 9101;
export const METRICS_PORT_WEBHOOK_DISPATCHER = 9102;
export const PING_TIMEOUT = 60000;
export const PING_INTERVAL = 25000;
export const UPGRADE_TIMEOUT = 10000;
export const MAX_HTTP_BUFFER_SIZE = 1e6;

// Time conversion constants
export const MS_PER_SECOND = 1000;
// File size conversion constants
export const BYTES_PER_KILOBYTE = 1 << 10; // 2^10
export const BYTES_PER_MEGABYTE = BYTES_PER_KILOBYTE * BYTES_PER_KILOBYTE;
// Sentry configuration constants
export const SENTRY_PRODUCTION_SAMPLE_RATE = 0.1; // 10% sampling in production
export const MAX_LENGTH_FEEDBACK = 1000;
export const SCORE_THRESHOLD = 0.9;
export const COUNT_DEFAULT = 42;
export const DEFAULT_TIMEOUT = 10000;
export const DAYS_PER_WEEK = 7;
export const DAYS_PER_TWO_WEEK = 14;
// Default value constants
export const RABBIT_CONFIRM_TIMEOUT_MS_DEFAULT = 10000; // 10 seconds
export const CHAT_TYPING_STOP_DELAY_MS_DEFAULT = 2000; // 2 seconds
export const EMBEDDINGS_EXPECTED_DIM_DEFAULT = 384;
export const EMBEDDINGS_HTTP_TIMEOUT_MS_DEFAULT = 15000; // 15 seconds
export const EMBEDDINGS_RX_TIMEOUT_MS_DEFAULT = 20000; // 20 seconds
export const EMBEDDINGS_MAX_TEXT_LENGTH_DEFAULT = 10000;
export const EMBEDDINGS_MAX_RETRIES_DEFAULT = 3;
export const EMBEDDINGS_BASE_RETRY_DELAY_MS_DEFAULT = 500; // 0.5 seconds
export const SECURITY_HSTS_MAX_AGE_DEFAULT = 31536000; // 1 year in seconds
export const RATE_LIMIT_MAX_DEFAULT = 500;
export const CACHE_MERCHANT_TTL_MS_DEFAULT = 600000; // 10 minutes
export const CACHE_MERCHANT_PROMPT_TTL_MS_DEFAULT = 1800000; // 30 minutes
export const CACHE_MERCHANT_STATUS_TTL_MS_DEFAULT = 300000; // 5 minutes

// Rate limit constants (in milliseconds)
export const RATE_LIMIT_WINDOW_MS_DEFAULT = 15 * 60 * MS_PER_SECOND; // 15 minutes

// CORS configuration constants
export const SECONDS_PER_HOUR = 60 * 60;
export const CORS_DEFAULT_MAX_AGE_SECONDS = 24 * SECONDS_PER_HOUR; // 86400 seconds = 24 hours
export const CORS_DEFAULT_OPTIONS_SUCCESS_STATUS = 204;
// Password validation constants
export const MIN_PASSWORD_LENGTH = 6;

export const MIN_LIMIT = 1;
export const MAX_LIMIT = 100;
export const DEFAULT_LIMIT = 20;
export const SECONDS_PER_DAY = 86400;
export const DEFAULT_SORT_FIELD = 'createdAt';
export const DEFAULT_SORT_ORDER = -1;
export const SECONDS_PER_MINUTE = 60;
export const PASSWORD_RESET_TOKEN_LENGTH = 32;
export const VERIFICATION_CODE_LENGTH = 6;
export const ONE_MINUTE_MS = 60 * MS_PER_SECOND;
export const RESEND_VERIFICATION_WINDOW_MS = ONE_MINUTE_MS;
export const PASSWORD_RESET_WINDOW_MS = ONE_MINUTE_MS;
export const HOUR_IN_SECONDS = 3600;

// File size constants
export const MAX_IMAGE_SIZE_BYTES = 2 * BYTES_PER_MEGABYTE; // 2 MB

// Image quality constants
export const IMAGE_QUALITY_HIGH = 85;
export const IMAGE_QUALITY_MEDIUM_HIGH = 80;
export const IMAGE_QUALITY_MEDIUM = 70;
export const IMAGE_QUALITY_MEDIUM_LOW = 60;
export const IMAGE_QUALITY_LOW = 50;
