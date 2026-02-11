// src/features/mechant/inventory/hooks/useInventory.ts
import { useState, useCallback, useEffect } from 'react';
import type {
  InventoryItem,
  InventoryFilters,
  InventoryResult,
  UpdateStockRequest,
  BulkUpdateStockItem,
  BulkUpdateStockResult,
  StockHistoryResult,
} from '../types';
import {
  getInventory,
  updateStock,
  bulkUpdateStock,
  getStockHistory,
  exportInventoryCsv,
  downloadCsv,
} from '../api';

interface UseInventoryState {
  items: InventoryItem[];
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  filters: InventoryFilters;
}

interface UseInventoryReturn extends UseInventoryState {
  /** إعادة جلب المخزون */
  refetch: () => Promise<void>;
  /** تغيير الفلاتر */
  setFilters: (filters: Partial<InventoryFilters>) => void;
  /** تحديث مخزون منتج */
  updateProductStock: (
    productId: string,
    dto: UpdateStockRequest
  ) => Promise<void>;
  /** تحديث مخزون عدة منتجات */
  bulkUpdate: (items: BulkUpdateStockItem[]) => Promise<BulkUpdateStockResult>;
  /** تصدير CSV */
  exportCsv: () => Promise<void>;
  /** جلب سجل التغييرات */
  fetchHistory: (
    productId: string,
    options?: { limit?: number; page?: number }
  ) => Promise<StockHistoryResult>;
  /** حالة التحميل للعمليات */
  actionLoading: boolean;
}

export function useInventory(initialFilters?: InventoryFilters): UseInventoryReturn {
  const [state, setState] = useState<UseInventoryState>({
    items: [],
    loading: true,
    error: null,
    total: 0,
    page: 1,
    limit: 20,
    hasMore: false,
    filters: {
      status: 'all',
      search: '',
      page: 1,
      limit: 20,
      ...initialFilters,
    },
  });

  const [actionLoading, setActionLoading] = useState(false);

  const fetchInventory = useCallback(async (filters: InventoryFilters) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const result: InventoryResult = await getInventory(filters);
      setState((prev) => ({
        ...prev,
        items: result.items,
        total: result.meta.total,
        page: result.meta.page,
        limit: result.meta.limit,
        hasMore: result.meta.hasMore,
        loading: false,
        error: null,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'حدث خطأ أثناء جلب المخزون',
      }));
    }
  }, []);

  // جلب البيانات عند تغيير الفلاتر
  useEffect(() => {
    fetchInventory(state.filters);
  }, [state.filters, fetchInventory]);

  const refetch = useCallback(async () => {
    await fetchInventory(state.filters);
  }, [state.filters, fetchInventory]);

  const setFilters = useCallback((newFilters: Partial<InventoryFilters>) => {
    setState((prev) => ({
      ...prev,
      filters: { ...prev.filters, ...newFilters, page: newFilters.page ?? 1 },
    }));
  }, []);

  const updateProductStock = useCallback(
    async (productId: string, dto: UpdateStockRequest) => {
      setActionLoading(true);
      try {
        await updateStock(productId, dto);
        // تحديث المخزون محلياً
        setState((prev) => ({
          ...prev,
          items: prev.items.map((item) => {
            if (item.productId !== productId) return item;

            if (dto.variantSku && item.variants) {
              const updatedVariants = item.variants.map((v) =>
                v.sku === dto.variantSku
                  ? { ...v, stock: dto.quantity, isAvailable: dto.quantity > 0 }
                  : v
              );
              return { ...item, variants: updatedVariants };
            }

            const isOutOfStock = !item.isUnlimitedStock && dto.quantity <= 0;
            const isLowStock =
              !item.isUnlimitedStock &&
              item.lowStockThreshold !== null &&
              dto.quantity <= item.lowStockThreshold;

            return {
              ...item,
              stock: dto.quantity,
              isAvailable: dto.quantity > 0 || item.isUnlimitedStock,
              isOutOfStock,
              isLowStock,
            };
          }),
        }));
      } finally {
        setActionLoading(false);
      }
    },
    []
  );

  const bulkUpdate = useCallback(
    async (items: BulkUpdateStockItem[]): Promise<BulkUpdateStockResult> => {
      setActionLoading(true);
      try {
        const result = await bulkUpdateStock({ items });
        // إعادة جلب البيانات بعد التحديث الجماعي
        await fetchInventory(state.filters);
        return result;
      } finally {
        setActionLoading(false);
      }
    },
    [state.filters, fetchInventory]
  );

  const exportCsv = useCallback(async () => {
    setActionLoading(true);
    try {
      const result = await exportInventoryCsv();
      downloadCsv(result.csv, result.filename);
    } finally {
      setActionLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(
    async (
      productId: string,
      options?: { limit?: number; page?: number }
    ): Promise<StockHistoryResult> => {
      return getStockHistory(productId, options);
    },
    []
  );

  return {
    ...state,
    refetch,
    setFilters,
    updateProductStock,
    bulkUpdate,
    exportCsv,
    fetchHistory,
    actionLoading,
  };
}

export default useInventory;
