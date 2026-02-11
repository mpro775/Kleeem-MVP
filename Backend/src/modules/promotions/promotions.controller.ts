// src/modules/promotions/promotions.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ForbiddenException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';

import { CurrentMerchantId } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';

import { CreatePromotionDto } from './dto/create-promotion.dto';
import { GetPromotionsDto } from './dto/get-promotions.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import {
  ApplicablePromotion,
  CartItem,
  PromotionsService,
} from './promotions.service';
import { Promotion } from './schemas/promotion.schema';

@ApiTags('Promotions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Post()
  @ApiOperation({ summary: 'إنشاء عرض ترويجي جديد' })
  @ApiResponse({ status: 201, description: 'تم إنشاء العرض بنجاح' })
  async create(
    @Body() createPromotionDto: CreatePromotionDto,
    @CurrentMerchantId() jwtMerchantId: string | null,
  ): Promise<Promotion> {
    if (!jwtMerchantId) {
      throw new ForbiddenException('معرّف التاجر مطلوب');
    }
    const input = { ...createPromotionDto, merchantId: jwtMerchantId };
    return this.promotionsService.create(input);
  }

  @Get()
  @ApiOperation({ summary: 'قائمة العروض الترويجية للتاجر' })
  @ApiResponse({ status: 200, description: 'تم الحصول على القائمة بنجاح' })
  async findAll(
    @Query() query: GetPromotionsDto,
    @CurrentMerchantId() merchantId: string | null,
  ): Promise<{
    promotions: Promotion[];
    total: number;
    page: number;
    limit: number;
  }> {
    if (!merchantId) {
      throw new ForbiddenException('معرّف التاجر مطلوب');
    }
    return this.promotionsService.findAll(merchantId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'تفاصيل عرض محدد' })
  @ApiParam({ name: 'id', description: 'معرّف العرض' })
  @ApiResponse({ status: 200, description: 'تم الحصول على العرض بنجاح' })
  @ApiResponse({ status: 404, description: 'العرض غير موجود' })
  async findOne(
    @Param('id') id: string,
    @CurrentMerchantId() merchantId: string | null,
  ): Promise<Promotion> {
    if (!merchantId) {
      throw new ForbiddenException('معرّف التاجر مطلوب');
    }
    return this.promotionsService.findOne(id, merchantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'تحديث عرض' })
  @ApiParam({ name: 'id', description: 'معرّف العرض' })
  @ApiResponse({ status: 200, description: 'تم تحديث العرض بنجاح' })
  @ApiResponse({ status: 404, description: 'العرض غير موجود' })
  async update(
    @Param('id') id: string,
    @Body() updatePromotionDto: UpdatePromotionDto,
    @CurrentMerchantId() merchantId: string | null,
  ): Promise<Promotion> {
    if (!merchantId) {
      throw new ForbiddenException('معرّف التاجر مطلوب');
    }
    return this.promotionsService.update(id, merchantId, updatePromotionDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'حذف عرض' })
  @ApiParam({ name: 'id', description: 'معرّف العرض' })
  @ApiResponse({ status: 200, description: 'تم حذف العرض بنجاح' })
  @ApiResponse({ status: 404, description: 'العرض غير موجود' })
  async remove(
    @Param('id') id: string,
    @CurrentMerchantId() merchantId: string | null,
  ): Promise<{ message: string }> {
    if (!merchantId) {
      throw new ForbiddenException('معرّف التاجر مطلوب');
    }
    await this.promotionsService.remove(id, merchantId);
    return { message: 'تم حذف العرض بنجاح' };
  }

  @Public()
  @Post('applicable')
  @ApiOperation({ summary: 'الحصول على العروض المطبقة على سلة' })
  @ApiResponse({ status: 200, description: 'قائمة العروض المطبقة' })
  async getApplicablePromotions(
    @Body('merchantId') merchantId: string,
    @Body('cartItems') cartItems: CartItem[],
    @Body('cartTotal') cartTotal: number,
  ): Promise<ApplicablePromotion[]> {
    return this.promotionsService.getApplicablePromotions(
      merchantId,
      cartItems,
      cartTotal,
    );
  }
}
