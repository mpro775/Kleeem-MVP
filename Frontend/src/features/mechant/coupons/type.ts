// src/features/mechant/coupons/type.ts
export type CouponType = "percentage" | "fixed_amount" | "free_shipping";

export type CouponStatus = "active" | "inactive" | "expired";

export interface Coupon {
  _id: string;
  merchantId: string;
  code: string;
  description?: string;
  type: CouponType;
  value: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number | null;
  usageLimit?: number | null;
  usedCount: number;
  oneTimePerCustomer: boolean;
  allowedCustomers?: string[];
  usedByCustomers?: string[];
  storeWide: boolean;
  products?: string[];
  categories?: string[];
  startDate?: string | null;
  endDate?: string | null;
  status: CouponStatus;
  totalDiscountGiven?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CouponListResponse {
  coupons: Coupon[];
  total: number;
  page: number;
  limit: number;
}

export interface CouponListQuery {
  merchantId: string;
  status?: CouponStatus;
  page?: number;
  limit?: number;
  search?: string;
}

export interface CouponBasePayload {
  description?: string;
  type: CouponType;
  value: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number | null;
  usageLimit?: number | null;
  oneTimePerCustomer?: boolean;
  allowedCustomers?: string[];
  storeWide?: boolean;
  products?: string[];
  categories?: string[];
  startDate?: string | null;
  endDate?: string | null;
  status?: CouponStatus;
}

export interface CreateCouponPayload extends CouponBasePayload {
  merchantId: string;
  code: string;
}

export type UpdateCouponPayload = CouponBasePayload;

export interface CouponGenerationPayload {
  merchantId: string;
  count: number;
  length?: number;
}

export interface CouponGenerationResponse {
  codes: string[];
}

