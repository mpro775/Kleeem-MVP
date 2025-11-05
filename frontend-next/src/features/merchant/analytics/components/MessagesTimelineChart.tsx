'use client';

import { useMemo } from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import type { TimelinePoint } from '../types';

interface MessagesTimelineChartProps {
  data: TimelinePoint[];
}

export function MessagesTimelineChart({ data }: MessagesTimelineChartProps) {
  const theme = useTheme();

  const chartData = useMemo(() => {
    return data.map((point) => ({
      date: format(new Date(point._id), 'MMM dd', { locale: ar }),
      count: point.count,
    }));
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
        <Typography variant="body2" color="text.secondary">
          لا توجد بيانات للعرض
        </Typography>
      </Box>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
        <XAxis
          dataKey="date"
          stroke={theme.palette.text.secondary}
          style={{ fontSize: 12 }}
        />
        <YAxis stroke={theme.palette.text.secondary} style={{ fontSize: 12 }} />
        <Tooltip
          contentStyle={{
            backgroundColor: theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 8,
          }}
        />
        <Line
          type="monotone"
          dataKey="count"
          stroke={theme.palette.primary.main}
          strokeWidth={2}
          dot={{ fill: theme.palette.primary.main }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

