export type Instruction = {
    _id: string;
    instruction: string;
    type: 'auto' | 'manual';
    active: boolean;
    merchantId?: string;
    relatedReplies?: string[];
    createdAt: string;
    updatedAt: string;
  };
  export interface Suggestion {
    badReply: string;
    count: number;
    instruction: string;
  }
  
  // واجهة موحدة للبيانات المستلمة من الـ API
  export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    // يمكن إضافة page, limit إذا كانت الـ API ترجعها
  }