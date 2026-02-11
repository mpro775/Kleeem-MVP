// src/features/mechant/inventory/ui/StockHistoryDialog.tsx
import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  Chip,
  Skeleton,
  IconButton,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import type { StockChangeLog, StockHistoryResult } from '../types';
import { getStockHistory } from '../api';

interface StockHistoryDialogProps {
  open: boolean;
  onClose: () => void;
  productId: string | null;
  productName?: string;
}

const changeTypeLabels: Record<
  string,
  {
    label: string;
    color: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
  }
> = {
  manual: { label: 'يدوي', color: 'primary' },
  order_placed: { label: 'طلب جديد', color: 'warning' },
  order_cancelled: { label: 'إلغاء طلب', color: 'success' },
  order_returned: { label: 'إرجاع', color: 'info' },
  import: { label: 'استيراد', color: 'default' },
  sync: { label: 'مزامنة', color: 'default' },
  adjustment: { label: 'تعديل', color: 'primary' },
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('ar-SA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function StockHistoryDialog({
  open,
  onClose,
  productId,
  productName,
}: StockHistoryDialogProps) {
  const [history, setHistory] = useState<StockChangeLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!productId) return;

    setLoading(true);
    setError(null);
    try {
      const result: StockHistoryResult = await getStockHistory(productId, {
        limit: 50,
        page: 1,
      });
      setHistory(result.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء جلب السجل');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    if (open && productId) {
      fetchHistory();
    }
  }, [open, productId, fetchHistory]);

  const handleClose = () => {
    setHistory([]);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography variant="h6">
            سجل تغييرات المخزون
            {productName && (
              <Typography
                component="span"
                color="text.secondary"
                sx={{ ml: 1 }}
              >
                - {productName}
              </Typography>
            )}
          </Typography>
          <IconButton size="small" onClick={handleClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {error ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography color="error">{error}</Typography>
          </Box>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell>التاريخ</TableCell>
                  <TableCell align="center">التغيير</TableCell>
                  <TableCell align="center">السابق</TableCell>
                  <TableCell align="center">الجديد</TableCell>
                  <TableCell>النوع</TableCell>
                  <TableCell>السبب</TableCell>
                  <TableCell>بواسطة</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Skeleton variant="text" />
                        </TableCell>
                        <TableCell>
                          <Skeleton variant="text" />
                        </TableCell>
                        <TableCell>
                          <Skeleton variant="text" />
                        </TableCell>
                        <TableCell>
                          <Skeleton variant="text" />
                        </TableCell>
                        <TableCell>
                          <Skeleton variant="text" />
                        </TableCell>
                        <TableCell>
                          <Skeleton variant="text" />
                        </TableCell>
                        <TableCell>
                          <Skeleton variant="text" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                ) : history.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        لا توجد تغييرات مسجلة
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  history.map((log) => {
                    const typeInfo = changeTypeLabels[log.changeType] || {
                      label: log.changeType,
                      color: 'default' as const,
                    };

                    return (
                      <TableRow key={log.id}>
                        <TableCell>
                          <Typography variant="body2">
                            {formatDate(log.changedAt)}
                          </Typography>
                          {log.variantSku && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              SKU: {log.variantSku}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <Typography
                            variant="body2"
                            fontWeight="bold"
                            color={
                              log.changeAmount > 0
                                ? 'success.main'
                                : 'error.main'
                            }
                          >
                            {log.changeAmount > 0 ? '+' : ''}
                            {log.changeAmount}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2">
                            {log.previousStock}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" fontWeight="bold">
                            {log.newStock}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={typeInfo.label}
                            color={typeInfo.color}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {log.reason || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {log.changedByName}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>إغلاق</Button>
      </DialogActions>
    </Dialog>
  );
}

export default StockHistoryDialog;
