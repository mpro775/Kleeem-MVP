// src/catalog/catalog.controller.ts (مبسّط)
import { Controller, Param, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { CatalogService } from './catalog.service';

@ApiTags('الكتالوج')
@Controller('catalog')
export class CatalogController {
  constructor(private readonly svc: CatalogService) {}

  /**
   * مزامنة كتالوج التاجر
   * يبدأ عملية مزامنة لكتالوج تاجر معين
   */
  @Post(':merchantId/sync')
  @ApiOperation({
    summary: 'مزامنة كتالوج التاجر',
    description: 'يبدأ عملية مزامنة لكتالوج تاجر معين.',
  })
  @ApiParam({
    name: 'merchantId',
    description: 'معرف التاجر لمزامنة الكتالوج',
    example: 'm_12345',
  })
  @ApiResponse({
    status: 201,
    description: 'تم بدء عملية المزامنة بنجاح.',
  })
  @ApiResponse({ status: 500, description: 'خطأ داخلي في الخادم.' })
  sync(@Param('merchantId') merchantId: string) {
    return this.svc.syncForMerchant(merchantId);
  }
}
