// src/features/ui/OrderDetailsDialog.tsx
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
  CircularProgress,
  Box,
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
} from "@mui/material";
import { LoadingButton } from "@mui/lab";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import { useState, useEffect } from "react";
import type { Order, OrderStatus } from "../type";
import { STATUS_LABEL, getStatusColor } from "./constants";

interface OrderDetailsDialogProps {
  order: Order | null;
  open: boolean;
  onClose: () => void;
  onUpdateStatus: (orderId: string, status: OrderStatus) => Promise<void>;
}

export function OrderDetailsDialog({
  order,
  open,
  onClose,
  onUpdateStatus,
}: OrderDetailsDialogProps) {
  const theme = useTheme();
  const isSm = useMediaQuery(theme.breakpoints.down("sm"));

  const [editStatus, setEditStatus] = useState<OrderStatus | "">("");
  const [isUpdating, setIsUpdating] = useState(false);

  // تحديث الحالة في النموذج عندما يتغير الطلب المختار
  useEffect(() => {
    if (order) {
      setEditStatus(order.status);
    }
  }, [order]);

  const handleUpdate = async () => {
    if (!order || !editStatus) return;
    setIsUpdating(true);
    try {
      await onUpdateStatus(order._id, editStatus as OrderStatus);
      // لا نغلق الحوار تلقائيًا، يمكن للمستخدم إجراء تغييرات أخرى
    } finally {
      setIsUpdating(false);
    }
  };

  if (!order) return null; // لا تعرض أي شيء إذا لم يكن هناك طلب محدد

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
            position: "sticky",
            top: 0,
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Toolbar>
            <IconButton edge="start" onClick={onClose} aria-label="close">
              <CloseIcon />
            </IconButton>
            <Typography
              sx={{ ml: 1, flex: 1 }}
              variant="subtitle1"
              fontWeight={700}
            >
              تفاصيل الطلب
            </Typography>
            <LoadingButton
              size="small"
              variant="contained"
              loading={isUpdating}
              disabled={!editStatus || editStatus === order.status}
              onClick={handleUpdate}
            >
              حفظ
            </LoadingButton>
          </Toolbar>
        </AppBar>
      ) : (
        <DialogTitle sx={{ fontWeight: 800 }}>🧾 تفاصيل الطلب</DialogTitle>
      )}

      <DialogContent dividers={!isSm} sx={{ p: isSm ? 2 : 3 }}>
        <Stack spacing={3}>
          {/* ... محتوى الحوار كما كان ... */}
          {/* يمكنك نسخ ولصق محتوى الـ DialogContent من الكود الأصلي هنا */}
          {/* مثال مختصر */}
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="subtitle1" fontWeight={700}>
              رقم الطلب: {order._id.substring(0, 8).toUpperCase()}
            </Typography>
            <Chip
              label={STATUS_LABEL[order.status]}
              color={getStatusColor(order.status)}
              size="small"
            />
          </Stack>
          <Divider />
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography sx={{ fontWeight: 700 }}>تحديث الحالة:</Typography>
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
                loading={isUpdating}
                disabled={!editStatus || editStatus === order.status}
                onClick={handleUpdate}
              >
                حفظ التعديل
              </LoadingButton>
            )}
          </Stack>
          <Divider />
          {/* Products Table */}
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
                {order.products.map((p, idx) => {
                  const name =
                    typeof p.product === "object" && p.product?.name
                      ? p.product.name
                      : p.name;
                  return (
                    <TableRow key={idx}>
                      <TableCell>{name}</TableCell>
                      <TableCell align="center">{p.quantity}</TableCell>
                      <TableCell align="right">{p.price.toFixed(2)}</TableCell>
                      <TableCell align="right">
                        {(p.price * p.quantity).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Paper>
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
