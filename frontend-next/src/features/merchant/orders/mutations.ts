/**
 * Orders Mutations
 * @description React Query hooks for mutating order data
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateOrderStatus, deleteOrder } from './api';
import type { OrderStatus } from './types';
import { ordersKeys } from './queries';
import { useErrorHandler } from '@/lib/hooks/useErrorHandler';

/**
 * Hook to update order status
 */
export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: ({
      orderId,
      status,
    }: {
      orderId: string;
      status: OrderStatus;
    }) => updateOrderStatus(orderId, status),
    onSuccess: (updatedOrder) => {
      // Invalidate all order lists
      queryClient.invalidateQueries({ queryKey: ordersKeys.lists() });
      // Update the specific order detail in cache
      queryClient.setQueryData(
        ordersKeys.detail(updatedOrder._id),
        updatedOrder
      );
    },
    onError: (error) => {
      handleError(error);
    },
  });
}

/**
 * Hook to delete an order
 */
export function useDeleteOrder() {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: (orderId: string) => deleteOrder(orderId),
    onSuccess: () => {
      // Invalidate all order lists
      queryClient.invalidateQueries({ queryKey: ordersKeys.lists() });
    },
    onError: (error) => {
      handleError(error);
    },
  });
}

