import type { PaginationResult } from '../../../common/dto/pagination.dto';
import type { Order as OrderType } from '../../webhooks/helpers/order';
import type { GetOrdersDto } from '../dto/get-orders.dto';
import type { Order } from '../schemas/order.schema';

export interface OrdersRepository {
  create(data: any): Promise<Order>;
  findAll(): Promise<Order[]>;
  findOne(orderId: string): Promise<OrderType | null>;
  updateStatus(id: string, status: string): Promise<Order | null>;
  upsertFromZid(storeId: string, zidOrder: any): Promise<any>;
  findMine(merchantId: string, sessionId: string): Promise<Order[]>;
  findMerchantByStoreId(storeId: string): Promise<any>;
  updateOrderStatusFromZid(
    storeId: string,
    zidOrder: any,
  ): Promise<Order | null>;
  findByCustomer(merchantId: string, phone: string): Promise<Order[]>;
  getOrders(
    merchantId: string,
    dto: GetOrdersDto,
  ): Promise<PaginationResult<any>>;
  searchOrders(
    merchantId: string,
    query: string,
    dto: GetOrdersDto,
  ): Promise<PaginationResult<any>>;
  getOrdersByCustomer(
    merchantId: string,
    phone: string,
    dto: GetOrdersDto,
  ): Promise<PaginationResult<any>>;
}
