'use client';

/**
 * OrdersTable Component
 * @description Desktop table view for orders
 */

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Tooltip,
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import { format } from 'date-fns';
import type { Order } from '../types';
import { STATUS_LABEL, getStatusColor } from './constants';
import { calculateOrderTotal, formatOrderId } from './utils';

interface OrdersTableProps {
  orders: Order[];
  onOpenDetails: (order: Order) => void;
}

export function OrdersTable({ orders, onOpenDetails }: OrdersTableProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
        overflowX: 'auto',
      }}
    >
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>رقم الطلب</TableCell>
            <TableCell>العميل</TableCell>
            <TableCell>الجوال</TableCell>
            <TableCell>الإجمالي</TableCell>
            <TableCell>الحالة</TableCell>
            <TableCell>تاريخ الطلب</TableCell>
            <TableCell align="center">إجراءات</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {orders.map((order) => {
            const total = calculateOrderTotal(order);

            return (
              <TableRow key={order._id} hover>
                <TableCell sx={{ fontWeight: 600 }}>
                  {formatOrderId(order._id)}
                </TableCell>
                <TableCell>{order.customer?.name || '-'}</TableCell>
                <TableCell>{order.customer?.phone || '-'}</TableCell>
                <TableCell>{total.toFixed(2)} ر.س</TableCell>
                <TableCell>
                  <Chip
                    label={STATUS_LABEL[order.status] || order.status}
                    color={getStatusColor(order.status)}
                    variant="outlined"
                    size="small"
                    sx={{ fontWeight: 600 }}
                  />
                </TableCell>
                <TableCell>
                  {format(new Date(order.createdAt), 'yyyy/MM/dd HH:mm')}
                </TableCell>
                <TableCell align="center">
                  <Tooltip title="تفاصيل الطلب">
                    <IconButton
                      size="small"
                      onClick={() => onOpenDetails(order)}
                    >
                      <InfoIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Paper>
  );
}

