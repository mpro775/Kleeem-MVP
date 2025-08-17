// src/modules/faq/faq.controller.ts
import { Controller, Post, Get, Body, Param, Delete } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { FaqService } from './faq.service';

@ApiTags('الأسئلة الشائعة')
@Controller('merchants/:merchantId/faqs')
@ApiParam({ name: 'merchantId', description: 'معرف التاجر', example: 'm_12345' })
export class FaqController {
  constructor(private readonly svc: FaqService) {}

    @Post()
  @ApiOperation({ summary: 'إضافة مجموعة من الأسئلة الشائعة' })
  @ApiBody({
    description: 'مصفوفة من كائنات الأسئلة والأجوبة',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          question: { type: 'string', example: 'ما هي سياسة الإرجاع؟' },
          answer: { type: 'string', example: 'يمكنك إرجاع المنتج خلال 14 يومًا.' },
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'تم إنشاء الأسئلة الشائعة بنجاح.' })
  async uploadFaqs(
    @Param('merchantId') merchantId: string,
    @Body() faqs: { question: string; answer: string }[],
  ) {
    return this.svc.createMany(merchantId, faqs);
  }

    @Get()
  @ApiOperation({ summary: 'الحصول على قائمة بجميع الأسئلة الشائعة للتاجر' })
  @ApiResponse({ status: 200, description: 'قائمة الأسئلة الشائعة.' })
  async list(@Param('merchantId') merchantId: string) {
    return this.svc.list(merchantId);
  }

    @Delete(':faqId')
  @ApiOperation({ summary: 'حذف سؤال شائع' })
  @ApiParam({ name: 'faqId', description: 'معرف السؤال الشائع', example: 'faq_12345' })
  @ApiResponse({ status: 200, description: 'تم حذف السؤال بنجاح.' })
  @ApiResponse({ status: 404, description: 'السؤال الشائع غير موجود.' })
  async delete(
    @Param('merchantId') merchantId: string,
    @Param('faqId') faqId: string,
  ) {
    return this.svc.delete(merchantId, faqId);
  }
}
