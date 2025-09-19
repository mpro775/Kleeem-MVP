import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { Order, OrderDocument } from '../schemas/order.schema';
import {
  Merchant,
  MerchantDocument,
} from '../../merchants/schemas/merchant.schema';
import { OrdersRepository } from './orders.repository';
import { GetOrdersDto } from '../dto/get-orders.dto';
import { PaginationResult } from '../../../common/dto/pagination.dto';
import { Order as OrderType } from '../../webhooks/helpers/order';
import { PaginationService } from '../../../common/services/pagination.service';
import { normalizePhone } from '../utils/phone.util';
import { MerchantNotFoundError } from '../../../common/errors/business-errors';

const isObjectId = (v?: string) => !!v && mongoose.Types.ObjectId.isValid(v);

function toOrderType(orderDoc: any): OrderType {
  return {
    _id: orderDoc._id?.toString?.() ?? orderDoc._id,
    status: orderDoc.status,
    createdAt: orderDoc.createdAt
      ? orderDoc.createdAt instanceof Date
        ? orderDoc.createdAt.toISOString()
        : orderDoc.createdAt
      : '',
    customer: {
      name: orderDoc.customer?.name,
      phone: orderDoc.customer?.phone,
      address: orderDoc.customer?.address,
    },
    products: Array.isArray(orderDoc.products)
      ? orderDoc.products.map((p: any) => ({
          name: p.name,
          quantity: p.quantity,
          price: p.price,
        }))
      : [],
  };
}

@Injectable()
export class MongoOrdersRepository implements OrdersRepository {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Merchant.name) private merchantModel: Model<MerchantDocument>,
    private paginationService: PaginationService,
  ) {}

  async create(data: any): Promise<Order> {
    return (await this.orderModel.create(data)).toObject();
  }

  async findAll(): Promise<Order[]> {
    return this.orderModel.find().sort({ createdAt: -1 }).exec();
  }

  async findOne(orderId: string): Promise<OrderType | null> {
    const orderDoc = await this.orderModel.findById(orderId).lean();
    return orderDoc ? toOrderType(orderDoc) : null;
  }

  async updateStatus(id: string, status: string): Promise<Order | null> {
    return this.orderModel.findByIdAndUpdate(id, { status }, { new: true });
  }

  async upsertFromZid(storeId: string, zidOrder: any): Promise<OrderDocument> {
    const merchant = await this.findMerchantByStoreId(storeId);
    if (!merchant) throw new MerchantNotFoundError(storeId);
    const merchantId = merchant.id.toString();

    let order = await this.orderModel.findOne({
      merchantId,
      externalId: zidOrder.id,
      source: 'api',
    });

    const phoneNormalized = normalizePhone(zidOrder.customer?.phone);
    const products = (zidOrder.products ?? []).map((p: any) => ({
      product: p.id || p.productId || undefined,
      name: p.name,
      price: Number(p.price) || 0,
      quantity: Number(p.quantity) || 1,
    }));

    const orderData = {
      merchantId,
      sessionId: zidOrder.session_id ?? `zid:${zidOrder.id}`,
      source: 'api',
      externalId: zidOrder.id,
      status: zidOrder.status ?? 'pending',
      customer: {
        name: zidOrder.customer?.name ?? '',
        phone: zidOrder.customer?.phone ?? '',
        address: zidOrder.customer?.address ?? '',
        phoneNormalized,
      },
      products,
      createdAt: zidOrder.created_at
        ? new Date(zidOrder.created_at)
        : new Date(),
    };

    if (order) {
      await order.set(orderData).save();
    } else {
      order = await this.orderModel.create(orderData);
    }
    return order;
  }

  async findMine(merchantId: string, sessionId: string) {
    return this.orderModel
      .find({ merchantId, sessionId })
      .sort({ createdAt: -1 })
      .lean();
  }

  async findMerchantByStoreId(storeId: string) {
    return this.merchantModel.findOne({ 'zidIntegration.storeId': storeId });
  }

  async updateOrderStatusFromZid(
    storeId: string,
    zidOrder: any,
  ): Promise<OrderDocument | null> {
    const merchant = await this.findMerchantByStoreId(storeId);
    if (!merchant) throw new MerchantNotFoundError(storeId);
    const merchantId = merchant._id;

    return this.orderModel.findOneAndUpdate(
      { merchantId, externalId: zidOrder.id, source: 'api' },
      { status: zidOrder.status },
      { new: true },
    );
  }

  async findByCustomer(merchantId: string, phone: string): Promise<Order[]> {
    return this.orderModel
      .find({ merchantId, 'customer.phone': phone })
      .sort({ createdAt: -1 });
  }

  async getOrders(
    merchantId: string,
    dto: GetOrdersDto,
  ): Promise<PaginationResult<any>> {
    const baseFilter: any = { merchantId };

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
    const sortOrder = dto.sortOrder === 'asc' ? 1 : -1;

    const result = await this.paginationService.paginate(
      this.orderModel,
      dto,
      baseFilter,
      { sortField, sortOrder, select: '-__v', lean: true },
    );

    const processedItems = result.items.map((item: any) => ({
      ...item,
      _id: item._id?.toString(),
      merchantId: item.merchantId?.toString(),
    }));

    return { ...result, items: processedItems };
  }

  async searchOrders(
    merchantId: string,
    query: string,
    dto: GetOrdersDto,
  ): Promise<PaginationResult<any>> {
    return this.getOrders(merchantId, { ...dto, search: query });
  }

  async getOrdersByCustomer(
    merchantId: string,
    phone: string,
    dto: GetOrdersDto,
  ): Promise<PaginationResult<any>> {
    const baseFilter: any = { merchantId, 'customer.phone': phone };
    const sortField = dto.sortBy || 'createdAt';
    const sortOrder = dto.sortOrder === 'asc' ? 1 : -1;

    const result = await this.paginationService.paginate(
      this.orderModel,
      dto,
      baseFilter,
      { sortField, sortOrder, select: '-__v', lean: true },
    );

    const processedItems = result.items.map((item: any) => ({
      ...item,
      _id: item._id?.toString(),
      merchantId: item.merchantId?.toString(),
    }));

    return { ...result, items: processedItems };
  }
}
