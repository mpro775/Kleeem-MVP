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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

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
@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Post()
  @ApiOperation({ summary: 'إنشاء عرض ترويجي جديد' })
  @ApiResponse({ status: 201, description: 'تم إنشاء العرض بنجاح' })
  async create(
    @Body() createPromotionDto: CreatePromotionDto,
  ): Promise<Promotion> {
    return this.promotionsService.create(createPromotionDto);
  }

  @Get()
  @ApiOperation({ summary: 'قائمة العروض الترويجية للتاجر' })
  @ApiResponse({ status: 200, description: 'تم الحصول على القائمة بنجاح' })
  async findAll(
    @Query('merchantId') merchantId: string,
    @Query() query: GetPromotionsDto,
  ): Promise<{
    promotions: Promotion[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.promotionsService.findAll(merchantId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'تفاصيل عرض محدد' })
  @ApiParam({ name: 'id', description: 'معرّف العرض' })
  @ApiResponse({ status: 200, description: 'تم الحصول على العرض بنجاح' })
  @ApiResponse({ status: 404, description: 'العرض غير موجود' })
  async findOne(
    @Param('id') id: string,
    @Query('merchantId') merchantId: string,
  ): Promise<Promotion> {
    return this.promotionsService.findOne(id, merchantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'تحديث عرض' })
  @ApiParam({ name: 'id', description: 'معرّف العرض' })
  @ApiResponse({ status: 200, description: 'تم تحديث العرض بنجاح' })
  @ApiResponse({ status: 404, description: 'العرض غير موجود' })
  async update(
    @Param('id') id: string,
    @Query('merchantId') merchantId: string,
    @Body() updatePromotionDto: UpdatePromotionDto,
  ): Promise<Promotion> {
    return this.promotionsService.update(id, merchantId, updatePromotionDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'حذف عرض' })
  @ApiParam({ name: 'id', description: 'معرّف العرض' })
  @ApiResponse({ status: 200, description: 'تم حذف العرض بنجاح' })
  @ApiResponse({ status: 404, description: 'العرض غير موجود' })
  async remove(
    @Param('id') id: string,
    @Query('merchantId') merchantId: string,
  ): Promise<{ message: string }> {
    await this.promotionsService.remove(id, merchantId);
    return { message: 'تم حذف العرض بنجاح' };
  }

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
