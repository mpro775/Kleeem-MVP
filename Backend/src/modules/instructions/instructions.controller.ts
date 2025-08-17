// src/modules/instructions/instructions.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  Query,
} from '@nestjs/common';
import { InstructionsService } from './instructions.service';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';

@ApiTags('التوجيهات')
@Controller('instructions')
export class InstructionsController {
  constructor(private readonly service: InstructionsService) { }

  @Post()
  @ApiOperation({ summary: 'إنشاء توجيه جديد' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        instruction: { type: 'string', description: 'نص التوجيه', example: 'إذا سأل العميل عن الخصومات، قم بعرض كود SUMMER25.' },
        merchantId: { type: 'string', description: 'معرف التاجر (اختياري)', example: 'm_12345' },
        relatedReplies: { type: 'array', items: { type: 'string' }, description: 'معرفات الردود المرتبطة (اختياري)' },
        type: { type: 'string', enum: ['auto', 'manual'], description: 'نوع التوجيه (تلقائي أو يدوي)', example: 'manual' },
      },
      required: ['instruction'],
    },
  })
  @ApiResponse({ status: 201, description: 'تم إنشاء التوجيه بنجاح.' })
  async create(
    @Body()
    dto: {
      instruction: string;
      merchantId?: string;
      relatedReplies?: string[];
      type?: 'auto' | 'manual';
    },
  ) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'الحصول على قائمة بالتوجيهات مع خيارات التصفية' })
  @ApiQuery({ name: 'merchantId', description: 'تصفية حسب معرف التاجر', required: false })
  @ApiQuery({ name: 'active', description: 'تصفية حسب حالة التفعيل (true/false)', required: false })
  @ApiQuery({ name: 'limit', description: 'عدد النتائج لكل صفحة', required: false, type: Number })
  @ApiQuery({ name: 'page', description: 'رقم الصفحة', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'قائمة التوجيهات.' })
  async findAll(
    @Query('merchantId') merchantId?: string,
    @Query('active') active?: string,
    @Query('limit') limit = '30',
    @Query('page') page = '1',
  ) {
    return this.service.findAll({
      merchantId,
      active: active === 'true' ? true : active === 'false' ? false : undefined,
      limit: parseInt(limit, 10),
      page: parseInt(page, 10),
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'تحديث توجيه موجود' })
  @ApiParam({ name: 'id', description: 'معرف التوجيه' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        instruction: { type: 'string', description: 'نص التوجيه' },
        active: { type: 'boolean', description: 'حالة التفعيل' },
        relatedReplies: { type: 'array', items: { type: 'string' }, description: 'معرفات الردود المرتبطة' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'تم تحديث التوجيه بنجاح.' })
  @ApiResponse({ status: 404, description: 'التوجيه غير موجود.' })
  async update(
    @Param('id') id: string,
    @Body()
    dto: Partial<{
      instruction: string;
      active: boolean;
      relatedReplies: string[];
    }>,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'حذف توجيه' })
  @ApiParam({ name: 'id', description: 'معرف التوجيه' })
  @ApiResponse({ status: 200, description: 'تم حذف التوجيه بنجاح.' })
  @ApiResponse({ status: 404, description: 'التوجيه غير موجود.' })
  async remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'إلغاء تفعيل توجيه' })
  @ApiParam({ name: 'id', description: 'معرف التوجيه' })
  @ApiResponse({ status: 200, description: 'تم إلغاء تفعيل التوجيه.' })
  @ApiResponse({ status: 404, description: 'التوجيه غير موجود.' })
  async deactivate(@Param('id') id: string) {
    return this.service.deactivate(id);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'تفعيل توجيه' })
  @ApiParam({ name: 'id', description: 'معرف التوجيه' })
  @ApiResponse({ status: 200, description: 'تم تفعيل التوجيه.' })
  @ApiResponse({ status: 404, description: 'التوجيه غير موجود.' })
  async activate(@Param('id') id: string) {
    return this.service.activate(id);
  }

  // جلب فقط التوجيهات الفعالة (للبوت)
  @Get('active')
  @ApiOperation({ summary: 'الحصول على جميع التوجيهات النشطة (للبوت)' })
  @ApiQuery({ name: 'merchantId', description: 'تصفية حسب معرف التاجر (اختياري)', required: false })
  @ApiResponse({ status: 200, description: 'قائمة التوجيهات النشطة.' })
  async getActive(@Query('merchantId') merchantId?: string) {
    return this.service.getActiveInstructions(merchantId);
  }
}
