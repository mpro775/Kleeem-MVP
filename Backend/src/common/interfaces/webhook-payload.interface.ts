// src/modules/webhooks/interfaces/webhook-payload.interface.ts
export interface WebhookPayload {
  orderId?: string;
  amount?: number;
  status?: string;
  [key: string]: any;
}

// ✅ Alias يحلّ أي استيراد قديم
export type WebhookPayloadInterface = WebhookPayload;
