/**
 * Orders Utilities
 * @description Helper functions for orders
 */

import type { Order, ProductInOrder } from '../types';
import { formatMoney } from '@/lib/utils/money';

/**
 * Calculate order total
 */
export function calculateOrderTotal(order: Order): number {
  return (order.products || []).reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
}

/**
 * Calculate order total formatted
 */
export function calculateOrderTotalFormatted(
  order: Order,
  currency = 'SAR'
): string {
  const total = calculateOrderTotal(order);
  return formatMoney(total, currency);
}

/**
 * Get product name from ProductInOrder
 */
export function getProductName(product: ProductInOrder): string {
  if (typeof product.product === 'object' && product.product?.name) {
    return product.product.name;
  }
  return product.name;
}

/**
 * Format order ID for display (first 8 characters uppercase)
 */
export function formatOrderId(orderId: string): string {
  return `#${orderId.substring(0, 8).toUpperCase()}`;
}

/**
 * Calculate line item total
 */
export function calculateLineTotal(item: ProductInOrder): number {
  return item.price * item.quantity;
}

