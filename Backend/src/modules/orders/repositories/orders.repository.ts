// src/modules/orders/repositories/orders.repository.ts
import type { PaginationResult } from '../../../common/dto/pagination.dto';
import type { Merchant } from '../../merchants/schemas/merchant.schema';
import type { GetOrdersDto } from '../dto/get-orders.dto';
import type { Order } from '../schemas/order.schema';

export interface OrdersRepository {
  create(data: Record<string, unknown>): Promise<Order>;
  findAll(): Promise<Order[]>;
  findOne(orderId: string): Promise<Order | null>;
  updateStatus(id: string, status: string): Promise<Order | null>;
  upsertFromZid(storeId: string, zidOrder: unknown): Promise<Order>;
  findMine(merchantId: string, sessionId: string): Promise<Order[]>;
  findMerchantByStoreId(storeId: string): Promise<Merchant | null>;
  updateOrderStatusFromZid(
    storeId: string,
    zidOrder: unknown,
  ): Promise<Order | null>;
  findByCustomer(merchantId: string, phone: string): Promise<Order[]>;
  getOrders(
    merchantId: string,
    dto: GetOrdersDto,
  ): Promise<PaginationResult<Order>>;
  searchOrders(
    merchantId: string,
    query: string,
    dto: GetOrdersDto,
  ): Promise<PaginationResult<Order>>;
  getOrdersByCustomer(
    merchantId: string,
    phone: string,
    dto: GetOrdersDto,
  ): Promise<PaginationResult<Order>>;
}
