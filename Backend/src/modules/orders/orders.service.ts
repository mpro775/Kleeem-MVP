import { Injectable, Inject, BadRequestException } from '@nestjs/common';

import { PaginationResult } from '../../common/dto/pagination.dto';
import { CouponsService } from '../coupons/coupons.service';
import { CustomersService } from '../customers/customers.service';
import { LeadsService } from '../leads/leads.service';
import {
  InventoryService,
  StockItem,
} from '../products/services/inventory.service';
import { PromotionsService } from '../promotions/promotions.service';

import { CreateOrderDto } from './dto/create-order.dto';
import { GetOrdersDto } from './dto/get-orders.dto';
import { OrdersRepository } from './repositories/orders.repository';
import { Order } from './schemas/order.schema';
import { PricingService } from './services/pricing.service';
import { normalizePhone } from './utils/phone.util';

import type {
  CalculatePricingOptions,
  PricingCartItem,
  PricingResult,
} from './services/pricing.service';

@Injectable()
export class OrdersService {
  constructor(
    @Inject('OrdersRepository')
    private readonly ordersRepository: OrdersRepository,
    private readonly customersService: CustomersService,
    private readonly leadsService: LeadsService,
    private readonly pricingService: PricingService,
    private readonly couponsService: CouponsService,
    private readonly promotionsService: PromotionsService,
    private readonly inventoryService: InventoryService,
  ) {}

  async create(dto: CreateOrderDto, customerId?: string): Promise<Order> {
    const merchantId = dto.merchantId;

    if (!merchantId) {
      throw new BadRequestException('merchantId is required');
    }

    const phoneNormalized = normalizePhone(dto.customer?.phone);
    const products = (dto.products || []).map((p) => ({
      ...p,
      product: p.product,
    }));

    const stockItems: StockItem[] = products
      .filter((p) => p.product)
      .map((p) => {
        const item: StockItem = {
          productId: p.product || '',
          quantity: p.quantity || 1,
        };
        if (p.variantSku !== undefined) {
          item.variantSku = p.variantSku;
        }
        return item;
      });

    if (stockItems.length > 0) {
      const availability =
        await this.inventoryService.checkAvailability(stockItems);
      if (!availability.available) {
        // سيُرمي OutOfStockError داخل deduct أيضاً، لكن نوقف مبكراً
        const first = availability.items.find(
          (i) => !i.isUnlimited && i.available < i.requested,
        );
        if (first) {
          throw new BadRequestException('Product out of stock');
        }
      }
      await this.inventoryService.deductStock(stockItems);
    }

    const cartItems: PricingCartItem[] = products.map((p) => ({
      productId: p.product || '',
      price: p.price || 0,
      quantity: p.quantity || 1,
      name: p.name || '',
    }));

    // حساب الأسعار والخصومات
    const pricingOptions = this.buildPricingOptions(merchantId, dto, cartItems);
    const pricingResult =
      await this.pricingService.calculateOrderPricing(pricingOptions);

    // تحضير بيانات العميل
    let orderCustomerId = customerId;
    let customerSnapshot = dto.customer ? { ...dto.customer, phoneNormalized } : undefined;

    // إذا كان هناك customerId من JWT، احصل على بيانات العميل الحالية
    if (customerId) {
      try {
        const customer = await this.customersService.findById(customerId);
        if (customer) {
          customerSnapshot = {
            id: customer._id,
            name: customer.name,
            email: customer.emailLower,
            phone: customer.phoneNormalized,
            phoneNormalized: customer.phoneNormalized,
            // أي بيانات إضافية تحتاجها
          };
        }
      } catch (error) {
        console.error('Error fetching customer data:', error);
        // نواصل بدون customer data إذا فشل
      }
    }

    const created = await this.ordersRepository.create({
      ...dto,
      products,
      source: dto.source ?? 'storefront',
      customerId: orderCustomerId,
      customerSnapshot,
      pricing: pricingResult.pricing,
      currency: pricingResult.currency,
      exchangeRate: pricingResult.exchangeRate,
      discountPolicy: pricingResult.discountPolicy,
      appliedCouponCode: pricingResult.appliedCouponCode,
    });

    await this.handleCouponUsage(
      merchantId,
      pricingResult,
      dto.customer?.phone,
    );
    await this.handlePromotionUsage(pricingResult);
    await this.createLeadFromOrder(merchantId, dto.sessionId, dto.customer);

    // تحديث إحصائيات العميل إذا كان هناك customerId
    if (orderCustomerId && pricingResult.pricing.total) {
      try {
        await this.customersService.updateCustomerStats(
          orderCustomerId,
          pricingResult.pricing.total,
        );
      } catch (error) {
        console.error('Error updating customer stats:', error);
        // لا نتوقف عن إنشاء الطلب بسبب فشل تحديث الإحصائيات
      }
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

  private buildPricingOptions(
    merchantId: string,
    dto: CreateOrderDto,
    cartItems: PricingCartItem[],
  ): CalculatePricingOptions {
    const options: CalculatePricingOptions = {
      merchantId,
      cartItems,
      shippingCost: 0,
    };

    if (dto.couponCode) {
      options.couponCode = dto.couponCode;
    }

    if (dto.customer?.phone) {
      options.customerPhone = dto.customer.phone;
    }

    if (dto.currency) {
      options.currency = dto.currency;
    }

    return options;
  }

  private async handleCouponUsage(
    merchantId: string,
    pricingResult: PricingResult,
    customerPhone?: string,
  ): Promise<void> {
    if (!pricingResult.appliedCouponCode || !pricingResult.pricing.coupon) {
      return;
    }

    try {
      const coupon = await this.couponsService.findByCode(
        merchantId,
        pricingResult.appliedCouponCode,
      );

      if (coupon._id) {
        await this.couponsService.incrementUsage(
          coupon._id.toString(),
          pricingResult.pricing.coupon.amount,
          customerPhone,
        );
      }
    } catch (e) {
      console.error('Failed to increment coupon usage:', e);
    }
  }

  private async handlePromotionUsage(
    pricingResult: PricingResult,
  ): Promise<void> {
    if (!pricingResult.pricing.promotions?.length) {
      return;
    }

    for (const promo of pricingResult.pricing.promotions) {
      if (!promo.id) {
        continue;
      }

      try {
        await this.promotionsService.incrementUsage(
          promo.id.toString(),
          promo.amount,
        );
      } catch (e) {
        console.error('Failed to increment promotion usage:', e);
      }
    }
  }

  private async createLeadFromOrder(
    merchantId: string,
    sessionId: string | undefined,
    customer: CreateOrderDto['customer'],
  ): Promise<void> {
    if (!customer) {
      return;
    }

    try {
      const leadData: Record<string, unknown> = { ...customer };

      await this.leadsService.create(merchantId, {
        sessionId: sessionId ?? '',
        data: leadData,
        source: 'order',
      });
    } catch (e) {
      console.error(e);
    }
  }
}
