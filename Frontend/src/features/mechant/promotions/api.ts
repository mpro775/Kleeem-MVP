// src/features/mechant/promotions/api.ts
import axiosInstance from "@/shared/api/axios";
import { ensureIdString } from "@/shared/utils/ids";
import type {
  Promotion,
  PromotionListQuery,
  PromotionListResponse,
  CreatePromotionPayload,
  UpdatePromotionPayload,
} from "./type";

const BASE_PATH = "/promotions";

export async function fetchPromotions(
  query: PromotionListQuery
): Promise<PromotionListResponse> {
  const { merchantId, status, limit = 10, page = 1 } = query;

  const params = {
    merchantId: ensureIdString(merchantId),
    status,
    limit,
    page,
  };

  const { data } = await axiosInstance.get<PromotionListResponse | Promotion[]>(
    BASE_PATH,
    { params }
  );

  if (Array.isArray(data)) {
    return {
      promotions: data,
      total: data.length,
      page: 1,
      limit: data.length,
    };
  }

  return {
    promotions: data.promotions ?? [],
    total: data.total ?? 0,
    page: data.page ?? page,
    limit: data.limit ?? limit,
  };
}

export async function getPromotionById(
  id: string,
  merchantId: string
): Promise<Promotion> {
  const { data } = await axiosInstance.get<Promotion>(
    `${BASE_PATH}/${encodeURIComponent(id)}`,
    { params: { merchantId: ensureIdString(merchantId) } }
  );
  return data;
}

export async function createPromotion(
  payload: CreatePromotionPayload
): Promise<Promotion> {
  const body: CreatePromotionPayload = {
    ...payload,
    merchantId: ensureIdString(payload.merchantId),
    categoryIds: payload.categoryIds?.map((cat) => ensureIdString(cat)),
    productIds: payload.productIds?.map((product) => ensureIdString(product)),
  };

  const { data } = await axiosInstance.post<Promotion>(BASE_PATH, body);
  return data;
}

export async function updatePromotion(
  id: string,
  merchantId: string,
  payload: UpdatePromotionPayload
): Promise<Promotion> {
  const body: UpdatePromotionPayload = {
    ...payload,
    categoryIds: payload.categoryIds?.map((cat) => ensureIdString(cat)),
    productIds: payload.productIds?.map((product) => ensureIdString(product)),
  };

  const { data } = await axiosInstance.patch<Promotion>(
    `${BASE_PATH}/${encodeURIComponent(id)}`,
    body,
    { params: { merchantId: ensureIdString(merchantId) } }
  );
  return data;
}

export async function deletePromotion(
  id: string,
  merchantId: string
): Promise<{ message: string }> {
  const { data } = await axiosInstance.delete<{ message: string }>(
    `${BASE_PATH}/${encodeURIComponent(id)}`,
    { params: { merchantId: ensureIdString(merchantId) } }
  );
  return data;
}

