'use client';

/**
 * SimpleMetricsCard Component
 * @description Simple placeholder for charts (to be expanded)
 */

import { Paper, Typography, Box, Stack, Chip } from '@mui/material';
import { useTranslations } from 'next-intl';

interface SimpleMetricsCardProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  badge?: string;
}

export function SimpleMetricsCard({
  title,
  description,
  children,
  badge,
}: SimpleMetricsCardProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: 2,
        border: 1,
        borderColor: 'divider',
        height: '100%',
      }}
    >
      <Stack spacing={2}>
        {/* Header */}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Typography variant="subtitle1" fontWeight={700}>
            {title}
          </Typography>
          {badge && <Chip label={badge} size="small" />}
        </Stack>

        {/* Description */}
        {description && (
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        )}

        {/* Content */}
        {children}
      </Stack>
    </Paper>
  );
}

/**
 * EmptyChart Placeholder
 */
export function EmptyChartPlaceholder() {
  const t = useTranslations('analytics');

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 200,
        bgcolor: 'action.hover',
        borderRadius: 2,
      }}
    >
      <Typography variant="body2" color="text.secondary">
        {t('charts.comingSoon')}
      </Typography>
    </Box>
  );
}

