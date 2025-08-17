/**
 * ملف يحتوي على جميع النماذج والأنماط المرتبطة بـ Zid API
 */

// OAuth Response Models
export interface ZidOAuthTokenResponse {
  access_token: string;
  refresh_token: string;
  store_id: string;
  token_type: string;
  expires_in: number;
  scope?: string;
  [key: string]: any;
}

// Product Models
export interface ZidProduct {
  id: number;
  name: string;
  description?: string;
  price: number;
  compare_at_price?: number;
  cost_price?: number;
  sku?: string;
  barcode?: string;
  images: ZidProductImage[];
  quantity: number;
  is_available: boolean;
  status: 'active' | 'inactive';
  category?: ZidCategory;
  weight?: number;
  dimensions?: ZidDimensions;
  meta_title?: string;
  meta_description?: string;
  tags?: string[];
  options?: ZidProductOption[];
  variants?: ZidProductVariant[];
  created_at: string;
  updated_at: string;
}

export interface ZidProductImage {
  id: number;
  url: string;
  alt?: string;
  position: number;
  width?: number;
  height?: number;
  created_at: string;
  updated_at: string;
}

export interface ZidCategory {
  id: number;
  name: string;
  description?: string;
  parent_id?: number;
  slug?: string;
  image?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ZidDimensions {
  length: number;
  width: number;
  height: number;
  unit: 'cm' | 'm' | 'mm' | 'in';
}

export interface ZidProductOption {
  id: number;
  name: string;
  values: string[];
  position: number;
}

export interface ZidProductVariant {
  id: number;
  product_id: number;
  name: string;
  sku?: string;
  price: number;
  compare_at_price?: number;
  cost_price?: number;
  quantity: number;
  is_available: boolean;
  option1?: string;
  option2?: string;
  option3?: string;
  barcode?: string;
  weight?: number;
  dimensions?: ZidDimensions;
  images?: ZidProductImage[];
  created_at: string;
  updated_at: string;
}

// Order Models
export interface ZidOrder {
  id: number;
  order_number: string;
  customer: ZidCustomer;
  items: ZidOrderItem[];
  total: number;
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  currency: string;
  status: ZidOrderStatus;
  payment_status: ZidPaymentStatus;
  fulfillment_status: ZidFulfillmentStatus;
  shipping_address?: ZidAddress;
  billing_address?: ZidAddress;
  created_at: string;
  updated_at: string;
}

export interface ZidOrderItem {
  id: number;
  product_id: number;
  variant_id?: number;
  name: string;
  sku?: string;
  quantity: number;
  price: number;
  total: number;
  tax: number;
  discount: number;
  properties?: Record<string, any>;
}

export interface ZidCustomer {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}

export interface ZidAddress {
  id: number;
  first_name: string;
  last_name: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  province: string;
  country: string;
  zip: string;
  phone?: string;
}

// Status Enums
export type ZidOrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded'
  | 'partially_refunded';

export type ZidPaymentStatus =
  | 'pending'
  | 'paid'
  | 'partially_paid'
  | 'refunded'
  | 'partially_refunded'
  | 'voided';

export type ZidFulfillmentStatus =
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'returned';

// Webhook Models
export interface ZidWebhookEvent {
  id: string;
  event: string;
  data: any;
  created_at: string;
}

export interface ZidProductWebhookEvent extends ZidWebhookEvent {
  event: 'product.create' | 'product.update' | 'product.delete';
  data: ZidProduct;
}

export interface ZidOrderWebhookEvent extends ZidWebhookEvent {
  event: 'order.create' | 'order.update' | 'order.delete';
  data: ZidOrder;
}

// API Response Models
export interface ZidApiResponse<T> {
  data: T;
  meta?: {
    current_page: number;
    from: number;
    last_page: number;
    per_page: number;
    to: number;
    total: number;
    has_more_pages: boolean;
  };
  links?: {
    first: string;
    last: string;
    prev?: string;
    next?: string;
  };
}

// Error Models
export interface ZidApiError {
  message: string;
  code?: string;
  status?: number;
  details?: any;
}

// Store Models
export interface ZidStore {
  id: string;
  name: string;
  domain: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  currency: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

// Webhook Registration Models
export interface ZidWebhookRegistration {
  url: string;
  events: string[];
  secret?: string;
}

export interface ZidRegisteredWebhook {
  id: number;
  url: string;
  events: string[];
  secret?: string;
  created_at: string;
  updated_at: string;
}
