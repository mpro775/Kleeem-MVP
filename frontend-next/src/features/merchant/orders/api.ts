/**
 * Orders API
 * @description API calls for Orders management
 */

import axiosInstance from '@/lib/api/axios';
import type {
  Order,
  OrderStatus,
  PaginatedOrdersResponse,
  FetchOrdersParams,
  UpdateOrderStatusDTO,
} from './types';

/**
 * Fetch orders with pagination and filters
 */
export const fetchOrders = async (
  params: FetchOrdersParams
): Promise<{ orders: Order[]; total: number }> => {
  const response = await axiosInstance.get<PaginatedOrdersResponse | Order[]>(
    '/orders',
    { params }
  );

  // API might return array directly or paginated object
  if (Array.isArray(response.data)) {
    return {
      orders: response.data,
      total: response.data.length,
    };
  }

  return {
    orders: response.data.orders || [],
    total: response.data.total || 0,
  };
};

/**
 * Fetch a single order by ID
 */
export const fetchOrderById = async (orderId: string): Promise<Order> => {
  const response = await axiosInstance.get<Order>(`/orders/${orderId}`);
  return response.data;
};

/**
 * Update order status
 */
export const updateOrderStatus = async (
  orderId: string,
  status: OrderStatus
): Promise<Order> => {
  const response = await axiosInstance.patch<Order>(
    `/orders/${orderId}/status`,
    { status } as UpdateOrderStatusDTO
  );
  return response.data;
};

/**
 * Delete an order (optional, if supported by backend)
 */
export const deleteOrder = async (orderId: string): Promise<void> => {
  await axiosInstance.delete(`/orders/${orderId}`);
};

/**
 * Export orders to CSV (optional, if supported by backend)
 */
export const exportOrdersToCSV = async (
  params: FetchOrdersParams
): Promise<Blob> => {
  const response = await axiosInstance.get('/orders/export', {
    params,
    responseType: 'blob',
  });
  return response.data;
};

