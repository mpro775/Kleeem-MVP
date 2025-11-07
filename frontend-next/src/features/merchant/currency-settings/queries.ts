/**
 * React Query hooks لإعدادات العملات
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCurrencySettings,
  updateCurrencySettings,
  getDiscountPolicy,
  updateDiscountPolicy,
} from './api';
import {
  UpdateCurrencySettingsDto,
  UpdateDiscountPolicyDto,
} from '../coupons/types';

// Query Keys
export const currencySettingsKeys = {
  all: ['currency-settings'] as const,
  detail: (merchantId: string) => [...currencySettingsKeys.all, merchantId] as const,
};

export const discountPolicyKeys = {
  all: ['discount-policy'] as const,
  detail: (merchantId: string) => [...discountPolicyKeys.all, merchantId] as const,
};

/**
 * Hook للحصول على إعدادات العملات
 */
export function useCurrencySettings(merchantId: string) {
  return useQuery({
    queryKey: currencySettingsKeys.detail(merchantId),
    queryFn: () => getCurrencySettings(merchantId),
    enabled: !!merchantId,
  });
}

/**
 * Hook لتحديث إعدادات العملات
 */
export function useUpdateCurrencySettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      merchantId,
      data,
    }: {
      merchantId: string;
      data: UpdateCurrencySettingsDto;
    }) => updateCurrencySettings(merchantId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: currencySettingsKeys.detail(variables.merchantId),
      });
    },
  });
}

/**
 * Hook للحصول على سياسة الخصومات
 */
export function useDiscountPolicy(merchantId: string) {
  return useQuery({
    queryKey: discountPolicyKeys.detail(merchantId),
    queryFn: () => getDiscountPolicy(merchantId),
    enabled: !!merchantId,
  });
}

/**
 * Hook لتحديث سياسة الخصومات
 */
export function useUpdateDiscountPolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      merchantId,
      data,
    }: {
      merchantId: string;
      data: UpdateDiscountPolicyDto;
    }) => updateDiscountPolicy(merchantId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: discountPolicyKeys.detail(variables.merchantId),
      });
    },
  });
}

