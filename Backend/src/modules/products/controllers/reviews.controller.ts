// src/modules/products/controllers/reviews.controller.ts
import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';

import { Customer } from '../../../common/decorators/customer.decorator';
import { CustomerGuard } from '../../../common/guards/customer.guard';
import { IdentityGuard } from '../../../common/guards/identity.guard';
import { CustomerRequestUser } from '../../../modules/auth/strategies/customer-jwt.strategy';
import { ReviewsService } from '../services/reviews.service';

@ApiTags('products')
@Controller('products')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  // ========== Public Endpoints ==========

  @Get(':id/reviews')
  @ApiOperation({ summary: 'الحصول على تقييمات المنتج المعتمدة (للعرض العام)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'قائمة التقييمات المعتمدة' })
  async getProductReviews(
    @Param('id') productId: string,
    @Query('merchantId') merchantId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.reviewsService.getApprovedReviewsForProduct(
      merchantId,
      productId,
      page,
      limit,
    );
  }

  // ========== Customer Endpoints ==========

  @UseGuards(CustomerGuard)
  @Post(':id/reviews')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'إضافة تقييم للمنتج' })
  @ApiResponse({ status: 201, description: 'تم إنشاء التقييم بنجاح' })
  @ApiResponse({ status: 400, description: 'بيانات غير صحيحة أو تقييم مكرر' })
  async createReview(
    @Param('id') productId: string,
    @Customer() customer: CustomerRequestUser,
    @Body()
    body: {
      rating: number;
      comment?: string;
      orderId?: string;
    },
  ) {
    return this.reviewsService.createReview(
      customer.merchantId,
      productId,
      customer.customerId,
      body.orderId,
      body.rating,
      body.comment,
    );
  }

  @UseGuards(CustomerGuard)
  @Get('reviews/me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'الحصول على تقييمات العميل' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'قائمة تقييمات العميل' })
  async getMyReviews(
    @Customer() customer: CustomerRequestUser,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.reviewsService.getCustomerReviews(
      customer.merchantId,
      customer.customerId,
      page,
      limit,
    );
  }

  // ========== Merchant Dashboard Endpoints ==========

  @UseGuards(IdentityGuard)
  @Get(':id/reviews/all')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'الحصول على جميع تقييمات المنتج (للتاجر)' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending', 'approved', 'rejected'],
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'قائمة جميع تقييمات المنتج' })
  async getAllProductReviews(
    @Param('id') productId: string,
    @Query('merchantId') merchantId: string,
    @Query('status') status?: 'pending' | 'approved' | 'rejected',
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.reviewsService.getAllReviewsForProduct(
      merchantId,
      productId,
      status as any,
      page,
      limit,
    );
  }

  @UseGuards(IdentityGuard)
  @Patch('reviews/:reviewId/approve')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'الموافقة على تقييم' })
  @ApiResponse({ status: 200, description: 'تم الموافقة على التقييم' })
  @ApiResponse({ status: 404, description: 'التقييم غير موجود' })
  async approveReview(
    @Param('reviewId') reviewId: string,
    @Body('merchantId') merchantId: string,
  ) {
    return this.reviewsService.approveReview(merchantId, reviewId);
  }

  @UseGuards(IdentityGuard)
  @Patch('reviews/:reviewId/reject')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'رفض تقييم' })
  @ApiResponse({ status: 200, description: 'تم رفض التقييم' })
  @ApiResponse({ status: 404, description: 'التقييم غير موجود' })
  async rejectReview(
    @Param('reviewId') reviewId: string,
    @Body('merchantId') merchantId: string,
  ) {
    return this.reviewsService.rejectReview(merchantId, reviewId);
  }

  @UseGuards(IdentityGuard)
  @Delete('reviews/:reviewId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'حذف تقييم' })
  @ApiResponse({ status: 200, description: 'تم حذف التقييم' })
  @ApiResponse({ status: 404, description: 'التقييم غير موجود' })
  async deleteReview(
    @Param('reviewId') reviewId: string,
    @Body('merchantId') merchantId: string,
  ) {
    const success = await this.reviewsService.deleteReview(
      merchantId,
      reviewId,
    );
    return { success };
  }
}
