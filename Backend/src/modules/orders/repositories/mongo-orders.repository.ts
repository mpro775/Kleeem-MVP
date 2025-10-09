// src/modules/orders/repositories/mongo-orders.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { MerchantNotFoundError } from '../../../common/errors/business-errors';
import { PaginationService } from '../../../common/services/pagination.service';
import { Merchant } from '../../merchants/schemas/merchant.schema';
import { GetOrdersDto, SortOrder } from '../dto/get-orders.dto';
import { Order, OrderDocument, OrderProduct } from '../schemas/order.schema';
import { normalizePhone } from '../utils/phone.util';

import { OrdersRepository } from './orders.repository';

import type { PaginationResult } from '../../../common/dto/pagination.dto';
import type { FilterQuery } from 'mongoose';

// ـــــــــــــ أنواع/حرّاس لتفادي any ـــــــــــــ
type ZidOrderCustomer = {
  name?: string;
  phone?: string;
  address?: string;
};

type ZidOrderProduct = {
  id?: string;
  productId?: string;
  name?: string;
  price?: number | string;
  quantity?: number | string;
};

type MinimalZidOrder = {
  id?: string | number;
  status?: string;
  created_at?: string | Date;
  session_id?: string;
  customer?: ZidOrderCustomer;
  products?: ZidOrderProduct[];
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function asString(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function asNumber(v: unknown, fallback = 0): number {
  return typeof v === 'number'
    ? v
    : typeof v === 'string'
      ? Number(v) || fallback
      : fallback;
}

function isMinimalZidOrder(v: unknown): v is MinimalZidOrder {
  if (!isRecord(v)) return false;
  // لا نلزم كل الحقول؛ يكفي وجود id أو customer/products
  return 'id' in v || 'customer' in v || 'products' in v;
}

function toIsoDate(v: unknown): Date {
  if (v instanceof Date) return v;
  const s = asString(v);
  const d = s ? new Date(s) : new Date();
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function toObjectId(v: unknown): Types.ObjectId | undefined {
  const s = asString(v);
  return s && Types.ObjectId.isValid(s) ? new Types.ObjectId(s) : undefined;
}

// ـــــــــــــ util: تطبيع الـ _id إلى string في النتائج ـــــــــــــ
function toStringId(id: unknown): string {
  const maybe = id as { toString?: () => string };
  return typeof maybe?.toString === 'function' ? maybe.toString() : String(id);
}

@Injectable()
export class MongoOrdersRepository implements OrdersRepository {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Merchant.name) private readonly merchantModel: Model<Merchant>,
    private readonly paginationService: PaginationService,
  ) {}

  // إنشاء: استقبل دخلًا كـ Record<string, unknown> لتجنّب unknown داخل create
  async create(data: Record<string, unknown>): Promise<Order> {
    const doc = await this.orderModel.create(data);
    return doc.toObject();
  }

  async findAll(): Promise<Order[]> {
    return this.orderModel.find().sort({ createdAt: -1 }).lean().exec();
  }

  async findOne(orderId: string): Promise<Order | null> {
    return this.orderModel.findById(orderId).lean().exec();
  }

  async updateStatus(id: string, status: string): Promise<Order | null> {
    return this.orderModel
      .findByIdAndUpdate(id, { status }, { new: true })
      .lean()
      .exec();
  }

  async upsertFromZid(storeId: string, zidOrder: unknown): Promise<Order> {
    const merchant = await this.findMerchantByStoreId(storeId);
    if (!merchant) throw new MerchantNotFoundError(storeId);
    const merchantId =
      (merchant as unknown as { id?: string }).id ?? String(merchant['_id']);

    if (!isMinimalZidOrder(zidOrder)) {
      throw new Error('Invalid ZID order payload');
    }

    const extId = asString(zidOrder.id, String(zidOrder.id ?? ''));
    // ابحث عن الطلب السابق
    let order = await this.orderModel
      .findOne({ merchantId, externalId: extId, source: 'api' })
      .exec();

    const phoneRaw = zidOrder.customer?.phone;
    const phoneNormalized = normalizePhone(asString(phoneRaw));

    const products = (zidOrder.products ?? []).map((p): OrderProduct => {
      const productId = toObjectId(p.id ?? p.productId);
      return {
        product: productId as Types.ObjectId,
        name: asString(p.name),
        price: asNumber(p.price, 0),
        quantity: asNumber(p.quantity, 1),
      } as OrderProduct;
    });

    const orderData: Partial<Order> & { createdAt: Date } = {
      merchantId,
      sessionId: asString(zidOrder.session_id, `zid:${extId}`),
      source: 'api',
      externalId: extId,
      status: asString(zidOrder.status, 'pending'),
      customer: {
        name: asString(zidOrder.customer?.name),
        phone: asString(zidOrder.customer?.phone),
        address: asString(zidOrder.customer?.address),
        phoneNormalized,
      },
      products,
      createdAt: toIsoDate(zidOrder.created_at),
    };

    if (order) {
      await order.set(orderData).save();
    } else {
      order = await this.orderModel.create(orderData);
    }
    return order.toObject();
  }

  async findMine(merchantId: string, sessionId: string): Promise<Order[]> {
    return this.orderModel
      .find({ merchantId, sessionId })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  async findMerchantByStoreId(storeId: string): Promise<Merchant | null> {
    return this.merchantModel
      .findOne({ 'zidIntegration.storeId': storeId })
      .lean()
      .exec();
  }

  async updateOrderStatusFromZid(
    storeId: string,
    zidOrder: unknown,
  ): Promise<Order | null> {
    const merchant = await this.findMerchantByStoreId(storeId);
    if (!merchant) throw new MerchantNotFoundError(storeId);
    const merchantId =
      (merchant as unknown as { id?: string }).id ?? String(merchant['_id']);

    const externalId = isMinimalZidOrder(zidOrder)
      ? asString(zidOrder.id, String(zidOrder.id ?? ''))
      : '';

    const status = isMinimalZidOrder(zidOrder)
      ? asString(zidOrder.status)
      : undefined;

    return this.orderModel
      .findOneAndUpdate(
        { merchantId, externalId, source: 'api' } as FilterQuery<Order>,
        { status },
        { new: true },
      )
      .lean()
      .exec();
  }

  async findByCustomer(merchantId: string, phone: string): Promise<Order[]> {
    return this.orderModel
      .find({ merchantId, 'customer.phone': phone })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  async getOrders(
    merchantId: string,
    dto: GetOrdersDto,
  ): Promise<PaginationResult<Order>> {
    const baseFilter: FilterQuery<OrderDocument> = { merchantId };

    if (dto.search) {
      baseFilter.$or = [
        { sessionId: { $regex: dto.search, $options: 'i' } },
        { 'customer.name': { $regex: dto.search, $options: 'i' } },
        { 'customer.phone': { $regex: dto.search, $options: 'i' } },
      ];
    }

    if (dto.status) baseFilter.status = dto.status;
    if (dto.source) baseFilter.source = dto.source;
    if (dto.sessionId) baseFilter.sessionId = dto.sessionId;

    const sortField = dto.sortBy || 'createdAt';
    const sortOrder: 1 | -1 = dto.sortOrder === SortOrder.ASC ? 1 : -1;

    const result = await this.paginationService.paginate<OrderDocument>(
      this.orderModel,
      dto,
      baseFilter,
      { sortField, sortOrder, select: '-__v', lean: true },
    );

    const items = result.items.map((item) => ({
      ...item,
      _id: toStringId((item as unknown as { _id?: unknown })?._id),
      merchantId: item.merchantId || '',
    }));

    return { ...result, items };
  }

  async searchOrders(
    merchantId: string,
    query: string,
    dto: GetOrdersDto,
  ): Promise<PaginationResult<Order>> {
    return this.getOrders(merchantId, { ...dto, search: query });
  }

  async getOrdersByCustomer(
    merchantId: string,
    phone: string,
    dto: GetOrdersDto,
  ): Promise<PaginationResult<Order>> {
    const baseFilter: FilterQuery<OrderDocument> = {
      merchantId,
      'customer.phone': phone,
    };
    const sortField = dto.sortBy || 'createdAt';
    const sortOrder: 1 | -1 = dto.sortOrder === SortOrder.ASC ? 1 : -1;

    const result = await this.paginationService.paginate<OrderDocument>(
      this.orderModel,
      dto,
      baseFilter,
      { sortField, sortOrder, select: '-__v', lean: true },
    );

    const items = result.items.map((item) => ({
      ...item,
      _id: toStringId((item as unknown as { _id?: unknown })?._id),
      merchantId: item.merchantId || '',
    }));

    return { ...result, items };
  }
}
