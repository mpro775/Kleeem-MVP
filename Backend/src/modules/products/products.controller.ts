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
  NotFoundException,
  UploadedFiles,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiOkResponse,
} from '@nestjs/swagger';
import { Types } from 'mongoose';
import { plainToInstance } from 'class-transformer';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductResponseDto } from './dto/product-response.dto';
import { GetProductsDto } from './dto/get-products.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import {
  ApiCreatedResponse as CommonApiCreatedResponse,
  CurrentUser, // ✅ موجود عندك
  CurrentMerchantId, // ✅ موجود عندك
} from '../../common';
import { ProductSetupConfigDto } from './dto/product-setup-config.dto';
import { ProductSetupConfigService } from './product-setup-config.service';
import { FilesInterceptor } from '@nestjs/platform-express';
import { TranslationService } from '../../common/services/translation.service';

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
      merchantId: jwtMerchantId, // ✅ بدل req.user.merchantId
      originalUrl: dto.originalUrl,
      source: dto.source,
      sourceUrl: dto.sourceUrl,
      externalId: dto.externalId,
      name: dto.name || '',
      currency: dto.currency,
      offer: dto.offer,
      price: dto.price || 0,
      isAvailable: dto.isAvailable ?? true,
      keywords: dto.keywords || [],
      platform: dto.platform || '',
      description: dto.description || '',
      images: dto.images || [],
      category: dto.category || '',
      specsBlock: dto.specsBlock || [],
      attributes: dto.attributes,
    };
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
  ) {
    if (!merchantId) {
      throw new ForbiddenException(
        this.translationService.translate('auth.errors.merchantRequired'),
      );
    }

    const result = await this.productsService.getPublicProducts(
      merchantId,
      dto,
    );

    return {
      items: plainToInstance(ProductResponseDto, result.items, {
        excludeExtraneousValues: true,
      }),
      meta: result.meta,
    };
  }

  @Public()
  @Get('legacy')
  @ApiOperation({ summary: 'جلب جميع المنتجات للتاجر (طريقة قديمة)' })
  @ApiOkResponse({ type: ProductResponseDto, isArray: true })
  async findAll(@Query('merchantId') merchantId: string) {
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
  ) {
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
      meta: result.meta,
    };
  }

  @Post(':id/images')
  @UseInterceptors(FilesInterceptor('files', 6))
  async uploadProductImages(
    @Param('id') id: string,
    @Query('replace') replace = 'false',
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentMerchantId() jwtMerchantId: string | null, // ✅
  ) {
    if (!jwtMerchantId) {
      throw new ForbiddenException('لا يوجد تاجر مرتبط بالحساب');
    }
    const result = await this.productsService.uploadProductImagesToMinio(
      id,
      jwtMerchantId, // ✅
      files,
      { replace: replace === 'true' },
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
    @Request() req: any, // تبقى عامة؛ قد لا يوجد user
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
    @CurrentUser() user: any, // ✅ للوصول إلى role
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
  ) {
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
        data: result,
      };
    } catch (error: any) {
      throw new InternalServerErrorException({
        success: false,
        message: this.translationService.translateError(
          'system.configurationError',
        ),
        error: error.message,
      });
    }
  }

  @Get(':merchantId/setup-products')
  async getSetupProducts(
    @Param('merchantId') merchantId: string,
    @CurrentMerchantId() jwtMerchantId: string | null, // ✅
  ) {
    if (!jwtMerchantId || merchantId !== String(jwtMerchantId)) {
      throw new ForbiddenException(
        this.translationService.translate('auth.errors.accessDenied'),
      );
    }
    const config =
      await this.productSetupConfigService.getByMerchantId(merchantId);
    return config ?? null;
  }

  @Post(':id/availability')
  async updateAvailability(
    @Param('id') id: string,
    @Body('isAvailable') isAvailable: boolean,
    @CurrentMerchantId() jwtMerchantId: string | null, // ⬅️ إن احتجت التحقق، أضِفه هنا
  ) {
    // إن أردت تقييدها بمالك المنتج أضف فحصًا مشابهًا لـ update/remove
    return this.productsService.setAvailability(id, isAvailable);
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
    @CurrentUser() user: any, // ✅ للوصول إلى role
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
  ) {
    const p = await this.productsService.getPublicBySlug(
      storeSlug,
      productSlug,
    );
    return plainToInstance(ProductResponseDto, p, {
      excludeExtraneousValues: true,
    });
  }
}
