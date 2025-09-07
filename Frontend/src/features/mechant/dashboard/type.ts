// types/analytics.ts

export type ChecklistItem = {
    key: string;
    title: string;
    isComplete: boolean;
    message?: string;
    actionPath?: string;
    skippable?: boolean;
  
    isSkipped?: boolean;
  };
  export type ChecklistGroup = {
    key: string;
    title: string;
    items: ChecklistItem[];
  };
  
  export type Overview = {
    sessions: {
      count: number;
      changePercent: number;
    };
    productsCount: number;
    messages: number;
    topKeywords: { keyword: string; count: number }[];
    topProducts: { productId: string; name: string; count: number }[];
    channels: {
      total: number;
      breakdown: { channel: string; count: number }[];
    };
    storeExtras: {
      paidOrders: number;
      aov: number;
    };
    orders: {
      totalSales: number;
    };
    csat: number;
    firstResponseTimeSec: number;
    missingOpen: number;
  };
  
  // مخطط الزمن للرسائل
  export type TimelinePoint = {
    _id: string; // اليوم/الفترة
    count: number;
  };
  