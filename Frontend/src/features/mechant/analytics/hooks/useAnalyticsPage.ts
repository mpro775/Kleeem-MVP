// src/features/mechant/analytics/hooks/useAnalyticsPage.ts
import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useStoreServicesFlag } from "@/shared/hooks/useStoreServicesFlag";
import type { Period, Channel } from "../api";
import {
  useOverview,
  useMessagesTimeline,
  useTopProducts,
  useTopKeywords,
  useMissingStats,
  useMissingList,
  useFaqs,
} from "../model"; // Assuming model is where the query hooks are

export const useAnalyticsPage = () => {
  const { user } = useAuth();
  const merchantId = user?.merchantId || "";
  const hasStore = useStoreServicesFlag();

  // 1. State and URL Management
  const [sp, setSp] = useSearchParams();
  const [tab, setTab] = useState(() => Number(sp.get("tab") || "0"));
  const [period, setPeriod] = useState<Period>((sp.get("period") as Period) || "week");
  const [channel, setChannel] = useState<Channel>((sp.get("channel") as Channel) || "all");

  const handleFilterChange = (newPeriod: Period, newChannel: Channel) => {
    setPeriod(newPeriod);
    setChannel(newChannel);
    const next = new URLSearchParams(sp);
    next.set("period", newPeriod);
    next.set("channel", newChannel);
    setSp(next, { replace: true });
  };

  const handleTabChange = (newTab: number) => {
    setTab(newTab);
    const next = new URLSearchParams(sp);
    next.set("tab", String(newTab));
    setSp(next, { replace: true });
  };

  // 2. Data Fetching using React Query Hooks
  const overviewQuery = useOverview(period);
  const timelineQuery = useMessagesTimeline(period, "day");
  const topProductsQuery = useTopProducts(period, tab === 3 && hasStore);
  const topKeywordsQuery = useTopKeywords(period, tab === 4);
  const missingStatsQuery = useMissingStats(period, tab === 1);
  const missingListQuery = useMissingList(period, channel, tab === 1);
  const faqsQuery = useFaqs(merchantId, tab === 4);

  // 3. Consolidate Loading and Error States
  const isLoading = useMemo(
    () =>
      [
        overviewQuery,
        timelineQuery,
        topProductsQuery,
        topKeywordsQuery,
        missingStatsQuery,
        missingListQuery,
        faqsQuery,
      ].some((q) => q.isLoading),
    [overviewQuery, timelineQuery, topProductsQuery, topKeywordsQuery, missingStatsQuery, missingListQuery, faqsQuery]
  );
  
  const error = useMemo(
    () =>
      [
        overviewQuery,
        timelineQuery,
        topProductsQuery,
        topKeywordsQuery,
        missingStatsQuery,
        missingListQuery,
        faqsQuery,
      ].find((q) => q.error)?.error,
    [overviewQuery, timelineQuery, topProductsQuery, topKeywordsQuery, missingStatsQuery, missingListQuery, faqsQuery]
  );

  // 4. Helper Functions
  const exportMissingCsv = () => {
    const list = missingListQuery.data?.items ?? [];
    if (list.length === 0) return;
    const header = "question,channel,createdAt\n";
    const rows = list
      .map((m) =>
        [JSON.stringify(m.question || ""), m.channel, new Date(m.createdAt).toISOString()].join(",")
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `missing-responses-${period}-${channel}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 5. Return everything the UI needs
  return {
    // State
    tab,
    period,
    channel,
    hasStore,
    isLoading,
    error,
    // Data
    overviewData: overviewQuery.data,
    timelineData: timelineQuery.data,
    topProductsData: topProductsQuery.data,
    topKeywordsData: topKeywordsQuery.data,
    missingStatsData: missingStatsQuery.data,
    missingListData: missingListQuery.data,
    faqsData: faqsQuery.data,
    // Handlers
    handleFilterChange,
    handleTabChange,
    exportMissingCsv,
  };
};