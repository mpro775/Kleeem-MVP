/**
 * Orders Queries
 * @description React Query hooks for fetching order data
 */

import { useQuery } from '@tanstack/react-query';
import { fetchOrders, fetchOrderById } from './api';
import type { FetchOrdersParams } from './types';

/**
 * Query keys for orders
 */
export const ordersKeys = {
  all: ['orders'] as const,
  lists: () => [...ordersKeys.all, 'list'] as const,
  list: (params: FetchOrdersParams) =>
    [...ordersKeys.lists(), params] as const,
  details: () => [...ordersKeys.all, 'detail'] as const,
  detail: (id: string) => [...ordersKeys.details(), id] as const,
};

/**
 * Hook to fetch orders with pagination and filters
 */
export function useOrders(params: FetchOrdersParams) {
  return useQuery({
    queryKey: ordersKeys.list(params),
    queryFn: () => fetchOrders(params),
    staleTime: 30000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch a single order by ID
 */
export function useOrder(orderId: string | null) {
  return useQuery({
    queryKey: ordersKeys.detail(orderId || ''),
    queryFn: () => fetchOrderById(orderId!),
    enabled: !!orderId,
    staleTime: 60000, // 1 minute
  });
}

