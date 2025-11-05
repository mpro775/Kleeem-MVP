'use client';

/**
 * Analytics Page
 * @description Main analytics dashboard for merchants
 */

import { useState } from 'react';
import {
  Box,
  CircularProgress,
  Alert,
  Typography,
  IconButton,
  Stack,
  Button,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { useTranslations } from 'next-intl';

// Features
import {
  useOverview,
  useMessagesTimeline,
  useTopProducts,
  useTopKeywords,
} from '@/features/merchant/analytics/queries';
import type { Period, Channel } from '@/features/merchant/analytics/types';
import { AnalyticsFilters } from '@/features/merchant/analytics/components/AnalyticsFilters';
import { DashboardGrid } from '@/features/merchant/analytics/components/DashboardGrid';
import { SimpleMetricsCard } from '@/features/merchant/analytics/components/SimpleMetricsCard';
import { MessagesTimelineChart } from '@/features/merchant/analytics/components/MessagesTimelineChart';
import { TopProductsChart } from '@/features/merchant/analytics/components/TopProductsChart';
import { TopKeywordsChart } from '@/features/merchant/analytics/components/TopKeywordsChart';
import { ChannelsPieChart } from '@/features/merchant/analytics/components/ChannelsPieChart';

export default function AnalyticsPage() {
  const t = useTranslations('analytics');

  // State
  const [period, setPeriod] = useState<Period>('week');
  const [channel, setChannel] = useState<Channel>('all');

  // Fetch data
  const {
    data: overview,
    isLoading,
    isError,
    error,
    refetch,
  } = useOverview(period);

  const { data: timeline } = useMessagesTimeline(period);
  const { data: topProducts } = useTopProducts(period, 8);
  const { data: topKeywords } = useTopKeywords(period, 10);

  // Handlers
  const handleFilterChange = (newPeriod: Period, newChannel: Channel) => {
    setPeriod(newPeriod);
    setChannel(newChannel);
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Export clicked');
  };

  // Loading state
  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Error state
  if (isError) {
    return (
      <Box sx={{ p: { xs: 2, md: 4 } }}>
        <Alert severity="error">
          {t('messages.error')}: {error?.message || 'Unknown error'}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {/* Filters */}
      <AnalyticsFilters
        period={period}
        channel={channel}
        onFilterChange={handleFilterChange}
      />

      {/* Header Actions */}
      <Stack
        direction="row"
        spacing={1}
        justifyContent="flex-end"
        mb={2}
      >
        <IconButton onClick={() => refetch()} aria-label={t('actions.refresh')}>
          <RefreshIcon />
        </IconButton>
        <Button
          variant="outlined"
          startIcon={<FileDownloadIcon />}
          onClick={handleExport}
          size="small"
        >
          {t('actions.export')}
        </Button>
      </Stack>

      {/* KPI Cards */}
      {overview && (
        <Box mb={3}>
          <DashboardGrid data={overview} hasStore={false} />
        </Box>
      )}

      {/* Messages Timeline Chart */}
      <Box mb={3}>
        <SimpleMetricsCard
          title={t('charts.messagesOverTime')}
        >
          <MessagesTimelineChart data={timeline || []} />
        </SimpleMetricsCard>
      </Box>

      {/* Additional Metrics */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        {/* Top Products */}
        <Box flex={1}>
          <SimpleMetricsCard title={t('charts.topProducts')}>
            <TopProductsChart data={topProducts || []} />
          </SimpleMetricsCard>
        </Box>

        {/* Top Keywords */}
        <Box flex={1}>
          <SimpleMetricsCard title={t('charts.topKeywords')}>
            <TopKeywordsChart data={topKeywords || []} />
          </SimpleMetricsCard>
        </Box>

        {/* Channels */}
        <Box flex={1}>
          <SimpleMetricsCard title={t('charts.channelDistribution')}>
            <ChannelsPieChart data={overview?.channels?.breakdown || []} />
          </SimpleMetricsCard>
        </Box>
      </Stack>

      {/* Footer Note */}
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ mt: 3, display: 'block' }}
      >
        * {t('messages.metricsNote')}
      </Typography>
    </Box>
  );
}
