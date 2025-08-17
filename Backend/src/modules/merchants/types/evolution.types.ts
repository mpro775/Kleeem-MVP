// types/evolution.types.ts
export interface StartSessionResponse {
  instanceId: string;
}

export interface QrResponse {
  qr: string;
}

export interface StatusResponse {
  state: string;
}

export interface SendMessageResponse {
  success: boolean;
  [key: string]: any;
}

export interface SetWebhookResponse {
  success: boolean;
  [key: string]: any;
}
export interface WhatsappInstanceInfo {
  instanceName: string;
  instanceId: string;
  status: string;
  serverUrl?: string;
  apikey?: string;
  integration?: {
    token?: string;
    webhook_wa_business?: string;
    // ... أي حقول مستقبلية
  };
  // أضف أي حقول تتوقعها
}
export interface WhatsappInstanceCreateResponse {
  instance: {
    instanceName: string;
    instanceId: string;
    webhook_wa_business: string | null;
    access_token_wa_business: string;
    status: string; // غالباً "created"
  };
  hash?: {
    apikey?: string;
  };
  webhook?: Record<string, unknown>;
  websocket?: Record<string, unknown>;
  rabbitmq?: Record<string, unknown>;
  sqs?: Record<string, unknown>;
  typebot?: {
    enabled: boolean;
  };
  settings?: Record<string, unknown>;
  qrcode?: {
    pairingCode: string | null;
    code: string;
    base64: string; // هذا هو الـ QR
    count: number;
  };
}
export interface WhatsappDeleteInstanceResponse {
  status: string; // "SUCCESS" غالبًا
  error: boolean;
  response: {
    message: string; // "Instance deleted"
  };
}
export interface WhatsappSetWebhookResponse {
  webhook: {
    instanceName: string;
    webhook: {
      url: string;
      events: string[];
      webhook_by_events: boolean;
      webhook_base64: boolean;
      enabled: boolean;
    };
  };
}
