// src/modules/documents/documents.controller.ts
import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UploadedFile,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiConsumes,
  ApiBody,
  ApiNoContentResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { Response } from 'express';
import { ErrorResponse } from 'src/common/dto/error-response.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { Ok, Created } from 'src/common/swagger/swagger';

import { DocumentsService } from './documents.service';
import {
  MerchantParamDto,
  DocParamDto,
  PaginatedDocumentsDto,
} from './dto/common.dto';
import { UploadResponseDto } from './dto/upload.dto';
import { DocumentSchemaClass } from './schemas/document.schema';

// File size constants
const BYTES_PER_KB = 1024;
const BYTES_PER_MB = BYTES_PER_KB * BYTES_PER_KB;
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * BYTES_PER_MB;

@ApiTags('المستندات')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('merchants/:merchantId/documents')
@ApiParam({ name: 'merchantId', example: 'm_12345', type: 'string' })
export class DocumentsController {
  constructor(private readonly svc: DocumentsService) {}

  @Post()
  @ApiOperation({ operationId: 'documents_upload', summary: 'رفع مستند جديد' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'ملف المستند (PDF, DOC, DOCX, JPG, PNG) بحد أقصى 10MB',
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @Created(UploadResponseDto, 'تم رفع المستند بنجاح')
  @ApiBadRequestResponse({
    description: 'طلب غير صالح أو نوع الملف غير مدعوم',
    type: ErrorResponse,
  })
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Param() { merchantId }: MerchantParamDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_FILE_SIZE_BYTES }),
          new FileTypeValidator({
            fileType:
              /(pdf|msword|vnd\.openxmlformats-officedocument\.wordprocessingml\.document|jpeg|png)$/,
          }),
        ],
      }),
    )
    file: Express.Multer.File & { key?: string },
  ): Promise<{ success: true; data: DocumentSchemaClass }> {
    const doc = await this.svc.uploadFile(merchantId, file);
    return { success: true, data: doc };
  }

  @Get()
  @ApiOperation({
    operationId: 'documents_list',
    summary: 'قائمة مستندات التاجر',
  })
  @Ok(PaginatedDocumentsDto, 'قائمة المستندات')
  @ApiNotFoundResponse({ description: 'التاجر غير موجود', type: ErrorResponse })
  async list(
    @Param() { merchantId }: MerchantParamDto,
  ): Promise<{ success: true; data: PaginatedDocumentsDto }> {
    const result = await this.svc.list(merchantId);
    // تأكد أن الخدمة تُرجع { items, meta } وفق PaginatedDocumentsDto
    return { success: true, data: result as unknown as PaginatedDocumentsDto };
  }

  @Get(':docId')
  @ApiOperation({ operationId: 'documents_download', summary: 'تنزيل مستند' })
  @ApiParam({ name: 'docId', example: 'doc_66f1a2...' })
  @ApiResponse({
    status: 302,
    description: 'إعادة توجيه إلى رابط التنزيل الموقّت',
    headers: {
      Location: {
        description: 'رابط MinIO الموقّت',
        schema: { type: 'string' },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'المستند غير موجود',
    type: ErrorResponse,
  })
  async download(
    @Param() { merchantId }: MerchantParamDto,
    @Param() { docId }: DocParamDto,
    @Res() res: Response,
  ): Promise<void> {
    const url = await this.svc.getPresignedUrl(merchantId, docId);
    return res.redirect(url);
  }

  // بديل: إرسال الملف مباشرة (إن أردت بدل 302)
  // @ApiProduces('application/octet-stream')
  // @ApiOkResponse({ description: 'ملف' })

  @Delete(':docId')
  @ApiOperation({ operationId: 'documents_delete', summary: 'حذف مستند' })
  @ApiParam({ name: 'docId', example: 'doc_66f1a2...' })
  @ApiNoContentResponse({ description: 'تم الحذف' })
  @ApiNotFoundResponse({
    description: 'المستند غير موجود',
    type: ErrorResponse,
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param() { merchantId }: MerchantParamDto,
    @Param() { docId }: DocParamDto,
  ): Promise<void> {
    await this.svc.delete(merchantId, docId);
    return;
  }
}
