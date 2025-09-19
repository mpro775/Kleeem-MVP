// src/common/examples/product-service.example.ts
import { Injectable } from '@nestjs/common';
import { ProductNotFoundError, OutOfStockError, CurrentUser } from '../index';
import { CursorDto, PaginationResult } from '../dto/pagination.dto';

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
  async purchaseProduct(
    productId: string,
    quantity: number,
    userId: string,
  ): Promise<void> {
    const product = await this.getProductById(productId);

    if (product.quantity < quantity) {
      throw new OutOfStockError(productId);
    }

    // محاكاة عملية الشراء
    await this.updateProductQuantity(productId, product.quantity - quantity);
  }

  // مثال على استخدام الترقيم باستخدام Cursor-based Pagination
  async getProducts(
    pagination: CursorDto,
    merchantId: string,
  ): Promise<PaginationResult<ProductDto>> {
    const { cursor, limit = 20 } = pagination;

    // محاكاة استعلام قاعدة البيانات باستخدام cursor
    const products = await this.findProductsInDatabase({
      merchantId,
      cursor,
      limit,
    });

    // محاكاة التحقق من وجود المزيد من النتائج
    const hasMore = products.length === limit;

    return {
      items: products,
      meta: {
        nextCursor: hasMore ? 'next_cursor_example' : undefined,
        hasMore,
        count: products.length,
      },
    };
  }

  // مثال على إنشاء منتج جديد
  async createProduct(
    createProductDto: CreateProductDto,
    @CurrentUser('merchantId') merchantId: string,
  ): Promise<ProductDto> {
    // محاكاة إنشاء المنتج
    const product = await this.createProductInDatabase({
      ...createProductDto,
      merchantId,
    });

    return product;
  }

  // طرق مساعدة (محاكاة)
  private async findProductInDatabase(
    productId: string,
  ): Promise<ProductDto | null> {
    // محاكاة استعلام قاعدة البيانات
    return null; // للتوضيح فقط
  }

  private async findProductsInDatabase(options: {
    merchantId: string;
    cursor?: string;
    limit: number;
  }): Promise<ProductDto[]> {
    // محاكاة استعلام قاعدة البيانات باستخدام cursor
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

  private async updateProductQuantity(
    productId: string,
    quantity: number,
  ): Promise<void> {
    // محاكاة تحديث الكمية
  }
}
