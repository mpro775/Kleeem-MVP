// src/features/type.ts

// واجهة لعنوان العميل
export interface Address {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  }
  
  // واجهة لبيانات العميل
  export interface Customer {
    _id: string;
    name: string;
    phone: string;
    address?: Address | string;
  }
  
  // واجهة للمنتج داخل الطلب
  export interface ProductInOrder {
    product: string | { _id: string; name: string }; // يمكن أن يكون ObjectId أو object كامل
    name: string;
  
    price: number;
    quantity: number;
  }
  
  // الحالة الممكنة للطلب
  export type OrderStatus = "pending" | "paid" | "shipped" | "delivered" | "canceled" | "refunded";
  
  // الواجهة الرئيسية للطلب
  export interface Order {
    _id: string;
    customer?: Customer;
    products: ProductInOrder[];
    status: OrderStatus;
    createdAt: string; // ISO date string
  }
  
  // واجهة للبيانات المستلمة من الـ API مع ترقيم الصفحات
  export interface PaginatedOrdersResponse {
    orders: Order[];
    total: number;
    page: number;
    limit: number;
  }