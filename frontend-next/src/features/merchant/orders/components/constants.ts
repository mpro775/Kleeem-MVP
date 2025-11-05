/**
 * Orders Constants
 * @description Constants for order status labels and colors
 */

import type { OrderStatus } from '../types';

/**
 * Order status labels in Arabic
 */
export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'قيد الانتظار',
  paid: 'مدفوع',
  shipped: 'تم الشحن',
  delivered: 'تم التوصيل',
  canceled: 'ملغي',
  refunded: 'مسترجع',
};

/**
 * Get color for order status
 */
export function getStatusColor(
  status: OrderStatus
): 'default' | 'primary' | 'success' | 'info' | 'warning' | 'error' {
  switch (status) {
    case 'pending':
      return 'warning';
    case 'paid':
      return 'primary';
    case 'shipped':
      return 'info';
    case 'delivered':
      return 'success';
    case 'refunded':
      return 'default';
    case 'canceled':
      return 'error';
    default:
      return 'default';
  }
}

