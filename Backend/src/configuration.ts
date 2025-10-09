// src/configuration.ts

type Config = {
  n8n: {
    openaiWebhookUrl?: string;
  };
};

export const configuration = (): Config => ({
  n8n: {
    ...(process.env.N8N_OPENAI_WEBHOOK_URL && {
      openaiWebhookUrl: process.env.N8N_OPENAI_WEBHOOK_URL,
    }),
  },
  // هنا متغيرات أخرى إن وجدت
});
