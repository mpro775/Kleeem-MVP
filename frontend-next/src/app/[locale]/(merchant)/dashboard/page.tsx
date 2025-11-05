import { Box, Card, CardContent, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { TrendingUp, Chat, People, ShoppingCart } from '@mui/icons-material';

export default function DashboardPage() {
  const t = useTranslations('dashboard');

  const stats = [
    {
      title: t('stats.totalSales'),
      value: '45,231 ر.س',
      icon: <TrendingUp />,
      color: '#4caf50',
    },
    {
      title: t('stats.activeConversations'),
      value: '23',
      icon: <Chat />,
      color: '#2196f3',
    },
    {
      title: t('stats.newLeads'),
      value: '156',
      icon: <People />,
      color: '#ff9800',
    },
    {
      title: t('stats.conversionRate'),
      value: '12.5%',
      icon: <ShoppingCart />,
      color: '#9c27b0',
    },
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>
        {t('welcome', { name: 'التاجر' })}
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 3 }}>
        {stats.map((stat, index) => (
          <Box key={index}>
            <Card
              sx={{
                height: '100%',
                position: 'relative',
                overflow: 'visible',
              }}
            >
              <CardContent>
                <Box
                  sx={{
                    position: 'absolute',
                    top: -20,
                    right: 20,
                    width: 60,
                    height: 60,
                    borderRadius: 2,
                    background: `linear-gradient(135deg, ${stat.color}, ${stat.color}dd)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    boxShadow: `0 4px 20px ${stat.color}40`,
                  }}
                >
                  {stat.icon}
                </Box>
                <Typography
                  color="text.secondary"
                  variant="body2"
                  sx={{ mt: 2, mb: 1 }}
                >
                  {stat.title}
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {stat.value}
                </Typography>
              </CardContent>
            </Card>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

