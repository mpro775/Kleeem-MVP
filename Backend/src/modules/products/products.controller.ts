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
  ApiResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { Types } from 'mongoose';
import { plainToInstance } from 'class-transformer';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductResponseDto } from './dto/product-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import {
  ApiSuccessResponse,
  ApiCreatedResponse as CommonApiCreatedResponse,
  CurrentUser, // ✅ موجود عندك
  CurrentMerchantId, // ✅ موجود عندك
} from '../../common';
import { ProductSetupConfigDto } from './dto/product-setup-config.dto';
import { ProductSetupConfigService } from './product-setup-config.service';
import { FilesInterceptor } from '@nestjs/platform-express';

@ApiTags('المنتجات')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseInterceptors(ClassSerializerInterceptor)
@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly productSetupConfigService: ProductSetupConfigService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'إنشاء منتج جديد (للتاجر)' })
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
      throw new ForbiddenException('لا يوجد تاجر مرتبط بالحساب');
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

  @Public()
  @Get()
  @ApiOperation({ summary: 'جلب جميع المنتجات للتاجر الحالي' })
  @ApiOkResponse({ type: ProductResponseDto, isArray: true })
  async findAll(@Query('merchantId') merchantId: string) {
    if (!merchantId) throw new BadRequestException('merchantId is required');
    const merchantObjectId = new Types.ObjectId(merchantId);
    const docs = await this.productsService.findAllByMerchant(merchantObjectId);
    return plainToInstance(ProductResponseDto, docs, {
      excludeExtraneousValues: true,
    });
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
  @ApiOperation({ summary: 'جلب منتج واحد حسب المعرّف' })
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
        throw new ForbiddenException('Not allowed');
      }
    }

    return plainToInstance(ProductResponseDto, product, {
      excludeExtraneousValues: true,
    });
  }

  @Put(':id')
  @ApiParam({ name: 'id', type: 'string', description: 'معرّف المنتج' })
  @ApiOperation({ summary: 'تحديث منتج (لصاحب المنتج فقط)' })
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
      throw new ForbiddenException('Not allowed');
    }
    const updated = await this.productsService.update(id, dto);
    return plainToInstance(ProductResponseDto, updated, {
      excludeExtraneousValues: true,
    });
  }

  @Post(':merchantId/setup-products')
  @ApiOperation({ summary: 'إعداد تكوين المنتجات للتاجر' })
  async setupProducts(
    @Param('merchantId') merchantId: string,
    @Body() config: ProductSetupConfigDto,
    @CurrentMerchantId() jwtMerchantId: string | null, // ✅
  ) {
    if (!jwtMerchantId || merchantId !== String(jwtMerchantId)) {
      throw new ForbiddenException('غير مصرح لك بتعديل إعدادات هذا التاجر');
    }
    if (!Types.ObjectId.isValid(merchantId)) {
      throw new BadRequestException('معرف التاجر غير صالح');
    }
    try {
      const result = await this.productSetupConfigService.saveOrUpdate(
        merchantId,
        config,
      );
      return {
        success: true,
        message: 'تم حفظ إعدادات المنتجات بنجاح',
        data: result,
      };
    } catch (error: any) {
      throw new InternalServerErrorException({
        success: false,
        message: 'فشل في حفظ إعدادات المنتجات',
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
      throw new ForbiddenException('Unauthorized');
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
  @ApiOperation({ summary: 'حذف منتج' })
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
      throw new ForbiddenException('ممنوع الوصول إلى منتج ليس ضمن متجرك');
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
