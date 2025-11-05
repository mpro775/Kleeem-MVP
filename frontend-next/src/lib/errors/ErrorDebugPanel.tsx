// src/shared/errors/ErrorDebugPanel.tsx
import  { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Button,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
} from '@mui/material';
import {
  ExpandMore,
  Delete,
  Download,
  Refresh,
  BugReport,
  Info,

} from '@mui/icons-material';
import { errorLogger, type ErrorLogData } from './ErrorLogger';

interface ErrorDebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ErrorDebugPanel({ isOpen, onClose }: ErrorDebugPanelProps) {
  const [logs, setLogs] = useState<ErrorLogData[]>([]);
  // const [selectedError, setSelectedError] = useState<ErrorLogData | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const loadLogs = () => {
    setLogs(errorLogger.getLogs());
  };

  useEffect(() => {
    if (isOpen) {
      // Load logs directly instead of calling a function
      const currentLogs = errorLogger.getLogs();
      setLogs(currentLogs);
    }
  }, [isOpen]);

  const handleClearLogs = () => {
    errorLogger.clearLogs();
    loadLogs();
  };

  const handleExportLogs = () => {
    const dataStr = errorLogger.exportLogs();
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `error-logs-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const filteredLogs = logs.filter(log =>
    log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.url.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getErrorSeverity = (error: ErrorLogData) => {
    if (error.status && error.status >= 500) return 'error';
    if (error.status && error.status >= 400) return 'warning';
    return 'info';
  };

  return (
    <Dialog 
      open={isOpen} 
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
        }
      }}
    >
      <DialogTitle sx={{ 
        background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%)',
        color: 'white',
        borderRadius: '12px 12px 0 0'
      }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <BugReport sx={{ fontSize: 28 }} />
          <Typography variant="h5" fontWeight={700}>لوحة تحكم الأخطاء</Typography>
          <Chip 
            label={`${logs.length} خطأ`} 
            sx={{ 
              backgroundColor: 'rgba(255,255,255,0.2)', 
              color: 'white',
              fontWeight: 600
            }}
            size="small" 
          />
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={2}>
          <Alert severity="info" icon={<Info />}>
            هذه اللوحة مخصصة للمطورين فقط. تعرض جميع الأخطاء المسجلة في التطبيق.
          </Alert>

          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              size="small"
              placeholder="البحث في الأخطاء..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ flexGrow: 1 }}
            />
            <Button
              startIcon={<Refresh />}
              onClick={loadLogs}
              variant="outlined"
            >
              تحديث
            </Button>
            <Button
              startIcon={<Download />}
              onClick={handleExportLogs}
              variant="outlined"
              disabled={logs.length === 0}
            >
              تصدير
            </Button>
            <Button
              startIcon={<Delete />}
              onClick={handleClearLogs}
              variant="outlined"
              color="error"
              disabled={logs.length === 0}
            >
              مسح الكل
            </Button>
          </Stack>

          {filteredLogs.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">
                {searchTerm ? 'لا توجد أخطاء تطابق البحث' : 'لا توجد أخطاء مسجلة'}
              </Typography>
            </Paper>
          ) : (
            <Stack spacing={1}>
              {filteredLogs.map((error, index) => (
                <Accordion key={index}>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Stack direction="row" alignItems="center" spacing={2} sx={{ width: '100%' }}>
                      <Chip 
                        label={error.status || 'N/A'} 
                        color={getErrorSeverity(error) as "error" | "warning" | "info"}
                        size="small"
                      />
                      <Typography sx={{ flexGrow: 1 }}>
                        {error.message}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(error.timestamp).toLocaleString('ar-SA')}
                      </Typography>
                    </Stack>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Stack spacing={2}>
                      <Stack direction="row" spacing={2}>
                        <Typography variant="body2">
                          <strong>الكود:</strong> {error.code || 'غير محدد'}
                        </Typography>
                        <Typography variant="body2">
                          <strong>الرابط:</strong> {error.url}
                        </Typography>
                      </Stack>
                      
                      {error.requestId && (
                        <Typography variant="body2">
                          <strong>رقم الطلب:</strong> {error.requestId}
                        </Typography>
                      )}

                      {error.stack && (
                        <Paper variant="outlined" sx={{ p: 2, backgroundColor: 'grey.50' }}>
                          <Typography variant="body2" fontFamily="monospace" fontSize="0.875rem">
                            {error.stack}
                          </Typography>
                        </Paper>
                      )}

                      {error.additionalData && Object.keys(error.additionalData).length > 0 && (
                        <Paper variant="outlined" sx={{ p: 2, backgroundColor: 'grey.50' }}>
                          <Typography variant="body2" fontWeight={600} mb={1}>
                            بيانات إضافية:
                          </Typography>
                          <Typography variant="body2" fontFamily="monospace" fontSize="0.875rem">
                            {JSON.stringify(error.additionalData, null, 2)}
                          </Typography>
                        </Paper>
                      )}
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Stack>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>إغلاق</Button>
      </DialogActions>
    </Dialog>
  );
}
