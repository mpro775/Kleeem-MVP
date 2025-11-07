/**
 * API Client للعروض الترويجية
 */

import axios from '@/lib/axios';
import {
  Promotion,
  CreatePromotionDto,
  UpdatePromotionDto,
  PromotionStats,
  PromotionsFilterParams,
} from '../coupons/types';

const BASE_URL = '/promotions';

/**
 * الحصول على قائمة العروض
 */
export async function getPromotions(
  params: PromotionsFilterParams
): Promise<{ promotions: Promotion[]; total: number }> {
  const response = await axios.get(BASE_URL, { params });
  return response.data;
}

/**
 * الحصول على عرض بالـ ID
 */
export async function getPromotionById(id: string): Promise<Promotion> {
  const response = await axios.get(`${BASE_URL}/${id}`);
  return response.data;
}

/**
 * إنشاء عرض جديد
 */
export async function createPromotion(
  merchantId: string,
  data: CreatePromotionDto
): Promise<Promotion> {
  const response = await axios.post(BASE_URL, {
    merchantId,
    ...data,
  });
  return response.data;
}

/**
 * تحديث عرض
 */
export async function updatePromotion(
  id: string,
  data: UpdatePromotionDto
): Promise<Promotion> {
  const response = await axios.patch(`${BASE_URL}/${id}`, data);
  return response.data;
}

/**
 * حذف عرض
 */
export async function deletePromotion(id: string): Promise<void> {
  await axios.delete(`${BASE_URL}/${id}`);
}

/**
 * الحصول على إحصائيات العروض
 */
export async function getPromotionStats(
  merchantId: string
): Promise<PromotionStats> {
  const response = await axios.get(`${BASE_URL}/stats`, {
    params: { merchantId },
  });
  return response.data;
}

/**
 * تفعيل/تعطيل عرض
 */
export async function togglePromotionStatus(
  id: string,
  isActive: boolean
): Promise<Promotion> {
  const response = await axios.patch(`${BASE_URL}/${id}`, { isActive });
  return response.data;
}

/**
 * الحصول على العروض المطبقة على سلة معينة
 */
export async function getApplicablePromotions(
  merchantId: string,
  cartItems: Array<{
    productId: string;
    categoryId?: string;
    price: number;
    quantity: number;
  }>,
  totalAmount: number
): Promise<Promotion[]> {
  const response = await axios.post(`${BASE_URL}/applicable`, {
    merchantId,
    cartItems,
    totalAmount,
  });
  return response.data;
}

