// src/features/mechant/coupons/api.ts
import axiosInstance from "@/shared/api/axios";
import { ensureIdString } from "@/shared/utils/ids";
import type {
  Coupon,
  CouponListQuery,
  CouponListResponse,
  CreateCouponPayload,
  UpdateCouponPayload,
  CouponGenerationPayload,
  CouponGenerationResponse,
} from "./type";

const BASE_PATH = "/coupons";

export async function fetchCoupons(
  query: CouponListQuery
): Promise<CouponListResponse> {
  const { merchantId, status, limit = 10, page = 1, search } = query;

  const params = {
    merchantId: ensureIdString(merchantId),
    status,
    limit,
    page,
    search: search?.trim() || undefined,
  };

  const { data } = await axiosInstance.get<CouponListResponse | Coupon[]>(
    BASE_PATH,
    { params }
  );

  if (Array.isArray(data)) {
    return {
      coupons: data,
      total: data.length,
      page: 1,
      limit: data.length,
    };
  }

  return {
    coupons: data.coupons ?? [],
    total: data.total ?? 0,
    page: data.page ?? page,
    limit: data.limit ?? limit,
  };
}

export async function getCouponById(
  id: string,
  merchantId: string
): Promise<Coupon> {
  const { data } = await axiosInstance.get<Coupon>(
    `${BASE_PATH}/${encodeURIComponent(id)}`,
    { params: { merchantId: ensureIdString(merchantId) } }
  );
  return data;
}

export async function createCoupon(
  payload: CreateCouponPayload
): Promise<Coupon> {
  const body: CreateCouponPayload = {
    ...payload,
    merchantId: ensureIdString(payload.merchantId),
    code: payload.code.trim().toUpperCase(),
    allowedCustomers: payload.allowedCustomers?.map((customer) =>
      customer.trim()
    ),
    products: payload.products?.map(ensureIdString),
    categories: payload.categories?.map(ensureIdString),
  };

  const { data } = await axiosInstance.post<Coupon>(BASE_PATH, body);
  return data;
}

export async function updateCoupon(
  id: string,
  merchantId: string,
  payload: UpdateCouponPayload
): Promise<Coupon> {
  const body: UpdateCouponPayload = {
    ...payload,
    allowedCustomers: payload.allowedCustomers?.map((customer) =>
      customer.trim()
    ),
    products: payload.products?.map(ensureIdString),
    categories: payload.categories?.map(ensureIdString),
  };

  const { data } = await axiosInstance.patch<Coupon>(
    `${BASE_PATH}/${encodeURIComponent(id)}`,
    body,
    { params: { merchantId: ensureIdString(merchantId) } }
  );
  return data;
}

export async function deleteCoupon(
  id: string,
  merchantId: string
): Promise<{ message: string }> {
  const { data } = await axiosInstance.delete<{ message: string }>(
    `${BASE_PATH}/${encodeURIComponent(id)}`,
    { params: { merchantId: ensureIdString(merchantId) } }
  );
  return data;
}

export async function generateCouponCodes(
  payload: CouponGenerationPayload
): Promise<CouponGenerationResponse> {
  const body: CouponGenerationPayload = {
    ...payload,
    merchantId: ensureIdString(payload.merchantId),
  };

  const { data } = await axiosInstance.post<CouponGenerationResponse>(
    `${BASE_PATH}/generate-codes`,
    body
  );
  return data;
}

