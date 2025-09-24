import { Injectable, Inject } from '@nestjs/common';

import { PaginationResult } from '../../common/dto/pagination.dto';
import { LeadsService } from '../leads/leads.service';

import { CreateOrderDto } from './dto/create-order.dto';
import { GetOrdersDto } from './dto/get-orders.dto';
import { OrdersRepository } from './repositories/orders.repository';
import { Order } from './schemas/order.schema';
import { normalizePhone } from './utils/phone.util';

@Injectable()
export class OrdersService {
  constructor(
    @Inject('OrdersRepository')
    private readonly ordersRepository: OrdersRepository,
    private readonly leadsService: LeadsService,
  ) {}

  async create(dto: CreateOrderDto): Promise<Order> {
    const phoneNormalized = normalizePhone(dto.customer?.phone);
    const products = (dto.products || []).map((p) => ({
      ...p,
      product: p.product,
    }));

    const created = await this.ordersRepository.create({
      ...dto,
      products,
      source: dto.source ?? 'storefront',
      customer: { ...dto.customer, phoneNormalized },
    });

    try {
      await this.leadsService.create(dto.merchantId, {
        sessionId: dto.sessionId,
        data: dto.customer as unknown as Record<string, unknown>,
        source: 'order',
      });
    } catch (e: unknown) {
      console.error(e);
    }

    return created;
  }

  async findAll(): Promise<Order[]> {
    return this.ordersRepository.findAll();
  }

  async findOne(orderId: string): Promise<Order | null> {
    return this.ordersRepository.findOne(orderId);
  }

  async updateStatus(id: string, status: string): Promise<Order | null> {
    return this.ordersRepository.updateStatus(id, status);
  }

  async upsertFromZid(storeId: string, zidOrder: unknown): Promise<Order> {
    return this.ordersRepository.upsertFromZid(storeId, zidOrder);
  }

  async findMine(merchantId: string, sessionId: string): Promise<Order[]> {
    return this.ordersRepository.findMine(merchantId, sessionId);
  }

  async updateOrderStatusFromZid(
    storeId: string,
    zidOrder: unknown,
  ): Promise<Order | null> {
    return this.ordersRepository.updateOrderStatusFromZid(storeId, zidOrder);
  }

  async findByCustomer(merchantId: string, phone: string): Promise<Order[]> {
    return this.ordersRepository.findByCustomer(merchantId, phone);
  }

  async getOrders(
    merchantId: string,
    dto: GetOrdersDto,
  ): Promise<PaginationResult<Order>> {
    return this.ordersRepository.getOrders(merchantId, dto);
  }

  async searchOrders(
    merchantId: string,
    query: string,
    dto: GetOrdersDto,
  ): Promise<PaginationResult<Order>> {
    return this.ordersRepository.searchOrders(merchantId, query, dto);
  }

  async getOrdersByCustomer(
    merchantId: string,
    phone: string,
    dto: GetOrdersDto,
  ): Promise<PaginationResult<Order>> {
    return this.ordersRepository.getOrdersByCustomer(merchantId, phone, dto);
  }
}
