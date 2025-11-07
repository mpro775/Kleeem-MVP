// src/modules/coupons/coupons.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Types } from 'mongoose';

import { CreateCouponDto } from './dto/create-coupon.dto';
import { GetCouponsDto } from './dto/get-coupons.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { ValidateCouponDto, CartItemDto } from './dto/validate-coupon.dto';
import { CouponsRepository } from './repositories/coupons.repository';
import { Coupon, CouponType, CouponStatus } from './schemas/coupon.schema';

export interface CouponValidationResult {
  valid: boolean;
  coupon?: Coupon;
  discountAmount?: number;
  message?: string;
}

export interface ApplyCouponResult {
  discountAmount: number;
  finalAmount: number;
  coupon: Coupon;
}

@Injectable()
export class CouponsService {
  constructor(private readonly couponsRepository: CouponsRepository) {}

  async create(dto: CreateCouponDto): Promise<Coupon> {
    // التحقق من أن الكود غير موجود مسبقاً
    const existing = await this.couponsRepository.findByCode(
      dto.merchantId,
      dto.code,
    );

    if (existing) {
      throw new ConflictException('كود الكوبون موجود مسبقاً');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { products, categories, ...dtoWithoutArrays } = dto;

    // تحويل merchantId إلى ObjectId
    const data: Partial<Coupon> = {
      ...dtoWithoutArrays,
      merchantId: new Types.ObjectId(dto.merchantId),
      code: dto.code.toUpperCase().trim(),
      usedCount: 0,
      usedByCustomers: [],
      totalDiscountGiven: 0,
    };

    // تحويل المنتجات والفئات إلى ObjectIds
    if (dto.products && dto.products.length > 0) {
      data.products = dto.products.map((id) => new Types.ObjectId(id));
    }

    if (dto.categories && dto.categories.length > 0) {
      data.categories = dto.categories.map((id) => new Types.ObjectId(id));
    }

    return this.couponsRepository.create(data);
  }

  async findAll(
    merchantId: string,
    query: GetCouponsDto,
  ): Promise<{
    coupons: Coupon[];
    total: number;
    page: number;
    limit: number;
  }> {
    const limit = query.limit || 20;
    const page = query.page || 1;
    const skip = (page - 1) * limit;

    const result = await this.couponsRepository.findByMerchant(merchantId, {
      ...(query.status !== undefined && { status: query.status }),
      limit,
      skip,
    });

    return {
      ...result,
      page,
      limit,
    };
  }

  async findOne(id: string, merchantId: string): Promise<Coupon> {
    const coupon = await this.couponsRepository.findById(id);

    if (!coupon) {
      throw new NotFoundException('الكوبون غير موجود');
    }

    // التحقق من ملكية التاجر
    if (coupon.merchantId.toString() !== merchantId) {
      throw new NotFoundException('الكوبون غير موجود');
    }

    return coupon;
  }

  async findByCode(merchantId: string, code: string): Promise<Coupon> {
    const coupon = await this.couponsRepository.findByCode(merchantId, code);

    if (!coupon) {
      throw new NotFoundException('الكوبون غير موجود');
    }

    return coupon;
  }

  async update(
    id: string,
    merchantId: string,
    dto: UpdateCouponDto,
  ): Promise<Coupon> {
    await this.findOne(id, merchantId);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { products, categories, ...dtoWithoutArrays } = dto;

    const updateData: Partial<Coupon> = { ...dtoWithoutArrays };

    // تحويل المنتجات والفئات إلى ObjectIds
    if (dto.products && dto.products.length > 0) {
      updateData.products = dto.products.map((id) => new Types.ObjectId(id));
    }

    if (dto.categories && dto.categories.length > 0) {
      updateData.categories = dto.categories.map(
        (id) => new Types.ObjectId(id),
      );
    }

    const updated = await this.couponsRepository.update(id, updateData);

    if (!updated) {
      throw new NotFoundException('فشل تحديث الكوبون');
    }

    return updated;
  }

  async remove(id: string, merchantId: string): Promise<void> {
    await this.findOne(id, merchantId); // التحقق من الملكية

    const deleted = await this.couponsRepository.delete(id);

    if (!deleted) {
      throw new NotFoundException('فشل حذف الكوبون');
    }
  }

  async validate(dto: ValidateCouponDto): Promise<CouponValidationResult> {
    const coupon = await this.couponsRepository.findByCode(
      dto.merchantId,
      dto.code,
    );

    if (!coupon) {
      return {
        valid: false,
        message: 'الكوبون غير موجود',
      };
    }

    // التحقق من الحالة والتواريخ
    const statusCheck = this.checkCouponStatus(coupon);
    if (!statusCheck.valid) {
      return statusCheck;
    }

    // التحقق من الاستخدامات
    const usageCheck = this.checkCouponUsage(coupon, dto.customerPhone);
    if (!usageCheck.valid) {
      return usageCheck;
    }

    // التحقق من الحد الأدنى للطلب
    const orderCheck = this.checkMinOrderAmount(coupon, dto.totalAmount);
    if (!orderCheck.valid) {
      return orderCheck;
    }

    // التحقق من نطاق التطبيق
    const applicabilityCheck = this.checkApplicability(coupon, dto.cartItems);
    if (!applicabilityCheck.valid) {
      return applicabilityCheck;
    }

    // حساب مبلغ الخصم
    const discountAmount = this.calculateDiscount(coupon, dto);

    return {
      valid: true,
      coupon,
      discountAmount,
    };
  }

  private checkCouponStatus(coupon: Coupon): CouponValidationResult {
    if (coupon.status !== CouponStatus.ACTIVE) {
      return {
        valid: false,
        message: 'الكوبون غير نشط',
      };
    }

    const now = new Date();

    if (coupon.startDate && now < coupon.startDate) {
      return {
        valid: false,
        message: 'الكوبون لم يبدأ بعد',
      };
    }

    if (coupon.endDate && now > coupon.endDate) {
      return {
        valid: false,
        message: 'الكوبون منتهي الصلاحية',
      };
    }

    return { valid: true };
  }

  private checkCouponUsage(
    coupon: Coupon,
    customerPhone?: string,
  ): CouponValidationResult {
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return {
        valid: false,
        message: 'تم استنفاد عدد مرات استخدام الكوبون',
      };
    }

    if (!customerPhone) {
      return { valid: true };
    }

    if (
      coupon.allowedCustomers &&
      coupon.allowedCustomers.length > 0 &&
      !coupon.allowedCustomers.includes(customerPhone)
    ) {
      return {
        valid: false,
        message: 'هذا الكوبون غير متاح لك',
      };
    }

    if (
      coupon.oneTimePerCustomer &&
      coupon.usedByCustomers.includes(customerPhone)
    ) {
      return {
        valid: false,
        message: 'لقد استخدمت هذا الكوبون مسبقاً',
      };
    }

    return { valid: true };
  }

  private checkMinOrderAmount(
    coupon: Coupon,
    totalAmount: number,
  ): CouponValidationResult {
    if (coupon.minOrderAmount && totalAmount < coupon.minOrderAmount) {
      return {
        valid: false,
        message: `الحد الأدنى للطلب هو ${coupon.minOrderAmount}`,
      };
    }

    return { valid: true };
  }

  private checkApplicability(
    coupon: Coupon,
    cartItems: CartItemDto[],
  ): CouponValidationResult {
    if (coupon.storeWide) {
      return { valid: true };
    }

    const hasApplicableItems = this.checkApplicableItems(coupon, cartItems);

    if (!hasApplicableItems) {
      return {
        valid: false,
        message: 'الكوبون لا ينطبق على المنتجات في السلة',
      };
    }

    return { valid: true };
  }

  async apply(dto: ValidateCouponDto): Promise<ApplyCouponResult> {
    const validation = await this.validate(dto);

    if (!validation.valid || !validation.coupon || !validation.discountAmount) {
      throw new BadRequestException(validation.message || 'الكوبون غير صالح');
    }

    const finalAmount = Math.max(
      0,
      dto.totalAmount - validation.discountAmount,
    );

    return {
      discountAmount: validation.discountAmount,
      finalAmount,
      coupon: validation.coupon,
    };
  }

  async incrementUsage(
    couponId: string,
    discountAmount: number,
    customerPhone?: string,
  ): Promise<Coupon> {
    const coupon = await this.couponsRepository.incrementUsage(
      couponId,
      customerPhone,
    );

    if (!coupon) {
      throw new NotFoundException('الكوبون غير موجود');
    }

    // تحديث إجمالي الخصم الممنوح
    await this.couponsRepository.update(couponId, {
      totalDiscountGiven: (coupon.totalDiscountGiven || 0) + discountAmount,
    });

    return coupon;
  }

  generateRandomCode(length: number = 8): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';

    for (let i = 0; i < length; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return code;
  }

  async generateUniqueCodes(
    merchantId: string,
    count: number,
    length: number = 8,
  ): Promise<string[]> {
    const codes: string[] = [];

    for (let i = 0; i < count; i++) {
      let code: string;
      let exists = true;

      // استمر في التوليد حتى نجد كود فريد
      while (exists) {
        code = this.generateRandomCode(length);
        const existing = await this.couponsRepository.findByCode(
          merchantId,
          code,
        );
        exists = !!existing;
      }

      codes.push(code!);
    }

    return codes;
  }

  private checkApplicableItems(
    coupon: Coupon,
    cartItems: CartItemDto[],
  ): boolean {
    // إذا كان على المتجر كامل
    if (coupon.storeWide) return true;

    // التحقق من المنتجات المحددة
    if (coupon.products && coupon.products.length > 0) {
      const hasProduct = cartItems.some((item) =>
        coupon.products!.some(
          (pid) => pid.toString() === item.productId.toString(),
        ),
      );

      if (hasProduct) return true;
    }

    // التحقق من الفئات المحددة
    if (coupon.categories && coupon.categories.length > 0) {
      const hasCategory = cartItems.some(
        (item) =>
          item.categoryId &&
          coupon.categories!.some(
            (cid) => cid.toString() === item.categoryId!.toString(),
          ),
      );

      if (hasCategory) return true;
    }

    return false;
  }

  private calculateDiscount(coupon: Coupon, dto: ValidateCouponDto): number {
    let discountAmount = 0;

    // حساب المبلغ القابل للتطبيق
    let applicableAmount = dto.totalAmount;

    // إذا كان الكوبون على منتجات أو فئات محددة
    if (!coupon.storeWide) {
      applicableAmount = this.calculateApplicableAmount(coupon, dto.cartItems);
    }

    // حساب الخصم حسب النوع
    switch (coupon.type) {
      case CouponType.PERCENTAGE:
        discountAmount = (applicableAmount * coupon.value) / 100;

        // تطبيق الحد الأقصى للخصم إن وُجد
        if (
          coupon.maxDiscountAmount &&
          discountAmount > coupon.maxDiscountAmount
        ) {
          discountAmount = coupon.maxDiscountAmount;
        }
        break;

      case CouponType.FIXED_AMOUNT:
        discountAmount = Math.min(coupon.value, applicableAmount);
        break;

      case CouponType.FREE_SHIPPING:
        // سيتم معالجته في Orders Service
        discountAmount = 0;
        break;
    }

    return Math.round(discountAmount * 100) / 100; // تقريب لرقمين عشريين
  }

  private calculateApplicableAmount(
    coupon: Coupon,
    cartItems: CartItemDto[],
  ): number {
    let amount = 0;

    for (const item of cartItems) {
      let isApplicable = false;

      // التحقق من المنتجات المحددة
      if (coupon.products && coupon.products.length > 0) {
        isApplicable = coupon.products.some(
          (pid) => pid.toString() === item.productId.toString(),
        );
      }

      // التحقق من الفئات المحددة
      if (!isApplicable && coupon.categories && coupon.categories.length > 0) {
        isApplicable =
          !!item.categoryId &&
          coupon.categories.some(
            (cid) => cid.toString() === item.categoryId!.toString(),
          );
      }

      if (isApplicable) {
        amount += item.price * item.quantity;
      }
    }

    return amount;
  }
}
