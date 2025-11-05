/**
 * Analytics API
 * @description API calls for analytics and dashboard metrics
 */

import axiosInstance from '@/lib/api/axios';
import type {
  Period,
  GroupBy,
  Channel,
  OverviewData,
  TimelinePoint,
  TopProduct,
  TopKeyword,
  MissingStatsData,
  MissingListData,
  Faq,
  ChecklistGroup,
} from './types';

/**
 * Ensure array helper
 */
const ensureArray = <T,>(x: unknown): T[] =>
  Array.isArray(x) ? (x as T[]) : [];

/**
 * Get overview metrics
 */
export async function getOverview(period: Period): Promise<OverviewData> {
  const response = await axiosInstance.get<OverviewData>(
    '/analytics/overview',
    {
      params: { period },
    }
  );
  return response.data;
}

/**
 * Get products count
 */
export async function getProductsCount(): Promise<number> {
  const response = await axiosInstance.get<{ total: number } | number>(
    '/analytics/products-count'
  );
  const payload = response.data;
  return typeof payload === 'number' ? payload : payload?.total ?? 0;
}

/**
 * Get messages timeline
 */
export async function getMessagesTimeline(
  period: Period,
  groupBy: GroupBy = 'day'
): Promise<TimelinePoint[]> {
  const response = await axiosInstance.get<TimelinePoint[]>(
    '/analytics/messages-timeline',
    {
      params: { period, groupBy },
    }
  );
  return ensureArray(response.data);
}

/**
 * Get checklist for merchant
 */
export async function getChecklist(
  merchantId: string
): Promise<ChecklistGroup[]> {
  const response = await axiosInstance.get<ChecklistGroup[]>(
    `/merchants/${merchantId}/checklist`
  );
  return ensureArray(response.data);
}

/**
 * Skip checklist item
 */
export async function skipChecklistItem(
  merchantId: string,
  itemKey: string
): Promise<void> {
  await axiosInstance.post(
    `/merchants/${merchantId}/checklist/${itemKey}/skip`
  );
}

/**
 * Get top products
 */
export async function getTopProducts(
  period: Period,
  limit = 8
): Promise<TopProduct[]> {
  const response = await axiosInstance.get<TopProduct[]>(
    '/analytics/top-products',
    {
      params: { period, limit },
    }
  );
  return ensureArray(response.data);
}

/**
 * Get top keywords
 */
export async function getTopKeywords(
  period: Period,
  limit = 10
): Promise<TopKeyword[]> {
  const response = await axiosInstance.get<TopKeyword[]>(
    '/analytics/top-keywords',
    {
      params: { period, limit },
    }
  );
  return ensureArray(response.data);
}

/**
 * Get missing responses stats
 */
export async function getMissingStats(
  days: number
): Promise<MissingStatsData[]> {
  const response = await axiosInstance.get<
    {
      _id: string;
      channels: { channel: string; count: number; resolved: boolean }[];
      total: number;
    }[]
  >('/analytics/missing-responses/stats', {
    params: { days },
  });

  const rows = ensureArray(response.data);
  return rows.map((d) => {
    let resolved = 0;
    let unresolved = 0;
    for (const ch of d.channels || []) {
      if (ch.resolved) {
        resolved += ch.count;
      } else {
        unresolved += ch.count;
      }
    }
    return {
      day: d._id,
      resolved,
      unresolved,
      total: d.total,
    };
  });
}

/**
 * Get missing unresolved list
 */
export async function getMissingUnresolvedList(params: {
  page?: number;
  limit?: number;
  channel?: Channel;
}): Promise<MissingListData> {
  const { page = 1, limit = 10, channel = 'all' } = params;
  const response = await axiosInstance.get<MissingListData>(
    '/analytics/missing-responses',
    {
      params: { page, limit, resolved: 'false', channel },
    }
  );
  return response.data;
}

/**
 * Get FAQs
 */
export async function getFaqs(merchantId: string): Promise<Faq[]> {
  const response = await axiosInstance.get<Faq[]>(
    `/merchants/${merchantId}/faqs`
  );
  return ensureArray(response.data);
}

/**
 * Export missing responses to CSV
 */
export async function exportMissingCsv(channel: Channel = 'all'): Promise<Blob> {
  const response = await axiosInstance.get('/analytics/missing-responses/export', {
    params: { channel },
    responseType: 'blob',
  });
  return response.data;
}

