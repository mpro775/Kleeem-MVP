// src/modules/products/services/reviews.service.ts
import { Injectable, Inject, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';

import { ProductReview, ProductReviewDocument, ProductReviewStatus } from '../schemas/product-review.schema';
import { PRODUCT_REVIEW_REPOSITORY } from '../tokens';
import { ProductReviewRepository } from '../repositories/product-review.repository';

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(
    @Inject(PRODUCT_REVIEW_REPOSITORY)
    private readonly reviewRepo: ProductReviewRepository,
  ) {}

  /**
   * إنشاء تقييم جديد
   */
  async createReview(
    merchantId: string,
    productId: string,
    customerId: string,
    orderId: string | undefined,
    rating: number,
    comment?: string,
  ): Promise<ProductReview> {
    // التحقق من صحة البيانات
    if (rating < 1 || rating > 5) {
      throw new BadRequestException('التقييم يجب أن يكون بين 1 و 5');
    }

    // التحقق من عدم وجود تقييم سابق لنفس المنتج من نفس العميل
    const existingReview = await this.reviewRepo.findByCustomerAndProduct(
      customerId,
      productId,
    );

    if (existingReview) {
      throw new BadRequestException('لقد قمت بتقييم هذا المنتج من قبل');
    }

    // التحقق من صحة الشراء إذا كان مطلوباً (يمكن إضافتها لاحقاً)

    return this.reviewRepo.create({
      merchantId,
      productId,
      customerId,
      orderId: orderId || undefined,
      rating,
      comment: comment?.trim(),
      status: ProductReviewStatus.PENDING,
      reviewedAt: new Date(),
      isVerifiedPurchase: !!orderId, // افتراض أن وجود orderId يعني شراء موثق
    });
  }

  /**
   * الحصول على تقييمات منتج معتمدة (للعرض العام)
   */
  async getApprovedReviewsForProduct(
    merchantId: string,
    productId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    reviews: ProductReview[];
    total: number;
    averageRating: number;
    ratingDistribution: { [key: number]: number };
  }> {
    const { reviews, total } = await this.reviewRepo.findApprovedByProduct(
      merchantId,
      productId,
      page,
      limit,
    );

    // حساب متوسط التقييمات وتوزيعها
    const stats = await this.getProductReviewStats(merchantId, productId);

    return {
      reviews,
      total,
      averageRating: stats.averageRating,
      ratingDistribution: stats.ratingDistribution,
    };
  }

  /**
   * الحصول على جميع تقييمات منتج (للتاجر)
   */
  async getAllReviewsForProduct(
    merchantId: string,
    productId: string,
    status?: ProductReviewStatus,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    reviews: ProductReview[];
    total: number;
  }> {
    return this.reviewRepo.findAllByProduct(merchantId, productId, status, page, limit);
  }

  /**
   * الموافقة على تقييم
   */
  async approveReview(merchantId: string, reviewId: string): Promise<ProductReview | null> {
    const review = await this.reviewRepo.findByIdAndMerchant(reviewId, merchantId);
    if (!review) {
      throw new BadRequestException('التقييم غير موجود');
    }

    if (review.status !== ProductReviewStatus.PENDING) {
      throw new BadRequestException('لا يمكن الموافقة على هذا التقييم');
    }

    return this.reviewRepo.updateStatus(reviewId, ProductReviewStatus.APPROVED, new Date());
  }

  /**
   * رفض تقييم
   */
  async rejectReview(merchantId: string, reviewId: string): Promise<ProductReview | null> {
    const review = await this.reviewRepo.findByIdAndMerchant(reviewId, merchantId);
    if (!review) {
      throw new BadRequestException('التقييم غير موجود');
    }

    if (review.status !== ProductReviewStatus.PENDING) {
      throw new BadRequestException('لا يمكن رفض هذا التقييم');
    }

    return this.reviewRepo.updateStatus(reviewId, ProductReviewStatus.REJECTED, undefined, new Date());
  }

  /**
   * حذف تقييم
   */
  async deleteReview(merchantId: string, reviewId: string): Promise<boolean> {
    const review = await this.reviewRepo.findByIdAndMerchant(reviewId, merchantId);
    if (!review) {
      throw new BadRequestException('التقييم غير موجود');
    }

    return this.reviewRepo.deleteById(reviewId);
  }

  /**
   * الحصول على تقييمات العميل
   */
  async getCustomerReviews(
    merchantId: string,
    customerId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    reviews: ProductReview[];
    total: number;
  }> {
    return this.reviewRepo.findByCustomer(merchantId, customerId, page, limit);
  }

  /**
   * حساب إحصائيات تقييمات المنتج
   */
  private async getProductReviewStats(
    merchantId: string,
    productId: string,
  ): Promise<{
    averageRating: number;
    ratingDistribution: { [key: number]: number };
  }> {
    const allApprovedReviews = await this.reviewRepo.findAllApprovedByProduct(
      merchantId,
      productId,
    );

    if (allApprovedReviews.length === 0) {
      return {
        averageRating: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };
    }

    const totalRating = allApprovedReviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / allApprovedReviews.length;

    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    allApprovedReviews.forEach(review => {
      ratingDistribution[review.rating as keyof typeof ratingDistribution]++;
    });

    return {
      averageRating: Math.round(averageRating * 10) / 10, // تقريب لمنزلة عشرية واحدة
      ratingDistribution,
    };
  }

  /**
   * التحقق من إمكانية تقييم منتج (هل تم شراؤه)
   */
  async canCustomerReviewProduct(
    merchantId: string,
    customerId: string,
    productId: string,
  ): Promise<boolean> {
    // يمكن إضافة منطق للتحقق من الشراء الفعلي لاحقاً
    // للوقت الحالي، نتحقق فقط من عدم وجود تقييم سابق
    const existingReview = await this.reviewRepo.findByCustomerAndProduct(
      customerId,
      productId,
    );

    return !existingReview;
  }
}
