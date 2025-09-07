import { Paper, Typography, Box, useTheme, useMediaQuery } from "@mui/material";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

// نفس النوع
type TimelinePoint = { _id: string; count: number };

interface Props {
  data: TimelinePoint[];
  mode?: "day" | "hour"; // لو عندك تجميع ساعات أو أيام (اختياري)
  daysRange?: number; // افتراضي 7 أيام
}

function formatDate(d: Date) {
  // YYYY-MM-DD
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fillByDay(data: TimelinePoint[], days = 7): TimelinePoint[] {
  const map = new Map<string, number>();
  for (const it of data ?? []) {
    const key = it._id || "unknown";
    const val = typeof it.count === "number" ? it.count : 0;
    map.set(key, (map.get(key) ?? 0) + val);
  }

  const out: TimelinePoint[] = [];
  const today = new Date();
  // ابدأ من الأقدم للأحدث
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = formatDate(d);
    out.push({ _id: key, count: map.get(key) ?? 0 });
  }
  return out;
}

export default function MessagesTimelineChart({
  data,
  mode = "day",
  daysRange = 7,
}: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.down("md"));

  // معالجة البيانات:
  const normalized = (data ?? []).map((it) => ({
    _id: it._id || "غير محدد",
    count: typeof it.count === "number" ? it.count : 0,
  }));

  // املأ الفترة بنقاط صفرية (يضمن ≥ نقطتين حتى لو يوم واحد عنده بيانات)
  const processedData =
    mode === "day" ? fillByDay(normalized, daysRange) : normalized;

  const isEmpty = processedData.every((d) => (d.count ?? 0) === 0);
  const chartHeight = isMobile ? 200 : isTablet ? 250 : 280;

  // Debug:
  // console.log({ original: data, processedData });

  return (
    <Paper
      sx={{
        p: isMobile ? 2 : 3,
        borderRadius: 3,
        boxShadow: 3,
        mt: 3,
        overflow: "hidden",
        minHeight: chartHeight + 100,
      }}
    >
      <Typography
        variant={isMobile ? "subtitle1" : "h6"}
        sx={{ fontWeight: 700, mb: 2, textAlign: isMobile ? "center" : "left" }}
      >
        عدد الرسائل مع الزمن
      </Typography>

      {isEmpty ? (
        <Typography
          sx={{ textAlign: "center", color: "text.secondary", py: 4 }}
        >
          لا توجد بيانات حالياً.
        </Typography>
      ) : (
        <Box dir="ltr" sx={{ width: "100%", height: chartHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={processedData}
              margin={{
                top: 10,
                right: isMobile ? 10 : 30,
                left: isMobile ? 10 : 30,
                bottom: isMobile ? 20 : 30,
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={theme.palette.divider}
                opacity={0.3}
              />
              <XAxis
                dataKey="_id"
                tick={{
                  fontSize: isMobile ? 10 : 12,
                  fill: theme.palette.text.secondary,
                }}
                tickLine={false}
                axisLine={{ stroke: theme.palette.divider }}
                interval="preserveStartEnd"
              />
              <YAxis
                allowDecimals={false}
                tick={{
                  fontSize: isMobile ? 10 : 12,
                  fill: theme.palette.text.secondary,
                }}
                tickLine={false}
                axisLine={{ stroke: theme.palette.divider }}
                width={isMobile ? 34 : 48}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: theme.palette.background.paper,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 8,
                  boxShadow: theme.shadows[4],
                  fontSize: isMobile ? 12 : 14,
                }}
                labelStyle={{
                  fontWeight: 600,
                  color: theme.palette.text.primary,
                }}
                formatter={(value: any) => [`${value} رسالة`, "عدد الرسائل"]}
                labelFormatter={(label: any) => `التاريخ: ${label}`}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#ff8500"
                strokeWidth={isMobile ? 2 : 3}
                dot={{ r: isMobile ? 3 : 4 }}
                activeDot={{ r: isMobile ? 5 : 6 }}
                connectNulls
                isAnimationActive={false} // ✅ يمنع مشاكل التحريك عند القياس الأول
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      )}
    </Paper>
  );
}
