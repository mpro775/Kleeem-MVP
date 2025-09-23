// ============ External imports ============
import os from 'os';

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Query,
  Patch,
  BadRequestException,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  applyDecorators,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiParam,
  ApiBody,
  ApiConsumes,
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
  ApiCreatedResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import multer from 'multer';
// ============ Internal imports ============
import { ErrorResponse } from 'src/common/dto/error-response.dto';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TranslationService } from '../../common/services/translation.service';

import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { MoveCategoryDto } from './dto/move-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category, CategoryDocument } from './schemas/category.schema';

// ============ Type-only ============
import type { Request } from 'express';

// ============ Constants ============
const BYTES_PER_MB = 1048_576;
const TWO_MB = 2 * BYTES_PER_MB;
// ثوابت واضحة (لا أرقام سحرية)

const ALLOWED_MIME = /^(image\/png|image\/jpe?g|image\/webp)$/i;

// إعدادات Multer ككائنات ثابتة
const storage = multer.diskStorage({
  destination: os.tmpdir(),
  filename: (_req, file, cb) => {
    const ext = (file.originalname.split('.').pop() || 'img').toLowerCase();
    cb(null, `cat-${Date.now()}.${ext}`);
  },
});

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: (error: BadRequestException | null, acceptFile: boolean) => void,
): void => {
  const ok = ALLOWED_MIME.test(file.mimetype);
  cb(
    ok
      ? null
      : new BadRequestException({
          code: 'UNSUPPORTED_FILE_FORMAT',
          message: 'نوع الملف غير مدعوم. يرجى استخدام PNG, JPG, JPEG, أو WebP',
          details: ['Supported formats: PNG, JPG, JPEG, WebP'],
        }),
    ok,
  );
};

export const MULTER_IMAGE_OPTIONS: multer.Options = {
  storage,
  limits: { fileSize: TWO_MB },
  fileFilter,
};

function ApiUploadCategoryImageDocs() {
  return applyDecorators(
    ApiOperation({
      operationId: 'categories_uploadImage',
      summary: 'categories.operations.uploadImage.summary',
      description: 'categories.operations.uploadImage.description',
    }),
    ApiParam({
      name: 'id',
      description: 'معرف الفئة',
      example: '66f1a2b3c4d5e6f7g8h9i0j',
    }),
    ApiQuery({
      name: 'merchantId',
      required: true,
      example: 'm_12345',
      description: 'معرف التاجر',
    }),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          file: {
            type: 'string',
            format: 'binary',
            description: 'PNG, JPG, JPEG, WebP — حد أقصى 2MB',
          },
        },
        required: ['file'],
      },
    }),
    ApiOkResponse({
      description: 'تم رفع الصورة بنجاح',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' },
          url: { type: 'string' },
          categoryId: { type: 'string' },
        },
      },
    }),
    ApiBadRequestResponse({
      description: 'ملف مفقود/صيغة غير مدعومة/حجم كبير',
      type: ErrorResponse,
    }),
    ApiNotFoundResponse({
      description: 'الفئة غير موجودة',
      type: ErrorResponse,
    }),
    ApiForbiddenResponse({
      description: 'ليس لديك صلاحية',
      type: ErrorResponse,
    }),
  );
}
// ============ Controller ============
@ApiTags('categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('categories')
export class CategoriesController {
  constructor(
    private readonly categories: CategoriesService,
    private readonly translationService: TranslationService,
  ) {}

  // ------ Create ------
  @Post()
  @ApiOperation({
    operationId: 'categories_create',
    summary: 'categories.operations.create.summary',
    description: 'categories.operations.create.description',
  })
  @ApiBody({ type: CreateCategoryDto })
  @ApiCreatedResponse({
    description: 'categories.responses.success.created',
    type: Category,
  })
  @ApiBadRequestResponse({
    description: 'بيانات غير صحيحة أو فئة موجودة مسبقاً',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description: 'ليس لديك صلاحية لإنشاء فئات لهذا التاجر',
    type: ErrorResponse,
  })
  create(@Body() dto: CreateCategoryDto): Promise<CategoryDocument> {
    return this.categories.create(dto);
  }

  // ------ Find All ------
  @Get()
  @ApiOperation({
    operationId: 'categories_findAll',
    summary: 'categories.operations.findAll.summary',
    description: 'categories.operations.findAll.description',
  })
  @ApiQuery({
    name: 'merchantId',
    required: true,
    example: 'm_12345',
    description: 'معرف التاجر',
  })
  @ApiQuery({
    name: 'tree',
    required: false,
    type: 'boolean',
    example: false,
    description: 'إرجاع الشجرة',
  })
  @ApiOkResponse({
    description: 'categories.responses.success.found',
    type: [Category],
  })
  @ApiBadRequestResponse({
    description: 'معرف التاجر مطلوب',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description: 'ليس لديك صلاحية للوصول إلى فئات هذا التاجر',
    type: ErrorResponse,
  })
  findAll(
    @Query('merchantId') merchantId: string,
    @Query('tree') tree?: string,
  ): Promise<CategoryDocument[] | Category[]> {
    if (!merchantId) {
      throw new BadRequestException({
        code: 'MISSING_MERCHANT_ID',
        message: 'معرف التاجر مطلوب',
        details: ['merchantId query parameter is required'],
      });
    }

    return tree === 'true'
      ? (this.categories.findAllTree(merchantId) as unknown as Promise<
          Category[]
        >)
      : this.categories.findAllFlat(merchantId);
  }

  // ------ Find One ------
  @Get(':id')
  @ApiOperation({
    operationId: 'categories_findOne',
    summary: 'categories.operations.findOne.summary',
    description: 'categories.operations.findOne.description',
  })
  @ApiParam({
    name: 'id',
    description: 'معرف الفئة',
    example: '66f1a2b3c4d5e6f7g8h9i0j',
  })
  @ApiQuery({
    name: 'merchantId',
    required: true,
    example: 'm_12345',
    description: 'معرف التاجر',
  })
  @ApiOkResponse({
    description: 'categories.responses.success.found',
    type: Category,
  })
  @ApiNotFoundResponse({
    description: 'categories.responses.error.notFound',
    type: ErrorResponse,
  })
  @ApiBadRequestResponse({
    description: 'معرف التاجر مطلوب',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description: 'ليس لديك صلاحية للوصول إلى هذه الفئة',
    type: ErrorResponse,
  })
  findOne(
    @Param('id') id: string,
    @Query('merchantId') merchantId: string,
  ): Promise<CategoryDocument> {
    if (!merchantId) {
      throw new BadRequestException({
        code: 'MISSING_MERCHANT_ID',
        message: 'معرف التاجر مطلوب',
        details: ['merchantId query parameter is required'],
      });
    }
    return this.categories.findOne(id, merchantId);
  }

  // ------ Breadcrumbs ------
  @Get(':id/breadcrumbs')
  @ApiOperation({
    operationId: 'categories_breadcrumbs',
    summary: 'categories.operations.breadcrumbs.summary',
    description: 'categories.operations.breadcrumbs.description',
  })
  @ApiParam({
    name: 'id',
    description: 'معرف الفئة',
    example: '66f1a2b3c4d5e6f7g8h9i0j',
  })
  @ApiQuery({
    name: 'merchantId',
    required: true,
    example: 'm_12345',
    description: 'معرف التاجر',
  })
  @ApiOkResponse({
    description: 'categories.responses.success.found',
    type: [Category],
  })
  @ApiNotFoundResponse({ description: 'الفئة غير موجودة', type: ErrorResponse })
  @ApiBadRequestResponse({
    description: 'معرف التاجر مطلوب',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description: 'ليس لديك صلاحية للوصول إلى هذه الفئة',
    type: ErrorResponse,
  })
  breadcrumbs(
    @Param('id') id: string,
    @Query('merchantId') merchantId: string,
  ): Promise<Category[]> {
    if (!merchantId) {
      throw new BadRequestException({
        code: 'MISSING_MERCHANT_ID',
        message: 'معرف التاجر مطلوب',
        details: ['merchantId query parameter is required'],
      });
    }
    return this.categories.breadcrumbs(id, merchantId) as unknown as Promise<
      Category[]
    >;
  }

  // ------ Subtree ------
  @Get(':id/subtree')
  @ApiOperation({
    operationId: 'categories_subtree',
    summary: 'categories.operations.subtree.summary',
    description: 'categories.operations.subtree.description',
  })
  @ApiParam({
    name: 'id',
    description: 'معرف الفئة الأساسية',
    example: '66f1a2b3c4d5e6f7g8h9i0j',
  })
  @ApiQuery({
    name: 'merchantId',
    required: true,
    example: 'm_12345',
    description: 'معرف التاجر',
  })
  @ApiOkResponse({
    description: 'categories.responses.success.found',
    type: Category,
  })
  @ApiNotFoundResponse({ description: 'الفئة غير موجودة', type: ErrorResponse })
  @ApiBadRequestResponse({
    description: 'معرف التاجر مطلوب',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description: 'ليس لديك صلاحية للوصول إلى هذه الفئة',
    type: ErrorResponse,
  })
  subtree(
    @Param('id') id: string,
    @Query('merchantId') merchantId: string,
  ): Promise<CategoryDocument> {
    if (!merchantId) {
      throw new BadRequestException({
        code: 'MISSING_MERCHANT_ID',
        message: 'معرف التاجر مطلوب',
        details: ['merchantId query parameter is required'],
      });
    }
    return this.categories.subtree(
      id,
      merchantId,
    ) as unknown as Promise<CategoryDocument>;
  }

  // ------ Move ------
  @Patch(':id/move')
  @ApiOperation({
    operationId: 'categories_move',
    summary: 'categories.operations.move.summary',
    description: 'categories.operations.move.description',
  })
  @ApiParam({
    name: 'id',
    description: 'معرف الفئة المراد نقلها',
    example: '66f1a2b3c4d5e6f7g8h9i0j',
  })
  @ApiQuery({
    name: 'merchantId',
    required: true,
    example: 'm_12345',
    description: 'معرف التاجر',
  })
  @ApiBody({ type: MoveCategoryDto })
  @ApiOkResponse({
    description: 'categories.responses.success.updated',
    type: Category,
  })
  @ApiNotFoundResponse({
    description: 'الفئة أو الفئة الأصل الجديدة غير موجودة',
    type: ErrorResponse,
  })
  @ApiBadRequestResponse({
    description: 'معرف التاجر مطلوب أو بيانات النقل غير صحيحة',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description: 'ليس لديك صلاحية لنقل هذه الفئة',
    type: ErrorResponse,
  })
  move(
    @Param('id') id: string,
    @Query('merchantId') merchantId: string,
    @Body() dto: MoveCategoryDto,
  ): Promise<CategoryDocument> {
    if (!merchantId) {
      throw new BadRequestException({
        code: 'MISSING_MERCHANT_ID',
        message: 'معرف التاجر مطلوب',
        details: ['merchantId query parameter is required'],
      });
    }
    return this.categories.move(id, merchantId, dto);
  }

  // ------ Remove ------
  @Delete(':id')
  @ApiOperation({
    operationId: 'categories_remove',
    summary: 'categories.operations.remove.summary',
    description: 'categories.operations.remove.description',
  })
  @ApiParam({
    name: 'id',
    description: 'معرف الفئة المراد حذفها',
    example: '66f1a2b3c4d5e6f7g8h9i0j',
  })
  @ApiQuery({
    name: 'merchantId',
    required: true,
    example: 'm_12345',
    description: 'معرف التاجر',
  })
  @ApiQuery({
    name: 'cascade',
    required: false,
    type: 'boolean',
    example: false,
    description: 'حذف الشجرة كاملة إذا true',
  })
  @ApiOkResponse({
    description: 'categories.responses.success.deleted',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'categories.responses.error.notFound',
    type: ErrorResponse,
  })
  @ApiBadRequestResponse({
    description: 'معرف التاجر مطلوب أو يمنع الحذف دون cascade',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description: 'ليس لديك صلاحية لحذف هذه الفئة',
    type: ErrorResponse,
  })
  remove(
    @Param('id') id: string,
    @Query('merchantId') merchantId: string,
    @Query('cascade') cascade?: string,
  ): Promise<{ message: string }> {
    if (!merchantId) {
      throw new BadRequestException({
        code: 'MISSING_MERCHANT_ID',
        message: 'معرف التاجر مطلوب',
        details: ['merchantId query parameter is required'],
      });
    }
    return this.categories.remove(id, merchantId, cascade === 'true');
  }

  // ------ Upload Image ------
  @Post(':id/image')
  @ApiUploadCategoryImageDocs()
  @UseInterceptors(FileInterceptor('file', MULTER_IMAGE_OPTIONS))
  async uploadImage(
    @Param('id') id: string,
    @Query('merchantId') merchantId: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{
    success: true;
    message: string;
    url: string;
    categoryId: string;
  }> {
    // جسم الدالة الآن سطر واحد فقط (يستدعي منطقًا مفصولًا مسبقًا)
    return this.processImageUpload(id, merchantId, file);
  }

  private async processImageUpload(
    id: string,
    merchantId: string,
    file: Express.Multer.File,
  ): Promise<{
    success: true;
    message: string;
    url: string;
    categoryId: string;
  }> {
    this.validateUploadImageRequest(merchantId, file);

    const url = await this.categories.uploadCategoryImageToMinio(
      id,
      merchantId,
      file,
    );
    return this.createUploadImageResponse(url, id);
  }

  private createUploadImageResponse(
    url: string,
    categoryId: string,
  ): {
    success: true;
    message: string;
    url: string;
    categoryId: string;
  } {
    return {
      success: true,
      message: 'تم رفع صورة الفئة بنجاح',
      url,
      categoryId,
    };
  }

  private validateUploadImageRequest(
    merchantId: string,
    file: Express.Multer.File,
  ): void {
    if (!merchantId) {
      throw new BadRequestException({
        code: 'MISSING_MERCHANT_ID',
        message: 'معرف التاجر مطلوب',
        details: ['merchantId query parameter is required'],
      });
    }
    if (!file) {
      throw new BadRequestException({
        code: 'NO_FILE_UPLOADED',
        message: 'لم يتم إرفاق ملف',
        details: ['File is required in the request'],
      });
    }
  }

  // ------ Update ------
  @Put(':id')
  @ApiOperation({
    operationId: 'categories_update',
    summary: 'categories.operations.update.summary',
    description: 'categories.operations.update.description',
  })
  @ApiParam({
    name: 'id',
    description: 'معرف الفئة المراد تحديثها',
    example: '66f1a2b3c4d5e6f7g8h9i0j',
  })
  @ApiQuery({
    name: 'merchantId',
    required: true,
    example: 'm_12345',
    description: 'معرف التاجر',
  })
  @ApiBody({ type: UpdateCategoryDto })
  @ApiOkResponse({
    description: 'categories.responses.success.updated',
    type: Category,
  })
  @ApiNotFoundResponse({
    description: 'categories.responses.error.notFound',
    type: ErrorResponse,
  })
  @ApiBadRequestResponse({
    description: 'معرف التاجر مطلوب أو بيانات التحديث غير صحيحة',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description: 'ليس لديك صلاحية لتحديث هذه الفئة',
    type: ErrorResponse,
  })
  async update(
    @Param('id') id: string,
    @Query('merchantId') merchantId: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<CategoryDocument> {
    if (!merchantId) {
      throw new BadRequestException({
        code: 'MISSING_MERCHANT_ID',
        message: 'معرف التاجر مطلوب',
        details: ['merchantId query parameter is required'],
      });
    }
    return this.categories.update(id, merchantId, dto);
  }
}
