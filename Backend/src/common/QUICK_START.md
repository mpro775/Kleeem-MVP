# 🚀 دليل البدء السريع - المكونات المشتركة

## 📋 الخطوات الأساسية

### 1. تثبيت التبعيات

```bash
npm install @nestjs/jwt @nestjs/swagger class-validator class-transformer helmet compression express-rate-limit
npm install --save-dev @types/compression
```

### 2. إعداد متغيرات البيئة

```env
JWT_SECRET=your-super-secret-jwt-key-here
ALLOWED_ORIGINS=http://localhost:3000
PORT=3000
```

### 3. تحديث AppModule

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommonModule, AppConfig } from './common';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CommonModule,
    // باقي الـ modules...
  ],
})
export class AppModule extends AppConfig {}
```

### 4. تحديث main.ts

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { setupApp } from './common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  setupApp(app);
  
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
  
  const config = new DocumentBuilder()
    .setTitle('Musad Bot API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
    
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  
  app.setGlobalPrefix('api/v1');
  
  await app.listen(process.env.PORT || 3000);
}

bootstrap();
```

## 🎯 استخدام سريع في الخدمات

### إنشاء خدمة مع الأخطاء المخصصة

```typescript
// src/modules/products/products.service.ts
import { Injectable } from '@nestjs/common';
import { ProductNotFoundError, OutOfStockError } from '../../common';

@Injectable()
export class ProductsService {
  async getProduct(id: string) {
    const product = await this.findProduct(id);
    
    if (!product) {
      throw new ProductNotFoundError(id);
    }
    
    return product;
  }
  
  async purchaseProduct(id: string, quantity: number) {
    const product = await this.getProduct(id);
    
    if (product.quantity < quantity) {
      throw new OutOfStockError(id, product.quantity);
    }
    
    // عملية الشراء...
  }
}
```

### إنشاء Controller مع المكونات المشتركة

```typescript
// src/modules/products/products.controller.ts
import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  AuthGuard,
  ApiSuccessResponse,
  CurrentUser,
  PaginationDto,
} from '../../common';

@ApiTags('المنتجات')
@Controller('products')
@UseGuards(AuthGuard)
export class ProductsController {
  constructor(private productsService: ProductsService) {}
  
  @Get()
  @ApiOperation({ summary: 'الحصول على قائمة المنتجات' })
  @ApiSuccessResponse(ProductDto, 'تم جلب المنتجات بنجاح')
  async getProducts(
    @Query() pagination: PaginationDto,
    @CurrentUser('merchantId') merchantId: string
  ) {
    return this.productsService.getProducts(pagination, merchantId);
  }
  
  @Get(':id')
  @ApiOperation({ summary: 'الحصول على منتج محدد' })
  @ApiSuccessResponse(ProductDto, 'تم جلب المنتج بنجاح')
  async getProduct(@Param('id') id: string) {
    return this.productsService.getProduct(id);
  }
}
```

## 🔍 النتائج المتوقعة

### استجابة ناجحة
```json
{
  "success": true,
  "data": {
    "id": "123",
    "name": "منتج تجريبي",
    "price": 100
  },
  "requestId": "uuid-here",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### استجابة خطأ
```json
{
  "status": 404,
  "code": "NOT_FOUND",
  "message": "المنتج غير موجود",
  "requestId": "uuid-here",
  "details": {
    "productId": "123"
  }
}
```

## 📚 المزيد من المعلومات

- 📖 [الدليل الكامل](./README.md)
- 🧪 [الأمثلة](./examples/)
- 📦 [التبعيات](./package-dependencies.md)

## 🆘 الدعم

إذا واجهت أي مشاكل:

1. تأكد من تثبيت جميع التبعيات
2. تحقق من متغيرات البيئة
3. راجع الأمثلة في مجلد `examples/`
4. تأكد من تطبيق `CommonModule` في `AppModule`
