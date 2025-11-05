'use client';

/**
 * KpiCard Component
 * @description Card to display a single KPI metric
 */

import { Paper, Typography, Box, Stack } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import type { MetricCardData } from '../types';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: number;
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
}

export function KpiCard({
  title,
  value,
  subtitle,
  change,
  trend,
  icon,
}: KpiCardProps) {
  const getTrendColor = () => {
    if (!trend || trend === 'neutral') return 'text.secondary';
    return trend === 'up' ? 'success.main' : 'error.main';
  };

  const getTrendIcon = () => {
    if (!trend || trend === 'neutral') return null;
    return trend === 'up' ? (
      <TrendingUpIcon sx={{ fontSize: 16 }} />
    ) : (
      <TrendingDownIcon sx={{ fontSize: 16 }} />
    );
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: 2,
        border: 1,
        borderColor: 'divider',
        height: '100%',
        transition: 'all 0.2s',
        '&:hover': {
          boxShadow: 2,
        },
      }}
    >
      <Stack spacing={1}>
        {/* Header */}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
        >
          <Typography variant="caption" color="text.secondary">
            {title}
          </Typography>
          {icon && (
            <Box sx={{ color: 'primary.main', opacity: 0.7 }}>{icon}</Box>
          )}
        </Stack>

        {/* Value */}
        <Typography variant="h5" fontWeight={800}>
          {value}
        </Typography>

        {/* Subtitle or Change */}
        {(subtitle || change !== undefined) && (
          <Stack direction="row" spacing={0.5} alignItems="center">
            {change !== undefined && (
              <>
                {getTrendIcon()}
                <Typography
                  variant="caption"
                  color={getTrendColor()}
                  fontWeight={600}
                >
                  {change >= 0 ? '+' : ''}
                  {change.toFixed(0)}%
                </Typography>
              </>
            )}
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}

