import { registerAs } from '@nestjs/config';

export default registerAs('vars', () => ({
  rabbit: {
    confirmTimeoutMs: parseInt(
      process.env.RABBIT_CONFIRM_TIMEOUT_MS ?? '10000',
      10,
    ),
  },
  chat: {
    n8nEndpoint:
      process.env.CHAT_N8N_ENDPOINT ?? '/webhook/webhooks/kleem/incoming',
    botName: process.env.CHAT_BOT_NAME ?? 'kleem',
    defaultChannel: process.env.CHAT_DEFAULT_CHANNEL ?? 'webchat',
    typing: {
      stopDelayMs: parseInt(
        process.env.CHAT_TYPING_STOP_DELAY_MS ?? '2000',
        10,
      ),
    },
  },
  embeddings: {
    expectedDim: parseInt(process.env.EMBEDDINGS_EXPECTED_DIM ?? '384', 10),
    httpTimeoutMs: parseInt(
      process.env.EMBEDDINGS_HTTP_TIMEOUT_MS ?? '15000',
      10,
    ),
    rxTimeoutMs: parseInt(process.env.EMBEDDINGS_RX_TIMEOUT_MS ?? '20000', 10),
    maxTextLength: parseInt(
      process.env.EMBEDDINGS_MAX_TEXT_LENGTH ?? '10000',
      10,
    ),
    retry: {
      maxRetries: parseInt(process.env.EMBEDDINGS_MAX_RETRIES ?? '3', 10),
      baseDelayMs: parseInt(
        process.env.EMBEDDINGS_BASE_RETRY_DELAY_MS ?? '500',
        10,
      ),
    },
    endpointPath: process.env.EMBEDDINGS_ENDPOINT_PATH ?? '/embed',
  },
  security: {
    hstsMaxAge: parseInt(process.env.SEC_HSTS_MAX_AGE ?? '31536000', 10), // 1y
  },
  rateLimit: {
    windowMs: parseInt(
      process.env.RATE_LIMIT_WINDOW_MS ?? String(15 * 60 * 1000),
      10,
    ),
    max: parseInt(process.env.RATE_LIMIT_MAX ?? '500', 10),
    message: {
      code: process.env.RATE_LIMIT_CODE ?? 'RATE_LIMIT_EXCEEDED',
      text:
        process.env.RATE_LIMIT_TEXT ??
        'تم تجاوز حد الطلبات، الرجاء المحاولة لاحقاً',
    },
  },
  cache: {
    merchantTtlMs: parseInt(process.env.CACHE_MERCHANT_TTL_MS ?? '600000', 10), // 10 minutes
    merchantPromptTtlMs: parseInt(
      process.env.CACHE_MERCHANT_PROMPT_TTL_MS ?? '1800000',
      10,
    ), // 30 minutes
    merchantStatusTtlMs: parseInt(
      process.env.CACHE_MERCHANT_STATUS_TTL_MS ?? '300000',
      10,
    ), // 5 minutes
  },
}));
