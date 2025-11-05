'use client';

import { Box, Typography, useTheme, Stack, Chip } from '@mui/material';
import { PieChart, Pie, Cell, ResponsiveContainer,  Tooltip } from 'recharts';
import type { ChannelBreakdown } from '../types';

interface ChannelsPieChartProps {
  data: ChannelBreakdown[];
}

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: 'واتساب',
  telegram: 'تليجرام',
  webchat: 'الويب',
};

export function ChannelsPieChart({ data }: ChannelsPieChartProps) {
  const theme = useTheme();

  if (!data || data.length === 0) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
        <Typography variant="body2" color="text.secondary">
          لا توجد بيانات للعرض
        </Typography>
      </Box>
    );
  }

  const COLORS = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.info.main,
  ];

  const chartData = data.map((item) => ({
    name: CHANNEL_LABELS[item.channel] || item.channel,
    value: item.count,
  }));

  const total = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <Box>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: theme.palette.background.paper,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 8,
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap" mt={1}>
        {chartData.map((item, index) => (
          <Chip
            key={item.name}
            label={`${item.name}: ${item.value}`}
            size="small"
            sx={{
              bgcolor: COLORS[index % COLORS.length],
              color: 'white',
            }}
          />
        ))}
      </Stack>

      <Typography variant="caption" color="text.secondary" textAlign="center" display="block" mt={1}>
        الإجمالي: {total}
      </Typography>
    </Box>
  );
}

