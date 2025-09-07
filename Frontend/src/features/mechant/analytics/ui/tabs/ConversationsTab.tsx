// src/features/mechant/analytics/components/tabs/ConversationsTab.tsx
import { Suspense, lazy } from "react";
import {
  Grid,
  Stack,
  Box,
  CircularProgress,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { KpiCard } from "../KpiCard";
import type { Overview, TimelinePoint } from "@/features/mechant/dashboard/type"; // Assuming types are exported

const MessagesTimelineChart = lazy(
  () => import("@/features/mechant/dashboard/ui/MessagesTimelineChart")
);

interface ConversationsTabProps {
  overviewData?: Overview;
  timelineData?: TimelinePoint[];
}

export const ConversationsTab = ({
  overviewData,
  timelineData,
}: ConversationsTabProps) => {
  const theme = useTheme();
  const isSm = useMediaQuery(theme.breakpoints.down("sm"));
  const chartH = isSm ? 220 : 360;

  const sessionsChange = overviewData?.sessions?.changePercent ?? 0;

  return (
    <Grid container spacing={2}>
      <Grid  size={{xs: 12, md: 4, lg: 3}}>
        <Stack spacing={2}>
          <KpiCard
            title="عدد المحادثات"
            value={overviewData?.sessions?.count ?? 0}
            subtitle={`التغير: ${sessionsChange >= 0 ? "▲" : "▼"}${Math.abs(
              sessionsChange
            )}%`}
          />
          <KpiCard title="الرسائل" value={overviewData?.messages ?? 0} />
          {/* Add other KPIs similarly */}
        </Stack>
      </Grid>
      <Grid  size={{xs: 12, md: 8, lg: 9}}>
        <Box sx={{ height: chartH, width: "100%" }}>
          <Suspense fallback={<CircularProgress />}>
            <MessagesTimelineChart data={timelineData ?? []} />
          </Suspense>
        </Box>
      </Grid>
    </Grid>
  );
};
