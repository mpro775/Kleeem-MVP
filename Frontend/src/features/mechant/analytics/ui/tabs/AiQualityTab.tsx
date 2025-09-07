// src/features/mechant/analytics/components/tabs/AiQualityTab.tsx
import {
  Grid,
  Stack,
  Paper,
  Typography,
  Box,
  Chip,
  Button,
} from "@mui/material";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { KpiCard } from "../KpiCard";
import type { MissingStatsData, MissingListData } from "@/features/mechant/analytics/types"; // تأكد من تصدير هذه الأنواع

interface AiQualityTabProps {
  csat?: number;
  missingOpenCount?: number;
  missingStatsData?: MissingStatsData[];
  missingListData?: MissingListData;
  onExportCsv: () => void;
}

export const AiQualityTab = ({
  csat,
  missingOpenCount,
  missingStatsData,
  missingListData,
  onExportCsv,
}: AiQualityTabProps) => {
  const latestMissingItems = (missingListData?.items ?? []).slice(0, 10);

  return (
    <Grid container spacing={2}>
      <Grid  size={{xs: 12, md: 8}}>
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
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
            الإجابات المفقودة — يوميًا
          </Typography>
          <Box sx={{ width: "100%", height: { xs: 240, md: 320 } }} dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={missingStatsData ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="unresolved"
                  stackId="1"
                  name="غير مُعالج"
                  fill="#ffc658"
                  stroke="#ffc658"
                />
                <Area
                  type="monotone"
                  dataKey="resolved"
                  stackId="1"
                  name="مُعالج"
                  fill="#82ca9d"
                  stroke="#82ca9d"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Box>
        </Paper>
      </Grid>
      <Grid  size={{xs: 12, md: 4}}>
        <Stack spacing={2}>
          {typeof csat === "number" && (
            <KpiCard title="CSAT الفترة" value={`${Math.round(csat * 100)}%`} />
          )}
          <KpiCard title="مفقود (مفتوح الآن)" value={missingOpenCount ?? 0} />
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
              أحدث 10 أسئلة غير مُعالجة
            </Typography>
            <Stack spacing={1}>
              {latestMissingItems.map((m) => (
                <Box
                  key={m._id}
                  sx={{
                    p: 1,
                    borderRadius: 1,
                    bgcolor: "background.default",
                    border: "1px dashed",
                    borderColor: "divider",
                  }}
                >
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    {m.question}
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <Chip size="small" label={m.channel} />
                    <Chip
                      size="small"
                      label={new Date(m.createdAt).toLocaleDateString()}
                    />
                  </Stack>
                </Box>
              ))}
              {latestMissingItems.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  لا توجد عناصر.
                </Typography>
              )}
              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  href="/dashboard/missing-responses"
                >
                  إدارة
                </Button>
                <Button size="small" variant="text" onClick={onExportCsv}>
                  تصدير CSV
                </Button>
              </Stack>
            </Stack>
          </Paper>
        </Stack>
      </Grid>
    </Grid>
  );
};
