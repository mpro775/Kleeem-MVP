// src/features/api.ts
import axiosInstance from "@/shared/api/axios";
import type { Order, OrderStatus, PaginatedOrdersResponse } from "./type";

// تعريف نوع البارامترات لدالة جلب الطلبات لتسهيل القراءة
interface FetchOrdersParams {
  page: number;
  limit: number;
  phone?: string;
  status?: string;
}

/**
 * دالة لجلب قائمة الطلبات مع الفلترة وترقيم الصفحات
 * @param params - كائن يحتوي على معلومات الصفحة والفلترة
 * @returns {Promise<{orders: Order[], total: number}>} - وعد يُرجع الطلبات والعدد الإجمالي
 */
export const fetchOrders = async (params: FetchOrdersParams): Promise<{ orders: Order[]; total: number }> => {
  const response = await axiosInstance.get<PaginatedOrdersResponse | Order[]>("/orders", { params });

  // API قد يرجع أحياناً مصفوفة مباشرة أو كائن يحتوي على بيانات الصفحة
  if (Array.isArray(response.data)) {
    return { orders: response.data, total: response.data.length };
  }
  
  // الحالة الافتراضية للبيانات المصفحة
  return {
    orders: response.data.orders || [],
    total: response.data.total || 0,
  };
};

/**
 * دالة لتحديث حالة طلب معين
 * @param orderId - معرف الطلب
 * @param status - الحالة الجديدة للطلب
 * @returns {Promise<Order>} - وعد يُرجع الطلب المحدث
 */
export const updateOrderStatus = async (orderId: string, status: OrderStatus): Promise<Order> => {
  const response = await axiosInstance.patch<Order>(`/orders/${orderId}/status`, { status });
  return response.data;
};