'use client';

/**
 * MobileOrdersView Component
 * @description Mobile card view for orders
 */

import {
  Card,
  CardContent,
  Stack,
  Typography,
  Chip,
  Button,
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import { format } from 'date-fns';
import type { Order } from '../types';
import { STATUS_LABEL, getStatusColor } from './constants';
import { calculateOrderTotal, formatOrderId } from './utils';

interface MobileOrdersViewProps {
  orders: Order[];
  onOpenDetails: (order: Order) => void;
}

export function MobileOrdersView({
  orders,
  onOpenDetails,
}: MobileOrdersViewProps) {
  if (!orders.length) {
    return null;
  }

  return (
    <Stack spacing={2}>
      {orders.map((order) => {
        const total = calculateOrderTotal(order);

        return (
          <Card
            key={order._id}
            sx={{
              border: 1,
              borderColor: 'divider',
            }}
          >
            <CardContent>
              <Stack spacing={2}>
                {/* Header */}
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography variant="subtitle1" fontWeight="bold">
                    {formatOrderId(order._id)}
                  </Typography>
                  <Chip
                    label={STATUS_LABEL[order.status] || order.status}
                    color={getStatusColor(order.status)}
                    size="small"
                    variant="outlined"
                  />
                </Stack>

                {/* Customer Info */}
                <Stack spacing={1}>
                  <Typography variant="body2">
                    <strong>العميل:</strong> {order.customer?.name || '-'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>الجوال:</strong> {order.customer?.phone || '-'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>الإجمالي:</strong> {total.toFixed(2)} ر.س
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>التاريخ:</strong>{' '}
                    {format(new Date(order.createdAt), 'yyyy/MM/dd HH:mm')}
                  </Typography>
                </Stack>

                {/* Action Button */}
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<InfoIcon />}
                  onClick={() => onOpenDetails(order)}
                  fullWidth
                >
                  عرض التفاصيل
                </Button>
              </Stack>
            </CardContent>
          </Card>
        );
      })}
    </Stack>
  );
}

