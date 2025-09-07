// src/features/mechant/analytics/types.ts

// أنواع الفلاتر المستخدمة في الصفحة
export type Period = "week" | "month" | "quarter";
export type Channel = "all" | "whatsapp" | "telegram" | "webchat";

// -----------------------------------------------------------------------------
// أنواع البيانات للـ Overview API
// -----------------------------------------------------------------------------

export interface ChannelBreakdown {
  channel: string;
  count: number;
}

export interface OverviewData {
  sessions?: {
    count: number;
    changePercent: number;
  };
  messages?: number;
  firstResponseTimeSec?: number;
  csat?: number;
  missingOpen?: number;
  channels?: {
    breakdown: ChannelBreakdown[];
  };
  orders?: {
    count: number;
    totalSales: number;
    byStatus: Record<string, number>;
  };
  storeExtras?: {
    aov: number; // Average Order Value
    paidOrders: number;
  };
}

// -----------------------------------------------------------------------------
// أنواع البيانات لمخططات ورسوم الإحصائيات
// -----------------------------------------------------------------------------

// نقطة بيانات في الخط الزمني للمحادثات
export interface TimelinePoint {
  date: string; // e.g., "2024-08-25"
  messages: number;
  sessions: number;
}

// بيانات إحصائيات الإجابات المفقودة
export interface MissingStatsData {
  day: string; // e.g., "Aug 25"
  unresolved: number;
  resolved: number;
}

// عنصر واحد في قائمة الإجابات المفقودة
export interface MissingListItem {
  _id: string;
  question: string;
  channel: string;
  createdAt: string; // ISO Date String
}

// بيانات قائمة الإجابات المفقودة (مع ترقيم الصفحات)
export interface MissingListData {
  items: MissingListItem[];
  total: number;
  page: number;
  limit: number;
}

// بيانات المنتجات الأعلى مبيعًا
export interface TopProduct {
  name: string;
  sales: number;
}

// بيانات الكلمات المفتاحية الأكثر استخدامًا
export interface TopKeyword {
  keyword: string;
  count: number;
}

// -----------------------------------------------------------------------------
// أنواع بيانات المعرفة (Knowledge)
// -----------------------------------------------------------------------------

export interface Faq {
  _id: string;
  question: string;
  answer: string;
  // أضف أي حقول أخرى ذات صلة
}