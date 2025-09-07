# نظام إدارة الأخطاء - Kaleem Bot

## نظرة عامة

نظام إدارة الأخطاء في Kaleem Bot مصمم لتوفير معالجة موحدة ومتسقة للأخطاء عبر جميع الخدمات. يوفر النظام تسجيل مفصل للأخطاء، تصنيفها حسب الشدة والنوع، وإعادة استجابة منسقة للعملاء.

## المكونات الرئيسية

### 1. أكواد الأخطاء (`src/common/constants/error-codes.ts`)

يحتوي على جميع أكواد الأخطاء المستخدمة في النظام:

```typescript
export const ERROR_CODES = {
  // أخطاء عامة
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  
  // أخطاء المحادثة والذكاء الاصطناعي
  CHAT_SESSION_NOT_FOUND: 'CHAT_SESSION_NOT_FOUND',
  AI_SERVICE_UNAVAILABLE: 'AI_SERVICE_UNAVAILABLE',
  
  // أخطاء التكامل
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  WEBHOOK_FAILED: 'WEBHOOK_FAILED',
  
  // أخطاء الأمان
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
  
  // ... والمزيد
};
```

### 2. الأخطاء التجارية (`src/common/errors/business-errors.ts`)

فئات الأخطاء المتخصصة لكل نوع من أنواع الأخطاء:

```typescript
// أخطاء المنتجات
export class ProductNotFoundError extends BusinessError {
  constructor(productId: string) {
    super(ERROR_CODES.NOT_FOUND, 'المنتج غير موجود', HttpStatus.NOT_FOUND, { productId });
  }
}

// أخطاء المحادثة
export class ChatSessionNotFoundError extends BusinessError {
  constructor(sessionId: string) {
    super(ERROR_CODES.CHAT_SESSION_NOT_FOUND, 'جلسة المحادثة غير موجودة', HttpStatus.NOT_FOUND, { sessionId });
  }
}

// أخطاء التكامل
export class ExternalServiceError extends BusinessError {
  constructor(serviceName: string, originalError?: any) {
    super(ERROR_CODES.EXTERNAL_SERVICE_ERROR, `خطأ في خدمة ${serviceName}`, HttpStatus.BAD_GATEWAY, { serviceName, originalError });
  }
}
```

### 3. فلتر الأخطاء المحسن (`src/common/filters/all-exceptions.filter.ts`)

معالجة موحدة لجميع أنواع الأخطاء:

- **HttpException**: معالجة أخطاء HTTP المخصصة
- **MongoDB Errors**: معالجة أخطاء قاعدة البيانات
- **Axios Errors**: معالجة أخطاء الطلبات الخارجية
- **JWT Errors**: معالجة أخطاء التوكن

### 4. خدمة إدارة الأخطاء (`src/common/services/error-management.service.ts`)

خدمة مركزية لتسجيل وإدارة الأخطاء:

```typescript
@Injectable()
export class ErrorManagementService {
  // تسجيل خطأ عام
  async logError(error: Error | string, context?: any): Promise<string>
  
  // تسجيل خطأ أمان
  async logSecurityError(activity: string, context?: any): Promise<string>
  
  // تسجيل خطأ تكامل
  async logIntegrationError(serviceName: string, error: Error | string, context?: any): Promise<string>
  
  // تسجيل خطأ أعمال
  async logBusinessError(code: string, message: string, context?: any): Promise<string>
  
  // إحصائيات الأخطاء
  async getErrorStats(filters?: any): Promise<any>
}
```

### 5. إنترسبتور تسجيل الأخطاء (`src/common/interceptors/error-logging.interceptor.ts`)

تسجيل تلقائي للأخطاء في كل طلب:

```typescript
@Injectable()
export class ErrorLoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((error) => {
        // تسجيل الخطأ تلقائياً
        this.errorManagementService.logError(error, context);
        return throwError(() => error);
      }),
    );
  }
}
```

## كيفية الاستخدام

### 1. في الخدمات

```typescript
@Injectable()
export class ProductsService {
  constructor(
    private readonly errorManagementService: ErrorManagementService,
  ) {}

  async findOne(id: string, merchantId: string) {
    try {
      const product = await this.productModel.findOne({ _id: id, merchantId });
      
      if (!product) {
        throw new ProductNotFoundError(id);
      }
      
      return product;
    } catch (error) {
      // تسجيل الخطأ
      await this.errorManagementService.logError(error, {
        merchantId,
        details: { action: 'find_one_product', productId: id }
      });
      throw error;
    }
  }
}
```

### 2. في الوحدات

```typescript
@Module({
  imports: [
    ErrorManagementModule, // إضافة وحدة إدارة الأخطاء
    // ... باقي الوحدات
  ],
  providers: [ProductsService],
  controllers: [ProductsController],
})
export class ProductsModule {}
```

### 3. في main.ts

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // إضافة فلتر الأخطاء المحسن
  const allExceptionsFilter = app.get(AllExceptionsFilter);
  app.useGlobalFilters(allExceptionsFilter);
  
  // إضافة إنترسبتور تسجيل الأخطاء
  app.useGlobalInterceptors(
    app.get(ErrorLoggingInterceptor),
  );
  
  await app.listen(3000);
}
```

## تصنيف الأخطاء

### حسب الشدة (Severity)

- **Critical**: أخطاء حرجة تؤثر على عمل النظام
  - `DATABASE_ERROR`
  - `EXTERNAL_SERVICE_ERROR`
  - `AI_SERVICE_UNAVAILABLE`

- **High**: أخطاء عالية الخطورة
  - `SUSPICIOUS_ACTIVITY`
  - `IP_BLOCKED`
  - `LICENSE_EXPIRED`

- **Medium**: أخطاء متوسطة الخطورة
  - `VALIDATION_ERROR`
  - `CONFLICT`
  - `RATE_LIMIT_EXCEEDED`

- **Low**: أخطاء منخفضة الخطورة
  - `NOT_FOUND`
  - `BUSINESS_RULE_VIOLATION`

### حسب النوع (Category)

- **Security**: أخطاء أمنية
- **Integration**: أخطاء التكامل مع الخدمات الخارجية
- **Technical**: أخطاء تقنية
- **Business**: أخطاء أعمال

## استجابة الأخطاء

جميع الأخطاء تعيد استجابة موحدة:

```json
{
  "status": 404,
  "code": "NOT_FOUND",
  "message": "المنتج غير موجود",
  "details": {
    "productId": "507f1f77bcf86cd799439011"
  },
  "requestId": "req_1234567890",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## المراقبة والتحليل

### إحصائيات الأخطاء

```typescript
const stats = await errorManagementService.getErrorStats({
  merchantId: 'merchant_123',
  severity: 'high',
  from: new Date('2024-01-01'),
  to: new Date('2024-01-31')
});
```

### تنظيف الأخطاء القديمة

```typescript
// حذف الأخطاء الأقدم من 30 يوم
const deletedCount = await errorManagementService.cleanupOldErrors(30);
```

## أفضل الممارسات

### 1. استخدام الأخطاء المخصصة

```typescript
// ❌ خطأ
throw new Error('Product not found');

// ✅ صحيح
throw new ProductNotFoundError(productId);
```

### 2. تسجيل السياق

```typescript
await this.errorManagementService.logError(error, {
  userId: request.user?.userId,
  merchantId: request.user?.merchantId,
  requestId: request.requestId,
  details: { action: 'create_product', dto: createProductDto }
});
```

### 3. معالجة الأخطاء في الطبقات المناسبة

```typescript
// في الخدمة - رمي الأخطاء المخصصة
async findProduct(id: string) {
  const product = await this.productModel.findById(id);
  if (!product) {
    throw new ProductNotFoundError(id);
  }
  return product;
}

// في الكنترولر - معالجة الأخطاء
async getProduct(id: string) {
  try {
    return await this.productsService.findProduct(id);
  } catch (error) {
    // الخطأ سيتم معالجته تلقائياً بواسطة AllExceptionsFilter
    throw error;
  }
}
```

### 4. تسجيل أخطاء التكامل

```typescript
try {
  const result = await externalApi.call();
  return result;
} catch (error) {
  await this.errorManagementService.logIntegrationError(
    'external_api',
    error,
    { merchantId, action: 'sync_data' }
  );
  throw new ExternalServiceError('External API', error);
}
```

## التطوير المستقبلي

1. **قاعدة بيانات الأخطاء**: حفظ الأخطاء في قاعدة بيانات للمراجعة والتحليل
2. **تنبيهات الأخطاء**: إرسال تنبيهات للأخطاء الحرجة
3. **لوحة تحكم الأخطاء**: واجهة لإدارة ومراقبة الأخطاء
4. **تحليل الأخطاء**: استخدام الذكاء الاصطناعي لتحليل أنماط الأخطاء
5. **التعافي التلقائي**: محاولة إصلاح بعض الأخطاء تلقائياً

## الخلاصة

نظام إدارة الأخطاء في Kaleem Bot يوفر:

- ✅ معالجة موحدة ومتسقة للأخطاء
- ✅ تسجيل مفصل مع السياق
- ✅ تصنيف الأخطاء حسب الشدة والنوع
- ✅ استجابات منسقة للعملاء
- ✅ مراقبة وتحليل الأخطاء
- ✅ سهولة الاستخدام والتطوير

هذا النظام يساعد في تحسين جودة الخدمة، تسريع تشخيص المشاكل، وتوفير تجربة مستخدم أفضل.
