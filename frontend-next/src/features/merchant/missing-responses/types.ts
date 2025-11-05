export type MissingResponse = {
  _id: string;
  merchantId: string;
  channel: string;
  question: string;
  botReply?: string;
  aiAnalysis?: string;
  type: 'missing_response' | 'unavailable_product';
  resolved: boolean;
  createdAt: string;
  updatedAt: string;
};

