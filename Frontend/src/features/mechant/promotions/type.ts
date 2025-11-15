// src/features/mechant/promotions/type.ts
export type PromotionType = "percentage" | "fixed_amount" | "cart_threshold";

export type ApplyTo = "all" | "categories" | "products";

export type PromotionStatus = "active" | "inactive" | "expired" | "scheduled";

export interface Promotion {
  _id: string;
  merchantId: string;
  name: string;
  description?: string;
  type: PromotionType;
  discountValue: number;
  maxDiscountAmount?: number | null;
  minCartAmount?: number;
  applyTo: ApplyTo;
  categoryIds?: string[];
  productIds?: string[];
  startDate?: string | null;
  endDate?: string | null;
  priority: number;
  countdownTimer: boolean;
  status: PromotionStatus;
  usageLimit?: number | null;
  timesUsed?: number;
  totalDiscountGiven?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PromotionListResponse {
  promotions: Promotion[];
  total: number;
  page: number;
  limit: number;
}

export interface PromotionListQuery {
  merchantId: string;
  status?: PromotionStatus;
  page?: number;
  limit?: number;
}

export interface PromotionBasePayload {
  name: string;
  description?: string;
  type: PromotionType;
  discountValue: number;
  maxDiscountAmount?: number | null;
  minCartAmount?: number;
  applyTo?: ApplyTo;
  categoryIds?: string[];
  productIds?: string[];
  startDate?: string | null;
  endDate?: string | null;
  priority?: number;
  countdownTimer?: boolean;
  usageLimit?: number | null;
}

export interface CreatePromotionPayload extends PromotionBasePayload {
  merchantId: string;
}

export interface UpdatePromotionPayload
  extends Partial<PromotionBasePayload> {
  status?: PromotionStatus;
}

