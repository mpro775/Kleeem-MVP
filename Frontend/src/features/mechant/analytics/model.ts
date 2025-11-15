import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "./api";

export function useOverview(period: api.Period) {
  return useQuery({
    queryKey: ["analytics", "overview", period],
    queryFn: () => api.getOverview(period),
    staleTime: 60_000, // دقيقة
  });
}

export function useProductsCount() {
  return useQuery({
    queryKey: ["analytics", "products-count"],
    queryFn: api.getProductsCount,
    staleTime: 60_000,
  });
}

export function useMessagesTimeline(period: api.Period, groupBy: api.GroupBy = "day") {
  return useQuery({
    queryKey: ["analytics", "messages-timeline", period, groupBy],
    queryFn: () => api.getMessagesTimeline(period, groupBy),
    staleTime: 30_000,
  });
}

export function useChecklist(merchantId?: string) {
  return useQuery({
    enabled: !!merchantId,
    queryKey: ["merchant", merchantId, "checklist"],
    queryFn: () => api.getChecklist(merchantId!),
  });
}

export function useSkipChecklist(merchantId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemKey: string) => api.skipChecklistItem(merchantId!, itemKey),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["merchant", merchantId, "checklist"] });
    },
  });
}


export function useTopProducts(period: api.Period, enabled = true) {
  return useQuery({
    enabled,
    queryKey: ["analytics", "top-products", period],
    queryFn: () => api.getTopProducts(period, 8),
    staleTime: 60_000,
  });
}

export function useTopKeywords(period: api.Period, enabled = true) {
  return useQuery({
    enabled,
    queryKey: ["analytics", "top-keywords", period],
    queryFn: () => api.getTopKeywords(period, 10),
    staleTime: 60_000,
  });
}

export function useMissingStats(period: api.Period, enabled = true) {
  const days = period === "week" ? 7 : period === "month" ? 30 : 90;
  return useQuery({
    enabled,
    queryKey: ["analytics", "missing-stats", days],
    queryFn: () => api.getMissingStats(days),
    staleTime: 30_000,
  });
}

export function useMissingList(period: api.Period, channel: api.Channel, enabled = true) {
  return useQuery({
    enabled,
    queryKey: ["analytics", "missing-list", period, channel],
    queryFn: () => api.getMissingUnresolvedList({ page: 1, limit: 10, channel }),
    staleTime: 30_000,
  });
}

export function useFaqs(merchantId?: string, enabled = true) {
  return useQuery({
    enabled: enabled && !!merchantId,
    queryKey: ["merchant", merchantId, "faqs"],
    queryFn: () => api.getFaqs(merchantId!),
    staleTime: 60_000,
  });
}
