'use client';

/**
 * DashboardGrid Component
 * @description Grid layout for dashboard metrics cards
 */

import { useMemo } from 'react';
import Grid from '@mui/material/Grid2';
import { useTranslations } from 'next-intl';
import { KpiCard } from './KpiCard';
import type { OverviewData } from '../types';
import ChatIcon from '@mui/icons-material/Chat';
import MessageIcon from '@mui/icons-material/Message';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import TimerIcon from '@mui/icons-material/Timer';
import HelpIcon from '@mui/icons-material/Help';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import InventoryIcon from '@mui/icons-material/Inventory';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';

interface DashboardGridProps {
  data: OverviewData;
  hasStore?: boolean;
}

export function DashboardGrid({ data, hasStore = false }: DashboardGridProps) {
  const t = useTranslations('analytics');

  const cards = useMemo(() => {
    const result = [];

    // Sessions (Conversations)
    result.push(
      <Grid key="sessions" size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
        <KpiCard
          title={t('metrics.conversations')}
          value={data.sessions?.count || 0}
          change={data.sessions?.changePercent || undefined}
          trend={
            (data.sessions?.changePercent || 0) >= 0 ? 'up' : 'down'
          }
          icon={<ChatIcon />}
        />
      </Grid>
    );

    // Messages
    result.push(
      <Grid key="messages" size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
        <KpiCard
          title={t('metrics.messages')}
          value={data.messages || 0}
          icon={<MessageIcon />}
        />
      </Grid>
    );

    // CSAT (Customer Satisfaction)
    if (typeof data.csat === 'number') {
      result.push(
        <Grid key="csat" size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <KpiCard
            title={t('metrics.csat')}
            value={`${Math.round((data.csat || 0) * 100)}%`}
            icon={<ThumbUpIcon />}
          />
        </Grid>
      );
    }

    // First Response Time
    if (typeof data.firstResponseTimeSec === 'number') {
      result.push(
        <Grid key="frt" size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <KpiCard
            title={t('metrics.firstResponseTime')}
            value={`${data.firstResponseTimeSec}s`}
            subtitle={t('metrics.average')}
            icon={<TimerIcon />}
          />
        </Grid>
      );
    }

    // Missing Responses
    result.push(
      <Grid key="missing" size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
        <KpiCard
          title={t('metrics.missingResponses')}
          value={data.missingOpen || 0}
          subtitle={t('metrics.open')}
          icon={<HelpIcon />}
        />
      </Grid>
    );

    // Store Metrics
    if (hasStore) {
      // Revenue
      result.push(
        <Grid key="revenue" size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <KpiCard
            title={t('metrics.revenue')}
            value={`${(data.orders?.totalSales || 0).toLocaleString()} ر.س`}
            change={data.orders?.changePercent || undefined}
            trend={
              (data.orders?.changePercent || 0) >= 0 ? 'up' : 'down'
            }
            icon={<AttachMoneyIcon />}
          />
        </Grid>
      );

      // Orders
      result.push(
        <Grid key="orders" size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <KpiCard
            title={t('metrics.orders')}
            value={data.orders?.count || 0}
            change={data.orders?.changePercent || undefined}
            trend={
              (data.orders?.changePercent || 0) >= 0 ? 'up' : 'down'
            }
            icon={<ShoppingCartIcon />}
          />
        </Grid>
      );

      // Average Order Value
      if (data.storeExtras?.aov) {
        result.push(
          <Grid key="aov" size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
            <KpiCard
              title={t('metrics.aov')}
              value={`${data.storeExtras.aov.toFixed(2)} ر.س`}
              icon={<AttachMoneyIcon />}
            />
          </Grid>
        );
      }
    } else {
      // Products Count
      result.push(
        <Grid key="products" size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <KpiCard
            title={t('metrics.products')}
            value={data.productsCount || 0}
            icon={<InventoryIcon />}
          />
        </Grid>
      );
    }

    return result;
  }, [data, hasStore, t]);

  return (
    <Grid container spacing={{ xs: 1.5, sm: 2 }}>
      {cards}
    </Grid>
  );
}

