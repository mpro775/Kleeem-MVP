import { registerAs } from '@nestjs/config';

// Helper functions to reduce complexity
const parseIntWithDefault = (
  value: string | undefined,
  defaultValue: number,
): number => parseInt(value ?? String(defaultValue), 10);

import {
  RABBIT_CONFIRM_TIMEOUT_MS_DEFAULT,
  CHAT_TYPING_STOP_DELAY_MS_DEFAULT,
  EMBEDDINGS_EXPECTED_DIM_DEFAULT,
  EMBEDDINGS_HTTP_TIMEOUT_MS_DEFAULT,
  EMBEDDINGS_RX_TIMEOUT_MS_DEFAULT,
  EMBEDDINGS_MAX_TEXT_LENGTH_DEFAULT,
  EMBEDDINGS_MAX_RETRIES_DEFAULT,
  EMBEDDINGS_BASE_RETRY_DELAY_MS_DEFAULT,
  SECURITY_HSTS_MAX_AGE_DEFAULT,
  RATE_LIMIT_WINDOW_MS_DEFAULT,
  RATE_LIMIT_MAX_DEFAULT,
  CACHE_MERCHANT_TTL_MS_DEFAULT,
  CACHE_MERCHANT_PROMPT_TTL_MS_DEFAULT,
  CACHE_MERCHANT_STATUS_TTL_MS_DEFAULT,
} from '../constants/common';

const getRabbitConfig = () => ({
  confirmTimeoutMs: parseIntWithDefault(
    process.env.RABBIT_CONFIRM_TIMEOUT_MS,
    RABBIT_CONFIRM_TIMEOUT_MS_DEFAULT,
  ),
});

const getChatConfig = () => ({
  n8nEndpoint:
    process.env.CHAT_N8N_ENDPOINT ?? '/webhook/webhooks/kleem/incoming',
  botName: process.env.CHAT_BOT_NAME ?? 'kleem',
  defaultChannel: process.env.CHAT_DEFAULT_CHANNEL ?? 'webchat',
  typing: {
    stopDelayMs: parseIntWithDefault(
      process.env.CHAT_TYPING_STOP_DELAY_MS,
      CHAT_TYPING_STOP_DELAY_MS_DEFAULT,
    ),
  },
});

const getEmbeddingsConfig = () => ({
  expectedDim: parseIntWithDefault(
    process.env.EMBEDDINGS_EXPECTED_DIM,
    EMBEDDINGS_EXPECTED_DIM_DEFAULT,
  ),
  httpTimeoutMs: parseIntWithDefault(
    process.env.EMBEDDINGS_HTTP_TIMEOUT_MS,
    EMBEDDINGS_HTTP_TIMEOUT_MS_DEFAULT,
  ),
  rxTimeoutMs: parseIntWithDefault(
    process.env.EMBEDDINGS_RX_TIMEOUT_MS,
    EMBEDDINGS_RX_TIMEOUT_MS_DEFAULT,
  ),
  maxTextLength: parseIntWithDefault(
    process.env.EMBEDDINGS_MAX_TEXT_LENGTH,
    EMBEDDINGS_MAX_TEXT_LENGTH_DEFAULT,
  ),
  retry: {
    maxRetries: parseIntWithDefault(
      process.env.EMBEDDINGS_MAX_RETRIES,
      EMBEDDINGS_MAX_RETRIES_DEFAULT,
    ),
    baseDelayMs: parseIntWithDefault(
      process.env.EMBEDDINGS_BASE_RETRY_DELAY_MS,
      EMBEDDINGS_BASE_RETRY_DELAY_MS_DEFAULT,
    ),
  },
  endpointPath: process.env.EMBEDDINGS_ENDPOINT_PATH ?? '/embed',
});

const getSecurityConfig = () => ({
  hstsMaxAge: parseIntWithDefault(
    process.env.SEC_HSTS_MAX_AGE,
    SECURITY_HSTS_MAX_AGE_DEFAULT,
  ), // 1 year
});

const getRateLimitConfig = () => ({
  windowMs: parseIntWithDefault(
    process.env.RATE_LIMIT_WINDOW_MS,
    RATE_LIMIT_WINDOW_MS_DEFAULT,
  ), // 15 minutes
  max: parseIntWithDefault(process.env.RATE_LIMIT_MAX, RATE_LIMIT_MAX_DEFAULT),
  message: {
    code: process.env.RATE_LIMIT_CODE ?? 'RATE_LIMIT_EXCEEDED',
    text:
      process.env.RATE_LIMIT_TEXT ??
      'تم تجاوز حد الطلبات، الرجاء المحاولة لاحقاً',
  },
});

const getCacheConfig = () => ({
  merchantTtlMs: parseIntWithDefault(
    process.env.CACHE_MERCHANT_TTL_MS,
    CACHE_MERCHANT_TTL_MS_DEFAULT,
  ), // 10 minutes
  merchantPromptTtlMs: parseIntWithDefault(
    process.env.CACHE_MERCHANT_PROMPT_TTL_MS,
    CACHE_MERCHANT_PROMPT_TTL_MS_DEFAULT,
  ), // 30 minutes
  merchantStatusTtlMs: parseIntWithDefault(
    process.env.CACHE_MERCHANT_STATUS_TTL_MS,
    CACHE_MERCHANT_STATUS_TTL_MS_DEFAULT,
  ), // 5 minutes
});

export default registerAs('vars', () => ({
  rabbit: getRabbitConfig(),
  chat: getChatConfig(),
  embeddings: getEmbeddingsConfig(),
  security: getSecurityConfig(),
  rateLimit: getRateLimitConfig(),
  cache: getCacheConfig(),
}));
