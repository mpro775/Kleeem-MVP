'use client';

import { Box, Typography, Button, Container } from '@mui/material';
import { SearchOff } from '@mui/icons-material';
import Link from 'next/link';

export default function NotFound() {
  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          textAlign: 'center',
        }}
      >
        <SearchOff sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
        <Typography variant="h1" sx={{ fontSize: '6rem', fontWeight: 800 }}>
          404
        </Typography>
        <Typography variant="h5" gutterBottom>
          الصفحة غير موجودة
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          عذراً، الصفحة التي تبحث عنها غير موجودة.
        </Typography>
        <Button
          component={Link}
          href="/ar"
          variant="contained"
          size="large"
        >
          العودة للرئيسية
        </Button>
      </Box>
    </Container>
  );
}

