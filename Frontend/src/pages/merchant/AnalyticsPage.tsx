// src/pages/dashboard/AnalyticsPage.tsx
import {
  Box,
  Paper,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  Typography,
} from "@mui/material";
import { useAnalyticsPage } from "@/features/mechant/analytics/hooks/useAnalyticsPage";

// Import Tab Components
import { ConversationsTab } from "@/features/mechant/analytics/ui/tabs/ConversationsTab";
import { AiQualityTab } from "@/features/mechant/analytics/ui/tabs/AiQualityTab";
import { ChannelsTab } from "@/features/mechant/analytics/ui/tabs/ChannelsTab";
import { StoreTab } from "@/features/mechant/analytics/ui/tabs/StoreTab";
import { KnowledgeTab } from "@/features/mechant/analytics/ui/tabs/KnowledgeTab";
import { AnalyticsFilters } from "@/features/mechant/analytics/ui/AnalyticsFilters";
import type { Period, Channel, Faq, OverviewData, TopProduct } from "@/features/mechant/analytics/types";
import type { MissingListData } from "@/features/mechant/analytics/types";
import type { TimelinePoint as DashboardTimelinePoint } from "@/features/mechant/dashboard/type";

// Helper to render the correct tab panel
const renderTabContent = (
  tabIndex: number,
  data: ReturnType<typeof useAnalyticsPage>
) => {
  switch (tabIndex) {
    case 0:
      return (
        <ConversationsTab
          overviewData={{
            sessions: data.overviewData?.sessions || { count: 0, changePercent: null },
            productsCount: data.overviewData?.productsCount || 0,
            messages: data.overviewData?.messages || 0,
            topKeywords: data.overviewData?.topKeywords || [],
            topProducts: data.overviewData?.topProducts || [],
            channels: data.overviewData?.channels || { total: 0, breakdown: [] },
            storeExtras: data.overviewData?.storeExtras || { paidOrders: 0, aov: 0 },
            orders: data.overviewData?.orders || { count: 0, changePercent: null, byStatus: {}, totalSales: 0 },
            csat: data.overviewData?.csat,
            firstResponseTimeSec: data.overviewData?.firstResponseTimeSec,
            missingOpen: data.overviewData?.missingOpen
          }}
          timelineData={data.timelineData as DashboardTimelinePoint[]}
        />
      );
    case 1:
      return (
        <AiQualityTab
          csat={data.overviewData?.csat}
          missingOpenCount={data.overviewData?.missingOpen}
          missingStatsData={data.missingStatsData}
          missingListData={data.missingListData as MissingListData}
          onExportCsv={data.exportMissingCsv}
        />
      );
    case 2:
      return (
        <ChannelsTab
          channelBreakdown={data.overviewData?.channels?.breakdown}
        />
      );
    case 3:
      return (
        <StoreTab
          hasStore={data.hasStore}
          overviewData={data.overviewData as OverviewData}
          topProductsData={data.topProductsData as TopProduct[]}
        />
      );
    case 4:
      return (
        <KnowledgeTab
          faqsData={data.faqsData as Faq[]}
          missingOpenCount={data.overviewData?.missingOpen}
          topKeywordsData={data.topKeywordsData}
        />
      );
    default:
      return null;
  }
};

export default function AnalyticsPage() {
  // 1. Call the custom hook to get all logic and data
  const analytics = useAnalyticsPage();
  const {
    tab,
    period,
    channel,
    handleFilterChange,
    handleTabChange,
    isLoading,
    error,
  } = analytics;

  return (
    <Box
      sx={{ p: { xs: 1.5, md: 3 }, background: "#f9fafb", minHeight: "100svh" }}
    >
      {/* 2. Render Filters */}
      <AnalyticsFilters
        period={period}
        channel={channel}
        onFilterChange={(p, c) => handleFilterChange(p as Period, c as Channel)}
      />

      {/* 3. Handle Loading and Error states */}
      {isLoading && (
        <Box sx={{ display: "grid", placeItems: "center", height: "50vh" }}>
          <CircularProgress />
        </Box>
      )}
      {error && !isLoading && (
        <Alert severity="error">حدث خطأ: {(error as Error).message}</Alert>
      )}

      {/* 4. Render Tabs and Panels when not loading and no error */}
      {!isLoading && !error && (
        <Paper
          elevation={0}
          sx={{
            p: { xs: 1, md: 2 },
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Tabs
            value={tab}
            onChange={(_e, v) => handleTabChange(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ mb: 2 }}
          >
            <Tab label="المحادثات" />
            <Tab label="جودة الذكاء" />
            <Tab label="القنوات" />
            <Tab label="المتجر" />
            <Tab label="المعرفة" />
          </Tabs>

          {/* Render the active tab's content, passing all necessary data */}
          {renderTabContent(tab, analytics)}
        </Paper>
      )}

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ mt: 2, display: "block" }}
      >
        * تُحسب المقاييس بالفترة المحددة.
      </Typography>
    </Box>
  );
}
