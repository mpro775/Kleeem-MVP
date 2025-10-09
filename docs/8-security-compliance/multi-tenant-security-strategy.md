# Multi‑Tenant Strategy — Kaleem AI

> الهدف: عزل بيانات التُجّار (tenants) منطقيًا وأمنيًا، ضمان أداء مستقر لكل تاجر، وتبسيط الصيانة والترحيل، مع قابلية التوسّع.

## 1) نموذج العزل (Isolation Model)
- **Shared DB, Shared Collections** مع **merchantId** إجباري في كل وثيقة (الواقع الحقيقي).
- مبررات:
  - أبسط عملياتيًا وتكلفة أقل.
  - يسمح بفهارس مشتركة مع `merchantId` في بداية الـ compound index.
  - مناسب لحجمنا الحالي وتوزيع الحمل.
  - **MongoDB + Mongoose** يدعم هذا النموذج بشكل ممتاز.
- خارطة ترقية مستقبلية:
  - **Shared DB, Separate Collections per tenant** لبعض الكيانات الثقيلة (مثل `products` إذا تجاوزت الحدود).
  - أو **Database per tenant** لعملاء Enterprise (عند الحاجة القانونية/الأمنية).
  - **Qdrant** يدعم multi-tenancy عبر payload filtering.

## 2) قواعد الوصول (Data Access Policy)
- **قاعدة ذهبية**: لا Query بدون شرط `merchantId` (مطبق فعلياً في جميع repositories).
- **طبقة Repository/Service**:
  - تُحقن `merchantId` من الـ JWT عبر `@CurrentMerchantId()` decorator.
  - جميع methods في repositories تأخذ `merchantId: Types.ObjectId` كمعامل أول.
  - مثال من الكود الحقيقي: `findAllByMerchant(merchantId: Types.ObjectId)`
- **Unique constraints** يجب أن تتضمن `merchantId`:
  - مثال: `(merchantId, slug)`، `(merchantId, source, externalId)` للمنتجات من API.
- **Guards**: `MerchantStateGuard` + `ThrottlerTenantGuard` للتحقق من صحة التاجر.

## 3) المخطط (Schema) وأمثلة
بناءً على الواقع الحقيقي في المشروع:

```ts
@Schema({ timestamps: true })
export class Product {
  @Prop({ required: true, index: true }) merchantId!: Types.ObjectId; // ALWAYS FIRST IN INDEXES
  @Prop({ required: true }) name!: string;
  @Prop({ default: 0 }) price!: number;
  @Prop({ default: true }) isAvailable!: boolean;
  @Prop({ enum: ['active', 'inactive', 'out_of_stock'], default: 'active' }) status!: string;
  @Prop({ type: Types.ObjectId, ref: 'Category' }) category!: Types.ObjectId;
  @Prop({ type: String, default: null }) slug?: string | null;
  @Prop({ enum: ['manual', 'api'], required: true }) source!: 'manual' | 'api';
  @Prop({ type: String, default: null }) externalId?: string | null;
  // ... باقي الحقول
}

// فهارس حقيقية من الكود
ProductSchema.index({ merchantId: 1, status: 1, createdAt: -1, _id: -1 });
ProductSchema.index({ merchantId: 1, slug: 1 }, { unique: true, sparse: true });
ProductSchema.index({ merchantId: 1, source: 1, externalId: 1 }, {
  unique: true,
  partialFilterExpression: { source: "api", externalId: { $type: "string" } }
});
```

- **Soft delete**: غير مطبق حالياً، لكن يمكن إضافة `deletedAt` مع فهرس جزئي عند الحاجة.

## 4) الحماية Authorization
- **JwtAuthGuard + RolesGuard + MerchantStateGuard** لتمييز:
  - طلبات لوحات التاجر (Merchant Admin) - يستخرج `merchantId` من JWT.
  - طلبات الخدمات الداخلية عبر Service Token.
  - **WebhookSignatureGuard** للتحقق من تواقيع الويبهوكس.
- **Row‑Level Security منطقي** عبر شرط `merchantId` في كل استعلام (مطبق في repositories).
- **Rate limiting** لكل تاجر عبر `ThrottlerTenantGuard`:
  - مفتاح: `m:${merchantId}` للتاجر فقط.
  - مفتاح: `m:${merchantId}:c:${channelId}` للتاجر + القناة.
- **Trust Proxy**: مفعل لاستخراج IP الحقيقي خلف Cloudflare/Nginx.

## 5) الكاش متعدد المستأجرين
- مفتاح Redis يُضمّن `merchantId` دائمًا (الواقع الحقيقي):
  - `v1:products:list:${merchantId}:${dtoKey}` - ProductsCacheKeys.list()
  - `v1:products:popular:${merchantId}:*` - ProductsCacheKeys.popular()
  - `v1:categories:list:${merchantId}` - لقوائم الفئات
- **Cache-busting**: عند تعديل منتج → حذف مفاتيح التاجر فقط.
- **Cache Warming**: نظام `CacheWarmerOrchestrator` يدفئ الكاش تلقائياً.
- **TTL**: قوائم 5–15 دقيقة، عناصر مفردة 1–5 دقائق.

## 6) التخزين الكائني (MinIO) والأسماء
- **الواقع الحقيقي**: يتم استخدام MinIO لتخزين الملفات والصور.
- هيكل المجلدات: `tenants/{merchantId}/...` لعزل ملفات كل تاجر.
- **Storefront domains**: كل تاجر له domain مخصص أو subdomain.
- **Signed URLs**: تستخدم لمنح صلاحيات محدودة زمنياً للوصول للملفات.
- **سياسات الأمان**: تمنع الوصول المباشر وتعتمد على middleware للتحقق من الملكية.

## 7) الويبهوكس/التكاملات
- **WebhookSignatureGuard**: يتحقق من تواقيع الويبهوكس (WhatsApp Cloud, Telegram, WhatsApp QR).
- كل قناة مرتبطة بـ `merchantId` ويتم التحقق من صحة التاجر.
- **Payload**: يشمل `merchantId` للتحقق والتوجيه الصحيح.
- **Providers مدعومة**:
  - WhatsApp Cloud (Meta) - HMAC-SHA256
  - Telegram - Secret Token
  - WhatsApp QR (Evolution) - API Key
- **Rate limiting**: يُطبق على مستوى التاجر + القناة.

## 8) التحليلات والقياس Per‑Tenant
- **ProductMetrics**: يتضمن labels `merchant_id` و `category` للمنتجات.
- **HTTP Metrics**: يُسجل `mongodb_op_latency_ms_bucket` مع dimensions.
- **Cache Metrics**: `cache_hits_total`, `cache_misses_total` لكل تاجر.
- **Qdrant Metrics**: `qdrant_search_duration_ms` مع dimensions.
- **لوحات Grafana**:
  - **Request rate/latency/error** لكل تاجر (Top N).
  - **Cache hit ratio** لكل تاجر.
  - **Qdrant queries** حسب التاجر/القناة.
  - **Resource usage** per tenant للكشف عن outliers.

## 9) الترقيات والترحيل
- **Migration Scripts**: تقرأ بـ batches لكل `merchantId` لتجنب قفل المجموعة.
- **Background Indexes**: جميع الفهارس الجديدة تُنشأ في الخلفية.
- **Feature Flags**: للتحديثات الكبيرة مع إمكانية rollback.
- **Testing**: قياس تأثير الأداء لكل تاجر قبل التعميم.
- **Monitoring**: مراقبة index usage و cardinality أثناء الترقية.
- **Backup Strategy**: MongoDB backups + point-in-time recovery.

## 10) اختبارات الاعتماد (Acceptance Tests)
- **وحدة + تكامل**: متوفرة في `Backend/src/**/__tests__/` و `Backend/test/`
  - كل اختبار يستخدم `merchantId` مزيف ويؤكد منع الوصول المتبادل.
  - فحوص unique per tenant تعمل كما هو متوقع (مثل slug uniqueness).
- **E2E**: متوفرة في `Frontend/tests/e2e/` و `Backend/test/e2e/`
  - تسجيل دخول تاجر A وB، إنشاء نفس `slug` → نجاح A وفشل عبور لـ B.
  - سرد منتجات A لا يعرض منتجات B (Assertions على العدد والمحتوى).
- **Load tests**: متوفرة في `Backend/test/k6/`
  - توزيع الحمل على 5–10 تجار، قياس p95 لكل تاجر بشكل مستقل.
  - اختبار حدود المعدل (rate limiting) لكل تاجر.

## 11) نقاط قرار (Playbook)
- **Tenant Onboarding**:
  - إنشاء قنوات افتراضية (WhatsApp, Telegram).
  - توليد slug فريد للمتجر.
  - إعداد webhook URLs مخصصة.
- **Offboarding/Export**:
  - ملف NDJSON/CSV per-collection مصفّى بـ `merchantId`.
  - حذف جميع البيانات المرتبطة بالتاجر.
- **Data Residency** (مستقبلي): خيار DB per tenant لعملاء Enterprise.
- **Scaling Decisions**: مراقبة index cardinality و query patterns لتقرير الانتقال لنماذج أخرى.

## 12) معايير القبول
- ✅ **لا توجد استعلامات بدون `merchantId`** (مطبق في جميع repositories).
- ✅ **لا تسريب بيانات بين التجار** (اختبارات E2E خضراء).
- ✅ **زمن استجابة p95 لكل تاجر** في النطاق المتفق عليه (<300ms لقوائم المنتجات الباردة).
- ✅ **Rate limiting فعال** لكل تاجر (اختبارات الحمل تمر).
- ✅ **Unique constraints تعمل** per tenant (اختبارات الوحدة تمر).
- ✅ **Cache invalidation** تعمل بشكل صحيح عند تحديث بيانات التاجر.

