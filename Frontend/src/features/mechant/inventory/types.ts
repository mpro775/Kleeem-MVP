// src/features/mechant/inventory/types.ts

/**
 * معلومات المخزون لمتغير
 */
export interface VariantStock {
  sku: string;
  stock: number;
  lowStockThreshold: number | null;
  isLowStock: boolean;
  isAvailable: boolean;
}

/**
 * عنصر المخزون (منتج واحد)
 */
export interface InventoryItem {
  productId: string;
  name: string;
  stock: number;
  lowStockThreshold: number | null;
  isUnlimitedStock: boolean;
  isAvailable: boolean;
  isLowStock: boolean;
  isOutOfStock: boolean;
  hasVariants: boolean;
  variants?: VariantStock[];
  images: string[];
}

/**
 * فلاتر جلب المخزون
 */
export interface InventoryFilters {
  status?: 'all' | 'low' | 'out' | 'unlimited' | 'available';
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * نتيجة جلب المخزون
 */
export interface InventoryResult {
  items: InventoryItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

/**
 * طلب تحديث مخزون منتج واحد
 */
export interface UpdateStockRequest {
  quantity: number;
  variantSku?: string;
  reason?: string;
}

/**
 * عنصر في التحديث الجماعي
 */
export interface BulkUpdateStockItem {
  productId: string;
  quantity: number;
  variantSku?: string;
  reason?: string;
}

/**
 * طلب التحديث الجماعي
 */
export interface BulkUpdateStockRequest {
  items: BulkUpdateStockItem[];
}

/**
 * نتيجة التحديث الجماعي
 */
export interface BulkUpdateStockResult {
  success: number;
  failed: number;
  results: Array<{
    productId: string;
    success: boolean;
    error?: string;
  }>;
}

/**
 * سجل تغيير في المخزون
 */
export interface StockChangeLog {
  id: string;
  productName: string;
  variantSku: string | null;
  previousStock: number;
  newStock: number;
  changeAmount: number;
  changeType: StockChangeType;
  reason: string | null;
  changedByName: string;
  changedAt: string;
}

/**
 * نوع التغيير
 */
export type StockChangeType =
  | 'manual'
  | 'order_placed'
  | 'order_cancelled'
  | 'order_returned'
  | 'import'
  | 'sync'
  | 'adjustment';

/**
 * نتيجة جلب سجل التغييرات
 */
export interface StockHistoryResult {
  items: StockChangeLog[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * نتيجة تصدير CSV
 */
export interface ExportCsvResult {
  csv: string;
  filename: string;
}

/**
 * حالة المخزون
 */
export type InventoryStatus = 'all' | 'low' | 'out' | 'unlimited' | 'available';

/**
 * خيارات حالة المخزون للعرض
 */
export const INVENTORY_STATUS_OPTIONS: Array<{
  value: InventoryStatus;
  label: string;
  color: 'default' | 'warning' | 'error' | 'success' | 'info';
}> = [
  { value: 'all', label: 'الكل', color: 'default' },
  { value: 'available', label: 'متاح', color: 'success' },
  { value: 'low', label: 'منخفض', color: 'warning' },
  { value: 'out', label: 'منتهي', color: 'error' },
  { value: 'unlimited', label: 'غير محدود', color: 'info' },
];
