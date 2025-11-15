export type MissingResponse = {
    _id: string;
    merchant: string;
    channel: 'telegram' | 'whatsapp' | 'webchat';
    question: string;
    botReply: string;
    sessionId?: string;
    aiAnalysis?: string;
    customerId?: string;
    type: 'missing_response' | 'unavailable_product';
    resolved: boolean;
    resolvedAt?: string;
    resolvedBy?: string;
    createdAt: string;
  };