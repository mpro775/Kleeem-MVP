// src/modules/orders/orders.service.ts
import { Injectable } from '@nestjs/common';
import { MerchantNotFoundError } from '../../common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { Order, OrderDocument } from './schemas/order.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { LeadsService } from '../leads/leads.service';
import { Order as OrderType } from '../webhooks/helpers/order';
import {
  Merchant,
  MerchantDocument,
} from '../merchants/schemas/merchant.schema';
import { normalizePhone } from './utils/phone.util';
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
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Merchant.name) private merchantModel: Model<MerchantDocument>,
    private leadsService: LeadsService,
  ) {}

  async create(dto: CreateOrderDto): Promise<Order> {
    const phoneNormalized = normalizePhone(dto.customer?.phone);

    const products = (dto.products || []).map((p) => ({
      ...p,
      product: isObjectId(p.product) ? p.product : undefined, // شِل القيمة غير الصحيحة
    }));

    const created = await this.orderModel.create({
      ...dto,
      products,
      source: dto.source ?? 'storefront',
      customer: { ...dto.customer, phoneNormalized },
    });

    try {
      await this.leadsService.create(dto.merchantId, {
        sessionId: dto.sessionId,
        data: dto.customer,
        source: 'order',
      });
    } catch (e) {}

    return created.toObject();
  }
  // جلب كل الطلبات
  async findAll(): Promise<Order[]> {
    return this.orderModel.find().sort({ createdAt: -1 }).exec();
  }

  // جلب طلب واحد مع تفاصيل المنتجات
  async findOne(orderId: string): Promise<OrderType | null> {
    const orderDoc = await this.orderModel.findById(orderId).lean(); // أو .exec()
    return orderDoc ? toOrderType(orderDoc) : null;
  }

  // تعديل حالة الطلب فقط
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
      products, // ✅ نفس حقل الـSchema
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
    const phone = await this.leadsService.getPhoneBySession(
      merchantId,
      sessionId,
    );
    const or: any[] = [{ sessionId }];
    if (phone) {
      // داعم للحالات القديمة والجديدة
      or.push(
        { 'customer.phone': phone },
        { 'customer.phoneNormalized': phone },
      );
    }
    return this.orderModel
      .find({ merchantId, $or: or })
      .sort({ createdAt: -1 })
      .lean();
  }
  // Helper: جلب merchant عبر store_id من merchants collection
  async findMerchantByStoreId(storeId: string) {
    // عدّل اسم الكوليكشن أو الموديل حسب مشروعك
    return this.merchantModel.findOne({ 'zidIntegration.storeId': storeId });
  }
  async updateOrderStatusFromZid(
    storeId: string,
    zidOrder: any,
  ): Promise<OrderDocument | null> {
    const merchant = await this.findMerchantByStoreId(storeId);
    if (!merchant) throw new MerchantNotFoundError(storeId);
    const merchantId = merchant._id;

    // ابحث عن الطلب ثم حدث حالته فقط
    const order = await this.orderModel.findOneAndUpdate(
      {
        merchantId,
        externalId: zidOrder.id,
        source: 'api',
      },
      { status: zidOrder.status },
      { new: true },
    );
    return order;
  }

  async findByCustomer(merchantId: string, phone: string): Promise<Order[]> {
    return this.orderModel
      .find({
        merchantId,
        'customer.phone': phone, // أو أي key آخر يحفظ رقم العميل
      })
      .sort({ createdAt: -1 });
  }
}
