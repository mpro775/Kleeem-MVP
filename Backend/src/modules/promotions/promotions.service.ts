// src/modules/promotions/promotions.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';

import { CreatePromotionDto } from './dto/create-promotion.dto';
import { GetPromotionsDto } from './dto/get-promotions.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { PromotionsRepository } from './repositories/promotions.repository';
import { Promotion, PromotionType, ApplyTo } from './schemas/promotion.schema';

export interface CartItem {
  productId: string;
  categoryId?: string;
  price: number;
  quantity: number;
}

export interface ApplicablePromotion {
  promotion: Promotion;
  discountAmount: number;
  applicableItems: CartItem[];
}

@Injectable()
export class PromotionsService {
  constructor(private readonly promotionsRepository: PromotionsRepository) {}

  async create(dto: CreatePromotionDto): Promise<Promotion> {
    const {
      categoryIds,
      productIds,
      merchantId: merchantIdString,
      ...rest
    } = dto;

    const data: Partial<Promotion> = {
      ...rest,
      merchantId: new Types.ObjectId(merchantIdString),
      timesUsed: 0,
      totalDiscountGiven: 0,
    };

    // تحويل الفئات والمنتجات إلى ObjectIds
    if (categoryIds && categoryIds.length > 0) {
      data.categoryIds = categoryIds.map((id) => new Types.ObjectId(id));
    }

    if (productIds && productIds.length > 0) {
      data.productIds = productIds.map((id) => new Types.ObjectId(id));
    }

    return this.promotionsRepository.create(data);
  }

  async findAll(
    merchantId: string,
    query: GetPromotionsDto,
  ): Promise<{
    promotions: Promotion[];
    total: number;
    page: number;
    limit: number;
  }> {
    const limit = query.limit || 20;
    const page = query.page || 1;
    const skip = (page - 1) * limit;

    const options: Parameters<PromotionsRepository['findByMerchant']>[1] = {
      limit,
      skip,
    };

    if (query.status) {
      options.status = query.status;
    }

    const result = await this.promotionsRepository.findByMerchant(
      merchantId,
      options,
    );

    return {
      ...result,
      page,
      limit,
    };
  }

  async findOne(id: string, merchantId: string): Promise<Promotion> {
    const promotion = await this.promotionsRepository.findById(id);

    if (!promotion) {
      throw new NotFoundException('العرض غير موجود');
    }

    // التحقق من ملكية التاجر
    if (promotion.merchantId.toString() !== merchantId) {
      throw new NotFoundException('العرض غير موجود');
    }

    return promotion;
  }

  async update(
    id: string,
    merchantId: string,
    dto: UpdatePromotionDto,
  ): Promise<Promotion> {
    await this.findOne(id, merchantId); // التحقق من الملكية

    const { categoryIds, productIds, ...rest } = dto;

    const updateData: Partial<Promotion> = { ...rest };

    // تحويل الفئات والمنتجات إلى ObjectIds
    if (categoryIds && categoryIds.length > 0) {
      updateData.categoryIds = categoryIds.map((id) => new Types.ObjectId(id));
    }

    if (productIds && productIds.length > 0) {
      updateData.productIds = productIds.map((id) => new Types.ObjectId(id));
    }

    const updated = await this.promotionsRepository.update(id, updateData);

    if (!updated) {
      throw new NotFoundException('فشل تحديث العرض');
    }

    return updated;
  }

  async remove(id: string, merchantId: string): Promise<void> {
    await this.findOne(id, merchantId); // التحقق من الملكية

    const deleted = await this.promotionsRepository.delete(id);

    if (!deleted) {
      throw new NotFoundException('فشل حذف العرض');
    }
  }

  async getApplicablePromotions(
    merchantId: string,
    cartItems: CartItem[],
    cartTotal: number,
  ): Promise<ApplicablePromotion[]> {
    const activePromotions =
      await this.promotionsRepository.findActivePromotions(merchantId);

    const applicablePromotions: ApplicablePromotion[] = [];

    for (const promotion of activePromotions) {
      // التحقق من الحد الأدنى للسلة
      if (promotion.minCartAmount && cartTotal < promotion.minCartAmount) {
        continue;
      }

      // التحقق من حد الاستخدام
      if (
        promotion.usageLimit &&
        promotion.timesUsed &&
        promotion.timesUsed >= promotion.usageLimit
      ) {
        continue;
      }

      const applicableItems = this.getApplicableItems(promotion, cartItems);

      if (applicableItems.length === 0) {
        continue;
      }

      const discountAmount = this.calculateDiscount(
        promotion,
        applicableItems,
        cartTotal,
      );

      if (discountAmount > 0) {
        applicablePromotions.push({
          promotion,
          discountAmount,
          applicableItems,
        });
      }
    }

    // ترتيب حسب الأولوية
    return applicablePromotions.sort(
      (a, b) => b.promotion.priority - a.promotion.priority,
    );
  }

  async incrementUsage(
    promotionId: string,
    discountAmount: number,
  ): Promise<Promotion> {
    const promotion = await this.promotionsRepository.incrementUsage(
      promotionId,
      discountAmount,
    );

    if (!promotion) {
      throw new NotFoundException('العرض غير موجود');
    }

    return promotion;
  }

  private getApplicableItems(
    promotion: Promotion,
    cartItems: CartItem[],
  ): CartItem[] {
    // إذا كان على كل المنتجات
    if (promotion.applyTo === ApplyTo.ALL) {
      return cartItems;
    }

    const applicableItems: CartItem[] = [];

    for (const item of cartItems) {
      let isApplicable = false;

      // التحقق من المنتجات المحددة
      if (
        promotion.applyTo === ApplyTo.PRODUCTS &&
        promotion.productIds &&
        promotion.productIds.length > 0
      ) {
        isApplicable = promotion.productIds.some(
          (pid) => pid.toString() === item.productId.toString(),
        );
      }

      // التحقق من الفئات المحددة
      if (
        !isApplicable &&
        promotion.applyTo === ApplyTo.CATEGORIES &&
        promotion.categoryIds &&
        promotion.categoryIds.length > 0
      ) {
        isApplicable =
          !!item.categoryId &&
          promotion.categoryIds.some(
            (cid) => cid.toString() === item.categoryId!.toString(),
          );
      }

      if (isApplicable) {
        applicableItems.push(item);
      }
    }

    return applicableItems;
  }

  private calculateDiscount(
    promotion: Promotion,
    applicableItems: CartItem[],
    cartTotal: number,
  ): number {
    let discountAmount = 0;

    // حساب المبلغ القابل للتطبيق
    const applicableAmount = applicableItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    // حساب الخصم حسب النوع
    switch (promotion.type) {
      case PromotionType.PERCENTAGE:
        discountAmount = (applicableAmount * promotion.discountValue) / 100;

        // تطبيق الحد الأقصى للخصم إن وُجد
        if (
          promotion.maxDiscountAmount &&
          discountAmount > promotion.maxDiscountAmount
        ) {
          discountAmount = promotion.maxDiscountAmount;
        }
        break;

      case PromotionType.FIXED_AMOUNT:
        discountAmount = Math.min(promotion.discountValue, applicableAmount);
        break;

      case PromotionType.CART_THRESHOLD:
        // خصم تلقائي عند تجاوز مبلغ معين
        if (cartTotal >= promotion.minCartAmount) {
          if (promotion.discountValue <= 100) {
            // نسبة مئوية
            discountAmount = (cartTotal * promotion.discountValue) / 100;
          } else {
            // مبلغ ثابت
            discountAmount = promotion.discountValue;
          }

          if (
            promotion.maxDiscountAmount &&
            discountAmount > promotion.maxDiscountAmount
          ) {
            discountAmount = promotion.maxDiscountAmount;
          }
        }
        break;
    }

    return Math.round(discountAmount * 100) / 100; // تقريب لرقمين عشريين
  }
}
