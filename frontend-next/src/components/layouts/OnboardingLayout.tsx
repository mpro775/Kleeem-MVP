'use client';

import { Box, Container, Paper, LinearProgress, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

type Props = {
  step?: number; // رقم الخطوة الحالية (1-based)
  total?: number; // إجمالي الخطوات
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md';
};

export default function OnboardingLayout({
  step = 1,
  total = 3,
  title,
  subtitle,
  children,
  maxWidth = 'sm',
}: Props) {
  const theme = useTheme();
  const t = useTranslations('onboarding');
  const value = Math.min(100, Math.max(0, (step / total) * 100));

  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: '100vh',
        background: theme.palette.mode === 'dark' 
          ? `linear-gradient(135deg, ${theme.palette.background.default} 0%, ${theme.palette.primary.dark} 100%)`
          : `linear-gradient(90deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
        overflow: 'hidden',
        py: 8,
      }}
    >
      {/* زخارف الخلفية */}
      <Box
        sx={{
          position: 'absolute',
          top: { xs: -60, md: -80 },
          left: { xs: -60, md: -80 },
          width: { xs: 160, md: 300 },
          height: { xs: 160, md: 300 },
          opacity: theme.palette.mode === 'dark' ? 0.08 : 0.18,
          zIndex: 0,
          background: theme.palette.mode === 'dark'
            ? 'radial-gradient(circle, rgba(155,127,217,0.4) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%)',
          borderRadius: '50%',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: { xs: -80, md: -100 },
          right: { xs: -60, md: -100 },
          width: { xs: 200, md: 400 },
          height: { xs: 200, md: 400 },
          opacity: theme.palette.mode === 'dark' ? 0.06 : 0.12,
          zIndex: 0,
          background: theme.palette.mode === 'dark'
            ? 'radial-gradient(circle, rgba(155,127,217,0.3) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%)',
          borderRadius: '50%',
        }}
      />

      <Container maxWidth={maxWidth} sx={{ position: 'relative', zIndex: 2 }}>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Paper 
            elevation={theme.palette.mode === 'dark' ? 12 : 8} 
            sx={{ 
              borderRadius: 4, 
              overflow: 'hidden',
              backgroundColor: theme.palette.mode === 'dark' 
                ? theme.palette.background.paper 
                : '#fff'
            }}
          >
            <Box
              sx={{
                height: 4,
                background: theme.palette.mode === 'dark'
                  ? `linear-gradient(90deg, ${theme.palette.primary.light}, ${theme.palette.primary.main})`
                  : `linear-gradient(90deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
              }}
            />
            <Box sx={{ p: 4 }}>
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Box sx={{ maxWidth: 140, mb: 1, mx: 'auto' }}>
                  <Image
                    src="/assets/logo.png"
                    alt="Kleem"
                    width={140}
                    height={60}
                    style={{ width: '100%', height: 'auto' }}
                  />
                </Box>
                {title}
                {subtitle}
              </Box>

              {/* مؤشر الخطوات */}
              <Box sx={{ mb: 3 }}>
                <Typography
                  variant="body2"
                  sx={{ color: 'text.secondary', mb: 1, fontWeight: 600 }}
                >
                  {t('progress.stepOf', { step, total })}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={value}
                  sx={{
                    height: 8,
                    borderRadius: 999,
                    '& .MuiLinearProgress-bar': {
                      background: `linear-gradient(90deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
                    },
                  }}
                />
              </Box>

              {children}
            </Box>
          </Paper>
        </motion.div>
      </Container>
    </Box>
  );
}

