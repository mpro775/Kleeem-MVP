'use client';

import { Box, Container, Paper, LinearProgress, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { motion } from 'framer-motion';
import Image from 'next/image';

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
  const value = Math.min(100, Math.max(0, (step / total) * 100));

  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: '100vh',
        background: `linear-gradient(90deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
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
          opacity: 0.18,
          zIndex: 0,
          background: 'radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%)',
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
          opacity: 0.12,
          zIndex: 0,
          background: 'radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%)',
          borderRadius: '50%',
        }}
      />

      <Container maxWidth={maxWidth} sx={{ position: 'relative', zIndex: 2 }}>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Paper elevation={8} sx={{ borderRadius: 4, overflow: 'hidden' }}>
            <Box
              sx={{
                height: 4,
                background: `linear-gradient(90deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
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
                  {`الخطوة ${step} من ${total}`}
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

