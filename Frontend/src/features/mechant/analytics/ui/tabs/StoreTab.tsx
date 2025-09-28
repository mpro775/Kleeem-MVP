// src/features/mechant/analytics/components/tabs/StoreTab.tsx
import { Suspense, lazy } from "react";
import { Grid, Paper, Typography, Box, Stack, Chip, CircularProgress } from "@mui/material";
import { KpiCard } from "../KpiCard";
import type { OverviewData, TopProduct } from "@/features/mechant/analytics/types";

const ProductsChart = lazy(() => import("@/features/mechant/dashboard/ui/ProductsChart"));

interface StoreTabProps {
  hasStore: boolean;
  overviewData?: OverviewData;
  topProductsData?: TopProduct[];
}

export const StoreTab = ({ hasStore, overviewData, topProductsData = [] }: StoreTabProps) => {
  if (!hasStore) {
    return (
      <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: "1px solid", borderColor: "divider", textAlign: "center" }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>متجر كليم غير مفعّل</Typography>
        <Typography variant="body2" color="text.secondary">فعّل ميزة المتجر لعرض الإيرادات، الطلبات، وأفضل المنتجات.</Typography>
      </Paper>
    );
  }

  const ordersByStatus = (overviewData?.orders as any)?.byStatus ?? {};

  return (
    <Grid container spacing={2}>
      <Grid  size={{xs: 12, md: 4}}>
        <Stack spacing={2}>
          <KpiCard title="الإيراد" value={`${(overviewData?.orders?.totalSales ?? 0).toLocaleString()} ر.س`} />
          <KpiCard title="الطلبات" value={overviewData?.orders?.count ?? 0} />
          {overviewData?.storeExtras?.aov != null && (
            <KpiCard title="متوسط قيمة الطلب (AOV)" value={`${Number(overviewData.storeExtras.aov).toLocaleString()} ر.س`} />
          )}
          <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>حالة الطلبات</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {Object.entries(ordersByStatus).map(([status, cnt]) => (
                <Chip key={status} size="small" variant="outlined" label={`${status}: ${cnt}`} />
              ))}
            </Stack>
          </Paper>
        </Stack>
      </Grid>
      <Grid  size={{xs: 12, md: 8}}>
        <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: "1px solid", borderColor: "divider", height: "100%" }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>أفضل المنتجات</Typography>
          <Box sx={{ width: "100%", height: { xs: 220, md: 300 } }}>
            <Suspense fallback={<Box sx={{ display: 'grid', placeItems: 'center', height: '100%' }}><CircularProgress /></Box>}>
              <ProductsChart products={topProductsData.map(p => ({ name: p.name, value: p.count }))} />
            </Suspense>
          </Box>
        </Paper>
      </Grid>
    </Grid>
  );
};