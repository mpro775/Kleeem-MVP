// src/features/mechant/analytics/components/tabs/ChannelsTab.tsx
import { Suspense, lazy } from "react";
import { Grid, Paper, Typography, Box, Stack, Chip, CircularProgress } from "@mui/material";
import type { ChannelBreakdown } from "@/features/mechant/analytics/types";

const ChannelsPieChart = lazy(() => import("@/features/mechant/dashboard/ui/ChannelsPieChart"));

interface ChannelsTabProps {
  channelBreakdown?: ChannelBreakdown[];
}

export const ChannelsTab = ({ channelBreakdown = [] }: ChannelsTabProps) => {
  const pieChartData = channelBreakdown.map(c => ({ channel: c.channel, count: c.count }));

  return (
    <Grid container spacing={2}>
      <Grid  size={{xs: 12, md: 5}}>
        <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: "1px solid", borderColor: "divider", height: "100%" }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
            توزيع القنوات
          </Typography>
          <Box sx={{ width: "100%", height: 240 }}>
            <Suspense fallback={<Box sx={{ display: 'grid', placeItems: 'center', height: '100%' }}><CircularProgress /></Box>}>
              <ChannelsPieChart channelUsage={pieChartData} />
            </Suspense>
          </Box>
        </Paper>
      </Grid>
      <Grid  size={{xs: 12, md: 7}}>
        <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: "1px solid", borderColor: "divider", height: "100%" }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
            تفاصيل القنوات
          </Typography>
          <Stack spacing={1}>
            {channelBreakdown.length > 0 ? (
              channelBreakdown.map((c) => (
                <Stack key={c.channel} direction="row" justifyContent="space-between" sx={{ p: 1, borderRadius: 1, border: "1px dashed", borderColor: "divider" }}>
                  <Typography>{c.channel}</Typography>
                  <Chip size="small" label={c.count} />
                </Stack>
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">لا توجد بيانات لعرضها.</Typography>
            )}
          </Stack>
        </Paper>
      </Grid>
    </Grid>
  );
};