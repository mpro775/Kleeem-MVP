/**
 * API Client للكوبونات
 */

import axios from '@/lib/axios';
import {
  Coupon,
  CreateCouponDto,
  UpdateCouponDto,
  ValidateCouponDto,
  CouponValidationResult,
  CouponStats,
  CouponsFilterParams,
} from './types';

const BASE_URL = '/coupons';

/**
 * الحصول على قائمة الكوبونات
 */
export async function getCoupons(
  params: CouponsFilterParams
): Promise<{ coupons: Coupon[]; total: number }> {
  const response = await axios.get(BASE_URL, { params });
  return response.data;
}

/**
 * الحصول على كوبون بالـ ID
 */
export async function getCouponById(id: string): Promise<Coupon> {
  const response = await axios.get(`${BASE_URL}/${id}`);
  return response.data;
}

/**
 * الحصول على كوبون بالكود
 */
export async function getCouponByCode(
  code: string,
  merchantId: string
): Promise<Coupon> {
  const response = await axios.get(`${BASE_URL}/code/${code}`, {
    params: { merchantId },
  });
  return response.data;
}

/**
 * إنشاء كوبون جديد
 */
export async function createCoupon(
  merchantId: string,
  data: CreateCouponDto
): Promise<Coupon> {
  const response = await axios.post(BASE_URL, {
    merchantId,
    ...data,
  });
  return response.data;
}

/**
 * تحديث كوبون
 */
export async function updateCoupon(
  id: string,
  data: UpdateCouponDto
): Promise<Coupon> {
  const response = await axios.patch(`${BASE_URL}/${id}`, data);
  return response.data;
}

/**
 * حذف كوبون
 */
export async function deleteCoupon(id: string): Promise<void> {
  await axios.delete(`${BASE_URL}/${id}`);
}

/**
 * التحقق من صلاحية كوبون
 */
export async function validateCoupon(
  data: ValidateCouponDto
): Promise<CouponValidationResult> {
  const response = await axios.post(`${BASE_URL}/validate`, data);
  return response.data;
}

/**
 * تطبيق كوبون على سلة
 */
export async function applyCoupon(
  data: ValidateCouponDto
): Promise<CouponValidationResult> {
  const response = await axios.post(`${BASE_URL}/apply`, data);
  return response.data;
}

/**
 * توليد كوبونات عشوائية
 */
export async function generateCoupons(
  merchantId: string,
  count: number,
  template: CreateCouponDto
): Promise<Coupon[]> {
  const response = await axios.post(`${BASE_URL}/generate-codes`, {
    merchantId,
    count,
    template,
  });
  return response.data;
}

/**
 * الحصول على إحصائيات الكوبونات
 */
export async function getCouponStats(merchantId: string): Promise<CouponStats> {
  const response = await axios.get(`${BASE_URL}/stats`, {
    params: { merchantId },
  });
  return response.data;
}

/**
 * تفعيل/تعطيل كوبون
 */
export async function toggleCouponStatus(
  id: string,
  isActive: boolean
): Promise<Coupon> {
  const response = await axios.patch(`${BASE_URL}/${id}`, { isActive });
  return response.data;
}

