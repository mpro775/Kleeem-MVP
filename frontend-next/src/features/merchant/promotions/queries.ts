/**
 * React Query hooks للعروض الترويجية
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPromotions,
  getPromotionById,
  createPromotion,
  updatePromotion,
  deletePromotion,
  getPromotionStats,
  togglePromotionStatus,
  getApplicablePromotions,
} from './api';
import {
  PromotionsFilterParams,
  CreatePromotionDto,
  UpdatePromotionDto,
} from '../coupons/types';

// Query Keys
export const promotionKeys = {
  all: ['promotions'] as const,
  lists: () => [...promotionKeys.all, 'list'] as const,
  list: (filters: PromotionsFilterParams) =>
    [...promotionKeys.lists(), filters] as const,
  details: () => [...promotionKeys.all, 'detail'] as const,
  detail: (id: string) => [...promotionKeys.details(), id] as const,
  stats: (merchantId: string) =>
    [...promotionKeys.all, 'stats', merchantId] as const,
};

/**
 * Hook للحصول على قائمة العروض
 */
export function usePromotions(params: PromotionsFilterParams) {
  return useQuery({
    queryKey: promotionKeys.list(params),
    queryFn: () => getPromotions(params),
  });
}

/**
 * Hook للحصول على عرض بالـ ID
 */
export function usePromotion(id: string) {
  return useQuery({
    queryKey: promotionKeys.detail(id),
    queryFn: () => getPromotionById(id),
    enabled: !!id,
  });
}

/**
 * Hook للحصول على إحصائيات العروض
 */
export function usePromotionStats(merchantId: string) {
  return useQuery({
    queryKey: promotionKeys.stats(merchantId),
    queryFn: () => getPromotionStats(merchantId),
    enabled: !!merchantId,
  });
}

/**
 * Hook لإنشاء عرض
 */
export function useCreatePromotion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      merchantId,
      data,
    }: {
      merchantId: string;
      data: CreatePromotionDto;
    }) => createPromotion(merchantId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: promotionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: promotionKeys.all });
    },
  });
}

/**
 * Hook لتحديث عرض
 */
export function useUpdatePromotion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePromotionDto }) =>
      updatePromotion(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: promotionKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: promotionKeys.lists() });
    },
  });
}

/**
 * Hook لحذف عرض
 */
export function useDeletePromotion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deletePromotion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: promotionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: promotionKeys.all });
    },
  });
}

/**
 * Hook لتفعيل/تعطيل عرض
 */
export function useTogglePromotionStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      togglePromotionStatus(id, isActive),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: promotionKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: promotionKeys.lists() });
    },
  });
}

/**
 * Hook للحصول على العروض المطبقة
 */
export function useApplicablePromotions(
  merchantId: string,
  cartItems: Array<{
    productId: string;
    categoryId?: string;
    price: number;
    quantity: number;
  }>,
  totalAmount: number
) {
  return useQuery({
    queryKey: [
      ...promotionKeys.all,
      'applicable',
      merchantId,
      cartItems,
      totalAmount,
    ],
    queryFn: () =>
      getApplicablePromotions(merchantId, cartItems, totalAmount),
    enabled: !!merchantId && cartItems.length > 0,
  });
}

