// src/modules/documents/documents.controller.ts
import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UploadedFile,
  UseInterceptors,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiConsumes,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { DocumentsService } from './documents.service';

@ApiTags('المستندات')
@Controller('merchants/:merchantId/documents')
@ApiParam({ name: 'merchantId', description: 'معرف التاجر', example: 'm_12345' })
export class DocumentsController {
  constructor(private readonly svc: DocumentsService) {}

    @Post()
  @ApiOperation({ summary: 'رفع مستند جديد' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'ملف المستند المراد رفعه',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'تم رفع المستند بنجاح.' })
  @ApiResponse({ status: 400, description: 'طلب غير صالح أو ملف مفقود.' })
  @UseInterceptors(FileInterceptor('file')) // يجب أن يكون نفس الاسم
  upload(
    @Param('merchantId') merchantId: string,
    @UploadedFile() file: Express.Multer.File & { key: string },
  ) {
    console.log('[Upload Endpoint] File:', file);
    return this.svc.uploadFile(merchantId, file);
  }

    @Get()
  @ApiOperation({ summary: 'الحصول على قائمة بجميع مستندات التاجر' })
  @ApiResponse({ status: 200, description: 'قائمة المستندات.' })
  list(@Param('merchantId') merchantId: string) {
    return this.svc.list(merchantId);
  }

    @Get(':docId')
  @ApiOperation({ summary: 'تنزيل مستند' })
  @ApiParam({ name: 'docId', description: 'معرف المستند', example: 'doc_12345' })
  @ApiResponse({ status: 302, description: 'إعادة توجيه إلى رابط التنزيل.' })
  @ApiResponse({ status: 404, description: 'المستند غير موجود.' })
  async download(
    @Param('merchantId') merchantId: string,
    @Param('docId') docId: string,
    @Res() res: Response,
  ) {
    // يعيد رابط موقع MinIO مباشرة
    const url = await this.svc.getPresignedUrl(merchantId, docId);
    return res.redirect(url);
  }

    @Delete(':docId')
  @ApiOperation({ summary: 'حذف مستند' })
  @ApiParam({ name: 'docId', description: 'معرف المستند', example: 'doc_12345' })
  @ApiResponse({ status: 204, description: 'تم حذف المستند بنجاح.' })
  @ApiResponse({ status: 404, description: 'المستند غير موجود.' })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('merchantId') merchantId: string,
    @Param('docId') docId: string,
  ) {
    return this.svc.delete(merchantId, docId);
  }
}
