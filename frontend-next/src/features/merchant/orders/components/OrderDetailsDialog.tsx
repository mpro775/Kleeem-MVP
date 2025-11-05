'use client';

/**
 * OrderDetailsDialog Component
 * @description Dialog for viewing and updating order details
 */

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Typography,
  Chip,
  Select,
  MenuItem,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Divider,
  useTheme,
  useMediaQuery,
  AppBar,
  Toolbar,
  IconButton,
  Box,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import { useState, useEffect } from 'react';
import type { Order, OrderStatus } from '../types';
import { STATUS_LABEL, getStatusColor } from './constants';
import {
  calculateOrderTotal,
  calculateLineTotal,
  getProductName,
  formatOrderId,
} from './utils';
import { useUpdateOrderStatus } from '../mutations';

interface OrderDetailsDialogProps {
  order: Order | null;
  open: boolean;
  onClose: () => void;
}

export function OrderDetailsDialog({
  order,
  open,
  onClose,
}: OrderDetailsDialogProps) {
  const theme = useTheme();
  const isSm = useMediaQuery(theme.breakpoints.down('sm'));

  const [editStatus, setEditStatus] = useState<OrderStatus | ''>('');
  const updateStatusMutation = useUpdateOrderStatus();

  // Update local status when order changes
  useEffect(() => {
    if (order) {
      setEditStatus(order.status);
    }
  }, [order]);

  const handleUpdate = async () => {
    if (!order || !editStatus) return;

    await updateStatusMutation.mutateAsync({
      orderId: order._id,
      status: editStatus as OrderStatus,
    });
  };

  if (!order) return null;

  const total = calculateOrderTotal(order);
  const isStatusChanged = editStatus && editStatus !== order.status;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isSm}
    >
      {isSm ? (
        <AppBar
          elevation={0}
          color="default"
          sx={{
            position: 'sticky',
            top: 0,
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Toolbar>
            <IconButton edge="start" onClick={onClose} aria-label="close">
              <CloseIcon />
            </IconButton>
            <Typography sx={{ ml: 1, flex: 1 }} variant="h6" fontWeight={700}>
              تفاصيل الطلب
            </Typography>
            <LoadingButton
              size="small"
              variant="contained"
              loading={updateStatusMutation.isPending}
              disabled={!isStatusChanged}
              onClick={handleUpdate}
            >
              حفظ
            </LoadingButton>
          </Toolbar>
        </AppBar>
      ) : (
        <DialogTitle sx={{ fontWeight: 800 }}>
          🧾 تفاصيل الطلب
        </DialogTitle>
      )}

      <DialogContent dividers={!isSm} sx={{ p: isSm ? 2 : 3 }}>
        <Stack spacing={3}>
          {/* Order Header */}
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="subtitle1" fontWeight={700}>
              رقم الطلب: {formatOrderId(order._id)}
            </Typography>
            <Chip
              label={STATUS_LABEL[order.status]}
              color={getStatusColor(order.status)}
              size="small"
            />
          </Stack>

          <Divider />

          {/* Update Status Section */}
          <Box>
            <Typography variant="subtitle2" fontWeight={700} mb={1}>
              تحديث الحالة:
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Select
                size="small"
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as OrderStatus)}
                sx={{ minWidth: 160 }}
              >
                {Object.entries(STATUS_LABEL).map(([key, label]) => (
                  <MenuItem key={key} value={key}>
                    {label}
                  </MenuItem>
                ))}
              </Select>
              {!isSm && (
                <LoadingButton
                  size="small"
                  variant="outlined"
                  startIcon={<EditIcon />}
                  loading={updateStatusMutation.isPending}
                  disabled={!isStatusChanged}
                  onClick={handleUpdate}
                >
                  حفظ التعديل
                </LoadingButton>
              )}
            </Stack>
          </Box>

          <Divider />

          {/* Customer Information */}
          {order.customer && (
            <>
              <Box>
                <Typography variant="subtitle2" fontWeight={700} mb={1}>
                  معلومات العميل:
                </Typography>
                <Stack spacing={1}>
                  <Typography variant="body2">
                    <strong>الاسم:</strong> {order.customer.name}
                  </Typography>
                  <Typography variant="body2">
                    <strong>الجوال:</strong> {order.customer.phone}
                  </Typography>
                  {order.customer.address &&
                    typeof order.customer.address === 'object' && (
                      <Typography variant="body2">
                        <strong>العنوان:</strong>{' '}
                        {[
                          order.customer.address.line1,
                          order.customer.address.line2,
                          order.customer.address.city,
                          order.customer.address.country,
                        ]
                          .filter(Boolean)
                          .join(', ')}
                      </Typography>
                    )}
                </Stack>
              </Box>
              <Divider />
            </>
          )}

          {/* Products Table */}
          <Box>
            <Typography variant="subtitle2" fontWeight={700} mb={1}>
              المنتجات:
            </Typography>
            <Paper variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>المنتج</TableCell>
                    <TableCell align="center">الكمية</TableCell>
                    <TableCell align="right">السعر</TableCell>
                    <TableCell align="right">الإجمالي</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {order.products.map((product, idx) => {
                    const lineTotal = calculateLineTotal(product);
                    const productName = getProductName(product);

                    return (
                      <TableRow key={idx}>
                        <TableCell>{productName}</TableCell>
                        <TableCell align="center">
                          {product.quantity}
                        </TableCell>
                        <TableCell align="right">
                          {product.price.toFixed(2)} ر.س
                        </TableCell>
                        <TableCell align="right">
                          {lineTotal.toFixed(2)} ر.س
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow>
                    <TableCell colSpan={3} align="right">
                      <strong>المجموع الإجمالي:</strong>
                    </TableCell>
                    <TableCell align="right">
                      <strong>{total.toFixed(2)} ر.س</strong>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Paper>
          </Box>

          {/* Order Dates */}
          <Box>
            <Typography variant="subtitle2" fontWeight={700} mb={1}>
              التواريخ:
            </Typography>
            <Stack spacing={1}>
              <Typography variant="body2">
                <strong>تاريخ الإنشاء:</strong>{' '}
                {new Date(order.createdAt).toLocaleString('ar-SA')}
              </Typography>
              {order.updatedAt && (
                <Typography variant="body2">
                  <strong>آخر تحديث:</strong>{' '}
                  {new Date(order.updatedAt).toLocaleString('ar-SA')}
                </Typography>
              )}
            </Stack>
          </Box>
        </Stack>
      </DialogContent>

      {!isSm && (
        <DialogActions>
          <Button onClick={onClose}>إغلاق</Button>
        </DialogActions>
      )}
    </Dialog>
  );
}

