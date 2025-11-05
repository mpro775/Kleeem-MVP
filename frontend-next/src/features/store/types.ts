import type { ProductResponse } from '@/features/merchant/products/types';

export interface Banner {
  image?: string;
  text: string;
  url?: string;
  color?: string;
  active?: boolean;
  order?: number;
}

type CustomerAddress =
  | string
  | {
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country?: string;
    };

export interface CustomerInfo {
  name: string;
  phone: string;
  address?: CustomerAddress;
  [key: string]: string | CustomerAddress | undefined;
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
  currency?: string;
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

export interface StoreConfig {
  _id: string;
  merchantId: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  phone?: string;
  email?: string;
  address?: string;
  socialLinks?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    whatsapp?: string;
  };
  workingHours?: Array<{
    day: string;
    open: string;
    close: string;
    closed?: boolean;
  }>;
  policies?: {
    return?: string;
    shipping?: string;
    privacy?: string;
  };
  theme?: {
    primaryColor?: string;
    secondaryColor?: string;
    fontFamily?: string;
  };
  banners?: Banner[];
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

