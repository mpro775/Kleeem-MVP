// src/modules/faq/faq.controller.ts
import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Delete,
  Query,
  Patch,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';

import { FaqService } from './faq.service';

@ApiTags('الأسئلة الشائعة')
@Controller('merchants/:merchantId/faqs')
@ApiParam({
  name: 'merchantId',
  description: 'معرف التاجر',
  example: 'm_12345',
})
export class FaqController {
  constructor(private readonly svc: FaqService) {}

  @Post()
  @ApiOperation({ summary: 'إضافة مجموعة من الأسئلة الشائعة (queue)' })
  @ApiBody({
    description: 'مصفوفة من كائنات الأسئلة والأجوبة',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          question: { type: 'string' },
          answer: { type: 'string' },
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'تمت جدولة الأسئلة للشحن إلى Qdrant.',
  })
  uploadFaqs(
    @Param('merchantId') merchantId: string,
    @Body() faqs: { question: string; answer: string }[],
  ): Promise<{
    success: boolean;
    queued: number;
    message: string;
    ids: string[];
  }> {
    return this.svc.createMany(merchantId, faqs);
  }

  @Get()
  @ApiOperation({ summary: 'قائمة الأسئلة الشائعة' })
  @ApiQuery({ name: 'includeDeleted', required: false, example: 'false' })
  list(
    @Param('merchantId') merchantId: string,
    @Query('includeDeleted') includeDeleted?: string,
  ): Promise<unknown> {
    return this.svc.list(merchantId, includeDeleted === 'true');
  }

  @Get('status')
  @ApiOperation({ summary: 'حالة التدريب/الفهرسة للأسئلة الشائعة' })
  status(@Param('merchantId') merchantId: string): Promise<unknown> {
    return this.svc.getStatus(merchantId);
  }

  @Patch(':faqId')
  @ApiOperation({ summary: 'تحديث سؤال/جواب وإعادة الفهرسة' })
  updateOne(
    @Param('merchantId') merchantId: string,
    @Param('faqId') faqId: string,
    @Body() body: { question?: string; answer?: string },
  ): Promise<unknown> {
    return this.svc.updateOne(merchantId, faqId, body);
  }

  @Delete(':faqId')
  @ApiOperation({ summary: 'حذف سؤال شائع (soft/hard)' })
  @ApiQuery({
    name: 'hard',
    required: false,
    example: 'false',
    description: 'true للحذف النهائي + حذف المتجهات',
  })
  deleteOne(
    @Param('merchantId') merchantId: string,
    @Param('faqId') faqId: string,
    @Query('hard') hard?: string,
  ): Promise<unknown> {
    return hard === 'true'
      ? this.svc.hardDelete(merchantId, faqId)
      : this.svc.softDelete(merchantId, faqId);
  }

  @Delete()
  @ApiOperation({ summary: 'حذف كل الأسئلة الشائعة لهذا التاجر (soft/hard)' })
  @ApiQuery({ name: 'all', required: true, example: 'true' })
  @ApiQuery({ name: 'hard', required: false, example: 'false' })
  deleteAll(
    @Param('merchantId') merchantId: string,
    @Query('all') all: string,
    @Query('hard') hard?: string,
  ): Promise<unknown> | { success: boolean; message: string } {
    if (all !== 'true') return { success: false, message: 'حدد all=true' };
    return this.svc.deleteAll(merchantId, hard === 'true');
  }
}
