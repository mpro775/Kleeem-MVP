// src/common/examples/product-controller.example.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UseFilters,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import {
  AuthGuard,
  ResponseInterceptor,
  LoggingInterceptor,
  AllExceptionsFilter,
  ApiSuccessResponse,
  ApiCreatedResponse,
  ApiDeletedResponse,
  CurrentUser,
  CurrentUserId,
  CursorDto,
  ProductNotFoundError,
  OutOfStockError,
} from '../index';
import {
  ProductServiceExample,
  CreateProductDto,
  ProductDto,
} from './product-service.example';

@ApiTags('المنتجات')
@Controller('products')
@UseGuards(AuthGuard)
@UseInterceptors(ResponseInterceptor, LoggingInterceptor)
@UseFilters(AllExceptionsFilter)
@ApiBearerAuth()
export class ProductControllerExample {
  constructor(private readonly productService: ProductServiceExample) {}

  @Get()
  @ApiOperation({ summary: 'الحصول على قائمة المنتجات' })
  @ApiSuccessResponse(ProductDto, 'تم جلب المنتجات بنجاح')
  async getProducts(
    @Query() pagination: CursorDto,
    @CurrentUser('merchantId') merchantId: string,
  ) {
    return this.productService.getProducts(pagination, merchantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'الحصول على منتج محدد' })
  @ApiSuccessResponse(ProductDto, 'تم جلب المنتج بنجاح')
  async getProduct(@Param('id') id: string) {
    try {
      return await this.productService.getProductById(id);
    } catch (error) {
      if (error instanceof ProductNotFoundError) {
        // سيتم التعامل مع الخطأ تلقائياً بواسطة AllExceptionsFilter
        throw error;
      }
      throw error;
    }
  }

  @Post()
  @ApiOperation({ summary: 'إنشاء منتج جديد' })
  @ApiCreatedResponse(ProductDto, 'تم إنشاء المنتج بنجاح')
  async createProduct(
    @Body() createProductDto: CreateProductDto,
    @CurrentUser('merchantId') merchantId: string,
  ) {
    return this.productService.createProduct(createProductDto, merchantId);
  }

  @Post(':id/purchase')
  @ApiOperation({ summary: 'شراء منتج' })
  @ApiSuccessResponse(Object, 'تم الشراء بنجاح')
  async purchaseProduct(
    @Param('id') productId: string,
    @Body() body: { quantity: number },
    @CurrentUserId() userId: string,
  ) {
    try {
      await this.productService.purchaseProduct(
        productId,
        body.quantity,
        userId,
      );
      return { message: 'تم الشراء بنجاح' };
    } catch (error) {
      if (error instanceof OutOfStockError) {
        // سيتم التعامل مع الخطأ تلقائياً بواسطة AllExceptionsFilter
        throw error;
      }
      throw error;
    }
  }

  @Put(':id')
  @ApiOperation({ summary: 'تحديث منتج' })
  @ApiSuccessResponse(ProductDto, 'تم تحديث المنتج بنجاح')
  async updateProduct(
    @Param('id') id: string,
    @Body() updateProductDto: Partial<CreateProductDto>,
  ) {
    // محاكاة تحديث المنتج
    return { id, ...updateProductDto, updatedAt: new Date() };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'حذف منتج' })
  @ApiDeletedResponse('تم حذف المنتج بنجاح')
  async deleteProduct(@Param('id') id: string) {
    // محاكاة حذف المنتج
    return { message: 'تم حذف المنتج بنجاح' };
  }
}
