// src/modules/orders/services/pricing.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { CouponsService } from '../../coupons/coupons.service';
import {
  Merchant,
  MerchantDocument,
} from '../../merchants/schemas/merchant.schema';
import { CurrencyService } from '../../merchants/services/currency.service';
import {
  Product,
  ProductDocument,
} from '../../products/schemas/product.schema';
import {
  PromotionsService,
  CartItem,
} from '../../promotions/promotions.service';
import { OrderPricing, OrderDiscount } from '../schemas/order.schema';

export interface PricingCartItem {
  productId: string;
  categoryId?: string;
  price: number;
  quantity: number;
  name: string;
}

export interface CalculatePricingOptions {
  merchantId: string;
  cartItems: PricingCartItem[];
  couponCode?: string;
  customerPhone?: string;
  currency?: string;
  shippingCost?: number;
}

export interface PricingResult {
  pricing: OrderPricing;
  currency: string;
  exchangeRate?: number;
  discountPolicy: 'highest' | 'stack';
  appliedCouponCode?: string;
}

@Injectable()
export class PricingService {
  constructor(
    @InjectModel(Merchant.name)
    private readonly merchantModel: Model<MerchantDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    private readonly couponsService: CouponsService,
    private readonly promotionsService: PromotionsService,
    private readonly currencyService: CurrencyService,
  ) {}

  async calculateOrderPricing(
    options: CalculatePricingOptions,
  ): Promise<PricingResult> {
    // 1. الحصول على إعدادات التاجر
    const merchant = await this.getMerchant(options.merchantId);

    const currency = this.getCurrency(merchant, options.currency);
    const discountPolicy = this.getDiscountPolicy(merchant);

    // 2. حساب subtotal (مجموع المنتجات قبل الخصم)
    const subtotal = this.calculateSubtotal(options.cartItems);

    // 3. جمع خصومات المنتجات (من offer على مستوى المنتج)
    const productDiscounts = await this.calculateProductDiscounts(
      options.merchantId,
      options.cartItems,
    );

    // 4. جمع العروض الترويجية المطبقة
    const promotionDiscounts = await this.calculatePromotionDiscounts(
      options.merchantId,
      options.cartItems,
      subtotal,
    );

    // 5. التحقق من الكوبون وحساب خصمه
    const { couponDiscount, appliedCouponCode } =
      await this.processCouponDiscount(options, subtotal);

    // 6. تطبيق سياسة الخصومات
    const totalDiscount = this.applyDiscountPolicy(
      discountPolicy,
      productDiscounts,
      promotionDiscounts,
      couponDiscount,
    );

    // 7. حساب الشحن
    const { shippingCost, shippingDiscount } = this.calculateShipping(
      options.shippingCost,
      couponDiscount,
    );

    // 8. حساب الإجمالي النهائي
    const total = this.calculateTotal(
      subtotal,
      totalDiscount,
      shippingCost,
      shippingDiscount,
    );

    // 9. تحويل العملة إن لزم
    const exchangeRate = this.getExchangeRate(merchant, currency);

    // 10. بناء كائن pricing
    const pricing = this.buildPricingObject(
      subtotal,
      promotionDiscounts,
      couponDiscount,
      productDiscounts,
      totalDiscount,
      shippingCost,
      shippingDiscount,
      total,
    );

    return {
      pricing,
      currency,
      ...(exchangeRate !== undefined && { exchangeRate }),
      discountPolicy,
      ...(appliedCouponCode !== undefined && { appliedCouponCode }),
    };
  }

  private getCurrency(merchant: Merchant, requestedCurrency?: string): string {
    return (
      requestedCurrency || merchant.currencySettings?.baseCurrency || 'SAR'
    );
  }

  private getDiscountPolicy(merchant: Merchant): 'highest' | 'stack' {
    return merchant.discountPolicy?.stackCouponsWithPromotions
      ? 'stack'
      : 'highest';
  }

  private calculateSubtotal(cartItems: PricingCartItem[]): number {
    return cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  private async processCouponDiscount(
    options: CalculatePricingOptions,
    subtotal: number,
  ): Promise<{
    couponDiscount: { code: string; amount: number } | null;
    appliedCouponCode: string | undefined;
  }> {
    if (!options.couponCode) {
      return { couponDiscount: null, appliedCouponCode: undefined };
    }

    try {
      const couponResult = await this.applyCoupon(
        options.merchantId,
        options.couponCode,
        options.cartItems,
        subtotal,
        options.customerPhone,
      );

      return {
        couponDiscount: {
          code: options.couponCode,
          amount: couponResult.discountAmount,
        },
        appliedCouponCode: options.couponCode,
      };
    } catch (error) {
      console.warn('Invalid coupon:', error);
      return { couponDiscount: null, appliedCouponCode: undefined };
    }
  }

  private calculateShipping(
    requestedShippingCost: number | undefined,
    couponDiscount: { code: string; amount: number } | null,
  ): { shippingCost: number; shippingDiscount: number } {
    const shippingCost = requestedShippingCost || 0;
    let shippingDiscount = 0;

    if (couponDiscount && couponDiscount.amount === 0) {
      shippingDiscount = shippingCost;
    }

    return { shippingCost, shippingDiscount };
  }

  private calculateTotal(
    subtotal: number,
    totalDiscount: number,
    shippingCost: number,
    shippingDiscount: number,
  ): number {
    return Math.max(
      0,
      subtotal - totalDiscount + shippingCost - shippingDiscount,
    );
  }

  private getExchangeRate(
    merchant: Merchant,
    currency: string,
  ): number | undefined {
    const baseCurrency = merchant.currencySettings?.baseCurrency || 'SAR';
    if (currency === baseCurrency) {
      return undefined;
    }

    return merchant.currencySettings?.exchangeRates?.get(currency);
  }

  private buildPricingObject(
    subtotal: number,
    promotionDiscounts: OrderDiscount[],
    couponDiscount: { code: string; amount: number } | null,
    productDiscounts: OrderDiscount[],
    totalDiscount: number,
    shippingCost: number,
    shippingDiscount: number,
    total: number,
  ): OrderPricing {
    return {
      subtotal,
      promotions: promotionDiscounts,
      coupon: couponDiscount,
      products: productDiscounts,
      totalDiscount,
      shippingCost,
      shippingDiscount,
      total,
    };
  }

  private async calculateProductDiscounts(
    merchantId: string,
    cartItems: PricingCartItem[],
  ): Promise<OrderDiscount[]> {
    const discounts: OrderDiscount[] = [];

    for (const item of cartItems) {
      const discount = await this.calculateSingleProductDiscount(
        merchantId,
        item,
      );
      if (discount) {
        discounts.push(discount);
      }
    }

    return discounts;
  }

  private async calculateSingleProductDiscount(
    merchantId: string,
    item: PricingCartItem,
  ): Promise<OrderDiscount | null> {
    if (!Types.ObjectId.isValid(item.productId)) {
      return null;
    }

    const product = await this.productModel
      .findOne({
        _id: new Types.ObjectId(item.productId),
        merchantId: new Types.ObjectId(merchantId),
      })
      .lean()
      .exec();

    if (!product || !product._id || !product.offer?.enabled) {
      return null;
    }

    if (!this.isOfferValid(product.offer)) {
      return null;
    }

    const discountAmount = this.calculateOfferDiscount(product.offer, item);

    if (discountAmount <= 0) {
      return null;
    }

    return {
      ...(product._id && { id: product._id }),
      ...(product.name && { name: product.name }),
      amount: Math.round(discountAmount * 100) / 100,
    };
  }

  private isOfferValid(offer: { startAt?: Date; endAt?: Date }): boolean {
    const now = new Date();

    if (offer.startAt && now < offer.startAt) {
      return false;
    }

    if (offer.endAt && now > offer.endAt) {
      return false;
    }

    return true;
  }

  private calculateOfferDiscount(
    offer: {
      type?: string;
      discountValue?: number;
      newPrice?: number;
      oldPrice?: number;
      quantityThreshold?: number;
      quantityDiscount?: number;
      buyQuantity?: number;
      getQuantity?: number;
      getProductId?: string;
      getDiscount?: number;
    },
    item: PricingCartItem,
  ): number {
    if (offer.type === 'percentage' && offer.discountValue) {
      return (item.price * item.quantity * offer.discountValue) / 100;
    }

    if (offer.type === 'fixed_amount' && offer.discountValue) {
      return Math.min(
        offer.discountValue * item.quantity,
        item.price * item.quantity,
      );
    }

    if (offer.newPrice != null) {
      const oldPrice = offer.oldPrice || item.price;
      return (oldPrice - offer.newPrice) * item.quantity;
    }

    if (
      offer.type === 'quantity_based' &&
      offer.quantityThreshold &&
      offer.quantityDiscount
    ) {
      if (item.quantity < offer.quantityThreshold) {
        return 0;
      }
      return item.price * item.quantity * (offer.quantityDiscount / 100);
    }

    if (
      offer.type === 'buy_x_get_y' &&
      offer.buyQuantity &&
      offer.getQuantity
    ) {
      // دعم حالة نفس المنتج فقط
      if (offer.getProductId && offer.getProductId !== item.productId) {
        return 0;
      }
      const bundleSize = offer.buyQuantity + offer.getQuantity;
      if (bundleSize <= 0) {
        return 0;
      }
      const freeBundles = Math.floor(item.quantity / bundleSize);
      const freeUnits = freeBundles * offer.getQuantity;
      const pct = offer.getDiscount ?? 100;
      return freeUnits * item.price * (pct / 100);
    }

    return 0;
  }

  private async calculatePromotionDiscounts(
    merchantId: string,
    cartItems: PricingCartItem[],
    cartTotal: number,
  ): Promise<OrderDiscount[]> {
    const cartItemsForPromotion: CartItem[] =
      await this.enrichCartItemsWithCategory(cartItems);

    const applicablePromotions =
      await this.promotionsService.getApplicablePromotions(
        merchantId,
        cartItemsForPromotion,
        cartTotal,
      );

    return applicablePromotions
      .filter((ap) => ap.promotion._id !== undefined)
      .map((ap) => ({
        ...(ap.promotion._id && { id: ap.promotion._id }),
        ...(ap.promotion.name && { name: ap.promotion.name }),
        amount: ap.discountAmount,
      }));
  }

  private async enrichCartItemsWithCategory(
    cartItems: PricingCartItem[],
  ): Promise<CartItem[]> {
    const missingCategoryIds = cartItems
      .filter((item) => !item.categoryId)
      .map((item) => item.productId)
      .filter((pid) => Types.ObjectId.isValid(pid));

    const categoryMap = new Map<string, string>();

    if (missingCategoryIds.length) {
      const products = await this.productModel
        .find(
          {
            _id: {
              $in: missingCategoryIds.map((id) => new Types.ObjectId(id)),
            },
          },
          { _id: 1, category: 1 },
        )
        .lean()
        .exec();

      for (const p of products) {
        if (p._id && p.category) {
          categoryMap.set(String(p._id), String(p.category));
        }
      }
    }

    return cartItems.map((item) => {
      const categoryId =
        item.categoryId || categoryMap.get(item.productId.toString());

      const cartItem: CartItem = {
        productId: item.productId,
        price: item.price,
        quantity: item.quantity,
      };

      if (categoryId !== undefined) {
        cartItem.categoryId = categoryId;
      }

      return cartItem;
    });
  }

  private async applyCoupon(
    merchantId: string,
    code: string,
    cartItems: PricingCartItem[],
    totalAmount: number,
    customerPhone?: string,
  ): Promise<{ discountAmount: number }> {
    const result = await this.couponsService.apply({
      code,
      merchantId,
      ...(customerPhone !== undefined && { customerPhone }),
      cartItems: cartItems.map((item) => ({
        productId: item.productId,
        categoryId: item.categoryId ?? '',
        price: item.price,
        quantity: item.quantity,
      })),
      totalAmount,
    });

    return {
      discountAmount: result.discountAmount,
    };
  }

  private applyDiscountPolicy(
    policy: 'highest' | 'stack',
    productDiscounts: OrderDiscount[],
    promotionDiscounts: OrderDiscount[],
    couponDiscount: { code: string; amount: number } | null,
  ): number {
    if (policy === 'highest') {
      // تطبيق الخصم الأعلى فقط
      const allDiscounts = [
        ...productDiscounts.map((d) => d.amount),
        ...promotionDiscounts.map((d) => d.amount),
        ...(couponDiscount ? [couponDiscount.amount] : []),
      ];

      return Math.max(...allDiscounts, 0);
    } else {
      // تراكم الخصومات
      const productTotal = productDiscounts.reduce(
        (sum, d) => sum + d.amount,
        0,
      );
      const promotionTotal = promotionDiscounts.reduce(
        (sum, d) => sum + d.amount,
        0,
      );
      const couponTotal = couponDiscount?.amount || 0;

      return productTotal + promotionTotal + couponTotal;
    }
  }

  private async getMerchant(merchantId: string): Promise<Merchant> {
    if (!Types.ObjectId.isValid(merchantId)) {
      throw new NotFoundException('التاجر غير موجود');
    }

    const merchant = await this.merchantModel
      .findById(merchantId)
      .lean()
      .exec();

    if (!merchant) {
      throw new NotFoundException('التاجر غير موجود');
    }

    return merchant as unknown as Merchant;
  }
}
