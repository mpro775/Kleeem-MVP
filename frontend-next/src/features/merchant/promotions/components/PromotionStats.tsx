'use client';

import { Box, Card, CardContent, Typography, Grid, Skeleton } from '@mui/material';
import CampaignIcon from '@mui/icons-material/Campaign';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import { PromotionStats as PromotionStatsType } from '../../coupons/types';

interface PromotionStatsProps {
  stats: PromotionStatsType | undefined;
  isLoading?: boolean;
}

export function PromotionStats({ stats, isLoading }: PromotionStatsProps) {
  if (isLoading) {
    return (
      <Grid container spacing={2}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Grid item xs={12} sm={6} md={2.4} key={i}>
            <Card>
              <CardContent>
                <Skeleton variant="text" width="60%" />
                <Skeleton variant="text" width="40%" height={40} />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  }

  if (!stats) return null;

  const statsData = [
    {
      title: 'إجمالي العروض',
      value: stats.totalPromotions,
      icon: <CampaignIcon />,
      color: 'primary.main',
    },
    {
      title: 'العروض النشطة',
      value: stats.activePromotions,
      icon: <CheckCircleIcon />,
      color: 'success.main',
    },
    {
      title: 'العروض المنتهية',
      value: stats.expiredPromotions,
      icon: <CancelIcon />,
      color: 'error.main',
    },
    {
      title: 'إجمالي الاستخدامات',
      value: stats.totalUsage,
      icon: <ShoppingCartIcon />,
      color: 'info.main',
    },
    {
      title: 'إجمالي الخصم الممنوح',
      value: `${stats.totalDiscountGiven.toLocaleString('ar-SA')} ريال`,
      icon: <AttachMoneyIcon />,
      color: 'warning.main',
    },
  ];

  return (
    <Grid container spacing={2}>
      {statsData.map((stat, index) => (
        <Grid item xs={12} sm={6} md={2.4} key={index}>
          <Card
            sx={{
              height: '100%',
              transition: 'transform 0.2s',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 3,
              },
            }}
          >
            <CardContent>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  mb: 1,
                  color: stat.color,
                }}
              >
                {stat.icon}
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ ml: 1 }}
                >
                  {stat.title}
                </Typography>
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                {stat.value}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}

