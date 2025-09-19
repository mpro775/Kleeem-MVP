// categories.controller.ts
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
  NotFoundException,
  ForbiddenException,
  UploadedFile,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { MoveCategoryDto } from './dto/move-category.dto';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiParam,
  ApiBody,
  ApiResponse,
  ApiConsumes,
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
  ApiCreatedResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiSuccessResponse,
  ApiCreatedResponse as CommonApiCreatedResponse,
  CurrentUser,
} from '../../common';
import { TranslationService } from '../../common/services/translation.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ErrorResponse } from 'src/common/dto/error-response.dto';
import multer from 'multer';
import os from 'os';

@ApiTags('categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('categories')
export class CategoriesController {
  constructor(
    private readonly categories: CategoriesService,
    private readonly translationService: TranslationService,
  ) {}

  @Post()
  @ApiOperation({
    operationId: 'categories_create',
    summary: 'categories.operations.create.summary',
    description: 'categories.operations.create.description',
  })
  @ApiBody({ type: CreateCategoryDto })
  @ApiCreatedResponse({
    description: 'categories.responses.success.created',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'تم إنشاء الفئة بنجاح' },
        category: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '66f1a2b3c4d5e6f7g8h9i0j' },
            name: { type: 'string', example: 'إلكترونيات' },
            merchantId: { type: 'string', example: 'm_12345' },
            parentId: { type: 'string', nullable: true, example: null },
            createdAt: { type: 'string', example: '2023-09-18T10:30:00Z' },
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'بيانات غير صحيحة أو فئة موجودة مسبقاً',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description: 'ليس لديك صلاحية لإنشاء فئات لهذا التاجر',
    type: ErrorResponse,
  })
  create(@Body() dto: CreateCategoryDto) {
    return this.categories.create(dto);
  }

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
    description: 'إرجاع الفئات بهيكل شجري أو مسطح',
  })
  @ApiOkResponse({
    description: 'categories.responses.success.found',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '66f1a2b3c4d5e6f7g8h9i0j' },
          name: { type: 'string', example: 'إلكترونيات' },
          merchantId: { type: 'string', example: 'm_12345' },
          parentId: { type: 'string', nullable: true, example: null },
          children: {
            type: 'array',
            items: { type: 'object' },
            description: 'الفئات الفرعية (في حالة tree=true)',
          },
          createdAt: { type: 'string', example: '2023-09-18T10:30:00Z' },
          updatedAt: { type: 'string', example: '2023-09-18T10:30:00Z' },
        },
      },
    },
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
  ) {
    if (!merchantId) {
      throw new BadRequestException({
        code: 'MISSING_MERCHANT_ID',
        message: 'معرف التاجر مطلوب',
        details: ['merchantId query parameter is required'],
      });
    }

    return tree === 'true'
      ? this.categories.findAllTree(merchantId)
      : this.categories.findAllFlat(merchantId);
  }

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
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: '66f1a2b3c4d5e6f7g8h9i0j' },
        name: { type: 'string', example: 'إلكترونيات' },
        merchantId: { type: 'string', example: 'm_12345' },
        parentId: { type: 'string', nullable: true, example: null },
        imageUrl: {
          type: 'string',
          nullable: true,
          example: 'https://cdn.example.com/categories/electronics.jpg',
        },
        createdAt: { type: 'string', example: '2023-09-18T10:30:00Z' },
        updatedAt: { type: 'string', example: '2023-09-18T10:30:00Z' },
      },
    },
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
  findOne(@Param('id') id: string, @Query('merchantId') merchantId: string) {
    if (!merchantId) {
      throw new BadRequestException({
        code: 'MISSING_MERCHANT_ID',
        message: 'معرف التاجر مطلوب',
        details: ['merchantId query parameter is required'],
      });
    }

    return this.categories.findOne(id, merchantId);
  }

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
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '66f1a2b3c4d5e6f7g8h9i0j' },
          name: { type: 'string', example: 'إلكترونيات' },
          level: { type: 'number', example: 1 },
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'الفئة غير موجودة',
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
  breadcrumbs(
    @Param('id') id: string,
    @Query('merchantId') merchantId: string,
  ): Promise<any> {
    if (!merchantId) {
      throw new BadRequestException({
        code: 'MISSING_MERCHANT_ID',
        message: 'معرف التاجر مطلوب',
        details: ['merchantId query parameter is required'],
      });
    }

    return this.categories.breadcrumbs(id, merchantId);
  }

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
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: '66f1a2b3c4d5e6f7g8h9i0j' },
        name: { type: 'string', example: 'إلكترونيات' },
        children: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: '66f2b3c4d5e6f7g8h9i0j1' },
              name: { type: 'string', example: 'هواتف ذكية' },
              children: {
                type: 'array',
                items: { type: 'object' },
                description: 'الفئات الفرعية المتداخلة',
              },
            },
          },
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'الفئة غير موجودة',
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
  subtree(@Param('id') id: string, @Query('merchantId') merchantId: string) {
    if (!merchantId) {
      throw new BadRequestException({
        code: 'MISSING_MERCHANT_ID',
        message: 'معرف التاجر مطلوب',
        details: ['merchantId query parameter is required'],
      });
    }

    return this.categories.subtree(id, merchantId);
  }

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
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'تم نقل الفئة بنجاح' },
        category: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '66f1a2b3c4d5e6f7g8h9i0j' },
            name: { type: 'string', example: 'إلكترونيات' },
            parentId: {
              type: 'string',
              nullable: true,
              example: '66f2b3c4d5e6f7g8h9i0j1',
            },
            updatedAt: { type: 'string', example: '2023-09-18T10:30:00Z' },
          },
        },
      },
    },
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
  ) {
    if (!merchantId) {
      throw new BadRequestException({
        code: 'MISSING_MERCHANT_ID',
        message: 'معرف التاجر مطلوب',
        details: ['merchantId query parameter is required'],
      });
    }

    return this.categories.move(id, merchantId, dto);
  }

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
    description:
      'حذف جميع الفئات الفرعية (true) أو منع الحذف إذا كانت هناك فئات فرعية (false)',
  })
  @ApiOkResponse({
    description: 'categories.responses.success.deleted',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'تم حذف الفئة بنجاح' },
        deletedCount: { type: 'number', example: 1 },
        cascade: { type: 'boolean', example: false },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'categories.responses.error.notFound',
    type: ErrorResponse,
  })
  @ApiBadRequestResponse({
    description: 'معرف التاجر مطلوب أو يوجد فئات فرعية ولم يتم تحديد cascade',
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
  ) {
    if (!merchantId) {
      throw new BadRequestException({
        code: 'MISSING_MERCHANT_ID',
        message: 'معرف التاجر مطلوب',
        details: ['merchantId query parameter is required'],
      });
    }

    return this.categories.remove(id, merchantId, cascade === 'true');
  }

  @Post(':id/image')
  @ApiOperation({
    operationId: 'categories_uploadImage',
    summary: 'categories.operations.uploadImage.summary',
    description: 'categories.operations.uploadImage.description',
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
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'ملف الصورة (PNG, JPG, JPEG, WebP) - حد أقصى 2MB',
        },
      },
      required: ['file'],
    },
  })
  @ApiOkResponse({
    description: 'تم رفع الصورة بنجاح',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'تم رفع صورة الفئة بنجاح' },
        url: {
          type: 'string',
          example: 'https://cdn.example.com/categories/cat-1695033000000.jpg',
        },
        categoryId: { type: 'string', example: '66f1a2b3c4d5e6f7g8h9i0j' },
      },
    },
  })
  @ApiBadRequestResponse({
    description:
      'لم يتم إرفاق ملف أو نوع الملف غير مدعوم أو حجم الملف كبير جداً',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'الفئة غير موجودة',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description: 'ليس لديك صلاحية لرفع صورة لهذه الفئة',
    type: ErrorResponse,
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multer.diskStorage({
        destination: os.tmpdir(), // تخزين مؤقت على القرص
        filename: (_req, file, cb) => {
          const ext = (
            file.originalname.split('.').pop() || 'img'
          ).toLowerCase();
          cb(null, `cat-${Date.now()}.${ext}`);
        },
      }),
      limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
      fileFilter: (_req, file, cb) => {
        const ok = /^(image\/png|image\/jpe?g|image\/webp)$/i.test(
          file.mimetype,
        );
        cb(
          ok
            ? null
            : new BadRequestException({
                code: 'UNSUPPORTED_FILE_FORMAT',
                message:
                  'نوع الملف غير مدعوم. يرجى استخدام PNG, JPG, JPEG, أو WebP',
                details: ['Supported formats: PNG, JPG, JPEG, WebP'],
              }),
          ok,
        );
      },
    }),
  )
  async uploadImage(
    @Param('id') id: string,
    @Query('merchantId') merchantId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
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

    const url = await this.categories.uploadCategoryImageToMinio(
      id,
      merchantId,
      file,
    );

    return {
      success: true,
      message: 'تم رفع صورة الفئة بنجاح',
      url,
      categoryId: id,
    };
  }

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
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'تم تحديث الفئة بنجاح' },
        category: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '66f1a2b3c4d5e6f7g8h9i0j' },
            name: { type: 'string', example: 'إلكترونيات محدثة' },
            merchantId: { type: 'string', example: 'm_12345' },
            parentId: { type: 'string', nullable: true, example: null },
            imageUrl: {
              type: 'string',
              nullable: true,
              example: 'https://cdn.example.com/categories/electronics.jpg',
            },
            updatedAt: { type: 'string', example: '2023-09-18T10:30:00Z' },
          },
        },
      },
    },
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
  ) {
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
