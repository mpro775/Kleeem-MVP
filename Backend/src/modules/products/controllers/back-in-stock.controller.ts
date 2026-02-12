// src/modules/products/controllers/back-in-stock.controller.ts
import {
  Controller,
  Post,
  Body,
  Delete,
  Param,
  Get,
  HttpCode,
  HttpStatus,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { CustomerGuard } from '../../../common/guards/customer.guard';
import { IdentityGuard } from '../../../common/guards/identity.guard';
import { BackInStockService } from '../services/back-in-stock.service';

@ApiTags('products')
@Controller('back-in-stock')
export class BackInStockController {
  constructor(private readonly backInStockService: BackInStockService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'إنشاء طلب إشعار عند توفر المنتج' })
  @ApiResponse({ status: 201, description: 'تم إنشاء الطلب بنجاح' })
  @ApiResponse({ status: 400, description: 'بيانات غير صحيحة أو طلب مكرر' })
  async createRequest(
    @Body()
    body: {
      merchantId: string;
      productId: string;
      variantId?: string;
      customerId?: string;
      contact?: string;
    },
  ) {
    return this.backInStockService.createRequest(
      body.merchantId,
      body.productId,
      body.variantId,
      body.customerId,
      body.contact,
    );
  }

  @UseGuards(CustomerGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'الحصول على طلبات الإشعار الخاصة بالعميل' })
  @ApiResponse({ status: 200, description: 'قائمة الطلبات' })
  async getMyRequests(
    @Query('merchantId') merchantId: string,
    @Body('customerId') customerId: string,
  ) {
    return this.backInStockService.getCustomerRequests(merchantId, customerId);
  }

  @UseGuards(CustomerGuard)
  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'إلغاء طلب إشعار' })
  @ApiResponse({ status: 200, description: 'تم إلغاء الطلب بنجاح' })
  @ApiResponse({ status: 404, description: 'الطلب غير موجود' })
  async cancelRequest(
    @Param('id') requestId: string,
    @Body('merchantId') merchantId: string,
  ) {
    const success = await this.backInStockService.cancelRequest(
      merchantId,
      requestId,
    );
    return { success };
  }

  // TODO: إضافة endpoints للتاجر لإدارة الطلبات
  // @UseGuards(IdentityGuard)
  // @Get('merchant/:merchantId')
  // async getMerchantRequests(@Param('merchantId') merchantId: string) {
  //   // إرجاع جميع الطلبات للتاجر
  // }
}
