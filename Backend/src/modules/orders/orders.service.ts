import {
  Injectable,
  Inject,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Types } from 'mongoose';

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
import { GetOrdersDto, ListOrdersDto } from './dto/get-orders.dto';
import { OrdersRepository } from './repositories/orders.repository';
import { Order, OrderCustomer } from './schemas/order.schema';
import { PricingService } from './services/pricing.service';
import { normalizePhone } from './utils/phone.util';

import type { ListOrdersOffsetResult } from './repositories/orders.repository';
import type {
  CalculatePricingOptions,
  PricingCartItem,
  PricingResult,
} from './services/pricing.service';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

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
      product: p.product ?? '',
    }));

    const stockItems = this.buildStockItems(products);
    await this.ensureStockAndDeduct(stockItems);

    const cartItems = this.buildCartItems(products);
    const pricingOptions = this.buildPricingOptions(merchantId, dto, cartItems);
    const pricingResult =
      await this.pricingService.calculateOrderPricing(pricingOptions);

    const customer = await this.resolveOrderCustomer(
      customerId,
      dto.customer,
      phoneNormalized,
    );

    const created = await this.ordersRepository.create({
      ...dto,
      products,
      source: dto.source ?? 'storefront',
      customerId,
      customer,
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
    const orderId = (
      created as Order & { _id?: Types.ObjectId }
    )._id?.toString();
    await this.updateCustomerStatsIfNeeded(customerId, pricingResult, orderId);

    return created;
  }

  private buildStockItems(products: CreateOrderDto['products']): StockItem[] {
    return (products || [])
      .filter((p) => p.product)
      .map((p) => {
        const item: StockItem = {
          productId: p.product || '',
          quantity: p.quantity || 1,
        };
        if (p.variantSku !== undefined) item.variantSku = p.variantSku;
        return item;
      });
  }

  private async ensureStockAndDeduct(stockItems: StockItem[]): Promise<void> {
    if (stockItems.length === 0) return;
    const availability =
      await this.inventoryService.checkAvailability(stockItems);
    if (!availability.available) {
      const first = availability.items.find(
        (i) => !i.isUnlimited && i.available < i.requested,
      );
      if (first) throw new BadRequestException('Product out of stock');
    }
    await this.inventoryService.deductStock(stockItems);
  }

  private buildCartItems(
    products: CreateOrderDto['products'],
  ): PricingCartItem[] {
    return (products || []).map((p) => ({
      productId: p.product || '',
      price: p.price || 0,
      quantity: p.quantity || 1,
      name: p.name || '',
    }));
  }

  private async resolveOrderCustomer(
    customerId: string | undefined,
    dtoCustomer: CreateOrderDto['customer'],
    phoneNormalized: string | undefined,
  ): Promise<OrderCustomer | undefined> {
    if (dtoCustomer) {
      return {
        name: dtoCustomer.name,
        phone: dtoCustomer.phone,
        email: dtoCustomer.email,
        address: dtoCustomer.address,
        phoneNormalized,
      } as OrderCustomer;
    }
    if (!customerId) return undefined;

    try {
      const dbCustomer = await this.customersService.findById(customerId);
      if (!dbCustomer) return undefined;

      const customerFromDb: OrderCustomer = {
        name: dbCustomer.name ?? '',
        email: dbCustomer.emailLower ?? '',
        phone: dbCustomer.phoneNormalized ?? '',
        phoneNormalized: dbCustomer.phoneNormalized ?? '',
      };
      return customerFromDb;
    } catch (error) {
      this.logger.warn(
        `Error fetching customer data: ${error instanceof Error ? error.message : String(error)}`,
      );
      return undefined;
    }
  }

  private async updateCustomerStatsIfNeeded(
    customerId: string | undefined,
    pricingResult: PricingResult,
    orderId?: string,
  ): Promise<void> {
    if (!customerId || !pricingResult.pricing.total) return;
    try {
      await this.customersService.updateCustomerStats(
        customerId,
        pricingResult.pricing.total,
        orderId,
      );
    } catch (error) {
      this.logger.warn(
        `Error updating customer stats: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async findAll(): Promise<Order[]> {
    return this.ordersRepository.findAll();
  }

  async findOne(orderId: string): Promise<Order | null> {
    return this.ordersRepository.findOne(orderId);
  }

  /**
   * يتحقق من ملكية الطلب.
   * إذا لم يُمرّر أي من sessionId أو phone → يُعاد true (متوافق مع السلوك السابق).
   * إذا مُرّر أحدهما أو كلاهما وكان أحدهما يطابق الطلب → true.
   * وإلا → false.
   */
  async assertOwnership(
    order: Order,
    opts: { sessionId?: string; phone?: string },
  ): Promise<boolean> {
    if (!opts.sessionId && !opts.phone) return true;
    const orderPhoneNorm =
      order.customer?.phoneNormalized ?? normalizePhone(order.customer?.phone);
    const inputPhoneNorm = opts.phone ? normalizePhone(opts.phone) : undefined;
    const sessionMatch = opts.sessionId && order.sessionId === opts.sessionId;
    const phoneMatch =
      inputPhoneNorm && orderPhoneNorm && orderPhoneNorm === inputPhoneNorm;
    return await Promise.resolve(Boolean(sessionMatch || phoneMatch));
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

  async listOrdersForMerchant(
    merchantId: string,
    dto: ListOrdersDto,
  ): Promise<ListOrdersOffsetResult> {
    return this.ordersRepository.findOrdersOffset(merchantId, dto);
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
      this.logger.warn(
        `Failed to increment coupon usage: ${e instanceof Error ? e.message : String(e)}`,
      );
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
        this.logger.warn(
          `Failed to increment promotion usage: ${e instanceof Error ? e.message : String(e)}`,
        );
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
      this.logger.warn(
        `Failed to create lead from order: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }
}
