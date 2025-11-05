'use client';

import { Box, Typography, Card, CardContent } from '@mui/material';
import {
  People,
  Store,
  Chat,
  TrendingUp,
} from '@mui/icons-material';

export default function AdminDashboardPage() {
  const stats = [
    {
      title: 'إجمالي التجار',
      value: '156',
      icon: <Store />,
      color: '#4caf50',
    },
    {
      title: 'المحادثات النشطة',
      value: '2,345',
      icon: <Chat />,
      color: '#2196f3',
    },
    {
      title: 'المستخدمين',
      value: '8,901',
      icon: <People />,
      color: '#ff9800',
    },
    {
      title: 'معدل النمو',
      value: '+23.5%',
      icon: <TrendingUp />,
      color: '#9c27b0',
    },
  ];

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        لوحة تحكم كليم - الإدارة
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' },
          gap: 3,
        }}
      >
        {stats.map((stat, index) => (
          <Card key={index} sx={{ position: 'relative', overflow: 'visible' }}>
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
              <Typography color="text.secondary" variant="body2" sx={{ mt: 2 }}>
                {stat.title}
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {stat.value}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Box>
  );
}

