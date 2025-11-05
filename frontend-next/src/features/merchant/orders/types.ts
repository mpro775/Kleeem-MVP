/**
 * Orders Feature Types
 * @description Type definitions for Orders management
 */

/**
 * Customer Address
 */
export interface Address {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

/**
 * Customer Information
 */
export interface Customer {
  _id: string;
  name: string;
  phone: string;
  address?: Address | string;
}

/**
 * Product within an Order
 */
export interface ProductInOrder {
  product: string | { _id: string; name: string };
  name: string;
  price: number;
  quantity: number;
}

/**
 * Order Status
 */
export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'shipped'
  | 'delivered'
  | 'canceled'
  | 'refunded';

/**
 * Order
 */
export interface Order {
  _id: string;
  customer?: Customer;
  products: ProductInOrder[];
  status: OrderStatus;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Paginated Orders Response
 */
export interface PaginatedOrdersResponse {
  orders: Order[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Fetch Orders Parameters
 */
export interface FetchOrdersParams {
  page: number;
  limit: number;
  phone?: string;
  status?: OrderStatus;
  search?: string;
}

/**
 * Update Order Status DTO
 */
export interface UpdateOrderStatusDTO {
  status: OrderStatus;
}

/**
 * Order Statistics (optional, for future use)
 */
export interface OrderStats {
  total: number;
  pending: number;
  paid: number;
  shipped: number;
  delivered: number;
  canceled: number;
  refunded: number;
  totalRevenue: number;
}

