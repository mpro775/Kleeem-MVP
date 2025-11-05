import axiosInstance from '@/lib/axios';
import type { Category, CategoryNode } from './types';
import { ensureIdString } from '@/lib/utils/ids';

// Helper to unwrap response
function unwrap<T>(data: unknown): T {
  return data as T;
}

// جلب الشجرة (مع كسر الكاش)
export async function getCategoriesTree(
  merchantId: string
): Promise<CategoryNode[]> {
  const res = await axiosInstance.get(`/categories`, {
    params: { merchantId: ensureIdString(merchantId), tree: true, _t: Date.now() },
    validateStatus: (s) => (s >= 200 && s < 300) || s === 304,
  });
  return Array.isArray(unwrap<CategoryNode[]>(res.data))
    ? unwrap(res.data)
    : [];
}

export async function hasAnyCategory(merchantId: string): Promise<boolean> {
  if (!merchantId) return false;
  const res = await axiosInstance.get(`/categories`, {
    params: { merchantId: ensureIdString(merchantId) },
  });
  const list = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
  return Array.isArray(list) && list.length > 0;
}

// جلب flat (مع كسر الكاش أيضاً لسلامة التوافق)
export async function getCategoriesFlat(
  merchantId: string
): Promise<Category[]> {
  const res = await axiosInstance.get(`/categories`, {
    params: { merchantId: ensureIdString(merchantId), _t: Date.now() },
    validateStatus: (s) => (s >= 200 && s < 300) || s === 304,
  });
  return Array.isArray(unwrap<Category[]>(res.data)) ? unwrap(res.data) : [];
}

