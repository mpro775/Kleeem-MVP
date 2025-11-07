/**
 * API Client لإعدادات العملات
 */

import axios from '@/lib/axios';
import {
  CurrencySettings,
  DiscountPolicy,
  UpdateCurrencySettingsDto,
  UpdateDiscountPolicyDto,
} from '../coupons/types';

const BASE_URL = '/merchants';

/**
 * الحصول على إعدادات العملات
 */
export async function getCurrencySettings(
  merchantId: string
): Promise<CurrencySettings> {
  const response = await axios.get(`${BASE_URL}/${merchantId}/currency-settings`);
  return response.data;
}

/**
 * تحديث إعدادات العملات
 */
export async function updateCurrencySettings(
  merchantId: string,
  data: UpdateCurrencySettingsDto
): Promise<CurrencySettings> {
  const response = await axios.patch(
    `${BASE_URL}/${merchantId}/currency-settings`,
    data
  );
  return response.data;
}

/**
 * الحصول على سياسة الخصومات
 */
export async function getDiscountPolicy(
  merchantId: string
): Promise<DiscountPolicy> {
  const response = await axios.get(`${BASE_URL}/${merchantId}/discount-policy`);
  return response.data;
}

/**
 * تحديث سياسة الخصومات
 */
export async function updateDiscountPolicy(
  merchantId: string,
  data: UpdateDiscountPolicyDto
): Promise<DiscountPolicy> {
  const response = await axios.patch(
    `${BASE_URL}/${merchantId}/discount-policy`,
    data
  );
  return response.data;
}

