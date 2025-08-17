// src/modules/webhooks/interfaces/webhook-payload.interface.ts
export interface WebhookPayload {
  orderId?: string;
  amount?: number;
  status?: string;
  [key: string]: any; // <-- لو هناك خصائص ديناميكية
}
