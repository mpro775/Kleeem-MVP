/**
 * React Query hooks للكوبونات
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCoupons,
  getCouponById,
  getCouponByCode,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
  applyCoupon,
  generateCoupons,
  getCouponStats,
  toggleCouponStatus,
} from './api';
import {
  CouponsFilterParams,
  CreateCouponDto,
  UpdateCouponDto,
  ValidateCouponDto,
} from './types';

// Query Keys
export const couponKeys = {
  all: ['coupons'] as const,
  lists: () => [...couponKeys.all, 'list'] as const,
  list: (filters: CouponsFilterParams) =>
    [...couponKeys.lists(), filters] as const,
  details: () => [...couponKeys.all, 'detail'] as const,
  detail: (id: string) => [...couponKeys.details(), id] as const,
  stats: (merchantId: string) =>
    [...couponKeys.all, 'stats', merchantId] as const,
  byCode: (code: string, merchantId: string) =>
    [...couponKeys.all, 'code', code, merchantId] as const,
};

/**
 * Hook للحصول على قائمة الكوبونات
 */
export function useCoupons(params: CouponsFilterParams) {
  return useQuery({
    queryKey: couponKeys.list(params),
    queryFn: () => getCoupons(params),
  });
}

/**
 * Hook للحصول على كوبون بالـ ID
 */
export function useCoupon(id: string) {
  return useQuery({
    queryKey: couponKeys.detail(id),
    queryFn: () => getCouponById(id),
    enabled: !!id,
  });
}

/**
 * Hook للحصول على كوبون بالكود
 */
export function useCouponByCode(code: string, merchantId: string) {
  return useQuery({
    queryKey: couponKeys.byCode(code, merchantId),
    queryFn: () => getCouponByCode(code, merchantId),
    enabled: !!code && !!merchantId,
  });
}

/**
 * Hook للحصول على إحصائيات الكوبونات
 */
export function useCouponStats(merchantId: string) {
  return useQuery({
    queryKey: couponKeys.stats(merchantId),
    queryFn: () => getCouponStats(merchantId),
    enabled: !!merchantId,
  });
}

/**
 * Hook لإنشاء كوبون
 */
export function useCreateCoupon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      merchantId,
      data,
    }: {
      merchantId: string;
      data: CreateCouponDto;
    }) => createCoupon(merchantId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: couponKeys.lists() });
      queryClient.invalidateQueries({ queryKey: couponKeys.all });
    },
  });
}

/**
 * Hook لتحديث كوبون
 */
export function useUpdateCoupon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCouponDto }) =>
      updateCoupon(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: couponKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: couponKeys.lists() });
    },
  });
}

/**
 * Hook لحذف كوبون
 */
export function useDeleteCoupon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteCoupon(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: couponKeys.lists() });
      queryClient.invalidateQueries({ queryKey: couponKeys.all });
    },
  });
}

/**
 * Hook للتحقق من كوبون
 */
export function useValidateCoupon() {
  return useMutation({
    mutationFn: (data: ValidateCouponDto) => validateCoupon(data),
  });
}

/**
 * Hook لتطبيق كوبون
 */
export function useApplyCoupon() {
  return useMutation({
    mutationFn: (data: ValidateCouponDto) => applyCoupon(data),
  });
}

/**
 * Hook لتوليد كوبونات
 */
export function useGenerateCoupons() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      merchantId,
      count,
      template,
    }: {
      merchantId: string;
      count: number;
      template: CreateCouponDto;
    }) => generateCoupons(merchantId, count, template),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: couponKeys.lists() });
    },
  });
}

/**
 * Hook لتفعيل/تعطيل كوبون
 */
export function useToggleCouponStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      toggleCouponStatus(id, isActive),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: couponKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: couponKeys.lists() });
    },
  });
}

