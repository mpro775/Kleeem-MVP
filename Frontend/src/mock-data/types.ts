// أنواع البيانات الوهمية
// هذا الملف يحتوي على تعريفات الأنواع المستخدمة في نظام البيانات الوهمية

export type MockUser = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "MERCHANT" | "MEMBER";
  merchantId: string | null;
  firstLogin: boolean;
  emailVerified: boolean;
  storeName?: string | null;
  storeLogoUrl?: string | null;
  storeAvatarUrl?: string | null;
};

export type MockProduct = {
  _id: string;
  id?: string;
  merchantId: string;
  name: string;
  description?: string;
  price: number;
  currency?: "SAR" | "YER" | "USD";
  isAvailable: boolean;
  images: string[];
  category: string;
  [key: string]: unknown;
};

export type MockConversation = {
  _id: string;
  merchantId: string;
  sessionId: string;
  channel: "whatsapp" | "telegram" | "webchat";
  messages: Array<{
    role: "customer" | "bot" | "agent";
    text: string;
    timestamp: string;
    metadata?: Record<string, unknown>;
    _id?: string;
    rating?: 0 | 1 | null;
    feedback?: string | null;
  }>;
  createdAt: string;
  updatedAt: string;
};

