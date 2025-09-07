# التكامل مع Sentry - Kaleem Bot

## نظرة عامة

تم إضافة التكامل مع Sentry لتوفير مراقبة متقدمة للأخطاء وتتبع الأداء في Kaleem Bot. يوفر هذا التكامل:

- ✅ مراقبة الأخطاء في الوقت الفعلي
- ✅ تتبع الأداء والاستجابة
- ✅ تحليل مفصل للأخطاء
- ✅ تنبيهات تلقائية
- ✅ لوحة تحكم متقدمة

## المكونات الرئيسية

### 1. خدمة Sentry (`src/common/services/sentry.service.ts`)

الخدمة الرئيسية للتعامل مع Sentry:

```typescript
@Injectable()
export class SentryService {
  // تهيئة Sentry
  initialize(): void
  
  // تسجيل خطأ
  captureException(error: Error | string, context?: SentryContext): string
  
  // تسجيل رسالة
  captureMessage(message: string, level?: Sentry.SeverityLevel, context?: SentryContext): string
  
  // بدء تتبع الأداء
  startTransaction(name: string, operation: string, context?: SentryContext): Sentry.Transaction
  
  // إضافة سياق
  setContext(name: string, context: Record<string, any>): void
  
  // إضافة تاج
  setTag(key: string, value: string): void
  
  // إضافة مستخدم
  setUser(user: { id: string; email?: string; username?: string; ip_address?: string }): void
}
```

### 2. إنترسبتور تتبع الأداء (`src/common/interceptors/performance-tracking.interceptor.ts`)

تتبع تلقائي لأداء الطلبات:

```typescript
@Injectable()
export class PerformanceTrackingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // بدء تتبع الأداء لكل طلب
    const transaction = this.sentryService.startTransaction(operationName, operationType, context);
    
    // قياس وقت الاستجابة
    // تصنيف الأداء (سريع/متوسط/بطيء)
    // تسجيل البيانات في Sentry
  }
}
```

### 3. كنترولر المراقبة (`src/common/controllers/error-monitoring.controller.ts`)

واجهة API لمراقبة الأخطاء:

```typescript
@Controller('monitoring/errors')
export class ErrorMonitoringController {
  // إحصائيات الأخطاء
  @Get('stats')
  async getErrorStats()
  
  // حالة Sentry
  @Get('sentry/status')
  async getSentryStatus()
  
  // حالة الصحة العامة
  @Get('health')
  async getHealthStatus()
}
```

## الإعداد والتكوين

### 1. متغيرات البيئة

أضف المتغيرات التالية إلى ملف `.env`:

```env
# Sentry Configuration
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
NODE_ENV=production
APP_VERSION=1.0.0

# Optional: Sentry Performance Settings
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_PROFILES_SAMPLE_RATE=0.1
```

### 2. إعدادات البيئة المختلفة

#### التطوير (Development)
```env
NODE_ENV=development
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SENTRY_TRACES_SAMPLE_RATE=1.0
SENTRY_PROFILES_SAMPLE_RATE=1.0
```

#### الإنتاج (Production)
```env
NODE_ENV=production
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_PROFILES_SAMPLE_RATE=0.1
```

## كيفية الاستخدام

### 1. تسجيل الأخطاء تلقائياً

الأخطاء تُسجل تلقائياً في Sentry من خلال:

```typescript
// في الخدمات
async findProduct(id: string) {
  try {
    const product = await this.productModel.findById(id);
    if (!product) {
      throw new ProductNotFoundError(id);
    }
    return product;
  } catch (error) {
    // سيتم تسجيل الخطأ تلقائياً في Sentry
    await this.errorManagementService.logError(error, {
      merchantId,
      details: { action: 'find_product', productId: id }
    });
    throw error;
  }
}
```

### 2. تسجيل أخطاء التكامل

```typescript
try {
  const result = await externalApi.call();
  return result;
} catch (error) {
  // تسجيل في Sentry مع سياق مفصل
  await this.errorManagementService.logIntegrationError(
    'external_api',
    error,
    { merchantId, action: 'sync_data' }
  );
  throw new ExternalServiceError('External API', error);
}
```

### 3. تسجيل أخطاء الأمان

```typescript
// تسجيل نشاط مشبوه
await this.errorManagementService.logSecurityError(
  'Multiple failed login attempts',
  {
    userId: 'user_123',
    ip: '192.168.1.1',
    details: { attempts: 5, timeWindow: '5 minutes' }
  }
);
```

### 4. تتبع الأداء المخصص

```typescript
// بدء تتبع أداء عملية معينة
const transaction = this.errorManagementService.startPerformanceTracking(
  'Product Sync',
  'database.operation',
  { merchantId, operation: 'sync_products' }
);

try {
  // العملية المطلوب تتبعها
  await this.syncProducts(merchantId);
  transaction.setStatus('ok');
} catch (error) {
  transaction.setStatus('internal_error');
  throw error;
} finally {
  transaction.finish();
}
```

## تصنيف الأخطاء في Sentry

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

## التاجات والسياق

### التاجات الافتراضية

```typescript
{
  service: 'kaleem-bot',
  version: '1.0.0',
  environment: 'production'
}
```

### التاجات الديناميكية

```typescript
{
  errorCode: 'NOT_FOUND',
  severity: 'medium',
  category: 'business',
  merchantId: 'merchant_123',
  userId: 'user_456'
}
```

### السياق الإضافي

```typescript
{
  merchantId: 'merchant_123',
  requestId: 'req_789',
  url: '/api/products/123',
  method: 'GET',
  userAgent: 'Mozilla/5.0...',
  details: {
    action: 'find_product',
    productId: '123'
  }
}
```

## مراقبة الأداء

### تتبع الطلبات

كل طلب HTTP يتم تتبعه تلقائياً:

- **وقت الاستجابة**: قياس الوقت المستغرق
- **حجم الاستجابة**: حجم البيانات المُرسلة
- **حالة الطلب**: نجاح أو فشل
- **تصنيف الأداء**: سريع/متوسط/بطيء

### تتبع العمليات المخصصة

```typescript
// تتبع عملية مزامنة المنتجات
const transaction = this.sentryService.startTransaction(
  'Product Sync',
  'database.operation',
  { merchantId }
);

// إضافة خطوات فرعية
const dbSpan = transaction.startChild({
  op: 'db.query',
  description: 'Fetch products from database'
});

// إنهاء الخطوة
dbSpan.finish();

// إنهاء المعاملة
transaction.finish();
```

## API المراقبة

### 1. إحصائيات الأخطاء

```http
GET /api/monitoring/errors/stats?merchantId=123&severity=high&from=2024-01-01&to=2024-01-31
```

الاستجابة:
```json
{
  "total": 150,
  "bySeverity": {
    "critical": 5,
    "high": 25,
    "medium": 80,
    "low": 40
  },
  "byCategory": {
    "security": 10,
    "integration": 45,
    "technical": 60,
    "business": 35
  },
  "byCode": {
    "NOT_FOUND": 30,
    "VALIDATION_ERROR": 25,
    "EXTERNAL_SERVICE_ERROR": 20
  },
  "recentErrors": [...],
  "sentryEnabled": true
}
```

### 2. حالة Sentry

```http
GET /api/monitoring/errors/sentry/status
```

الاستجابة:
```json
{
  "enabled": true,
  "currentUserId": "user_123",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 3. حالة الصحة العامة

```http
GET /api/monitoring/errors/health
```

الاستجابة:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "services": {
    "errorManagement": {
      "status": "active",
      "totalErrors": 150
    },
    "sentry": {
      "status": "active",
      "enabled": true
    }
  },
  "summary": {
    "totalErrors": 150,
    "bySeverity": {...},
    "byCategory": {...},
    "recentErrors": 10
  }
}
```

## الأمان والخصوصية

### تصفية البيانات الحساسة

```typescript
beforeSend(event, hint) {
  // إزالة البيانات الحساسة
  if (event.request?.headers) {
    delete event.request.headers.authorization;
    delete event.request.headers.cookie;
    delete event.request.headers['x-api-key'];
  }
  
  // تصفية أخطاء التحقق
  if (event.exception?.values?.[0]?.type === 'ValidationError') {
    return null;
  }
  
  return event;
}
```

### إعدادات الأمان

- **إزالة التوكنات**: لا يتم إرسال توكنات المصادقة
- **إزالة الكوكيز**: لا يتم إرسال الكوكيز
- **تصفية الأخطاء**: أخطاء التحقق لا تُرسل
- **تشفير البيانات**: جميع البيانات مشفرة في النقل

## أفضل الممارسات

### 1. استخدام السياق المناسب

```typescript
// ✅ صحيح
await this.errorManagementService.logError(error, {
  userId: request.user?.userId,
  merchantId: request.user?.merchantId,
  requestId: request.requestId,
  details: { action: 'create_product', dto: createProductDto }
});

// ❌ خطأ
await this.errorManagementService.logError(error);
```

### 2. تصنيف الأخطاء بدقة

```typescript
// ✅ صحيح
throw new ProductNotFoundError(productId);

// ❌ خطأ
throw new Error('Product not found');
```

### 3. تتبع الأداء للعمليات المهمة

```typescript
// تتبع عمليات قاعدة البيانات
const transaction = this.sentryService.startTransaction(
  'Database Query',
  'db.query',
  { merchantId, operation: 'find_products' }
);

// تتبع عمليات التكامل
const transaction = this.sentryService.startTransaction(
  'External API Call',
  'http.client',
  { merchantId, service: 'payment_gateway' }
);
```

### 4. مراقبة الأخطاء المتكررة

```typescript
// تسجيل أخطاء التكامل مع تفاصيل
await this.errorManagementService.logIntegrationError(
  'payment_gateway',
  error,
  {
    merchantId,
    action: 'process_payment',
    details: {
      amount: payment.amount,
      currency: payment.currency,
      retryCount: retryCount
    }
  }
);
```

## التطوير المستقبلي

### 1. قاعدة بيانات الأخطاء
- حفظ الأخطاء محلياً للمراجعة
- تحليل أنماط الأخطاء
- إحصائيات مفصلة

### 2. تنبيهات ذكية
- تنبيهات للأخطاء الحرجة
- تنبيهات للأداء البطيء
- تنبيهات للنشاط المشبوه

### 3. لوحة تحكم متقدمة
- واجهة رسومية للمراقبة
- رسوم بيانية للأخطاء
- تحليل الاتجاهات

### 4. التعافي التلقائي
- محاولة إصلاح الأخطاء تلقائياً
- إعادة المحاولة للعمليات الفاشلة
- تبديل للخدمات البديلة

## الخلاصة

التكامل مع Sentry يوفر:

- ✅ مراقبة شاملة للأخطاء
- ✅ تتبع الأداء في الوقت الفعلي
- ✅ تحليل مفصل ومتقدم
- ✅ تنبيهات ذكية
- ✅ أمان وخصوصية عالية
- ✅ سهولة الاستخدام والتطوير

هذا التكامل يساعد في:
- تحسين جودة الخدمة
- تسريع تشخيص المشاكل
- تحسين الأداء
- توفير تجربة مستخدم أفضل
- تقليل وقت التوقف
