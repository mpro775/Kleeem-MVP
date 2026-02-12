// src/modules/products/products.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
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
import { ApiCreatedResponse as CommonApiCreatedResponse } from 'src/common/decorators/api-response.decorator';
import {
  CurrentUser,
  CurrentMerchantId,
} from 'src/common/decorators/current-user.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { PaginationResult } from 'src/common/dto/pagination.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TranslationService } from 'src/common/services/translation.service';

import { CreateProductDto } from './dto/create-product.dto';
import {
  SetManualPriceDto,
  BulkSetPricesDto,
  ResetPriceDto,
} from './dto/currency-price.dto';
import { GetProductsDto } from './dto/get-products.dto';
import { ProductResponseDto } from './dto/product-response.dto';
import { ProductSetupConfigDto } from './dto/product-setup-config.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import {
  UpdateStockDto,
  BulkUpdateStockDto,
  InventoryQueryDto,
} from './dto/update-stock.dto';
import { ProductSetupConfigService } from './product-setup-config.service';
import { ProductsService } from './products.service';
import { StockChangeType } from './schemas/stock-change-log.schema';
import { InventoryService } from './services/inventory.service';
import { ProductCsvService } from './services/product-csv.service';
import { StockChangeLogService } from './services/stock-change-log.service';

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
    private readonly inventoryService: InventoryService,
    private readonly stockChangeLogService: StockChangeLogService,
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

    const input = {
      ...dto,
      merchantId: jwtMerchantId,
    } as CreateProductDto & { merchantId: string };
    const product = await this.productsService.create(input);

    return plainToInstance(ProductResponseDto, product, {
      excludeExtraneousValues: true,
    });
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

  // ============ إدارة الأسعار المتعددة ============

  /**
   * تعيين سعر يدوي لعملة معينة
   * السعر اليدوي لا يتزامن مع تغييرات سعر الصرف
   */
  @Patch(':id/prices/:currency')
  @ApiParam({ name: 'id', type: 'string', description: 'معرّف المنتج' })
  @ApiParam({
    name: 'currency',
    type: 'string',
    description: 'رمز العملة (مثل: SAR, USD)',
  })
  @ApiOperation({
    summary: 'تعيين سعر يدوي لعملة معينة',
    description:
      'تعيين سعر يدوي لعملة معينة. السعر اليدوي لا يتزامن مع تغييرات سعر الصرف',
  })
  @ApiBody({ type: SetManualPriceDto })
  async setManualPrice(
    @Param('id') id: string,
    @Param('currency') currency: string,
    @Body() dto: SetManualPriceDto,
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

    const updated = await this.productsService.setManualPrice(
      id,
      currency,
      dto,
    );
    return plainToInstance(ProductResponseDto, updated, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * إعادة السعر للوضع التلقائي
   */
  @Delete(':id/prices/:currency/manual')
  @ApiParam({ name: 'id', type: 'string', description: 'معرّف المنتج' })
  @ApiParam({ name: 'currency', type: 'string', description: 'رمز العملة' })
  @ApiOperation({
    summary: 'إعادة السعر للوضع التلقائي',
    description:
      'إعادة السعر للوضع التلقائي. السعر سيتزامن مع تغييرات سعر الصرف',
  })
  async resetToAutoPrice(
    @Param('id') id: string,
    @Param('currency') currency: string,
    @Body() dto: ResetPriceDto,
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

    const updated = await this.productsService.resetToAutoPrice(
      id,
      currency,
      dto?.recalculate ?? true,
    );
    return plainToInstance(ProductResponseDto, updated, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * تعيين أسعار متعددة دفعة واحدة
   */
  @Patch(':id/prices/bulk')
  @ApiParam({ name: 'id', type: 'string', description: 'معرّف المنتج' })
  @ApiOperation({
    summary: 'تعيين أسعار متعددة دفعة واحدة',
    description: 'تعيين أسعار لعملات متعددة في طلب واحد',
  })
  @ApiBody({ type: BulkSetPricesDto })
  async setBulkPrices(
    @Param('id') id: string,
    @Body() dto: BulkSetPricesDto,
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

    const updated = await this.productsService.setBulkPrices(id, dto);
    return plainToInstance(ProductResponseDto, updated, {
      excludeExtraneousValues: true,
    });
  }

  // ============ أسعار المتغيرات ============

  /**
   * تعيين سعر يدوي لمتغير
   */
  @Patch(':id/variants/:sku/prices/:currency')
  @ApiParam({ name: 'id', type: 'string', description: 'معرّف المنتج' })
  @ApiParam({ name: 'sku', type: 'string', description: 'SKU للمتغير' })
  @ApiParam({ name: 'currency', type: 'string', description: 'رمز العملة' })
  @ApiOperation({
    summary: 'تعيين سعر يدوي لمتغير',
    description: 'تعيين سعر يدوي لعملة معينة لمتغير محدد',
  })
  @ApiBody({ type: SetManualPriceDto })
  async setVariantManualPrice(
    @Param('id') id: string,
    @Param('sku') sku: string,
    @Param('currency') currency: string,
    @Body() dto: SetManualPriceDto,
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

    const updated = await this.productsService.setVariantManualPrice(
      id,
      sku,
      currency,
      dto,
    );
    return plainToInstance(ProductResponseDto, updated, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * إعادة سعر المتغير للوضع التلقائي
   */
  @Delete(':id/variants/:sku/prices/:currency/manual')
  @ApiParam({ name: 'id', type: 'string', description: 'معرّف المنتج' })
  @ApiParam({ name: 'sku', type: 'string', description: 'SKU للمتغير' })
  @ApiParam({ name: 'currency', type: 'string', description: 'رمز العملة' })
  @ApiOperation({
    summary: 'إعادة سعر المتغير للوضع التلقائي',
    description: 'إعادة سعر المتغير للوضع التلقائي',
  })
  async resetVariantToAutoPrice(
    @Param('id') id: string,
    @Param('sku') sku: string,
    @Param('currency') currency: string,
    @Body() dto: ResetPriceDto,
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

    const updated = await this.productsService.resetVariantToAutoPrice(
      id,
      sku,
      currency,
      dto?.recalculate ?? true,
    );
    return plainToInstance(ProductResponseDto, updated, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * تعيين أسعار متعددة لمتغير دفعة واحدة
   */
  @Patch(':id/variants/:sku/prices/bulk')
  @ApiParam({ name: 'id', type: 'string', description: 'معرّف المنتج' })
  @ApiParam({ name: 'sku', type: 'string', description: 'SKU للمتغير' })
  @ApiOperation({
    summary: 'تعيين أسعار متعددة لمتغير دفعة واحدة',
    description: 'تعيين أسعار لعملات متعددة لمتغير محدد في طلب واحد',
  })
  @ApiBody({ type: BulkSetPricesDto })
  async setVariantBulkPrices(
    @Param('id') id: string,
    @Param('sku') sku: string,
    @Body() dto: BulkSetPricesDto,
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

    const updated = await this.productsService.setVariantBulkPrices(
      id,
      sku,
      dto,
    );
    return plainToInstance(ProductResponseDto, updated, {
      excludeExtraneousValues: true,
    });
  }

  // ============ إدارة المخزون ============

  /**
   * جلب قائمة المخزون مع الفلترة
   */
  @Get('inventory')
  @ApiOperation({
    summary: 'جلب قائمة المخزون',
    description: 'جلب قائمة المنتجات مع معلومات المخزون والفلترة حسب الحالة',
  })
  @ApiOkResponse({
    description: 'قائمة المخزون',
    schema: {
      type: 'object',
      properties: {
        items: { type: 'array' },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            page: { type: 'number' },
            limit: { type: 'number' },
            hasMore: { type: 'boolean' },
          },
        },
      },
    },
  })
  async getInventory(
    @Query() query: InventoryQueryDto,
    @CurrentMerchantId() jwtMerchantId: string | null,
  ): Promise<{
    items: Array<{
      productId: string;
      name: string;
      stock: number;
      lowStockThreshold: number | null;
      isUnlimitedStock: boolean;
      isAvailable: boolean;
      isLowStock: boolean;
      isOutOfStock: boolean;
      hasVariants: boolean;
      variants?: Array<{
        sku: string;
        stock: number;
        lowStockThreshold: number | null;
        isLowStock: boolean;
        isAvailable: boolean;
      }>;
      images: string[];
    }>;
    meta: { total: number; page: number; limit: number; hasMore: boolean };
  }> {
    if (!jwtMerchantId) {
      throw new ForbiddenException(
        this.translationService.translate('auth.errors.merchantRequired'),
      );
    }

    const limit = query.limit ?? 20;
    const page = query.page ?? 1;

    // جلب المنتجات
    const result = await this.productsService.listByMerchant(jwtMerchantId, {
      limit,
      cursor: undefined,
    });

    // تحويل البيانات لشكل المخزون
    let items = result.items.map((product) => {
      const stock = product.stock ?? 0;
      const threshold = product.lowStockThreshold ?? null;
      const isUnlimited = product.isUnlimitedStock ?? false;
      const isLowStock =
        !isUnlimited && threshold !== null && stock <= threshold;
      const isOutOfStock = !isUnlimited && stock <= 0;

      return {
        productId: String(product._id),
        name: product.name ?? '',
        stock,
        lowStockThreshold: threshold,
        isUnlimitedStock: isUnlimited,
        isAvailable: product.isAvailable ?? false,
        isLowStock,
        isOutOfStock,
        hasVariants: product.hasVariants ?? false,
        variants: product.variants?.map((v) => ({
          sku: v.sku,
          stock: v.stock ?? 0,
          lowStockThreshold: v.lowStockThreshold ?? null,
          isLowStock:
            v.lowStockThreshold !== null &&
            v.lowStockThreshold !== undefined &&
            (v.stock ?? 0) <= v.lowStockThreshold,
          isAvailable: v.isAvailable ?? false,
        })),
        images: product.images ?? [],
      };
    });

    // تطبيق الفلترة
    if (query.status && query.status !== 'all') {
      items = items.filter((item) => {
        switch (query.status) {
          case 'low':
            return item.isLowStock && !item.isOutOfStock;
          case 'out':
            return item.isOutOfStock;
          case 'unlimited':
            return item.isUnlimitedStock;
          case 'available':
            return item.isAvailable && !item.isOutOfStock;
          default:
            return true;
        }
      });
    }

    // تطبيق البحث
    if (query.search) {
      const searchLower = query.search.toLowerCase();
      items = items.filter((item) =>
        item.name.toLowerCase().includes(searchLower),
      );
    }

    const total = items.length;
    const startIdx = (page - 1) * limit;
    const paginatedItems = items.slice(startIdx, startIdx + limit);

    return {
      items: paginatedItems,
      meta: {
        total,
        page,
        limit,
        hasMore: startIdx + paginatedItems.length < total,
      },
    };
  }

  /**
   * تحديث مخزون منتج واحد
   */
  @Patch(':id/stock')
  @ApiParam({ name: 'id', type: 'string', description: 'معرّف المنتج' })
  @ApiOperation({
    summary: 'تحديث مخزون منتج',
    description: 'تحديث كمية المخزون لمنتج واحد أو متغير محدد',
  })
  @ApiBody({ type: UpdateStockDto })
  @ApiOkResponse({ type: ProductResponseDto })
  async updateStock(
    @Param('id') id: string,
    @Body() dto: UpdateStockDto,
    @CurrentMerchantId() jwtMerchantId: string | null,
    @CurrentUser()
    user: { userId: string; role: string; merchantId: string; name?: string },
  ): Promise<ProductResponseDto> {
    if (!jwtMerchantId) {
      throw new ForbiddenException(
        this.translationService.translate('auth.errors.merchantRequired'),
      );
    }

    const product = await this.productsService.findOne(id);
    if (
      user.role !== 'ADMIN' &&
      String(product.merchantId) !== String(jwtMerchantId)
    ) {
      throw new ForbiddenException(
        this.translationService.translate('auth.errors.accessDenied'),
      );
    }

    // الحصول على المخزون السابق
    const previousStock = dto.variantSku
      ? (product.variants?.find((v) => v.sku === dto.variantSku)?.stock ?? 0)
      : (product.stock ?? 0);

    // تحديث المخزون
    const updated = await this.inventoryService.updateStock(
      id,
      dto.quantity,
      dto.variantSku,
      dto.reason,
    );

    // تسجيل التغيير
    await this.stockChangeLogService.logChange({
      merchantId: jwtMerchantId,
      productId: id,
      productName: product.name ?? '',
      variantSku: dto.variantSku ?? null,
      previousStock,
      newStock: dto.quantity,
      changeType: StockChangeType.MANUAL,
      reason: dto.reason ?? null,
      changedBy: user.userId,
      changedByName: user.name ?? 'Unknown',
    });

    return plainToInstance(ProductResponseDto, updated, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * تحديث مخزون عدة منتجات دفعة واحدة
   */
  @Patch('stock/bulk')
  @ApiOperation({
    summary: 'تحديث مخزون عدة منتجات',
    description: 'تحديث كمية المخزون لعدة منتجات في طلب واحد',
  })
  @ApiBody({ type: BulkUpdateStockDto })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        success: { type: 'number' },
        failed: { type: 'number' },
        results: { type: 'array' },
      },
    },
  })
  async bulkUpdateStock(
    @Body() dto: BulkUpdateStockDto,
    @CurrentMerchantId() jwtMerchantId: string | null,
    @CurrentUser()
    user: { userId: string; role: string; merchantId: string; name?: string },
  ): Promise<{
    success: number;
    failed: number;
    results: Array<{ productId: string; success: boolean; error?: string }>;
  }> {
    if (!jwtMerchantId) {
      throw new ForbiddenException(
        this.translationService.translate('auth.errors.merchantRequired'),
      );
    }

    const results: Array<{
      productId: string;
      success: boolean;
      error?: string;
    }> = [];
    let successCount = 0;
    let failedCount = 0;

    for (const item of dto.items) {
      try {
        const product = await this.productsService.findOne(item.productId);

        // التحقق من الملكية
        if (
          user.role !== 'ADMIN' &&
          String(product.merchantId) !== String(jwtMerchantId)
        ) {
          results.push({
            productId: item.productId,
            success: false,
            error: 'Access denied',
          });
          failedCount++;
          continue;
        }

        // الحصول على المخزون السابق
        const previousStock = item.variantSku
          ? (product.variants?.find((v) => v.sku === item.variantSku)?.stock ??
            0)
          : (product.stock ?? 0);

        // تحديث المخزون
        await this.inventoryService.updateStock(
          item.productId,
          item.quantity,
          item.variantSku,
          item.reason,
        );

        // تسجيل التغيير
        await this.stockChangeLogService.logChange({
          merchantId: jwtMerchantId,
          productId: item.productId,
          productName: product.name ?? '',
          variantSku: item.variantSku ?? null,
          previousStock,
          newStock: item.quantity,
          changeType: StockChangeType.MANUAL,
          reason: item.reason ?? null,
          changedBy: user.userId,
          changedByName: user.name ?? 'Unknown',
        });

        results.push({ productId: item.productId, success: true });
        successCount++;
      } catch (error) {
        results.push({
          productId: item.productId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        failedCount++;
      }
    }

    return {
      success: successCount,
      failed: failedCount,
      results,
    };
  }

  /**
   * جلب سجل تغييرات المخزون لمنتج
   */
  @Get(':id/stock-history')
  @ApiParam({ name: 'id', type: 'string', description: 'معرّف المنتج' })
  @ApiOperation({
    summary: 'سجل تغييرات المخزون',
    description: 'جلب سجل تغييرات المخزون لمنتج معين',
  })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        items: { type: 'array' },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
        hasMore: { type: 'boolean' },
      },
    },
  })
  async getStockHistory(
    @Param('id') id: string,
    @Query('limit') limit?: number,
    @Query('page') page?: number,
    @CurrentMerchantId() jwtMerchantId?: string | null,
    @CurrentUser() user?: { role: string; merchantId: string },
  ): Promise<{
    items: Array<{
      id: string;
      productName: string;
      variantSku: string | null;
      previousStock: number;
      newStock: number;
      changeAmount: number;
      changeType: string;
      reason: string | null;
      changedByName: string;
      changedAt: Date;
    }>;
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  }> {
    if (!jwtMerchantId) {
      throw new ForbiddenException(
        this.translationService.translate('auth.errors.merchantRequired'),
      );
    }

    // التحقق من ملكية المنتج
    const product = await this.productsService.findOne(id);
    if (
      user?.role !== 'ADMIN' &&
      String(product.merchantId) !== String(jwtMerchantId)
    ) {
      throw new ForbiddenException(
        this.translationService.translate('auth.errors.accessDenied'),
      );
    }

    const result = await this.stockChangeLogService.getProductHistory(
      id,
      limit ?? 50,
      page ?? 1,
    );

    return {
      items: result.items.map((log) => ({
        id: String(log._id),
        productName: log.productName,
        variantSku: log.variantSku ?? null,
        previousStock: log.previousStock,
        newStock: log.newStock,
        changeAmount: log.changeAmount,
        changeType: log.changeType,
        reason: log.reason ?? null,
        changedByName: log.changedByName,
        changedAt: log.changedAt,
      })),
      total: result.total,
      page: result.page,
      limit: result.limit,
      hasMore: result.hasMore,
    };
  }

  /**
   * تصدير المخزون إلى CSV
   */
  @Get('inventory/export')
  @ApiOperation({
    summary: 'تصدير المخزون إلى CSV',
    description: 'تصدير بيانات المخزون إلى ملف CSV',
  })
  async exportInventoryCsv(
    @CurrentMerchantId() jwtMerchantId: string | null,
  ): Promise<{ csv: string; filename: string }> {
    if (!jwtMerchantId) {
      throw new ForbiddenException(
        this.translationService.translate('auth.errors.merchantRequired'),
      );
    }

    // جلب جميع المنتجات
    const merchantObjectId = new Types.ObjectId(jwtMerchantId);
    const products =
      await this.productsService.findAllByMerchant(merchantObjectId);

    // بناء CSV
    const headers = [
      'معرف المنتج',
      'اسم المنتج',
      'SKU المتغير',
      'المخزون',
      'عتبة التنبيه',
      'غير محدود',
      'متاح',
      'الحالة',
    ].join(',');

    const rows: string[] = [];

    for (const product of products) {
      const isUnlimited = product.isUnlimitedStock ?? false;
      const stock = product.stock ?? 0;
      const threshold = product.lowStockThreshold ?? '';
      const isLow =
        !isUnlimited && threshold !== '' && stock <= Number(threshold);
      const isOut = !isUnlimited && stock <= 0;
      const status = isUnlimited
        ? 'غير محدود'
        : isOut
          ? 'منتهي'
          : isLow
            ? 'منخفض'
            : 'جيد';

      if (product.hasVariants && product.variants) {
        for (const variant of product.variants) {
          const vStock = variant.stock ?? 0;
          const vThreshold = variant.lowStockThreshold ?? '';
          const vIsLow = vThreshold !== '' && vStock <= Number(vThreshold);
          const vIsOut = vStock <= 0;
          const vStatus = vIsOut ? 'منتهي' : vIsLow ? 'منخفض' : 'جيد';

          rows.push(
            [
              String(product._id),
              `"${(product.name ?? '').replace(/"/g, '""')}"`,
              variant.sku,
              vStock,
              vThreshold,
              'لا',
              variant.isAvailable ? 'نعم' : 'لا',
              vStatus,
            ].join(','),
          );
        }
      } else {
        rows.push(
          [
            String(product._id),
            `"${(product.name ?? '').replace(/"/g, '""')}"`,
            '',
            stock,
            threshold,
            isUnlimited ? 'نعم' : 'لا',
            product.isAvailable ? 'نعم' : 'لا',
            status,
          ].join(','),
        );
      }
    }

    const csv = '\uFEFF' + headers + '\n' + rows.join('\n'); // BOM for Excel Arabic support
    const filename = `inventory_${new Date().toISOString().split('T')[0]}.csv`;

    return { csv, filename };
  }
}
