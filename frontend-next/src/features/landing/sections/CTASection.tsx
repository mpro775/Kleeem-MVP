'use client';

import { Box, Typography, Button } from '@mui/material';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

export default function CTASection({ locale }: { locale: string }) {
  const t = useTranslations('landing.cta');
  const router = useRouter();

  return (
    <Box
      sx={{
        py: 10,
        px: 3,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        textAlign: 'center',
      }}
    >
      <Typography variant="h3" fontWeight={800} gutterBottom>
        {t('title')}
      </Typography>
      <Typography variant="h6" sx={{ mb: 4, opacity: 0.9 }}>
        {t('subtitle')}
      </Typography>
      <Button
        variant="contained"
        size="large"
        onClick={() => router.push(`/${locale}/signup`)}
        sx={{
          background: 'white',
          color: '#764ba2',
          px: 6,
          py: 2,
          fontSize: '1.1rem',
          fontWeight: 700,
          '&:hover': {
            background: '#f5f5f5',
          },
        }}
      >
        {t('button')}
      </Button>
    </Box>
  );
}

