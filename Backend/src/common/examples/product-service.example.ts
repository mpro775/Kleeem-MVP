// src/common/examples/product-service.example.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import {
  ProductNotFoundError,
  OutOfStockError,
  ApiSuccessResponse,
  ApiCreatedResponse,
  CurrentUser,
  PaginationDto,
  PaginatedResponseDto,
} from '../index';

// مثال على DTO للمنتج
export class CreateProductDto {
  name: string;
  price: number;
  quantity: number;
  description?: string;
}

export class ProductDto {
  id: string;
  name: string;
  price: number;
  quantity: number;
  description?: string;
  merchantId: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class ProductServiceExample {
  // مثال على استخدام الأخطاء المخصصة
  async getProductById(productId: string): Promise<ProductDto> {
    // محاكاة البحث عن المنتج
    const product = await this.findProductInDatabase(productId);
    
    if (!product) {
      // استخدام خطأ مخصص بدلاً من NotFoundException
      throw new ProductNotFoundError(productId);
    }
    
    return product;
  }

  // مثال على استخدام خطأ الأعمال
  async purchaseProduct(productId: string, quantity: number, userId: string): Promise<void> {
    const product = await this.getProductById(productId);
    
    if (product.quantity < quantity) {
      throw new OutOfStockError(productId);
    }
    
    // محاكاة عملية الشراء
    await this.updateProductQuantity(productId, product.quantity - quantity);
  }

  // مثال على استخدام الترقيم
  async getProducts(
    pagination: PaginationDto,
    merchantId: string
  ): Promise<PaginatedResponseDto<ProductDto>> {
    const { page = 1, limit = 10, search, sortBy, sortOrder } = pagination;
    
    // محاكاة استعلام قاعدة البيانات
    const products = await this.findProductsInDatabase({
      merchantId,
      search,
      sortBy,
      sortOrder,
      skip: (page - 1) * limit,
      take: limit,
    });
    
    const total = await this.countProductsInDatabase({ merchantId, search });
    const totalPages = Math.ceil(total / limit);
    
    return {
      data: products,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  // مثال على إنشاء منتج جديد
  async createProduct(
    createProductDto: CreateProductDto,
    @CurrentUser('merchantId') merchantId: string
  ): Promise<ProductDto> {
    // محاكاة إنشاء المنتج
    const product = await this.createProductInDatabase({
      ...createProductDto,
      merchantId,
    });
    
    return product;
  }

  // طرق مساعدة (محاكاة)
  private async findProductInDatabase(productId: string): Promise<ProductDto | null> {
    // محاكاة استعلام قاعدة البيانات
    return null; // للتوضيح فقط
  }

  private async findProductsInDatabase(options: any): Promise<ProductDto[]> {
    // محاكاة استعلام قاعدة البيانات
    return [];
  }

  private async countProductsInDatabase(options: any): Promise<number> {
    // محاكاة عد العناصر
    return 0;
  }

  private async createProductInDatabase(data: any): Promise<ProductDto> {
    // محاكاة إنشاء المنتج
    return {} as ProductDto;
  }

  private async updateProductQuantity(productId: string, quantity: number): Promise<void> {
    // محاكاة تحديث الكمية
  }
}
