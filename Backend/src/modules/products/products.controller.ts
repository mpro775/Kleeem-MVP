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
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiBearerAuth, 
  ApiOperation, 
  ApiParam, 
  ApiBody, 
  ApiOkResponse, 
  ApiCreatedResponse,
  ApiResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { Types } from 'mongoose';
import { plainToInstance } from 'class-transformer';
import { ProductsService } from './products.service';
import { CreateProductDto, ProductSource } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductResponseDto } from './dto/product-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RequestWithUser } from '../../common/interfaces/request-with-user.interface';
import { Public } from '../../common/decorators/public.decorator';
import { ProductSetupConfigDto } from './dto/product-setup-config.dto';
import { ProductSetupConfigService } from './product-setup-config.service';

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
  @ApiCreatedResponse({
    description: 'تم إنشاء المنتج ووضعه في قائمة الانتظار للمعالجة',
    type: ProductResponseDto,
    schema: {
      example: {
        _id: '60f8f0e5e1d3c42f88a7b9a1',
        merchantId: '5f7e1a3b4c9d0e2f1a2b3c4d',
        originalUrl: 'https://example.com/product/123',
        name: 'منتج تجريبي',
        price: 99.99,
        isAvailable: true,
        keywords: ['test', 'demo'],
        platform: 'ExampleShop',
        description: 'هذا وصف تفصيلي للمنتج.',
        images: ['https://.../img1.jpg', 'https://.../img2.jpg'],
        category: 'إلكترونيات',
        errorState: 'queued',
        createdAt: '2025-06-09T13:45:00.000Z',
        updatedAt: '2025-06-09T13:45:00.000Z',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'غير مصرح: توكن JWT غير صالح أو مفقود',
  })
  @ApiForbiddenResponse({ description: 'ممنوع: دور المستخدم غير كافٍ' })
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Request() req: RequestWithUser,
    @Body() dto: CreateProductDto,
  ): Promise<ProductResponseDto> {
    // Build input for service
    const input = {
      merchantId: req.user.merchantId,
      originalUrl: dto.originalUrl,
      source: dto.source,
      sourceUrl: dto.sourceUrl,
      externalId: dto.externalId,
      name: dto.name || '',
      price: dto.price || 0,
      isAvailable: dto.isAvailable ?? true,
      keywords: dto.keywords || [],
      platform: dto.platform || '',
      description: dto.description || '',
      images: dto.images || [],
      category: dto.category || '',
      lowQuantity: dto.lowQuantity || '',
      specsBlock: dto.specsBlock || [],
      // alerts
      errorState: 'queued',
    };
    const product = await this.productsService.create(input);
    // enqueue scrape job for api/scraper
    if (dto.source !== ProductSource.MANUAL) {
      await this.productsService.enqueueScrapeJob({
        productId: product._id.toString(),
        url: dto.sourceUrl || dto.originalUrl || '',
        merchantId: req.user.merchantId,
        mode: 'minimal',
      });
    }
    return plainToInstance(ProductResponseDto, product, {
      excludeExtraneousValues: true,
    });
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'جلب جميع المنتجات للتاجر الحالي' })
  @ApiOkResponse({
    description: 'تم إرجاع قائمة المنتجات بنجاح',
    type: ProductResponseDto,
    isArray: true,
    schema: {
      example: [
        {
          _id: '60f8f0e5e1d3c42f88a7b9a1',
          merchantId: '5f7e1a3b4c9d0e2f1a2b3c4d',
          originalUrl: 'https://example.com/product/123',
          name: 'منتج تجريبي',
          price: 99.99,
          isAvailable: true,
          keywords: ['test', 'demo'],
          platform: 'ExampleShop',
          description: 'هذا وصف تفصيلي للمنتج.',
          images: ['https://.../img1.jpg', 'https://.../img2.jpg'],
          category: 'إلكترونيات',
          errorState: 'ready',
          createdAt: '2025-06-09T13:45:00.000Z',
          updatedAt: '2025-06-09T14:00:00.000Z',
        },
      ],
    },
  })
  @ApiUnauthorizedResponse({
    description: 'غير مصرح: توكن JWT غير صالح أو مفقود',
  })
  @ApiForbiddenResponse({ description: 'ممنوع: دور المستخدم غير كافٍ' })
  async findAll(
    @Query('merchantId') merchantId: string,
  ): Promise<ProductResponseDto[]> {
    if (!merchantId) {
      throw new BadRequestException('merchantId is required');
    }

    const merchantObjectId = new Types.ObjectId(merchantId);
    const docs = await this.productsService.findAllByMerchant(merchantObjectId);

    return plainToInstance(ProductResponseDto, docs);
  }

  @Public()
  @Get(':id')
  @ApiParam({ name: 'id', type: 'string', description: 'معرّف المنتج' })
  @ApiOperation({ summary: 'جلب منتج واحد حسب المعرّف' })
  @ApiOkResponse({
    description: 'تم إرجاع بيانات المنتج بنجاح',
    type: ProductResponseDto,
    schema: {
      example: {
        _id: '60f8f0e5e1d3c42f88a7b9a1',
        merchantId: '5f7e1a3b4c9d0e2f1a2b3c4d',
        originalUrl: 'https://example.com/product/123',
        name: 'منتج تجريبي',
        price: 99.99,
        isAvailable: true,
        keywords: ['test', 'demo'],
        platform: 'ExampleShop',
        description: 'هذا وصف تفصيلي للمنتج.',
        images: ['https://.../img1.jpg', 'https://.../img2.jpg'],
        category: 'إلكترونيات',
        errorState: 'ready',
        createdAt: '2025-06-09T13:45:00.000Z',
        updatedAt: '2025-06-09T14:00:00.000Z',
      },
    },
  })
  @ApiNotFoundResponse({ description: 'المنتج غير موجود' })
  @ApiUnauthorizedResponse({
    description: 'غير مصرح: توكن JWT غير صالح أو مفقود',
  })
  @ApiForbiddenResponse({ description: 'ممنوع: ليس مالك المنتج' })
  async findOne(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ): Promise<ProductResponseDto> {
    try {
      const product = await this.productsService.findOne(id);

      // إذا هناك مستخدم سجّل الدخول (req.user موجود) افحص الصلاحية
      if (req.user) {
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
    } catch (error) {
      console.error('Find Product Error:', error);
      throw error;
    }
  }
  @Post('import-link')
  @HttpCode(HttpStatus.ACCEPTED)
  async importByLink(
    @Request() req: RequestWithUser,
    @Body('url') url: string,
  ) {
    if (!url) throw new BadRequestException('URL is required');
    await this.productsService.create({
      merchantId: req.user.merchantId,
      originalUrl: url,
      source: ProductSource.SCRAPER, // أو ProductSource.API حسب الحالة
    });
    return { status: 'queued' };
  }

  @Put(':id')
  @ApiParam({ name: 'id', type: 'string', description: 'معرّف المنتج' })
  @ApiOperation({ summary: 'تحديث منتج (لصاحب المنتج فقط)' })
  @ApiBody({ type: UpdateProductDto, description: 'الحقول المراد تحديثها' })
  @ApiOkResponse({
    description: 'تم تحديث المنتج بنجاح',
    type: ProductResponseDto,
    schema: {
      example: {
        _id: '60f8f0e5e1d3c42f88a7b9a1',
        /* باقي الحقول كما في الأمثلة السابقة */
      },
    },
  })
  @ApiNotFoundResponse({ description: 'المنتج غير موجود' })
  @ApiUnauthorizedResponse({
    description: 'غير مصرح: توكن JWT غير صالح أو مفقود',
  })
  @ApiForbiddenResponse({ description: 'ممنوع: ليس مالك المنتج' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @Request() req: RequestWithUser,
  ): Promise<ProductResponseDto> {
    const product = await this.productsService.findOne(id);
    if (
      req.user.role !== 'ADMIN' &&
      product.merchantId.toString() !== req.user.merchantId
    ) {
      throw new ForbiddenException('Not allowed');
    }
    const updated = await this.productsService.update(id, dto);
    return plainToInstance(ProductResponseDto, updated, {
      excludeExtraneousValues: true,
    });
  }

  @Post(':merchantId/setup-products')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'إعداد تكوين المنتجات للتاجر',
    description: 'يسمح بإعداد أو تحديث تكوين المنتجات للتاجر',
  })
  @ApiParam({
    name: 'merchantId',
    required: true,
    description: 'معرف التاجر',
    example: '60d21b4667d0d8992e610c85',
  })
  @ApiBody({
    type: ProductSetupConfigDto,
    description: 'إعدادات تكوين المنتجات',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'تم حفظ إعدادات المنتجات بنجاح',
    type: ProductSetupConfigDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'بيانات الطلب غير صالحة',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'غير مصرح به',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'حدث خطأ في الخادم',
  })
  async setupProducts(
    @Param('merchantId') merchantId: string,
    @Body() config: ProductSetupConfigDto,
    @Request() req: RequestWithUser,
  ) {
    // التحقق من أن المستخدم هو صاحب المتجر
    if (merchantId !== req.user.merchantId) {
      throw new ForbiddenException('غير مصرح لك بتعديل إعدادات هذا التاجر');
    }

    // التحقق من صحة معرف التاجر
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
    } catch (error) {
      throw new InternalServerErrorException({
        success: false,
        message: 'فشل في حفظ إعدادات المنتجات',
        error: error.message,
      });
    }
  }

  @Get(':merchantId/setup-products')
  @UseGuards(JwtAuthGuard)
  async getSetupProducts(
    @Param('merchantId') merchantId: string,
    @Request() req,
  ) {
    if (merchantId !== req.user.merchantId) throw new Error('Unauthorized');
    const config =
      await this.productSetupConfigService.getByMerchantId(merchantId);
    console.log('[DEBUG] getSetupProducts:', { merchantId, config }); // ← سجل الرد هنا
    return config; // أو يمكنك: return config || null;
  }

  @Post(':id/availability')
  async updateAvailability(
    @Param('id') id: string,
    @Body('isAvailable') isAvailable: boolean,
  ) {
    return this.productsService.setAvailability(id, isAvailable);
  }

  @Post(':id/sync')
  @ApiParam({ name: 'id', description: 'معرّف المنتج' })
  @ApiOperation({ summary: 'مزامنة يدوية للمنتجات الآلية' })
  @ApiOkResponse({ type: ProductResponseDto })
  @ApiForbiddenResponse({ description: 'لا يمكن مزامنة المنتجات اليدوية' })
  @ApiNotFoundResponse({ description: 'المنتج غير موجود' })
  async triggerSync(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ): Promise<ProductResponseDto> {
    const product = await this.productsService.findOne(id);
    if (
      product.merchantId.toString() !== req.user.merchantId &&
      req.user.role !== 'ADMIN'
    ) {
      throw new ForbiddenException('ليس لديك صلاحية مزامنة هذا المنتج');
    }
    if (product.source === 'manual') {
      throw new BadRequestException('لا يمكن مزامنة المنتجات اليدوية');
    }
    const synced = await this.productsService.triggerSync(id);
    return plainToInstance(ProductResponseDto, synced, {
      excludeExtraneousValues: true,
    });
  }

  @Delete(':id')
  @ApiParam({ name: 'id', type: 'string', description: 'معرّف المنتج' })
  @ApiOperation({ summary: 'حذف منتج' })
  @ApiOkResponse({
    description: 'تم حذف المنتج بنجاح',
    schema: { example: { message: 'Product removed successfully' } },
  })
  @ApiNotFoundResponse({ description: 'المنتج غير موجود' })
  @ApiUnauthorizedResponse({
    description: 'غير مصرح: توكن JWT غير صالح أو مفقود',
  })
  @ApiForbiddenResponse({ description: 'ممنوع: ليس مالك المنتج' })
  async remove(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ): Promise<{ message: string }> {
    const product = await this.productsService.findOne(id);
    if (
      req.user.role !== 'ADMIN' &&
      product.merchantId.toString() !== req.user.merchantId
    ) {
      throw new ForbiddenException('Not allowed');
    }
    return this.productsService.remove(id);
  }
}
