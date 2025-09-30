// src/pages/dashboard/Dashboard.tsx
import { useState, useMemo, useEffect, type JSX } from "react";
import {
  Box,
  Paper,
  Stack,
  Typography,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  Divider,
  Chip,
  IconButton,
  Button,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import InsightsIcon from "@mui/icons-material/Insights";
import RefreshIcon from "@mui/icons-material/Refresh";
import ChecklistPanel from "@/features/mechant/dashboard/ui/ChecklistPanel";
import DashboardAdvice from "@/features/mechant/dashboard/ui/DashboardAdvice";
import ProductsChart from "@/features/mechant/dashboard/ui/ProductsChart";
import KeywordsChart from "@/features/mechant/dashboard/ui/KeywordsChart";
import ChannelsPieChart from "@/features/mechant/dashboard/ui/ChannelsPieChart";
import MessagesTimelineChart from "@/features/mechant/dashboard/ui/MessagesTimelineChart";
import { useAuth } from "@/context/hooks";
import {
  useChecklist,
  useMessagesTimeline,
  useOverview,
  useProductsCount,
  useSkipChecklist,
} from "@/features/mechant/analytics/model";
import { useStoreServicesFlag } from "@/shared/hooks/useStoreServicesFlag";
import { useNavigate } from "react-router-dom";
import { useErrorHandler } from "@/shared/errors";

type Period = "week" | "month" | "quarter";

function KpiCard({
  title,
  value,
  subtitle,
  highlight,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  highlight?: "pos" | "neg";
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
        height: "100%",
      }}
    >
      <Typography variant="caption" color="text.secondary">
        {title}
      </Typography>
      <Typography variant="h5" fontWeight={800} sx={{ my: 0.5 }}>
        {value}
      </Typography>
      {subtitle && (
        <Typography
          variant="caption"
          color={
            highlight === "pos"
              ? "success.main"
              : highlight === "neg"
              ? "error.main"
              : "text.secondary"
          }
        >
          {subtitle}
        </Typography>
      )}
    </Paper>
  );
}

export default function Dashboard() {
  const theme = useTheme();
  const isSm = useMediaQuery(theme.breakpoints.down("sm"));
  const isMd = useMediaQuery(theme.breakpoints.down("md"));
  const chartH = useMemo(() => (isSm ? 220 : isMd ? 300 : 360), [isSm, isMd]);
  const [timeRange, setTimeRange] = useState<Period>("week");
  const [activeTab, setActiveTab] = useState(0);
  const { user } = useAuth();
  const merchantId = user?.merchantId;
  const hasStore = useStoreServicesFlag();
  const navigate = useNavigate();
  const { handleError } = useErrorHandler();

  // Queries
  const {
    data: overview,
    isLoading: loadingOverview,
    error: errorOverview,
    refetch,
  } = useOverview(timeRange);

  const {
    data: checklistResponse,
    isLoading: loadingChecklist,
    error: errorChecklist,
  } = useChecklist(merchantId ?? undefined);

  // استخراج البيانات من response
  const checklist = checklistResponse || [];

  // إضافة debugging للـ checklist
  console.log("Dashboard Checklist Debug:", {
    checklistResponse,
    checklist,
    checklistType: typeof checklist,
    checklistIsArray: Array.isArray(checklist),
    loadingChecklist,
    errorChecklist,
    merchantId,
    checklistLength: Array.isArray(checklist) ? checklist.length : 0,
  });

  const { data: timeline, isLoading: loadingTimeline } = useMessagesTimeline(
    timeRange,
    "day"
  );

  // معالجة بيانات الخط الزمني
  const processedTimeline = useMemo(() => {
    if (!timeline || !Array.isArray(timeline)) return [];

    return timeline
      .filter((item): item is { _id: unknown; count: unknown } =>
        Boolean(
          item && typeof item === "object" && "_id" in item && "count" in item
        )
      )
      .map((item) => ({
        _id: String(item._id || ""),
        count: Number(item.count || 0),
      }))
      .sort((a, b) => {
        // محاولة ترتيب حسب التاريخ إذا كان _id يحتوي على تاريخ
        const dateA = new Date(a._id);
        const dateB = new Date(b._id);
        if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
          return dateA.getTime() - dateB.getTime();
        }
        return 0;
      });
  }, [timeline]);

  // Debug للخط الزمني
  console.log("Dashboard Timeline Debug:", {
    originalTimeline: timeline,
    processedTimeline,
    timelineLength: timeline?.length,
    processedLength: processedTimeline.length,
  });

  const { data: productsCountFallback } = useProductsCount();
  const { mutateAsync: skipItem } = useSkipChecklist(merchantId ?? undefined);

  // حالات عامة
  const loading = loadingOverview || loadingChecklist || loadingTimeline;

  // معالجة الأخطاء
  useEffect(() => {
    if (errorOverview) {
      handleError(errorOverview);
    }
    if (errorChecklist) {
      handleError(errorChecklist);
    }
  }, [errorOverview, errorChecklist, handleError]);

  // اشتقاقات نظيفة
  const sessionsCount = overview?.sessions?.count ?? 0;
  const sessionsDelta = overview?.sessions?.changePercent ?? 0;

  const messagesCount = overview?.messages ?? 0;
  const productsCount = overview?.productsCount ?? productsCountFallback ?? 0;

  const topProducts = Array.isArray(overview?.topProducts)
    ? overview!.topProducts.map((p: { productId: string; name: string; count: number }) => ({
        productId: p.productId,
        name: p.name,
        count: p.count,
      }))
    : [];

  const keywords = Array.isArray(overview?.topKeywords)
    ? overview!.topKeywords.map((kw: { keyword: string; count: number; percentage?: number }) => ({
        keyword: kw.keyword,
        count: kw.count,
        percentage: kw.percentage,
      }))
    : [];

  const channelUsage = Array.isArray(overview?.channels?.breakdown)
    ? overview!.channels.breakdown.map(
        (c: { channel: string; count: number }) => ({
          channel: c.channel,
          count: c.count,
        })
      )
    : [];

  // الإضافات (تعمل حتى لو الباك-إند ما رجّعها – تبقى undefined)
  const csat = overview?.csat; // 0..1
  const frt = overview?.firstResponseTimeSec;
  const missingOpen = overview?.missingOpen ?? 0;
  const revenue = overview?.orders?.totalSales ?? 0;
  const ordersCount = overview?.orders?.count ?? 0;
  const ordersDelta = overview?.orders?.changePercent ?? 0;
  const paidOrders = overview?.storeExtras?.paidOrders ?? 0;
  const aov = overview?.storeExtras?.aov ?? null;

  const kpiCards = useMemo(() => {
    const arr: JSX.Element[] = [];

    arr.push(
      <KpiCard
        key="sessions"
        title="المحادثات"
        value={sessionsCount}
        subtitle={`${sessionsDelta >= 0 ? "▲" : "▼"} ${Math.abs(
          sessionsDelta
        ).toFixed(0)}%`}
        highlight={sessionsDelta >= 0 ? "pos" : "neg"}
      />
    );

    arr.push(<KpiCard key="messages" title="الرسائل" value={messagesCount} />);

    if (typeof csat === "number") {
      arr.push(
        <KpiCard
          key="csat"
          title="رضا العملاء (CSAT)"
          value={`${Math.round(csat * 100)}%`}
        />
      );
    }

    if (typeof frt === "number") {
      arr.push(
        <KpiCard
          key="frt"
          title="زمن أول رد"
          value={`${frt}s`}
          subtitle="متوسط"
        />
      );
    }

    arr.push(
      <KpiCard
        key="missing"
        title="إجابات مفقودة (مفتوحة)"
        value={missingOpen}
      />
    );

    if (hasStore) {
      arr.push(
        <KpiCard
          key="revenue"
          title="إيراد الفترة"
          value={`${revenue.toLocaleString()}`}
          subtitle={`${ordersDelta >= 0 ? "▲" : "▼"} ${Math.abs(ordersDelta).toFixed(0)}%`}
          highlight={ordersDelta >= 0 ? "pos" : "neg"}
        />
      );
    } else {
      arr.push(
        <KpiCard key="products" title="عدد المنتجات" value={productsCount} />
      );
    }

    return arr;
  }, [
    sessionsCount,
    sessionsDelta,
    messagesCount,
    csat,
    frt,
    missingOpen,
    hasStore,
    revenue,
    ordersDelta,
    aov,
    paidOrders,
    productsCount,
  ]);

  const handleSkip = async (itemKey: string) => {
    try {
      await skipItem(itemKey);
    } catch {
      /* TODO: Toast */
    }
  };

  return (
    <Box
      sx={{ p: { xs: 1.5, md: 3 }, background: "#f9fafb", minHeight: "100vh" }}
    >
      {/* حالات */}
      {loading && (
        <Box
          sx={{
            minHeight: "60vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CircularProgress />
        </Box>
      )}

      {errorOverview && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {String(errorOverview) || "حدث خطأ أثناء جلب البيانات."}
        </Alert>
      )}

      {!loading && !errorOverview && (
        <>
          {/* رأس بسيط بدل DashboardHeader (أخف على الموبايل) */}
          <Paper
            elevation={0}
            sx={{
              p: 2,
              mb: 2,
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider",
              display: "flex",
              flexDirection: isSm ? "column" : "row",
              alignItems: isSm ? "stretch" : "center",
              gap: isSm ? 1 : 2,
              flexWrap: "wrap",
              justifyContent: "space-between",
              minWidth: 0,
            }}
          >
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ minWidth: 0 }}
            >
              <Typography variant="h6" fontWeight={800}>
                نظرة عامة
              </Typography>
              <Chip
                size="small"
                label={
                  timeRange === "week"
                    ? "آخر أسبوع"
                    : timeRange === "month"
                    ? "آخر شهر"
                    : "آخر ربع"
                }
              />
            </Stack>
            <Stack
              direction="row"
              spacing={1}
              sx={{ flexWrap: "wrap", minWidth: 0 }}
            >
              <Tabs
                value={["week", "month", "quarter"].indexOf(timeRange)}
                onChange={(_, v) =>
                  setTimeRange(["week", "month", "quarter"][v] as Period)
                }
                variant={isSm ? "scrollable" : "standard"}
                scrollButtons={isSm ? "auto" : false}
                sx={{
                  ".MuiTabs-flexContainer": { gap: 0.5 },
                  minHeight: 36,
                  "& .MuiTab-root": { minHeight: 36 },
                  marginBottom: isSm ? 1 : 2,
                }}
              >
                <Tab label="أسبوع" />
                <Tab label="شهر" />
                <Tab label="ربع" />
              </Tabs>
              <IconButton onClick={() => refetch()} aria-label="تحديث">
                <RefreshIcon />
              </IconButton>
              <Button
                onClick={() => navigate("/dashboard/analytics")}
                variant={isSm ? "outlined" : "contained"}
                size={isSm ? "small" : "medium"}
                fullWidth={isSm}
                startIcon={isSm ? undefined : <InsightsIcon />}
                sx={{
                  marginBottom: isSm ? 0 : 2,
                  marginTop: isSm ? 0 : 2,
                }}
              >
                {isSm ? "الإحصائيات" : "عرض الإحصائيات المتقدمة"}
              </Button>
            </Stack>
          </Paper>

          {/* Checklist أعلى، لكن مطوي على الموبايل داخل Paper */}
          <Paper
            elevation={0}
            sx={{
              p: { xs: 1, md: 2 },
              mb: 2,
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <ChecklistPanel
              checklist={Array.isArray(checklist) ? checklist : []}
              onSkip={handleSkip}
              loading={loadingChecklist}
              // إن كان لديك prop لتصغير العرض في الموبايل يمكن تمريره هنا
            />
            {/* Debug info */}
            {process.env.NODE_ENV === "development" && (
              <div
                style={{ fontSize: "12px", color: "gray", marginTop: "8px" }}
              >
                Debug: Checklist length ={" "}
                {Array.isArray(checklist) ? checklist.length : 0} | Loading ={" "}
                {loadingChecklist ? "true" : "false"} | Response ={" "}
                {JSON.stringify(checklistResponse?.length || 0)}
              </div>
            )}
          </Paper>

          {/* KPI GRID — ريسبونсив */}
          <Grid container spacing={isSm ? 1 : 2} sx={{ flexGrow: 1 }}>
            {kpiCards.map((card, i) => (
              <Grid
                size={{ xs: 12, sm: 6, md: 4, lg: 3 }}
                sx={{ minWidth: 0 }}
                key={i}
              >
                {card}
              </Grid>
            ))}
          </Grid>

          {/* الخط الزمني للرسائل */}
          <Box sx={{ mb: 3 }}>
            <MessagesTimelineChart data={processedTimeline} />
          </Box>

          {/* تبويبات التحليلات السريعة */}
          <Paper
            elevation={0}
            sx={{
              p: { xs: 1, md: 2 },
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider",
              overflow: "hidden", // منع خروج المحتوى
            }}
          >
            <Tabs
              value={activeTab}
              onChange={(_e, v) => setActiveTab(v)}
              variant={isSm ? "scrollable" : "standard"}
              scrollButtons={isSm ? "auto" : false}
              sx={{
                mb: 2,
                "& .MuiTabs-flexContainer": {
                  gap: isSm ? 0.5 : 1,
                },
                "& .MuiTab-root": {
                  minWidth: isSm ? "auto" : 120,
                  fontSize: isSm ? "0.75rem" : "0.875rem",
                  padding: isSm ? "6px 8px" : "12px 16px",
                },
              }}
            >
              <Tab label="المنتجات" />
              <Tab label="الكلمات المفتاحية" />
              <Tab label="القنوات" />
            </Tabs>

            <Button
              size="small"
              variant="text"
              sx={{
                mt: 1,
                mb: 2,
                fontSize: isSm ? "0.75rem" : "0.875rem",
                padding: isSm ? "4px 8px" : "8px 16px",
              }}
              onClick={() =>
                navigate(
                  `/dashboard/analytics?tab=${
                    activeTab === 0 ? 3 : activeTab === 1 ? 4 : 2
                  }`
                )
              }
            >
              فتح في صفحة الإحصائيات ↗
            </Button>

            <Box
              sx={{
                height: chartH,
                minWidth: 0,
                overflow: "auto", // أفضل من auto هنا
                position: "relative",
              }}
            >
              {activeTab === 2 && (
               <Box sx={{ height: '100%', p: 1 }}>
                  <ChannelsPieChart channelUsage={channelUsage} />
                </Box>
              )}
              {activeTab === 0 && (
                <Box sx={{ height: '100%', p: 1 }}>
                  <ProductsChart products={topProducts} />
                </Box>
              )}
              {activeTab === 1 && (
               <Box sx={{ height: '100%', p: 1 }}>
                  <KeywordsChart keywords={keywords} />
                </Box>
              )}
            </Box>
          </Paper>

          <Divider sx={{ my: 3 }} />

          <DashboardAdvice />
        </>
      )}
    </Box>
  );
}
