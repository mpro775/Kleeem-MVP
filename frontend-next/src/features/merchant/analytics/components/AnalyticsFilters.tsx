'use client';

/**
 * AnalyticsFilters Component
 * @description Filters for analytics dashboard
 */

import {
  Paper,
  Stack,
  Typography,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import type { Period, Channel } from '../types';

interface AnalyticsFiltersProps {
  period: Period;
  channel: Channel;
  onFilterChange: (period: Period, channel: Channel) => void;
}

export function AnalyticsFilters({
  period,
  channel,
  onFilterChange,
}: AnalyticsFiltersProps) {
  const t = useTranslations('analytics');

  const getPeriodLabel = (p: Period) => {
    switch (p) {
      case 'week':
        return t('filters.lastWeek');
      case 'month':
        return t('filters.lastMonth');
      case 'quarter':
        return t('filters.lastQuarter');
      default:
        return p;
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        mb: 2,
        borderRadius: 2,
        border: 1,
        borderColor: 'divider',
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        justifyContent="space-between"
      >
        {/* Title & Period Badge */}
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="h6" fontWeight={800}>
            {t('title')}
          </Typography>
          <Chip size="small" label={getPeriodLabel(period)} />
        </Stack>

        {/* Filters */}
        <Stack direction="row" spacing={1.5} flexWrap="wrap">
          {/* Period Filter */}
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>{t('filters.period')}</InputLabel>
            <Select
              value={period}
              label={t('filters.period')}
              onChange={(e) =>
                onFilterChange(e.target.value as Period, channel)
              }
            >
              <MenuItem value="week">{t('filters.week')}</MenuItem>
              <MenuItem value="month">{t('filters.month')}</MenuItem>
              <MenuItem value="quarter">{t('filters.quarter')}</MenuItem>
            </Select>
          </FormControl>

          {/* Channel Filter */}
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>{t('filters.channel')}</InputLabel>
            <Select
              value={channel}
              label={t('filters.channel')}
              onChange={(e) =>
                onFilterChange(period, e.target.value as Channel)
              }
            >
              <MenuItem value="all">{t('filters.allChannels')}</MenuItem>
              <MenuItem value="whatsapp">WhatsApp</MenuItem>
              <MenuItem value="telegram">Telegram</MenuItem>
              <MenuItem value="webchat">Web Chat</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Stack>
    </Paper>
  );
}

