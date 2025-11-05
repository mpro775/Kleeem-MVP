/**
 * Analytics Feature Types
 * @description Type definitions for Analytics and Dashboard metrics
 */

/**
 * Filter types
 */
export type Period = 'week' | 'month' | 'quarter';
export type Channel = 'all' | 'whatsapp' | 'telegram' | 'webchat';
export type GroupBy = 'day' | 'week';

/**
 * Channel Breakdown
 */
export interface ChannelBreakdown {
  channel: string;
  count: number;
}

/**
 * Overview Data (Main Dashboard Metrics)
 */
export interface OverviewData {
  sessions: {
    count: number;
    changePercent: number | null;
  };
  messages: number;
  firstResponseTimeSec?: number | null;
  csat?: number; // 0-1
  missingOpen?: number;
  topKeywords?: TopKeyword[];
  topProducts?: TopProduct[];
  channels?: {
    total: number;
    breakdown: ChannelBreakdown[];
  };
  orders?: {
    count: number;
    changePercent: number | null;
    byStatus: Record<string, number>;
    totalSales: number;
  };
  productsCount: number;
  storeExtras?: {
    paidOrders: number;
    aov: number; // Average Order Value
  };
}

/**
 * Timeline Point (for charts)
 */
export interface TimelinePoint {
  _id: string; // Date string like "2024-08-25"
  count: number;
}

/**
 * Top Product
 */
export interface TopProduct {
  productId: string;
  name: string;
  count: number;
}

/**
 * Top Keyword
 */
export interface TopKeyword {
  keyword: string;
  count: number;
  percentage?: number;
}

/**
 * Missing Stats Data (for charts)
 */
export interface MissingStatsData {
  day: string;
  unresolved: number;
  resolved: number;
  total: number;
}

/**
 * Missing List Item
 */
export interface MissingListItem {
  _id: string;
  question: string;
  channel: string;
  createdAt: string;
}

/**
 * Missing List Data (Paginated)
 */
export interface MissingListData {
  items: MissingListItem[];
  total: number;
  page: number;
  limit: number;
}

/**
 * FAQ
 */
export interface Faq {
  _id: string;
  question: string;
  answer: string;
}

/**
 * Checklist Item
 */
export interface ChecklistItem {
  key: string;
  title: string;
  description: string;
  completed: boolean;
  skipped: boolean;
  actionUrl?: string;
}

/**
 * Checklist Group
 */
export interface ChecklistGroup {
  groupTitle: string;
  items: ChecklistItem[];
}

/**
 * Metrics Card Props
 */
export interface MetricCardData {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: number; // Percentage change
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
}

