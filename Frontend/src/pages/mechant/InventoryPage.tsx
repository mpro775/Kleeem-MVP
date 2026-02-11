// src/pages/mechant/InventoryPage.tsx
import { useState, useCallback } from 'react';
import { Box, Typography, Alert, Pagination, Snackbar } from '@mui/material';
import { useInventory } from '@/features/mechant/inventory/hooks/useInventory';
import { InventoryFilters } from '@/features/mechant/inventory/ui/InventoryFilters';
import { InventoryTable } from '@/features/mechant/inventory/ui/InventoryTable';
import { StockHistoryDialog } from '@/features/mechant/inventory/ui/StockHistoryDialog';
import type {
  InventoryStatus,
  UpdateStockRequest,
  InventoryItem,
} from '@/features/mechant/inventory/types';

export default function InventoryPage() {
  const {
    items,
    loading,
    error,
    total,
    page,
    limit,
    filters,
    setFilters,
    updateProductStock,
    exportCsv,
    actionLoading,
  } = useInventory();

  const [historyDialog, setHistoryDialog] = useState<{
    open: boolean;
    productId: string | null;
    productName?: string;
  }>({
    open: false,
    productId: null,
  });

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const handleStatusChange = useCallback(
    (status: InventoryStatus) => {
      setFilters({ status });
    },
    [setFilters],
  );

  const handleSearchChange = useCallback(
    (search: string) => {
      setFilters({ search });
    },
    [setFilters],
  );

  const handlePageChange = useCallback(
    (_: React.ChangeEvent<unknown>, newPage: number) => {
      setFilters({ page: newPage });
    },
    [setFilters],
  );

  const handleExport = useCallback(async () => {
    try {
      await exportCsv();
      setSnackbar({
        open: true,
        message: 'تم تصدير المخزون بنجاح',
        severity: 'success',
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'فشل في تصدير المخزون',
        severity: 'error',
      });
    }
  }, [exportCsv]);

  const handleUpdateStock = useCallback(
    async (productId: string, dto: UpdateStockRequest) => {
      try {
        await updateProductStock(productId, dto);
        setSnackbar({
          open: true,
          message: 'تم تحديث المخزون بنجاح',
          severity: 'success',
        });
      } catch (err) {
        setSnackbar({
          open: true,
          message: err instanceof Error ? err.message : 'فشل في تحديث المخزون',
          severity: 'error',
        });
        throw err; // إعادة رمي الخطأ للـ StockEditCell
      }
    },
    [updateProductStock],
  );

  const handleShowHistory = useCallback(
    (productId: string) => {
      const product = items.find(
        (item: InventoryItem) => item.productId === productId,
      );
      setHistoryDialog({
        open: true,
        productId,
        productName: product?.name,
      });
    },
    [items],
  );

  const handleCloseHistory = useCallback(() => {
    setHistoryDialog({ open: false, productId: null });
  }, []);

  const handleCloseSnackbar = useCallback(() => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  }, []);

  const totalPages = Math.ceil(total / limit);

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Typography variant="h4" fontWeight="bold" sx={{ mb: 3 }}>
        إدارة المخزون
      </Typography>

      <InventoryFilters
        status={filters.status || 'all'}
        search={filters.search || ''}
        onStatusChange={handleStatusChange}
        onSearchChange={handleSearchChange}
        onExport={handleExport}
        exportLoading={actionLoading}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <InventoryTable
        items={items}
        loading={loading}
        onUpdateStock={handleUpdateStock}
        onShowHistory={handleShowHistory}
      />

      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={handlePageChange}
            color="primary"
            shape="rounded"
          />
        </Box>
      )}

      <StockHistoryDialog
        open={historyDialog.open}
        onClose={handleCloseHistory}
        productId={historyDialog.productId}
        productName={historyDialog.productName}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
