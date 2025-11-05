// src/shared/errors/ErrorFallback.tsx
import { 
  Alert, 
  Button, 
  Stack, 
  Typography, 
  Box, 
  Paper,
  Divider,
  Chip,
  Fade,
  Grow
} from '@mui/material';
import { 
  ErrorOutline, 
  Refresh, 
  Home, 
  Support,
  BugReport,
  Info
} from '@mui/icons-material';

interface ErrorFallbackProps {
  error?: Error;
  resetErrorBoundary?: () => void;
  requestId?: string;
  showDetails?: boolean;
}

export function ErrorFallback({ 
  error, 
  resetErrorBoundary, 
  requestId,
  showDetails = false 
}: ErrorFallbackProps) {
  const handleReload = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  const handleContactSupport = () => {
    // يمكن ربط هذا بنظام الدعم الفني
    window.open('mailto:support@kaleem.com', '_blank');
  };

  return (
    <Box 
      display="flex" 
      justifyContent="center" 
      alignItems="center" 
      minHeight="100vh"
      p={2}
      sx={{
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        minHeight: '100vh'
      }}
    >
      <Fade in timeout={800}>
        <Paper 
          elevation={8} 
          sx={{ 
            maxWidth: 600, 
            width: '100%',
            p: 4,
            textAlign: 'center',
            borderRadius: 3,
            background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(10px)'
          }}
        >
          <Stack spacing={4}>
            <Grow in timeout={1000}>
              <Box>
                <ErrorOutline 
                  color="error" 
                  sx={{ 
                    fontSize: 80, 
                    mx: 'auto',
                    filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
                  }} 
                />
              </Box>
            </Grow>
            
            <Typography variant="h4" fontWeight={700} color="error" gutterBottom>
              حدث خطأ غير متوقع
            </Typography>
            
            <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1.1rem', lineHeight: 1.6 }}>
              عذراً، حدث خطأ أثناء تحميل الصفحة. يمكنك المحاولة مرة أخرى أو العودة للصفحة الرئيسية.
            </Typography>

          {requestId && (
            <Grow in timeout={1200}>
              <Alert 
                severity="info" 
                sx={{ 
                  textAlign: 'right',
                  borderRadius: 2,
                  '& .MuiAlert-icon': { alignItems: 'center' }
                }}
                icon={<Info />}
              >
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography variant="body2">
                    رقم المراجعة:
                  </Typography>
                  <Chip 
                    label={requestId} 
                    size="small" 
                    color="primary" 
                    variant="outlined"
                    sx={{ fontFamily: 'monospace' }}
                  />
                </Stack>
              </Alert>
            </Grow>
          )}

          {showDetails && error && (
            <Grow in timeout={1400}>
              <Box>
                <Divider sx={{ my: 2 }} />
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                  <BugReport color="action" />
                  <Typography variant="body2" color="text.secondary">
                    تفاصيل الخطأ:
                  </Typography>
                </Stack>
                <Paper 
                  variant="outlined" 
                  sx={{ 
                    p: 3, 
                    backgroundColor: 'grey.50',
                    textAlign: 'left',
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                    borderRadius: 2,
                    border: '1px solid rgba(0,0,0,0.1)',
                    maxHeight: 200,
                    overflow: 'auto'
                  }}
                >
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
                    {error.message}
                  </Typography>
                  {error.stack && (
                    <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                      {error.stack}
                    </Typography>
                  )}
                </Paper>
              </Box>
            </Grow>
          )}

          <Grow in timeout={1600}>
            <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap">
              {resetErrorBoundary && (
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<Refresh />}
                  onClick={resetErrorBoundary}
                  sx={{
                    borderRadius: 2,
                    px: 3,
                    py: 1.5,
                    background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                    boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
                    '&:hover': {
                      background: 'linear-gradient(45deg, #1976D2 30%, #1E88E5 90%)',
                    }
                  }}
                >
                  إعادة المحاولة
                </Button>
              )}
              
              <Button
                variant="outlined"
                size="large"
                startIcon={<Refresh />}
                onClick={handleReload}
                sx={{
                  borderRadius: 2,
                  px: 3,
                  py: 1.5,
                  borderWidth: 2,
                  '&:hover': {
                    borderWidth: 2,
                  }
                }}
              >
                تحديث الصفحة
              </Button>
            </Stack>
          </Grow>

          <Grow in timeout={1800}>
            <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap">
              <Button
                variant="text"
                size="large"
                startIcon={<Home />}
                onClick={handleGoHome}
                sx={{
                  borderRadius: 2,
                  px: 3,
                  py: 1.5,
                  '&:hover': {
                    backgroundColor: 'rgba(0,0,0,0.04)',
                  }
                }}
              >
                الصفحة الرئيسية
              </Button>
              
              <Button
                variant="text"
                size="large"
                startIcon={<Support />}
                onClick={handleContactSupport}
                sx={{
                  borderRadius: 2,
                  px: 3,
                  py: 1.5,
                  '&:hover': {
                    backgroundColor: 'rgba(0,0,0,0.04)',
                  }
                }}
              >
                الدعم الفني
              </Button>
            </Stack>
          </Grow>
        </Stack>
      </Paper>
      </Fade>
    </Box>
  );
}
