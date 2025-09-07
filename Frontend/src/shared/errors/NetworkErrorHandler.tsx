// src/shared/errors/NetworkErrorHandler.tsx
import  { useEffect, useState, useCallback } from 'react';
import { Alert, Button, Stack, Typography, Box, Slide, Chip } from '@mui/material';
import { Refresh, SignalWifiOff, SignalWifi4Bar } from '@mui/icons-material';

interface NetworkStatus {
  online: boolean;
  lastOffline: Date | null;
  retryCount: number;
}

export function NetworkErrorHandler() {
  const [status, setStatus] = useState<NetworkStatus>({
    online: navigator.onLine,
    lastOffline: null,
    retryCount: 0
  });

  const handleOnline = useCallback(() => {
    setStatus(prev => ({
      ...prev,
      online: true,
      retryCount: 0
    }));
  }, []);

  const handleOffline = useCallback(() => {
    setStatus(prev => ({
      ...prev,
      online: false,
      lastOffline: new Date()
    }));
  }, []);

  const handleRetry = useCallback(() => {
    setStatus(prev => ({
      ...prev,
      retryCount: prev.retryCount + 1
    }));
    
    // محاولة إعادة الاتصال
    if (navigator.onLine) {
      window.location.reload();
    } else {
      // إظهار رسالة أن الشبكة لا تزال غير متوفرة
      setTimeout(() => {
        setStatus(prev => ({
          ...prev,
          retryCount: prev.retryCount - 1
        }));
      }, 2000);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  if (status.online) return null;

  return (
    <Slide direction="down" in={!status.online} mountOnEnter unmountOnExit>
      <Box 
        position="fixed" 
        top={0} 
        left={0} 
        right={0} 
        zIndex={9999}
        sx={{
          background: 'linear-gradient(90deg, #ff9800 0%, #f57c00 100%)',
          boxShadow: '0 4px 12px rgba(255, 152, 0, 0.3)'
        }}
      >
        <Alert 
          severity="warning" 
          icon={<SignalWifiOff sx={{ fontSize: 28 }} />}
          sx={{
            borderRadius: 0,
            background: 'transparent',
            color: 'white',
            '& .MuiAlert-message': { width: '100%' },
            '& .MuiAlert-icon': { color: 'white' }
          }}
          action={
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip
                label={`محاولة ${status.retryCount}`}
                size="small"
                sx={{ 
                  backgroundColor: 'rgba(255,255,255,0.2)', 
                  color: 'white',
                  fontWeight: 600
                }}
              />
              <Button
                size="small"
                startIcon={<Refresh />}
                onClick={handleRetry}
                disabled={status.retryCount > 0}
                variant="outlined"
                sx={{
                  color: 'white',
                  borderColor: 'rgba(255,255,255,0.5)',
                  '&:hover': {
                    borderColor: 'white',
                    backgroundColor: 'rgba(255,255,255,0.1)'
                  },
                  '&:disabled': {
                    color: 'rgba(255,255,255,0.5)',
                    borderColor: 'rgba(255,255,255,0.3)'
                  }
                }}
              >
                إعادة المحاولة
              </Button>
              <SignalWifi4Bar sx={{ color: 'rgba(255,255,255,0.7)' }} />
            </Stack>
          }
        >
          <Stack spacing={1}>
            <Typography variant="body1" fontWeight={700} sx={{ color: 'white' }}>
              لا يوجد اتصال بالإنترنت
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
              يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى
            </Typography>
            {status.lastOffline && (
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                آخر انقطاع: {status.lastOffline.toLocaleTimeString('ar-SA')}
              </Typography>
            )}
          </Stack>
        </Alert>
      </Box>
    </Slide>
  );
}
