import axiosInstance from '@/lib/axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const uploadBannerImages = async (
  merchantId: string,
  files: File[]
) => {
  const form = new FormData();
  files.forEach((f) => form.append('files', f));

  const { data } = await axiosInstance.post<{
    urls: string[];
    accepted: number;
    remaining: number;
    max: number;
  }>(`${API_BASE}/storefront/by-merchant/${merchantId}/banners/upload`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return data;
};

export const getStorefrontBySlug = async (slug: string) => {
  const { data } = await axiosInstance.get(
    `${API_BASE}/storefront/by-slug/${slug}`
  );
  return data;
};

export const getStorefrontProducts = async (
  slug: string,
  params?: {
    category?: string;
    search?: string;
    page?: number;
    limit?: number;
  }
) => {
  const { data } = await axiosInstance.get(
    `${API_BASE}/storefront/by-slug/${slug}/products`,
    { params }
  );
  return data;
};

export const getStorefrontProduct = async (slug: string, productId: string) => {
  const { data } = await axiosInstance.get(
    `${API_BASE}/storefront/by-slug/${slug}/products/${productId}`
  );
  return data;
};

export const createOrder = async (slug: string, orderData: any) => {
  const { data } = await axiosInstance.post(
    `${API_BASE}/storefront/by-slug/${slug}/orders`,
    orderData
  );
  return data;
};

export const getOrder = async (slug: string, orderId: string) => {
  const { data } = await axiosInstance.get(
    `${API_BASE}/storefront/by-slug/${slug}/orders/${orderId}`
  );
  return data;
};

export const submitLead = async (slug: string, leadData: any) => {
  const { data } = await axiosInstance.post(
    `${API_BASE}/storefront/by-slug/${slug}/leads`,
    leadData
  );
  return data;
};

