import { varsConfig } from './vars.config';

describe('varsConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment variables before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment variables
    process.env = originalEnv;
  });

  describe('rabbit configuration', () => {
    it('should use default RABBIT_CONFIRM_TIMEOUT_MS when not set', () => {
      delete process.env.RABBIT_CONFIRM_TIMEOUT_MS;

      const config = varsConfig();

      expect(config.rabbit.confirmTimeoutMs).toBeDefined();
      expect(typeof config.rabbit.confirmTimeoutMs).toBe('number');
    });

    it('should use custom RABBIT_CONFIRM_TIMEOUT_MS when set', () => {
      const customTimeout = 15000;
      process.env.RABBIT_CONFIRM_TIMEOUT_MS = customTimeout.toString();

      const config = varsConfig();

      expect(config.rabbit.confirmTimeoutMs).toBe(customTimeout);
    });

    it('should handle invalid RABBIT_CONFIRM_TIMEOUT_MS gracefully', () => {
      process.env.RABBIT_CONFIRM_TIMEOUT_MS = 'invalid';

      const config = varsConfig();

      expect(config.rabbit.confirmTimeoutMs).toBe(10000); // Default value
    });

    it('should handle negative RABBIT_CONFIRM_TIMEOUT_MS', () => {
      process.env.RABBIT_CONFIRM_TIMEOUT_MS = '-1000';

      const config = varsConfig();

      expect(config.rabbit.confirmTimeoutMs).toBe(10000); // Default value
    });
  });

  describe('chat configuration', () => {
    it('should use default CHAT_N8N_ENDPOINT when not set', () => {
      delete process.env.CHAT_N8N_ENDPOINT;

      const config = varsConfig();

      expect(config.chat.n8nEndpoint).toBe('/webhook/webhooks/kleem/incoming');
    });

    it('should use custom CHAT_N8N_ENDPOINT when set', () => {
      const customEndpoint = '/custom/webhook';
      process.env.CHAT_N8N_ENDPOINT = customEndpoint;

      const config = varsConfig();

      expect(config.chat.n8nEndpoint).toBe(customEndpoint);
    });

    it('should use default CHAT_BOT_NAME when not set', () => {
      delete process.env.CHAT_BOT_NAME;

      const config = varsConfig();

      expect(config.chat.botName).toBe('kleem');
    });

    it('should use custom CHAT_BOT_NAME when set', () => {
      const customBotName = 'custom-bot';
      process.env.CHAT_BOT_NAME = customBotName;

      const config = varsConfig();

      expect(config.chat.botName).toBe(customBotName);
    });

    it('should use default CHAT_DEFAULT_CHANNEL when not set', () => {
      delete process.env.CHAT_DEFAULT_CHANNEL;

      const config = varsConfig();

      expect(config.chat.defaultChannel).toBe('webchat');
    });

    it('should use custom CHAT_DEFAULT_CHANNEL when set', () => {
      const customChannel = 'whatsapp';
      process.env.CHAT_DEFAULT_CHANNEL = customChannel;

      const config = varsConfig();

      expect(config.chat.defaultChannel).toBe(customChannel);
    });

    describe('typing configuration', () => {
      it('should use default CHAT_TYPING_STOP_DELAY_MS when not set', () => {
        delete process.env.CHAT_TYPING_STOP_DELAY_MS;

        const config = varsConfig();

        expect(config.chat.typing.stopDelayMs).toBeDefined();
        expect(typeof config.chat.typing.stopDelayMs).toBe('number');
      });

      it('should use custom CHAT_TYPING_STOP_DELAY_MS when set', () => {
        const customDelay = 3000;
        process.env.CHAT_TYPING_STOP_DELAY_MS = customDelay.toString();

        const config = varsConfig();

        expect(config.chat.typing.stopDelayMs).toBe(customDelay);
      });

      it('should handle invalid CHAT_TYPING_STOP_DELAY_MS', () => {
        process.env.CHAT_TYPING_STOP_DELAY_MS = 'invalid';

        const config = varsConfig();

        expect(config.chat.typing.stopDelayMs).toBe(2000); // Default value
      });
    });
  });

  describe('embeddings configuration', () => {
    describe('expectedDim', () => {
      it('should use default EMBEDDINGS_EXPECTED_DIM when not set', () => {
        delete process.env.EMBEDDINGS_EXPECTED_DIM;

        const config = varsConfig();

        expect(config.embeddings.expectedDim).toBeDefined();
        expect(typeof config.embeddings.expectedDim).toBe('number');
      });

      it('should use custom EMBEDDINGS_EXPECTED_DIM when set', () => {
        const customDim = 512;
        process.env.EMBEDDINGS_EXPECTED_DIM = customDim.toString();

        const config = varsConfig();

        expect(config.embeddings.expectedDim).toBe(customDim);
      });
    });

    describe('timeouts', () => {
      it('should use default EMBEDDINGS_HTTP_TIMEOUT_MS when not set', () => {
        delete process.env.EMBEDDINGS_HTTP_TIMEOUT_MS;

        const config = varsConfig();

        expect(config.embeddings.httpTimeoutMs).toBeDefined();
        expect(typeof config.embeddings.httpTimeoutMs).toBe('number');
      });

      it('should use custom EMBEDDINGS_HTTP_TIMEOUT_MS when set', () => {
        const customTimeout = 10000;
        process.env.EMBEDDINGS_HTTP_TIMEOUT_MS = customTimeout.toString();

        const config = varsConfig();

        expect(config.embeddings.httpTimeoutMs).toBe(customTimeout);
      });

      it('should use default EMBEDDINGS_RX_TIMEOUT_MS when not set', () => {
        delete process.env.EMBEDDINGS_RX_TIMEOUT_MS;

        const config = varsConfig();

        expect(config.embeddings.rxTimeoutMs).toBeDefined();
        expect(typeof config.embeddings.rxTimeoutMs).toBe('number');
      });

      it('should use custom EMBEDDINGS_RX_TIMEOUT_MS when set', () => {
        const customTimeout = 15000;
        process.env.EMBEDDINGS_RX_TIMEOUT_MS = customTimeout.toString();

        const config = varsConfig();

        expect(config.embeddings.rxTimeoutMs).toBe(customTimeout);
      });
    });

    describe('text length limits', () => {
      it('should use default EMBEDDINGS_MAX_TEXT_LENGTH when not set', () => {
        delete process.env.EMBEDDINGS_MAX_TEXT_LENGTH;

        const config = varsConfig();

        expect(config.embeddings.maxTextLength).toBeDefined();
        expect(typeof config.embeddings.maxTextLength).toBe('number');
      });

      it('should use custom EMBEDDINGS_MAX_TEXT_LENGTH when set', () => {
        const customLength = 2000;
        process.env.EMBEDDINGS_MAX_TEXT_LENGTH = customLength.toString();

        const config = varsConfig();

        expect(config.embeddings.maxTextLength).toBe(customLength);
      });
    });

    describe('retry configuration', () => {
      it('should use default EMBEDDINGS_MAX_RETRIES when not set', () => {
        delete process.env.EMBEDDINGS_MAX_RETRIES;

        const config = varsConfig();

        expect(config.embeddings.retry.maxRetries).toBeDefined();
        expect(typeof config.embeddings.retry.maxRetries).toBe('number');
      });

      it('should use custom EMBEDDINGS_MAX_RETRIES when set', () => {
        const customRetries = 5;
        process.env.EMBEDDINGS_MAX_RETRIES = customRetries.toString();

        const config = varsConfig();

        expect(config.embeddings.retry.maxRetries).toBe(customRetries);
      });

      it('should use default EMBEDDINGS_BASE_RETRY_DELAY_MS when not set', () => {
        delete process.env.EMBEDDINGS_BASE_RETRY_DELAY_MS;

        const config = varsConfig();

        expect(config.embeddings.retry.baseDelayMs).toBeDefined();
        expect(typeof config.embeddings.retry.baseDelayMs).toBe('number');
      });

      it('should use custom EMBEDDINGS_BASE_RETRY_DELAY_MS when set', () => {
        const customDelay = 2000;
        process.env.EMBEDDINGS_BASE_RETRY_DELAY_MS = customDelay.toString();

        const config = varsConfig();

        expect(config.embeddings.retry.baseDelayMs).toBe(customDelay);
      });
    });

    it('should use default EMBEDDINGS_ENDPOINT_PATH when not set', () => {
      delete process.env.EMBEDDINGS_ENDPOINT_PATH;

      const config = varsConfig();

      expect(config.embeddings.endpointPath).toBe('/embed');
    });

    it('should use custom EMBEDDINGS_ENDPOINT_PATH when set', () => {
      const customPath = '/custom/embeddings';
      process.env.EMBEDDINGS_ENDPOINT_PATH = customPath;

      const config = varsConfig();

      expect(config.embeddings.endpointPath).toBe(customPath);
    });
  });

  describe('security configuration', () => {
    it('should use default SEC_HSTS_MAX_AGE when not set', () => {
      delete process.env.SEC_HSTS_MAX_AGE;

      const config = varsConfig();

      expect(config.security.hstsMaxAge).toBeDefined();
      expect(typeof config.security.hstsMaxAge).toBe('number');
    });

    it('should use custom SEC_HSTS_MAX_AGE when set', () => {
      const customAge = 31536000; // 1 year
      process.env.SEC_HSTS_MAX_AGE = customAge.toString();

      const config = varsConfig();

      expect(config.security.hstsMaxAge).toBe(customAge);
    });

    it('should handle invalid SEC_HSTS_MAX_AGE', () => {
      process.env.SEC_HSTS_MAX_AGE = 'invalid';

      const config = varsConfig();

      expect(config.security.hstsMaxAge).toBe(31536000); // Default value
    });
  });

  describe('rate limit configuration', () => {
    it('should use default RATE_LIMIT_WINDOW_MS when not set', () => {
      delete process.env.RATE_LIMIT_WINDOW_MS;

      const config = varsConfig();

      expect(config.rateLimit.windowMs).toBeDefined();
      expect(typeof config.rateLimit.windowMs).toBe('number');
    });

    it('should use custom RATE_LIMIT_WINDOW_MS when set', () => {
      const customWindow = 900000; // 15 minutes
      process.env.RATE_LIMIT_WINDOW_MS = customWindow.toString();

      const config = varsConfig();

      expect(config.rateLimit.windowMs).toBe(customWindow);
    });

    it('should use default RATE_LIMIT_MAX when not set', () => {
      delete process.env.RATE_LIMIT_MAX;

      const config = varsConfig();

      expect(config.rateLimit.max).toBeDefined();
      expect(typeof config.rateLimit.max).toBe('number');
    });

    it('should use custom RATE_LIMIT_MAX when set', () => {
      const customMax = 200;
      process.env.RATE_LIMIT_MAX = customMax.toString();

      const config = varsConfig();

      expect(config.rateLimit.max).toBe(customMax);
    });

    it('should use default RATE_LIMIT_CODE when not set', () => {
      delete process.env.RATE_LIMIT_CODE;

      const config = varsConfig();

      expect(config.rateLimit.message.code).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('should use custom RATE_LIMIT_CODE when set', () => {
      const customCode = 'CUSTOM_RATE_LIMIT';
      process.env.RATE_LIMIT_CODE = customCode;

      const config = varsConfig();

      expect(config.rateLimit.message.code).toBe(customCode);
    });

    it('should use default RATE_LIMIT_TEXT when not set', () => {
      delete process.env.RATE_LIMIT_TEXT;

      const config = varsConfig();

      expect(config.rateLimit.message.text).toBe(
        'تم تجاوز حد الطلبات، الرجاء المحاولة لاحقاً',
      );
    });

    it('should use custom RATE_LIMIT_TEXT when set', () => {
      const customText = 'Too many requests, please try again later';
      process.env.RATE_LIMIT_TEXT = customText;

      const config = varsConfig();

      expect(config.rateLimit.message.text).toBe(customText);
    });
  });

  describe('cache configuration', () => {
    it('should use default CACHE_MERCHANT_TTL_MS when not set', () => {
      delete process.env.CACHE_MERCHANT_TTL_MS;

      const config = varsConfig();

      expect(config.cache.merchantTtlMs).toBeDefined();
      expect(typeof config.cache.merchantTtlMs).toBe('number');
    });

    it('should use custom CACHE_MERCHANT_TTL_MS when set', () => {
      const customTtl = 600000; // 10 minutes
      process.env.CACHE_MERCHANT_TTL_MS = customTtl.toString();

      const config = varsConfig();

      expect(config.cache.merchantTtlMs).toBe(customTtl);
    });

    it('should use default CACHE_MERCHANT_PROMPT_TTL_MS when not set', () => {
      delete process.env.CACHE_MERCHANT_PROMPT_TTL_MS;

      const config = varsConfig();

      expect(config.cache.merchantPromptTtlMs).toBeDefined();
      expect(typeof config.cache.merchantPromptTtlMs).toBe('number');
    });

    it('should use custom CACHE_MERCHANT_PROMPT_TTL_MS when set', () => {
      const customTtl = 1800000; // 30 minutes
      process.env.CACHE_MERCHANT_PROMPT_TTL_MS = customTtl.toString();

      const config = varsConfig();

      expect(config.cache.merchantPromptTtlMs).toBe(customTtl);
    });

    it('should use default CACHE_MERCHANT_STATUS_TTL_MS when not set', () => {
      delete process.env.CACHE_MERCHANT_STATUS_TTL_MS;

      const config = varsConfig();

      expect(config.cache.merchantStatusTtlMs).toBeDefined();
      expect(typeof config.cache.merchantStatusTtlMs).toBe('number');
    });

    it('should use custom CACHE_MERCHANT_STATUS_TTL_MS when set', () => {
      const customTtl = 300000; // 5 minutes
      process.env.CACHE_MERCHANT_STATUS_TTL_MS = customTtl.toString();

      const config = varsConfig();

      expect(config.cache.merchantStatusTtlMs).toBe(customTtl);
    });
  });

  describe('configuration structure', () => {
    it('should return complete configuration object', () => {
      const config = varsConfig();

      expect(config).toHaveProperty('rabbit');
      expect(config).toHaveProperty('chat');
      expect(config).toHaveProperty('embeddings');
      expect(config).toHaveProperty('security');
      expect(config).toHaveProperty('rateLimit');
      expect(config).toHaveProperty('cache');

      expect(typeof config.rabbit).toBe('object');
      expect(typeof config.chat).toBe('object');
      expect(typeof config.embeddings).toBe('object');
      expect(typeof config.security).toBe('object');
      expect(typeof config.rateLimit).toBe('object');
      expect(typeof config.cache).toBe('object');
    });

    it('should have all required rabbit properties', () => {
      const config = varsConfig();

      expect(config.rabbit).toHaveProperty('confirmTimeoutMs');
      expect(typeof config.rabbit.confirmTimeoutMs).toBe('number');
    });

    it('should have all required chat properties', () => {
      const config = varsConfig();

      expect(config.chat).toHaveProperty('n8nEndpoint');
      expect(config.chat).toHaveProperty('botName');
      expect(config.chat).toHaveProperty('defaultChannel');
      expect(config.chat).toHaveProperty('typing');
      expect(config.chat.typing).toHaveProperty('stopDelayMs');

      expect(typeof config.chat.n8nEndpoint).toBe('string');
      expect(typeof config.chat.botName).toBe('string');
      expect(typeof config.chat.defaultChannel).toBe('string');
      expect(typeof config.chat.typing.stopDelayMs).toBe('number');
    });

    it('should have all required embeddings properties', () => {
      const config = varsConfig();

      expect(config.embeddings).toHaveProperty('expectedDim');
      expect(config.embeddings).toHaveProperty('httpTimeoutMs');
      expect(config.embeddings).toHaveProperty('rxTimeoutMs');
      expect(config.embeddings).toHaveProperty('maxTextLength');
      expect(config.embeddings).toHaveProperty('retry');
      expect(config.embeddings).toHaveProperty('endpointPath');

      expect(config.embeddings.retry).toHaveProperty('maxRetries');
      expect(config.embeddings.retry).toHaveProperty('baseDelayMs');

      expect(typeof config.embeddings.expectedDim).toBe('number');
      expect(typeof config.embeddings.httpTimeoutMs).toBe('number');
      expect(typeof config.embeddings.rxTimeoutMs).toBe('number');
      expect(typeof config.embeddings.maxTextLength).toBe('number');
      expect(typeof config.embeddings.retry.maxRetries).toBe('number');
      expect(typeof config.embeddings.retry.baseDelayMs).toBe('number');
      expect(typeof config.embeddings.endpointPath).toBe('string');
    });

    it('should have all required security properties', () => {
      const config = varsConfig();

      expect(config.security).toHaveProperty('hstsMaxAge');
      expect(typeof config.security.hstsMaxAge).toBe('number');
    });

    it('should have all required rate limit properties', () => {
      const config = varsConfig();

      expect(config.rateLimit).toHaveProperty('windowMs');
      expect(config.rateLimit).toHaveProperty('max');
      expect(config.rateLimit).toHaveProperty('message');

      expect(config.rateLimit.message).toHaveProperty('code');
      expect(config.rateLimit.message).toHaveProperty('text');

      expect(typeof config.rateLimit.windowMs).toBe('number');
      expect(typeof config.rateLimit.max).toBe('number');
      expect(typeof config.rateLimit.message.code).toBe('string');
      expect(typeof config.rateLimit.message.text).toBe('string');
    });

    it('should have all required cache properties', () => {
      const config = varsConfig();

      expect(config.cache).toHaveProperty('merchantTtlMs');
      expect(config.cache).toHaveProperty('merchantPromptTtlMs');
      expect(config.cache).toHaveProperty('merchantStatusTtlMs');

      expect(typeof config.cache.merchantTtlMs).toBe('number');
      expect(typeof config.cache.merchantPromptTtlMs).toBe('number');
      expect(typeof config.cache.merchantStatusTtlMs).toBe('number');
    });
  });

  describe('environment variable parsing', () => {
    it('should handle all environment variables being set', () => {
      // Set all possible environment variables
      process.env.RABBIT_CONFIRM_TIMEOUT_MS = '10000';
      process.env.CHAT_N8N_ENDPOINT = '/custom/webhook';
      process.env.CHAT_BOT_NAME = 'test-bot';
      process.env.CHAT_DEFAULT_CHANNEL = 'telegram';
      process.env.CHAT_TYPING_STOP_DELAY_MS = '2000';
      process.env.EMBEDDINGS_EXPECTED_DIM = '768';
      process.env.EMBEDDINGS_HTTP_TIMEOUT_MS = '15000';
      process.env.EMBEDDINGS_RX_TIMEOUT_MS = '20000';
      process.env.EMBEDDINGS_MAX_TEXT_LENGTH = '3000';
      process.env.EMBEDDINGS_MAX_RETRIES = '7';
      process.env.EMBEDDINGS_BASE_RETRY_DELAY_MS = '3000';
      process.env.EMBEDDINGS_ENDPOINT_PATH = '/custom/embed';
      process.env.SEC_HSTS_MAX_AGE = '63072000';
      process.env.RATE_LIMIT_WINDOW_MS = '600000';
      process.env.RATE_LIMIT_MAX = '150';
      process.env.RATE_LIMIT_CODE = 'CUSTOM_LIMIT';
      process.env.RATE_LIMIT_TEXT = 'Custom limit message';
      process.env.CACHE_MERCHANT_TTL_MS = '7200000';
      process.env.CACHE_MERCHANT_PROMPT_TTL_MS = '3600000';
      process.env.CACHE_MERCHANT_STATUS_TTL_MS = '600000';

      const config = varsConfig();

      // Verify all custom values are used
      expect(config.rabbit.confirmTimeoutMs).toBe(10000);
      expect(config.chat.n8nEndpoint).toBe('/custom/webhook');
      expect(config.chat.botName).toBe('test-bot');
      expect(config.chat.defaultChannel).toBe('telegram');
      expect(config.chat.typing.stopDelayMs).toBe(2000);
      expect(config.embeddings.expectedDim).toBe(768);
      expect(config.embeddings.httpTimeoutMs).toBe(15000);
      expect(config.embeddings.rxTimeoutMs).toBe(20000);
      expect(config.embeddings.maxTextLength).toBe(3000);
      expect(config.embeddings.retry.maxRetries).toBe(7);
      expect(config.embeddings.retry.baseDelayMs).toBe(3000);
      expect(config.embeddings.endpointPath).toBe('/custom/embed');
      expect(config.security.hstsMaxAge).toBe(63072000);
      expect(config.rateLimit.windowMs).toBe(600000);
      expect(config.rateLimit.max).toBe(150);
      expect(config.rateLimit.message.code).toBe('CUSTOM_LIMIT');
      expect(config.rateLimit.message.text).toBe('Custom limit message');
      expect(config.cache.merchantTtlMs).toBe(7200000);
      expect(config.cache.merchantPromptTtlMs).toBe(3600000);
      expect(config.cache.merchantStatusTtlMs).toBe(600000);
    });

    it('should handle all environment variables being unset', () => {
      // Clear all possible environment variables
      delete process.env.RABBIT_CONFIRM_TIMEOUT_MS;
      delete process.env.CHAT_N8N_ENDPOINT;
      delete process.env.CHAT_BOT_NAME;
      delete process.env.CHAT_DEFAULT_CHANNEL;
      delete process.env.CHAT_TYPING_STOP_DELAY_MS;
      delete process.env.EMBEDDINGS_EXPECTED_DIM;
      delete process.env.EMBEDDINGS_HTTP_TIMEOUT_MS;
      delete process.env.EMBEDDINGS_RX_TIMEOUT_MS;
      delete process.env.EMBEDDINGS_MAX_TEXT_LENGTH;
      delete process.env.EMBEDDINGS_MAX_RETRIES;
      delete process.env.EMBEDDINGS_BASE_RETRY_DELAY_MS;
      delete process.env.EMBEDDINGS_ENDPOINT_PATH;
      delete process.env.SEC_HSTS_MAX_AGE;
      delete process.env.RATE_LIMIT_WINDOW_MS;
      delete process.env.RATE_LIMIT_MAX;
      delete process.env.RATE_LIMIT_CODE;
      delete process.env.RATE_LIMIT_TEXT;
      delete process.env.CACHE_MERCHANT_TTL_MS;
      delete process.env.CACHE_MERCHANT_PROMPT_TTL_MS;
      delete process.env.CACHE_MERCHANT_STATUS_TTL_MS;

      const config = varsConfig();

      // Verify defaults are used for all values
      expect(typeof config.rabbit.confirmTimeoutMs).toBe('number');
      expect(typeof config.chat.n8nEndpoint).toBe('string');
      expect(typeof config.chat.botName).toBe('string');
      expect(typeof config.chat.defaultChannel).toBe('string');
      expect(typeof config.chat.typing.stopDelayMs).toBe('number');
      expect(typeof config.embeddings.expectedDim).toBe('number');
      expect(typeof config.embeddings.httpTimeoutMs).toBe('number');
      expect(typeof config.embeddings.rxTimeoutMs).toBe('number');
      expect(typeof config.embeddings.maxTextLength).toBe('number');
      expect(typeof config.embeddings.retry.maxRetries).toBe('number');
      expect(typeof config.embeddings.retry.baseDelayMs).toBe('number');
      expect(typeof config.embeddings.endpointPath).toBe('string');
      expect(typeof config.security.hstsMaxAge).toBe('number');
      expect(typeof config.rateLimit.windowMs).toBe('number');
      expect(typeof config.rateLimit.max).toBe('number');
      expect(typeof config.rateLimit.message.code).toBe('string');
      expect(typeof config.rateLimit.message.text).toBe('string');
      expect(typeof config.cache.merchantTtlMs).toBe('number');
      expect(typeof config.cache.merchantPromptTtlMs).toBe('number');
      expect(typeof config.cache.merchantStatusTtlMs).toBe('number');
    });
  });

  describe('parseIntWithDefault function', () => {
    it('should handle valid integer strings', () => {
      // Access the private function through the module
      // We can't directly test the helper function, but we can test its behavior
      process.env.RABBIT_CONFIRM_TIMEOUT_MS = '12345';

      const config = varsConfig();
      expect(config.rabbit.confirmTimeoutMs).toBe(12345);
    });

    it('should handle floating point strings', () => {
      process.env.RABBIT_CONFIRM_TIMEOUT_MS = '12345.67';

      const config = varsConfig();
      expect(config.rabbit.confirmTimeoutMs).toBe(12345);
    });

    it('should handle zero values', () => {
      process.env.RABBIT_CONFIRM_TIMEOUT_MS = '0';

      const config = varsConfig();
      expect(config.rabbit.confirmTimeoutMs).toBe(0);
    });

    it('should handle large numbers', () => {
      process.env.RABBIT_CONFIRM_TIMEOUT_MS = '2147483647';

      const config = varsConfig();
      expect(config.rabbit.confirmTimeoutMs).toBe(2147483647);
    });
  });

  describe('configuration stability', () => {
    it('should return consistent configuration on multiple calls', () => {
      const config1 = varsConfig();
      const config2 = varsConfig();

      expect(config1).toEqual(config2);
    });

    it('should not mutate the original process.env', () => {
      const originalEnv = { ...process.env };

      varsConfig();

      expect(process.env).toEqual(originalEnv);
    });

    it('should handle concurrent configuration access', () => {
      const configs: ReturnType<typeof varsConfig>[] = [];

      // Simulate concurrent access
      for (let i = 0; i < 10; i++) {
        configs.push(varsConfig());
      }

      // All configurations should be identical
      for (let i = 1; i < configs.length; i++) {
        expect(configs[i]).toEqual(configs[0]);
      }
    });
  });
});
