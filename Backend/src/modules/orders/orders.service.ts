// src/modules/orders/orders.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument } from './schemas/order.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { LeadsService } from '../leads/leads.service';
import { Order as OrderType } from '../webhooks/helpers/order';
import {
  Merchant,
  MerchantDocument,
} from '../merchants/schemas/merchant.schema';

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
    const created = await this.orderModel.create(dto);
    await this.leadsService.create(dto.merchantId, {
      sessionId: dto.sessionId,
      data: dto.customer, // هنا تحفظ بيانات العميل (الاسم/الجوال/العنوان)
      source: 'order', // مصدر العميل: جاء عبر الطلبات
    });
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
    // حدد طريقة ربط storeId → merchantId حسب تصميمك
    // مثال: استخرج merchantId من قاعدة بيانات merchants عبر storeId
    const merchant = await this.findMerchantByStoreId(storeId);
    if (!merchant) throw new Error('Merchant not found for this store_id');
    const merchantId = merchant._id;

    // ابحث عن الطلب بـ externalId أو رقم الطلب من زد (غالباً zidOrder.id أو zidOrder.external_id)
    let order = await this.orderModel.findOne({
      merchantId,
      externalId: zidOrder.id,
      source: 'api',
    });

    const orderData: CreateOrderDto = {
      merchantId: merchant.id.toString(),
      sessionId: zidOrder.session_id,
      source: 'api',
      externalId: zidOrder.id,
      // أضف باقي الحقول التي تحتاجها من zidOrder
      status: zidOrder.status,
      customer: {
        name: zidOrder.customer?.name ?? '',
        phone: zidOrder.customer?.phone ?? '',
        address: zidOrder.customer?.address ?? '',
      },
      products:
        zidOrder.products?.map((p: any) => ({
          name: p.name,
          price: p.price,
          quantity: p.quantity,
        })) ?? [],
      createdAt: zidOrder.created_at
        ? new Date(zidOrder.created_at)
        : new Date(),
      // أضف باقي الحقول حسب الحاجة
    };

    if (order) {
      await order.set(orderData).save();
    } else {
      order = await this.orderModel.create(orderData);
    }
    return order;
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
    if (!merchant) throw new Error('Merchant not found for this store_id');
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
