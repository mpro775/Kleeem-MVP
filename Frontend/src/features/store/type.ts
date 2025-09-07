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
export interface Order {
  _id: string;
  merchantId: string;
  sessionId: string;
  customer: CustomerInfo;
  products: OrderProduct[];
  status: 'pending' | 'paid' | 'canceled';
  createdAt: string;
  updatedAt: string;
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
