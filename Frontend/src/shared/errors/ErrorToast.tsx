// src/shared/errors/ErrorToast.tsx
import {
  Alert,
  AlertTitle,
  Box,
  Typography,
  Stack,
  Chip,
  IconButton,
  Collapse,
  Paper
} from '@mui/material';
import {
  Error,
  Warning,
  Info,
  ExpandMore,
  ExpandLess,
  BugReport,
  Refresh
} from '@mui/icons-material';
import { AppError } from './AppError';

interface ErrorToastProps {
  error: AppError;
  onRetry?: () => void;
  onExpand?: () => void;
  expanded?: boolean;
}

export function ErrorToast({ error, onRetry, onExpand, expanded = false }: ErrorToastProps) {
  const getSeverity = () => {
    if (error.status && error.status >= 500) return 'error';
    if (error.status && error.status >= 400) return 'warning';
    return 'info';
  };

  const getIcon = () => {
    const severity = getSeverity();
    switch (severity) {
      case 'error':
        return <Error />;
      case 'warning':
        return <Warning />;
      default:
        return <Info />;
    }
  };

  const getTitle = () => {
    if (error.status && error.status >= 500) return 'خطأ في الخادم';
    if (error.status && error.status >= 400) return 'خطأ في الطلب';
    return 'تنبيه';
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <Paper
      elevation={8}
      sx={{
        borderRadius: 3,
        overflow: 'hidden',
        background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
        border: '1px solid rgba(0,0,0,0.1)',
        maxWidth: 400,
        width: '100%'
      }}
    >
      <Alert
        severity={getSeverity()}
        icon={getIcon()}
        sx={{
          borderRadius: 0,
          background: 'transparent',
          '& .MuiAlert-message': { width: '100%' },
          '& .MuiAlert-icon': { fontSize: 24 }
        }}
        action={
          <Stack direction="row" spacing={1} alignItems="center">
            {onRetry && (
              <IconButton
                size="small"
                onClick={onRetry}
                sx={{
                  color: 'inherit',
                  '&:hover': {
                    backgroundColor: 'rgba(0,0,0,0.04)'
                  }
                }}
              >
                <Refresh />
              </IconButton>
            )}
            {error.requestId && (
              <IconButton
                size="small"
                onClick={onExpand}
                sx={{
                  color: 'inherit',
                  '&:hover': {
                    backgroundColor: 'rgba(0,0,0,0.04)'
                  }
                }}
              >
                {expanded ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
            )}
          </Stack>
        }
      >
        <Stack spacing={1}>
          <AlertTitle sx={{ fontWeight: 700, fontSize: '1rem' }}>
            {getTitle()}
          </AlertTitle>
          
          <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
            {error.message}
          </Typography>

          <Stack direction="row" spacing={1} flexWrap="wrap">
            {error.status && (
              <Chip
                label={`HTTP ${error.status}`}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.75rem' }}
              />
            )}
            {error.code && (
              <Chip
                label={error.code}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.75rem' }}
              />
            )}
            {error.requestId && (
              <Chip
                label={`ID: ${error.requestId.slice(0, 8)}`}
                size="small"
                variant="outlined"
                sx={{ 
                  fontSize: '0.75rem',
                  fontFamily: 'monospace'
                }}
              />
            )}
          </Stack>

          <Typography variant="caption" color="text.secondary">
            {formatTime(new Date())}
          </Typography>
        </Stack>
      </Alert>

      <Collapse in={expanded}>
        <Box sx={{ p: 2, backgroundColor: 'grey.50' }}>
          <Stack spacing={2}>
            {error.requestId && (
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  معرف الطلب:
                </Typography>
                <Typography variant="body2" fontFamily="monospace">
                  {error.requestId}
                </Typography>
              </Box>
            )}
            
            {error.fields && Object.keys(error.fields).length > 0 && (
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  أخطاء الحقول:
                </Typography>
                <Stack spacing={0.5}>
                  {Object.entries(error.fields).map(([field, messages]) => (
                    <Box key={field}>
                      <Typography variant="body2" fontWeight={600}>
                        {field}:
                      </Typography>
                      {messages.map((message, index) => (
                        <Typography key={index} variant="body2" color="error" sx={{ ml: 2 }}>
                          • {message}
                        </Typography>
                      ))}
                    </Box>
                  ))}
                </Stack>
              </Box>
            )}

            <Stack direction="row" spacing={1} alignItems="center">
              <BugReport fontSize="small" color="action" />
              <Typography variant="caption" color="text.secondary">
                اضغط على أيقونة التوسيع لعرض التفاصيل
              </Typography>
            </Stack>
          </Stack>
        </Box>
      </Collapse>
    </Paper>
  );
}
