'use client';

import { Paper, Typography, Box } from "@mui/material";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
} from "recharts";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

type ChannelUsageType = { channel: string; count: number };

const COLORS = [
  "#0077b6",
  "#00b4d8",
  "#90e0ef",
  "#ff9e00",
  "#ff6d00",
  "#ff5400",
];

interface ChannelsPieChartProps {
  channelUsage: ChannelUsageType[];
}

export default function ChannelsPieChart({
  channelUsage,
}: ChannelsPieChartProps) {
  const isEmpty =
    !channelUsage ||
    channelUsage.length === 0 ||
    channelUsage.every((c) => (c?.count ?? 0) === 0);

  return (
    <Paper
      sx={{
        p: { xs: 2, md: 3 },
        borderRadius: 3,
        boxShadow: 3,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        minHeight: 0,
      }}
    >
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
        توزيع القنوات
      </Typography>

      {isEmpty ? (
        <Box
          sx={{
            flex: 1,
            minHeight: 180,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "text.secondary",
          }}
        >
          <InfoOutlinedIcon sx={{ fontSize: 42, mb: 1 }} />
          <Typography variant="body1" sx={{ fontWeight: 500 }}>
            لا توجد بيانات لعرضها حالياً
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            تأكد من تفعيل القنوات أو وجود تفاعل خلال الفترة المحددة.
          </Typography>
        </Box>
      ) : (
        // ✅ المساحة الباقية من الورقة للرسم
        <Box dir="ltr" sx={{ flex: 1, minHeight: 0, width: "100%" }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={channelUsage}
                dataKey="count"
                nameKey="channel"
                innerRadius="55%"
                outerRadius="80%"
                labelLine={false}
                label={(e: any) =>
                  `${e.channel}: ${((e.percent || 0) * 100).toFixed(0)}%`
                }
                isAnimationActive={false}
              >
                {channelUsage.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip
                formatter={(v: number) => [`${v} جلسة`, "عدد الجلسات"]}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,0.08)",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
                  backgroundColor: "var(--mui-palette-background-paper)",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </Box>
      )}
    </Paper>
  );
}
