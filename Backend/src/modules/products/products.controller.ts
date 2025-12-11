// src/modules/products/products.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Request,
  Query,
  UseGuards,
  UseInterceptors,
  ClassSerializerInterceptor,
  HttpStatus,
  HttpCode,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
  UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiOkResponse,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { Types } from 'mongoose';

import {
  ApiCreatedResponse as CommonApiCreatedResponse,
  CurrentUser, // ✅ موجود عندك
  CurrentMerchantId,
  PaginationResult, // ✅ موجود عندك
} from '../../common';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TranslationService } from '../../common/services/translation.service';

import { CreateProductDto } from './dto/create-product.dto';
import { GetProductsDto } from './dto/get-products.dto';
import { ProductResponseDto } from './dto/product-response.dto';
import { ProductSetupConfigDto } from './dto/product-setup-config.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductSetupConfigService } from './product-setup-config.service';
import { ProductsService } from './products.service';
import { ProductCsvService } from './services/product-csv.service';

const MAX_IMAGES = 6;

@ApiTags('المنتجات')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseInterceptors(ClassSerializerInterceptor)
@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly productSetupConfigService: ProductSetupConfigService,
    private readonly translationService: TranslationService,
    private readonly csvService: ProductCsvService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'products.operations.create.summary',

    description: 'products.operations.create.description',
  })
  @ApiBody({ type: CreateProductDto, description: 'بيانات إنشاء المنتج' })
  @CommonApiCreatedResponse(
    ProductResponseDto,
    'تم إنشاء المنتج ووضعه في قائمة الانتظار للمعالجة',
  )
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateProductDto,
    @CurrentMerchantId() jwtMerchantId: string | null, // ✅ بديل عن req.user
  ): Promise<ProductResponseDto> {
    if (!jwtMerchantId) {
      throw new ForbiddenException(
        this.translationService.translate('auth.errors.merchantRequired'),
      );
    }

    const input = this.buildCreateProductInput(dto, jwtMerchantId);
    const product = await this.productsService.create(
      input as unknown as CreateProductDto & { merchantId: string },
    );

    return plainToInstance(ProductResponseDto, product, {
      excludeExtraneousValues: true,
    });
  }

  private buildCreateProductInput(dto: CreateProductDto, merchantId: string) {
    const input = {
      merchantId,
      name: dto.name || '',
      prices: dto.prices,
      isAvailable: dto.isAvailable ?? true,
      keywords: dto.keywords || [],
      images: dto.images || [],
      category: dto.category || '',
      specsBlock: dto.specsBlock || [],
    };

    return this.addOptionalProductFields(input, dto);
  }

  private addOptionalProductFields(
    input: Record<string, unknown>,
    dto: CreateProductDto,
  ) {
    const optionalMappings = {
      source: dto.source,
      sourceUrl: dto.sourceUrl,
      externalId: dto.externalId,
      platform: dto.platform,
      currency: dto.currency,
      offer: dto.offer,
      attributes: dto.attributes,
    };

    Object.entries(optionalMappings).forEach(([key, value]) => {
      if (value !== undefined) {
        input[key] = value;
      }
    });

    return input;
  }

  @Get()
  @ApiOperation({
    summary: 'products.operations.list.summary',

    description: 'products.operations.list.description',
  })
  @ApiOkResponse({
    description: 'قائمة المنتجات مع معلومات الـ pagination',
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: { $ref: '#/components/schemas/ProductResponseDto' },
        },
        meta: {
          type: 'object',
          properties: {
            nextCursor: { type: 'string', nullable: true },
            hasMore: { type: 'boolean' },
            count: { type: 'number' },
          },
        },
      },
    },
  })
  async getProducts(
    @Query() dto: GetProductsDto,
    @CurrentMerchantId() merchantId: string,
  ): Promise<PaginationResult<ProductResponseDto>> {
    if (!merchantId) {
      throw new ForbiddenException(
        this.translationService.translate('auth.errors.merchantRequired'),
      );
    }

    const result = await this.productsService.listByMerchant(merchantId, dto);

    return {
      items: plainToInstance(ProductResponseDto, result.items, {
        excludeExtraneousValues: true,
      }),
      meta: {
        hasMore: result.meta.hasMore,
        count: result.meta.count,
      },
    };
  }

  // مسار عام مبني على المتجر (storeSlug)
  @Public()
  @Get('public/:storeSlug')
  @ApiOperation({ summary: 'Public list by store slug' })
  async getPublicProducts(
    @Param('storeSlug') storeSlug: string,
    @Query() dto: GetProductsDto,
  ): Promise<PaginationResult<ProductResponseDto>> {
    const result = await this.productsService.getPublicProducts(storeSlug, dto);
    return {
      items: plainToInstance(ProductResponseDto, result.items, {
        excludeExtraneousValues: true,
      }),
      meta: {
        ...(result.meta.nextCursor && { nextCursor: result.meta.nextCursor }),
        hasMore: result.meta.hasMore,
        count: result.meta.count,
      },
    };
  }

  @Public()
  @Get('legacy')
  @ApiOperation({ summary: 'جلب جميع المنتجات للتاجر (طريقة قديمة)' })
  @ApiOkResponse({ type: ProductResponseDto, isArray: true })
  async findAll(
    @Query('merchantId') merchantId: string,
  ): Promise<ProductResponseDto[]> {
    if (!merchantId)
      throw new BadRequestException(
        this.translationService.translate('validation.required'),
      );
    const merchantObjectId = new Types.ObjectId(merchantId);
    const docs = await this.productsService.findAllByMerchant(merchantObjectId);
    return plainToInstance(ProductResponseDto, docs, {
      excludeExtraneousValues: true,
    });
  }

  @Get('search')
  @ApiOperation({
    summary: 'products.operations.search.summary',

    description: 'products.operations.search.description',
  })
  @ApiOkResponse({
    description: 'نتائج البحث مع معلومات الـ pagination',
  })
  async searchProducts(
    @Query('q') query: string,
    @Query() dto: GetProductsDto,
    @CurrentMerchantId() merchantId: string,
  ): Promise<PaginationResult<ProductResponseDto>> {
    if (!merchantId) {
      throw new ForbiddenException(
        this.translationService.translate('auth.errors.merchantRequired'),
      );
    }

    if (!query) {
      throw new BadRequestException(
        this.translationService.translate('validation.required'),
      );
    }

    const result = await this.productsService.searchProducts(
      merchantId,
      query,
      dto,
    );

    return {
      items: plainToInstance(ProductResponseDto, result.items, {
        excludeExtraneousValues: true,
      }),
      meta: {
        ...(result.meta.nextCursor && { nextCursor: result.meta.nextCursor }),
        hasMore: result.meta.hasMore,
        count: result.meta.count,
      },
    };
  }

  @Post(':id/images')
  @UseInterceptors(FilesInterceptor('files', MAX_IMAGES))
  async uploadProductImages(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentMerchantId() jwtMerchantId: string | null, // ✅
  ): Promise<{
    urls: string[];
    count: number;
    accepted: number;
    remaining: number;
  }> {
    if (!jwtMerchantId) {
      throw new ForbiddenException('لا يوجد تاجر مرتبط بالحساب');
    }
    const result = await this.productsService.uploadProductImagesToMinio(
      id,
      jwtMerchantId, // ✅
      files,
    );
    return {
      urls: result.urls,
      count: result.count,
      accepted: result.accepted,
      remaining: result.remaining,
    };
  }

  @Public()
  @Get(':id')
  @ApiParam({ name: 'id', type: 'string', description: 'معرّف المنتج' })
  @ApiOperation({
    summary: 'products.operations.get.summary',

    description: 'products.operations.get.description',
  })
  async findOne(
    @Param('id') id: string,
    @Request() req: Request & { user: { role: string; merchantId: string } }, // تبقى عامة؛ قد لا يوجد user
  ): Promise<ProductResponseDto> {
    const product = await this.productsService.findOne(id);

    // إذ كان هناك مستخدم (الهيدر موجود) تحقّق الملكية
    if (req?.user) {
      if (
        req.user.role !== 'ADMIN' &&
        String(product.merchantId) !== String(req.user.merchantId)
      ) {
        throw new ForbiddenException(
          this.translationService.translate('auth.errors.accessDenied'),
        );
      }
    }

    return plainToInstance(ProductResponseDto, product, {
      excludeExtraneousValues: true,
    });
  }

  @Put(':id')
  @ApiParam({ name: 'id', type: 'string', description: 'معرّف المنتج' })
  @ApiOperation({
    summary: 'products.operations.update.summary',

    description: 'products.operations.update.description',
  })
  @ApiBody({ type: UpdateProductDto, description: 'الحقول المراد تحديثها' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @CurrentMerchantId() jwtMerchantId: string | null, // ✅
    @CurrentUser() user: { role: string; merchantId: string }, // ✅ للوصول إلى role
  ): Promise<ProductResponseDto> {
    const product = await this.productsService.findOne(id);
    if (
      user.role !== 'ADMIN' &&
      String(product.merchantId) !== String(jwtMerchantId)
    ) {
      throw new ForbiddenException(
        this.translationService.translate('auth.errors.accessDenied'),
      );
    }
    const updated = await this.productsService.update(id, dto);
    return plainToInstance(ProductResponseDto, updated, {
      excludeExtraneousValues: true,
    });
  }

  @Post(':merchantId/setup-products')
  @ApiOperation({
    summary: 'products.operations.setup.summary',

    description: 'products.operations.setup.description',
  })
  async setupProducts(
    @Param('merchantId') merchantId: string,
    @Body() config: ProductSetupConfigDto,
    @CurrentMerchantId() jwtMerchantId: string | null, // ✅
  ): Promise<{
    success: boolean;
    message: string;
    data: ProductSetupConfigDto;
  }> {
    if (!jwtMerchantId || merchantId !== String(jwtMerchantId)) {
      throw new ForbiddenException(
        this.translationService.translate('auth.errors.accessDenied'),
      );
    }
    if (!Types.ObjectId.isValid(merchantId)) {
      throw new BadRequestException(
        this.translationService.translate('validation.mongoId'),
      );
    }
    try {
      const result = await this.productSetupConfigService.saveOrUpdate(
        merchantId,
        config,
      );
      return {
        success: true,
        message: this.translationService.translate(
          'products.messages.configSaved',
        ),
        data: result as ProductSetupConfigDto,
      };
    } catch (error: unknown) {
      throw new InternalServerErrorException({
        success: false,
        message: this.translationService.translateError(
          'system.configurationError',
        ),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  @Get(':merchantId/setup-products')
  async getSetupProducts(
    @Param('merchantId') merchantId: string,
    @CurrentMerchantId() jwtMerchantId: string | null, // ✅
  ): Promise<ProductSetupConfigDto | null> {
    if (!jwtMerchantId || merchantId !== String(jwtMerchantId)) {
      throw new ForbiddenException(
        this.translationService.translate('auth.errors.accessDenied'),
      );
    }
    const config =
      await this.productSetupConfigService.getByMerchantId(merchantId);
    return config as ProductSetupConfigDto | null;
  }

  @Post(':id/availability')
  async updateAvailability(
    @Param('id') id: string,
    @Body('isAvailable') isAvailable: boolean,
  ): Promise<void> {
    // إن أردت تقييدها بمالك المنتج أضف فحصًا مشابهًا لـ update/remove
    await this.productsService.setAvailability(id, isAvailable);
  }

  @Delete(':id')
  @ApiParam({ name: 'id', type: 'string', description: 'معرّف المنتج' })
  @ApiOperation({
    summary: 'products.operations.delete.summary',

    description: 'products.operations.delete.description',
  })
  async remove(
    @Param('id') id: string,
    @CurrentMerchantId() jwtMerchantId: string | null, // ✅
    @CurrentUser() user: { role: string; merchantId: string }, // ✅ للوصول إلى role
  ): Promise<{ message: string }> {
    const product = await this.productsService.findOne(id); // ✅ كُنّا نفحص بدون جلب

    if (
      user.role !== 'ADMIN' &&
      String(product.merchantId) !== String(jwtMerchantId)
    ) {
      throw new ForbiddenException(
        this.translationService.translate('auth.errors.accessDenied'),
      );
    }

    return this.productsService.remove(id);
  }
  @Public()
  @Get('public/:storeSlug/product/:productSlug')
  async getPublicBySlug(
    @Param('storeSlug') storeSlug: string,
    @Param('productSlug') productSlug: string,
  ): Promise<ProductResponseDto> {
    const p = await this.productsService.getPublicBySlug(
      storeSlug,
      productSlug,
    );
    return plainToInstance(ProductResponseDto, p, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * تحديث المنتجات الشبيهة
   */
  @Put(':id/related')
  @ApiParam({ name: 'id', type: 'string', description: 'معرّف المنتج' })
  @ApiOperation({
    summary: 'تحديث المنتجات الشبيهة',
    description: 'تحديث قائمة المنتجات الشبيهة (حد أقصى 10 منتجات)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        relatedProductIds: {
          type: 'array',
          items: { type: 'string' },
          maxItems: 10,
          example: ['507f1f77bcf86cd799439011', '507f191e810c19729de860ea'],
        },
      },
    },
  })
  async updateRelatedProducts(
    @Param('id') id: string,
    @Body('relatedProductIds') relatedProductIds: string[],
    @CurrentMerchantId() jwtMerchantId: string | null,
    @CurrentUser() user: { role: string; merchantId: string },
  ): Promise<ProductResponseDto> {
    const product = await this.productsService.findOne(id);
    if (
      user.role !== 'ADMIN' &&
      String(product.merchantId) !== String(jwtMerchantId)
    ) {
      throw new ForbiddenException(
        this.translationService.translate('auth.errors.accessDenied'),
      );
    }

    const updated = await this.productsService.update(id, {
      relatedProducts: relatedProductIds,
    });

    return plainToInstance(ProductResponseDto, updated, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * جلب المنتجات الشبيهة (populated)
   */
  @Public()
  @Get(':id/related')
  @ApiParam({ name: 'id', type: 'string', description: 'معرّف المنتج' })
  @ApiOperation({
    summary: 'جلب المنتجات الشبيهة',
    description: 'جلب المنتجات الشبيهة لمنتج معين',
  })
  @ApiOkResponse({
    type: ProductResponseDto,
    isArray: true,
    description: 'قائمة المنتجات الشبيهة',
  })
  async getRelatedProducts(
    @Param('id') id: string,
  ): Promise<ProductResponseDto[]> {
    const product = await this.productsService.findOne(id);

    if (!product.relatedProducts || product.relatedProducts.length === 0) {
      return [];
    }

    // جلب المنتجات الشبيهة
    const relatedProducts = await Promise.all(
      product.relatedProducts.map((relatedId) =>
        this.productsService.findOne(relatedId.toString()).catch(() => null),
      ),
    );

    // فلترة null values
    const validProducts = relatedProducts.filter((p) => p !== null);

    return plainToInstance(ProductResponseDto, validProducts, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * جلب جميع التاجز المستخدمة
   */
  @Get('tags')
  @ApiOperation({
    summary: 'جلب جميع التاجز المستخدمة',
    description: 'جلب قائمة بجميع التاجز (keywords) المستخدمة في منتجات التاجر',
  })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        tags: {
          type: 'array',
          items: { type: 'string' },
          example: ['إلكترونيات', 'هواتف', 'أجهزة لوحية'],
        },
        count: { type: 'number', example: 15 },
      },
    },
  })
  async getTags(
    @CurrentMerchantId() jwtMerchantId: string | null,
  ): Promise<{ tags: string[]; count: number }> {
    if (!jwtMerchantId) {
      throw new ForbiddenException(
        this.translationService.translate('auth.errors.merchantRequired'),
      );
    }

    const tags = await this.productsService.getAllTags(jwtMerchantId);

    return {
      tags,
      count: tags.length,
    };
  }

  /**
   * تصدير المنتجات إلى CSV
   */
  @Get('export/csv')
  @ApiOperation({
    summary: 'تصدير المنتجات إلى CSV',
    description: 'تصدير جميع منتجات التاجر إلى ملف CSV',
  })
  async exportCsv(
    @CurrentMerchantId() jwtMerchantId: string | null,
  ): Promise<{ csv: string }> {
    if (!jwtMerchantId) {
      throw new ForbiddenException(
        this.translationService.translate('auth.errors.merchantRequired'),
      );
    }

    const csv = await this.csvService.exportToCSV(jwtMerchantId);

    return { csv };
  }

  /**
   * استيراد المنتجات من CSV
   */
  @Post('import/csv')
  @UseInterceptors(FilesInterceptor('file', 1))
  @ApiOperation({
    summary: 'استيراد المنتجات من CSV',
    description: 'استيراد منتجات جديدة من ملف CSV',
  })
  async importCsv(
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentMerchantId() jwtMerchantId: string | null,
  ): Promise<{
    success: number;
    failed: number;
    errors: Array<{ row: number; error: string }>;
  }> {
    if (!jwtMerchantId) {
      throw new ForbiddenException(
        this.translationService.translate('auth.errors.merchantRequired'),
      );
    }

    if (!files || files.length === 0) {
      throw new BadRequestException(
        this.translationService.translate('validation.fileRequired'),
      );
    }

    const file = files[0];
    const csvContent = file.buffer.toString('utf-8');

    const result = await this.csvService.importFromCSV(
      jwtMerchantId,
      csvContent,
    );

    return result;
  }

  /**
   * تنزيل template CSV فارغ
   */
  @Public()
  @Get('export/csv/template')
  @ApiOperation({
    summary: 'تنزيل template CSV',
    description: 'تنزيل ملف CSV فارغ كمثال للاستيراد',
  })
  exportCsvTemplate(): { csv: string } {
    const csv = this.csvService.exportTemplate();
    return { csv };
  }
}
