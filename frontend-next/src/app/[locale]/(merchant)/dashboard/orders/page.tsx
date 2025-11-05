'use client';

/**
 * Orders Page
 * @description Main page for orders management
 */

import { useState } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Paper,
  useTheme,
  useMediaQuery,
  Pagination,
  Stack,
  Button,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';

// Features
import { useOrders } from '@/features/merchant/orders/queries';
import type { Order } from '@/features/merchant/orders/types';
import { OrdersTable } from '@/features/merchant/orders/components/OrdersTable';
import { MobileOrdersView } from '@/features/merchant/orders/components/MobileOrdersView';
import { OrderDetailsDialog } from '@/features/merchant/orders/components/OrderDetailsDialog';
import { OrdersFilters } from '@/features/merchant/orders/components/OrdersFilters';

export default function OrdersPage() {
  const t = useTranslations('orders');
  const theme = useTheme();
  const isSm = useMediaQuery(theme.breakpoints.down('sm'));
  const searchParams = useSearchParams();

  // State Management
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [phone, setPhone] = useState(searchParams.get('phone') || '');
  const [status, setStatus] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Fetch orders
  const { data, isLoading, isError } = useOrders({
    page,
    limit: pageSize,
    phone: phone || undefined,
    status: status || undefined,
  });

  const orders = data?.orders || [];
  const totalOrders = data?.total || 0;
  const totalPages = Math.ceil(totalOrders / pageSize);

  // Handlers
  const handleOpenDetails = (order: Order) => {
    setSelectedOrder(order);
  };

  const handleCloseDialog = () => {
    setSelectedOrder(null);
  };

  const handleClearFilters = () => {
    setPhone('');
    setStatus('');
    setPage(1);
  };

  const handlePageChange = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {/* Header */}
      <Typography variant="h5" fontWeight="bold" mb={3}>
        {t('title')}
      </Typography>

      {/* Filters */}
      <Box mb={3}>
        <OrdersFilters
          phone={phone}
          status={status}
          onPhoneChange={(value) => {
            setPhone(value);
            setPage(1); // Reset to first page on filter change
          }}
          onStatusChange={(value) => {
            setStatus(value);
            setPage(1); // Reset to first page on filter change
          }}
          onClear={handleClearFilters}
        />
      </Box>

      {/* Loading State */}
      {isLoading && (
        <Paper
          elevation={0}
          sx={{
            p: 4,
            textAlign: 'center',
            border: 1,
            borderColor: 'divider',
            borderRadius: 2,
          }}
        >
          <CircularProgress />
          <Typography variant="body2" color="text.secondary" mt={2}>
            {t('messages.loading')}
          </Typography>
        </Paper>
      )}

      {/* Error State */}
      {isError && (
        <Paper
          elevation={0}
          sx={{
            p: 4,
            textAlign: 'center',
            border: 1,
            borderColor: 'error.main',
            borderRadius: 2,
            bgcolor: 'error.lighter',
          }}
        >
          <Typography variant="body1" color="error.main">
            {t('messages.error')}
          </Typography>
        </Paper>
      )}

      {/* Empty State */}
      {!isLoading && !isError && !orders.length && (
        <Paper
          elevation={0}
          sx={{
            p: 4,
            textAlign: 'center',
            border: 1,
            borderColor: 'divider',
            borderRadius: 2,
          }}
        >
          <Typography variant="h6" mb={1}>
            {t('empty.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            {t('empty.description')}
          </Typography>
          <Button variant="contained">{t('empty.addManual')}</Button>
        </Paper>
      )}

      {/* Orders Table/List */}
      {!isLoading && !isError && orders.length > 0 && (
        <>
          {isSm ? (
            <MobileOrdersView
              orders={orders}
              onOpenDetails={handleOpenDetails}
            />
          ) : (
            <OrdersTable orders={orders} onOpenDetails={handleOpenDetails} />
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <Stack alignItems="center" mt={3}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={handlePageChange}
                color="primary"
                size={isSm ? 'small' : 'medium'}
                showFirstButton
                showLastButton
              />
            </Stack>
          )}
        </>
      )}

      {/* Order Details Dialog */}
      <OrderDetailsDialog
        order={selectedOrder}
        open={!!selectedOrder}
        onClose={handleCloseDialog}
      />
    </Box>
  );
}
