# المكونات المشتركة (Common Components)

هذا المجلد يحتوي على جميع المكونات المشتركة التي يمكن استخدامها في جميع أنحاء التطبيق لضمان التناسق والجودة.

## 📁 هيكل المجلد

```
src/common/
├── constants/          # الثوابت المشتركة
├── decorators/         # الـ Decorators المخصصة
├── dto/               # Data Transfer Objects
├── errors/            # فئات الأخطاء المخصصة
├── filters/           # فلاتر الاستثناءات
├── guards/            # Guards للمصادقة والتفويض
├── interceptors/      # Interceptors للاستجابات والتسجيل
├── interfaces/        # الواجهات المشتركة
├── middlewares/       # Middlewares
├── outbox/            # نمط Outbox للرسائل
└── examples/          # أمثلة على الاستخدام
```

## 🚀 كيفية الاستخدام

### 1. استيراد المكونات

```typescript
// استيراد جميع المكونات
import {
  // الأخطاء
  DomainError,
  ProductNotFoundError,
  OutOfStockError,
  
  // الفلاتر
  AllExceptionsFilter,
  WsAllExceptionsFilter,
  
  // Guards
  AuthGuard,
  
  // Interceptors
  ResponseInterceptor,
  LoggingInterceptor,
  
  // Decorators
  ApiSuccessResponse,
  CurrentUser,
  
  // DTOs
  PaginationDto,
  
  // Middlewares
  RequestIdMiddleware,
} from '../common';
```

### 2. استخدام الأخطاء المخصصة

```typescript
@Injectable()
export class ProductService {
  async getProduct(id: string) {
    const product = await this.productRepository.findById(id);
    
    if (!product) {
      // استخدام خطأ مخصص بدلاً من NotFoundException
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

### 3. إعداد Controller مع المكونات المشتركة

```typescript
@Controller('products')
@UseGuards(AuthGuard)
@UseInterceptors(ResponseInterceptor, LoggingInterceptor)
@UseFilters(AllExceptionsFilter)
export class ProductController {
  
  @Get()
  @ApiSuccessResponse(ProductDto, 'تم جلب المنتجات بنجاح')
  async getProducts(
    @Query() pagination: PaginationDto,
    @CurrentUser('merchantId') merchantId: string
  ) {
    return this.productService.getProducts(pagination, merchantId);
  }
  
  @Post()
  @ApiCreatedResponse(ProductDto, 'تم إنشاء المنتج بنجاح')
  async createProduct(
    @Body() createProductDto: CreateProductDto,
    @CurrentUser('merchantId') merchantId: string
  ) {
    return this.productService.createProduct(createProductDto, merchantId);
  }
}
```

### 4. إعداد Module الرئيسي

```typescript
@Module({
  imports: [
    // ... باقي الـ imports
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestIdMiddleware)
      .forRoutes('*');
  }
}
```

## 📋 المكونات المتاحة

### 🔴 الأخطاء (Errors)

- **DomainError**: الخطأ الأساسي للأعمال
- **BusinessError**: خطأ الأعمال المتخصص
- **ProductNotFoundError**: خطأ المنتج غير موجود
- **OutOfStockError**: خطأ نفاد المخزون
- **OrderNotFoundError**: خطأ الطلب غير موجود
- **UserNotFoundError**: خطأ المستخدم غير موجود
- **ExternalServiceError**: خطأ الخدمات الخارجية

### 🛡️ Guards

- **AuthGuard**: حارس المصادقة باستخدام JWT

### 🔄 Interceptors

- **ResponseInterceptor**: توحيد شكل الاستجابة
- **LoggingInterceptor**: تسجيل الطلبات والاستجابات

### 🎯 Decorators

- **@ApiSuccessResponse**: توثيق الاستجابة الناجحة
- **@ApiCreatedResponse**: توثيق الاستجابة المحدثة
- **@ApiDeletedResponse**: توثيق الاستجابة المحذوفة
- **@CurrentUser**: الحصول على المستخدم الحالي
- **@CurrentUserId**: الحصول على معرف المستخدم
- **@CurrentMerchantId**: الحصول على معرف التاجر

### 📄 DTOs

- **PaginationDto**: DTO للترقيم
- **PaginatedResponseDto**: استجابة الترقيم

### 🔧 Middlewares

- **RequestIdMiddleware**: إضافة معرف فريد لكل طلب

### 🚫 Filters

- **AllExceptionsFilter**: فلتر موحد لجميع الاستثناءات
- **WsAllExceptionsFilter**: فلتر استثناءات الويب سوكيت

### 📊 Constants

- **ERROR_CODES**: أكواد الأخطاء الموحدة
- **HTTP_MESSAGES**: رسائل HTTP باللغة العربية
- **ALLOWED_DARK_BRANDS**: الألوان المسموحة للعلامات التجارية

## 🎨 شكل الاستجابة الموحدة

### استجابة ناجحة
```json
{
  "success": true,
  "data": { ... },
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

## 🔍 الترقيم (Pagination)

```typescript
// استخدام الترقيم
const pagination: PaginationDto = {
  page: 1,
  limit: 10,
  search: "منتج",
  sortBy: "createdAt",
  sortOrder: "desc"
};

// استجابة الترقيم
const response: PaginatedResponseDto<ProductDto> = {
  data: [...],
  pagination: {
    page: 1,
    limit: 10,
    total: 100,
    totalPages: 10,
    hasNext: true,
    hasPrev: false
  }
};
```

## 📝 أفضل الممارسات

1. **استخدم الأخطاء المخصصة** بدلاً من الأخطاء العامة
2. **طبق Guards** على جميع الـ Controllers التي تحتاج مصادقة
3. **استخدم Interceptors** لتوحيد شكل الاستجابة والتسجيل
4. **طبق Filters** للتعامل مع الأخطاء بشكل موحد
5. **استخدم Decorators** لتوثيق API في Swagger
6. **طبق Middlewares** لإضافة معرف فريد لكل طلب

## 🧪 الأمثلة

راجع مجلد `examples/` للحصول على أمثلة كاملة على:
- ProductServiceExample
- ProductControllerExample

## 🔧 التخصيص

يمكنك تخصيص هذه المكونات حسب احتياجات مشروعك:

1. إضافة أكواد أخطاء جديدة في `constants/error-codes.ts`
2. إنشاء فئات أخطاء جديدة في `errors/business-errors.ts`
3. تخصيص شكل الاستجابة في `interceptors/response.interceptor.ts`
4. إضافة Guards جديدة حسب متطلبات الأمان
