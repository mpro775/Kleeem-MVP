// src/configuration.ts

type Config = {
  n8n: {
    openaiWebhookUrl?: string;
  };
};

export default (): Config => ({
  n8n: {
    openaiWebhookUrl: process.env.N8N_OPENAI_WEBHOOK_URL,
  },
  // هنا متغيرات أخرى إن وجدت
});
