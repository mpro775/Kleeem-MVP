// src/features/mechant/inventory/api.ts
import axiosInstance from '@/shared/api/axios';
import type {
  InventoryResult,
  InventoryFilters,
  UpdateStockRequest,
  BulkUpdateStockRequest,
  BulkUpdateStockResult,
  StockHistoryResult,
  ExportCsvResult,
} from './types';
import type { ProductResponse } from '@/features/mechant/products/type';

/**
 * جلب قائمة المخزون مع الفلترة
 */
export async function getInventory(
  filters?: InventoryFilters
): Promise<InventoryResult> {
  const { data } = await axiosInstance.get<InventoryResult>('/products/inventory', {
    params: {
      status: filters?.status,
      search: filters?.search,
      page: filters?.page ?? 1,
      limit: filters?.limit ?? 20,
    },
  });
  return data;
}

/**
 * تحديث مخزون منتج واحد
 */
export async function updateStock(
  productId: string,
  dto: UpdateStockRequest
): Promise<ProductResponse> {
  const { data } = await axiosInstance.patch<ProductResponse>(
    `/products/${encodeURIComponent(productId)}/stock`,
    dto
  );
  return data;
}

/**
 * تحديث مخزون عدة منتجات دفعة واحدة
 */
export async function bulkUpdateStock(
  dto: BulkUpdateStockRequest
): Promise<BulkUpdateStockResult> {
  const { data } = await axiosInstance.patch<BulkUpdateStockResult>(
    '/products/stock/bulk',
    dto
  );
  return data;
}

/**
 * جلب سجل تغييرات المخزون لمنتج
 */
export async function getStockHistory(
  productId: string,
  options?: { limit?: number; page?: number }
): Promise<StockHistoryResult> {
  const { data } = await axiosInstance.get<StockHistoryResult>(
    `/products/${encodeURIComponent(productId)}/stock-history`,
    {
      params: {
        limit: options?.limit ?? 50,
        page: options?.page ?? 1,
      },
    }
  );
  return data;
}

/**
 * تصدير المخزون إلى CSV
 */
export async function exportInventoryCsv(): Promise<ExportCsvResult> {
  const { data } = await axiosInstance.get<ExportCsvResult>(
    '/products/inventory/export'
  );
  return data;
}

/**
 * تحميل ملف CSV
 */
export function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
