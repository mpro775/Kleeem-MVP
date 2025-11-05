/**
 * Analytics Queries
 * @description React Query hooks for fetching analytics data
 */

import { useQuery } from '@tanstack/react-query';
import {
  getOverview,
  getProductsCount,
  getMessagesTimeline,
  getChecklist,
  getTopProducts,
  getTopKeywords,
  getMissingStats,
  getMissingUnresolvedList,
  getFaqs,
} from './api';
import type { Period, GroupBy, Channel } from './types';

/**
 * Query keys
 */
export const analyticsKeys = {
  all: ['analytics'] as const,
  overview: (period: Period) => [...analyticsKeys.all, 'overview', period] as const,
  productsCount: () => [...analyticsKeys.all, 'productsCount'] as const,
  timeline: (period: Period, groupBy: GroupBy) =>
    [...analyticsKeys.all, 'timeline', period, groupBy] as const,
  checklist: (merchantId: string) =>
    [...analyticsKeys.all, 'checklist', merchantId] as const,
  topProducts: (period: Period, limit: number) =>
    [...analyticsKeys.all, 'topProducts', period, limit] as const,
  topKeywords: (period: Period, limit: number) =>
    [...analyticsKeys.all, 'topKeywords', period, limit] as const,
  missingStats: (days: number) =>
    [...analyticsKeys.all, 'missingStats', days] as const,
  missingList: (page: number, limit: number, channel: Channel) =>
    [...analyticsKeys.all, 'missingList', page, limit, channel] as const,
  faqs: (merchantId: string) => [...analyticsKeys.all, 'faqs', merchantId] as const,
};

/**
 * Hook to fetch overview data
 */
export function useOverview(period: Period) {
  return useQuery({
    queryKey: analyticsKeys.overview(period),
    queryFn: () => getOverview(period),
    staleTime: 60000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch products count
 */
export function useProductsCount() {
  return useQuery({
    queryKey: analyticsKeys.productsCount(),
    queryFn: () => getProductsCount(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch messages timeline
 */
export function useMessagesTimeline(period: Period, groupBy: GroupBy = 'day') {
  return useQuery({
    queryKey: analyticsKeys.timeline(period, groupBy),
    queryFn: () => getMessagesTimeline(period, groupBy),
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook to fetch checklist
 */
export function useChecklist(merchantId: string | undefined) {
  return useQuery({
    queryKey: analyticsKeys.checklist(merchantId || ''),
    queryFn: () => getChecklist(merchantId!),
    enabled: !!merchantId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch top products
 */
export function useTopProducts(period: Period, limit = 8) {
  return useQuery({
    queryKey: analyticsKeys.topProducts(period, limit),
    queryFn: () => getTopProducts(period, limit),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to fetch top keywords
 */
export function useTopKeywords(period: Period, limit = 10) {
  return useQuery({
    queryKey: analyticsKeys.topKeywords(period, limit),
    queryFn: () => getTopKeywords(period, limit),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to fetch missing stats
 */
export function useMissingStats(days: number) {
  return useQuery({
    queryKey: analyticsKeys.missingStats(days),
    queryFn: () => getMissingStats(days),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to fetch missing list
 */
export function useMissingList(
  page: number,
  limit: number,
  channel: Channel = 'all'
) {
  return useQuery({
    queryKey: analyticsKeys.missingList(page, limit, channel),
    queryFn: () => getMissingUnresolvedList({ page, limit, channel }),
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook to fetch FAQs
 */
export function useFaqs(merchantId: string | undefined) {
  return useQuery({
    queryKey: analyticsKeys.faqs(merchantId || ''),
    queryFn: () => getFaqs(merchantId!),
    enabled: !!merchantId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

