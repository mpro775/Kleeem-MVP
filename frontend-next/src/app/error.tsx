'use client';

import { useEffect } from 'react';
import { Box, Typography, Button, Container } from '@mui/material';
import { ErrorOutline } from '@mui/icons-material';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

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
        <ErrorOutline
          sx={{ fontSize: 80, color: 'error.main', mb: 2 }}
        />
        <Typography variant="h4" gutterBottom>
          حدث خطأ غير متوقع
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          نعتذر عن هذا الخطأ. يرجى المحاولة مرة أخرى.
        </Typography>
        <Box display="flex" gap={2}>
          <Button variant="contained" onClick={() => reset()}>
            إعادة المحاولة
          </Button>
          <Button
            variant="outlined"
            onClick={() => (window.location.href = '/')}
          >
            العودة للرئيسية
          </Button>
        </Box>
      </Box>
    </Container>
  );
}

