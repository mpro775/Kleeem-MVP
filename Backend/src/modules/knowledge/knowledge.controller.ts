import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  Query,
  Delete,
  HttpCode,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { KnowledgeService } from './knowledge.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UseGuards } from '@nestjs/common/decorators/core/use-guards.decorator';

@ApiTags('المعرفة - ربط المواقع')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('merchants/:merchantId/knowledge/urls')
export class KnowledgeController {
  constructor(private readonly svc: KnowledgeService) {}

  @Post()
  @ApiOperation({
    summary: 'إضافة روابط معرفية للتاجر',
    description: 'إضافة قائمة من الروابط المعرفية لتاجر معين',
  })
  @ApiParam({ name: 'merchantId', description: 'معرف التاجر', type: String })
  @ApiBody({
    description: 'قائمة الروابط المعرفية',
    schema: {
      type: 'object',
      properties: {
        urls: {
          type: 'array',
          items: { type: 'string', format: 'url' },
          description: 'قائمة الروابط المعرفية',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'تمت إضافة الروابط بنجاح' })
  @ApiResponse({ status: 400, description: 'بيانات غير صالحة' })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 404, description: 'التاجر غير موجود' })
  async uploadUrls(
    @Param('merchantId') merchantId: string,
    @Body('urls') urls: string[],
    @Req() req: any,                           // ⬅️ جديد
  ) {
    // مرّر userId لصاحب العملية لغايات الإشعار
    return this.svc.addUrls(merchantId, urls, req.user?.userId);
  }
  @Get('status')
  @ApiOperation({
    summary: 'حالة الروابط المعرفية',
    description: 'استرجاع حالة معالجة الروابط المعرفية للتاجر',
  })
  @ApiParam({ name: 'merchantId', description: 'معرف التاجر', type: String })
  @ApiResponse({ status: 200, description: 'تم استرجاع حالة الروابط بنجاح' })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 404, description: 'التاجر غير موجود' })
  async getUrlsStatus(@Param('merchantId') merchantId: string) {
    return this.svc.getUrlsStatus(merchantId);
  }
  @Get()
  @ApiOperation({
    summary: 'الحصول على الروابط المعرفية',
    description: 'استرجاع جميع الروابط المعرفية المرتبطة بالتاجر',
  })
  @ApiParam({ name: 'merchantId', description: 'معرف التاجر', type: String })
  @ApiResponse({ status: 200, description: 'تم استرجاع الروابط بنجاح' })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 404, description: 'التاجر غير موجود' })
  async getUrls(@Param('merchantId') merchantId: string) {
    return this.svc.getUrls(merchantId);
  }
  // حذف واحد باستخدام id
  @Delete(':id')
  @ApiOperation({ summary: 'حذف رابط معرفي واحد بالمعرف (id) + حذف متجهاته' })
  @ApiParam({ name: 'merchantId', type: String })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'معرف السجل في قاعدة البيانات',
  })
  @ApiResponse({ status: 200, description: 'تم الحذف' })
  async deleteOneById(
    @Param('merchantId') merchantId: string,
    @Param('id') id: string,
  ) {
    return this.svc.deleteById(merchantId, id);
  }

  // حذف واحد باستخدام url (Query)
  // ======= حذف برابط أو حذف الكل =======
  @Delete()
  @ApiOperation({ summary: 'حذف رابط عبر url أو حذف جميع الروابط' })
  @ApiParam({ name: 'merchantId', type: String })
  @ApiQuery({ name: 'url', required: false })
  @ApiQuery({
    name: 'all',
    required: false,
    description: 'إذا true يحذف جميع الروابط والمتجهات',
  })
  deleteByUrlOrAll(
    @Param('merchantId') merchantId: string,
    @Query('url') url?: string,
    @Query('all') all?: string,
  ) {
    if (all === 'true') return this.svc.deleteAll(merchantId);
    if (url) return this.svc.deleteByUrl(merchantId, url);
    return { success: false, message: 'حدد url أو all=true' };
  }
}
