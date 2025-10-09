describe('configuration', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  it('should return default configuration when no env vars are set', () => {
    // Clear all relevant env vars
    delete process.env.N8N_OPENAI_WEBHOOK_URL;

    const { configuration } = require('./configuration');

    const config = configuration();

    expect(config).toEqual({
      n8n: {},
    });
  });

  it('should include openaiWebhookUrl when N8N_OPENAI_WEBHOOK_URL is set', () => {
    const testUrl = 'https://test-webhook.example.com';
    process.env.N8N_OPENAI_WEBHOOK_URL = testUrl;

    const { configuration } = require('./configuration');

    const config = configuration();

    expect(config).toEqual({
      n8n: {
        openaiWebhookUrl: testUrl,
      },
    });
  });

  it('should not include openaiWebhookUrl when N8N_OPENAI_WEBHOOK_URL is empty string', () => {
    process.env.N8N_OPENAI_WEBHOOK_URL = '';

    const { configuration } = require('./configuration');

    const config = configuration();

    expect(config).toEqual({
      n8n: {},
    });
  });

  it('should handle falsy values for N8N_OPENAI_WEBHOOK_URL', () => {
    // Test various falsy values
    const falsyValues = [undefined, null, '', '0', 'false'];
    const results: Array<{ value: any; expected: any }> = [];

    falsyValues.forEach((falsyValue) => {
      delete process.env.N8N_OPENAI_WEBHOOK_URL;
      if (falsyValue !== undefined && falsyValue !== null) {
        process.env.N8N_OPENAI_WEBHOOK_URL = falsyValue;
      }

      const { configuration } = require('./configuration');
      const config = configuration();

      // Collect results instead of asserting conditionally
      results.push({
        value: falsyValue,
        expected: !falsyValue || falsyValue === '' ? undefined : falsyValue,
      });

      expect(config.n8n.openaiWebhookUrl).toBe(
        results[results.length - 1].expected,
      );
    });

    // Verify we tested all expected cases
    expect(results).toHaveLength(falsyValues.length);
  });

  it('should return a Config type object', () => {
    const { configuration } = require('./configuration');

    const config = configuration();

    // Verify the structure matches the Config type
    expect(config).toHaveProperty('n8n');
    expect(typeof config.n8n).toBe('object');
    expect(config.n8n).toHaveProperty('openaiWebhookUrl');

    // openaiWebhookUrl should be optional
    expect(config.n8n.openaiWebhookUrl).toBeUndefined();
  });
});
