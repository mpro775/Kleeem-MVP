// src/modules/kleem/botFaq/botFaq.controller.ts
import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { seconds, Throttle } from '@nestjs/throttler';
import { BotFaqService } from './botFaq.service';
import { CreateBotFaqDto } from './dto/create-botFaq.dto';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth, 
  ApiConsumes, 
  ApiBody, 
  ApiParam,
  ApiQuery 
} from '@nestjs/swagger';
import { BulkImportDto } from './dto/bulk-import.dto';
import { UpdateBotFaqDto } from './dto/update-botFaq.dto';

@ApiTags('إدارة الأسئلة الشائعة')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/kleem/bot-faqs')
export class BotFaqController {
  constructor(private readonly svc: BotFaqService) {}

  @Post()
  @ApiOperation({ summary: 'إنشاء سؤال شائع جديد', description: 'يستخدم هذا المسار لإنشاء سؤال شائع جديد في قاعدة البيانات' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'تم إنشاء السؤال بنجاح' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'بيانات الطلب غير صالحة' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'غير مصرح' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'غير مسموح الوصول' })
  create(@Body() dto: CreateBotFaqDto) {
    return this.svc.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'عرض جميع الأسئلة الشائعة', description: 'استرجاع قائمة بجميع الأسئلة الشائعة' })
  @ApiResponse({ status: HttpStatus.OK, description: 'تم استرجاع الأسئلة بنجاح' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'غير مصرح' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'غير مسموح الوصول' })
  list() {
    return this.svc.findAll();
  }

  @Patch(':id')
  @ApiOperation({ summary: 'تحديث سؤال شائع', description: 'تحديث بيانات سؤال شائع موجود' })
  @ApiParam({ name: 'id', description: 'معرف السؤال', type: String })
  @ApiResponse({ status: HttpStatus.OK, description: 'تم تحديث السؤال بنجاح' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'لم يتم العثور على السؤال' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'بيانات الطلب غير صالحة' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'غير مصرح' })
  update(@Param('id') id: string, @Body() dto: UpdateBotFaqDto) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'حذف سؤال شائع', description: 'حذف سؤال شائع من قاعدة البيانات' })
  @ApiParam({ name: 'id', description: 'معرف السؤال المراد حذفه', type: String })
  @ApiResponse({ status: HttpStatus.OK, description: 'تم حذف السؤال بنجاح' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'لم يتم العثور على السؤال' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'غير مصرح' })
  delete(@Param('id') id: string) {
    return this.svc.delete(id);
  }

  @Post('import')
  @ApiOperation({ 
    summary: 'استيراد أسئلة شائعة', 
    description: 'استيراد عدة أسئلة شائعة دفعة واحدة (حتى 500 سؤال في المرة الواحدة)' 
  })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'تم استيراد الأسئلة بنجاح' 
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'بيانات الطلب غير صالحة أو تجاوز الحد المسموح' 
  })
  @ApiResponse({ 
    status: HttpStatus.UNAUTHORIZED, 
    description: 'غير مصرح' 
  })
  bulk(@Body() body: BulkImportDto) {
    return this.svc.bulkImport(body);
  }

  // رفع ملف JSON من لوحة التحكم (بديل اختياري)
  @Post('import/file')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ 
    summary: 'استيراد أسئلة من ملف', 
    description: 'رفع ملف JSON يحتوي على قائمة بالأسئلة الشائعة للاستيراد' 
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'ملف JSON يحتوي على مصفوفة من الأسئلة الشائعة',
        },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'تم استيراد الملف بنجاح' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'صيغة الملف غير صالحة' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'غير مصرح' })
  async bulkFile(@UploadedFile() file: Express.Multer.File) {
    const text = file?.buffer?.toString('utf8') || '[]';
    const items = JSON.parse(text);
    return this.svc.bulkImport({ items });
  }

  @Post('reindex')
  @ApiOperation({ 
    summary: 'إعادة فهرسة الأسئلة', 
    description: 'إعادة فهرسة جميع الأسئلة الشائعة في محرك البحث' 
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'تمت إعادة الفهرسة بنجاح',
    schema: {
      example: {
        count: 42
      }
    }
  })
  @ApiResponse({ 
    status: HttpStatus.UNAUTHORIZED, 
    description: 'غير مصرح' 
  })
  reindex() {
    return this.svc.reindexAll();
  }
}

/**
 * واجهة برمجة التطبيقات العامة للأسئلة الشائعة
 * يمكن الوصول إلى هذه النقاط النهائية بدون مصادقة
 */
@ApiTags('الأسئلة الشائعة - عام')
@Controller('kleem/faq')
export class BotFaqPublicController {
  constructor(private readonly svc: BotFaqService) {}

  @Throttle({ public: { limit: 30, ttl: seconds(60) } }) // 30 طلب/دقيقة
  @Get('semantic-search')
  @Public()
  @ApiOperation({
    summary: 'بحث دلالي في الأسئلة الشائعة',
    description: 'البحث عن الأسئلة الشائعة باستخدام البحث الدلالي (متوافق مع اللغة العربية)'
  })
  @ApiQuery({
    name: 'q',
    required: true,
    description: 'نص البحث',
    example: 'كيفية إعادة تعيين كلمة المرور'
  })
  @ApiQuery({
    name: 'topK',
    required: false,
    description: 'عدد النتائج المرجعة (الافتراضي: 5، الحد الأقصى: 20)',
    type: Number,
    example: 5
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'تم البحث بنجاح',
    schema: {
      example: [
        {
          question: 'كيف يمكنني إعادة تعيين كلمة المرور؟',
          answer: 'يمكنك إعادة تعيين كلمة المرور من خلال النقر على "نسيت كلمة المرور" في صفحة تسجيل الدخول.',
          score: 0.95
        }
      ]
    }
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'نص البحث فارغ أو غير صالح'
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'تم تجاوز الحد المسموح من الطلبات (30 طلب/دقيقة)'
  })
  async semanticSearch(
    @Query('q') q: string, 
    @Query('topK') topK?: string
  ) {
    if (!q?.trim()) return [];
    const limit = Math.min(Number(topK) || 5, 20); // الحد الأقصى 20 نتيجة
    return this.svc.semanticSearch(q, limit);
  }
}
