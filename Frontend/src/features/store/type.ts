export interface Banner {
    image?: string;
    text: string;
    url?: string;
    color?: string;
    active?: boolean;
    order?: number;
  }
  import type { ProductResponse } from "@/features/mechant/products/type";
  type CustomerAddress =
  | string
  | { line1?: string; line2?: string; city?: string; state?: string; postalCode?: string; country?: string };

export interface CustomerInfo {
  name: string;
  phone: string;
  address?: CustomerAddress;
  [key: string]: string | CustomerAddress | undefined; // دعم أي بيانات مستقبلية
}
export interface OrderProduct {
  productId: string;
    product?: string | ProductResponse;
  name: string;
  quantity: number;
  price: number;
    image?: string;
}

export interface OrderPricing {
  subtotal?: number;
  total?: number;
  totalDiscount?: number;
  shippingCost?: number;
  shippingDiscount?: number;
  promotions?: Array<{ name?: string; amount?: number }>;
  coupon?: { code: string; amount: number } | null;
  products?: Array<{ name?: string; amount?: number }>;
}

export type OrderStatus =
  | "pending"
  | "paid"
  | "canceled"
  | "shipped"
  | "delivered"
  | "refunded";

export interface Order {
  _id: string;
  merchantId: string;
  currency?: string;
  sessionId: string;
  customer: CustomerInfo;
  products: OrderProduct[];
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  pricing?: OrderPricing | null;
}
export interface Lead {
  _id: string;
  merchantId: string;
  sessionId: string;
  data: CustomerInfo;
  source?: string;
  createdAt: string;
  updatedAt: string;
}
