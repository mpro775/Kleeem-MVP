// types/order.ts
export interface Order {
  _id: string;
  status: string;
  createdAt: string; // string وليس Date للرد النهائي
  customer?: {
    name?: string;
    phone?: string;
    address?: string;
  };
  products: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
}
