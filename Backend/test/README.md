# Testing Guide

هذا الدليل يوضح كيفية تشغيل واستخدام نظام الاختبارات الشامل للمشروع.

## أنواع الاختبارات

### 1. اختبارات الوحدة (Unit Tests)

تختبر الوظائف الفردية والخدمات بمعزل عن التبعيات الخارجية.

**الملفات:** `src/**/*.spec.ts`

**تشغيل:**

```bash
# تشغيل جميع اختبارات الوحدة
npm run test:unit

# تشغيل مع مراقبة التغييرات
npm run test:unit:watch

# تشغيل مع تقرير التغطية
npm run test:unit:cov
```

**الخدمات المختبرة:**

- ✅ TokenService (إنشاء وتدوير وإبطال التوكنات)
- ✅ AuthService (تسجيل وتسجيل دخول)
- ✅ OrdersService (إنشاء وإدارة الطلبات)
- ✅ ProductsService (إدارة المنتجات والمخزون)
- ✅ VectorService (البحث الدلالي والفهرسة)

### 2. اختبارات التكامل (Integration Tests)

تختبر التفاعل بين المكونات المختلفة مع قاعدة بيانات حقيقية.

**الملفات:** `test/integration/**/*.integration.spec.ts`

**تشغيل:**

```bash
# تشغيل اختبارات التكامل
npm run test:integration

# تشغيل مع مراقبة التغييرات
npm run test:integration:watch
```

**المميزات المختبرة:**

- ✅ API endpoints مع MongoDB Memory Server
- ✅ المصادقة والترخيص
- ✅ إدارة المنتجات والطلبات
- ✅ معالجة الأخطاء والتحقق من صحة البيانات
- ✅ Rate limiting

### 3. اختبارات النهاية إلى النهاية (E2E Tests)

تختبر السيناريوهات الكاملة من منظور المستخدم النهائي.

**الملفات:** `test/e2e/**/*.e2e-spec.ts`

**تشغيل:**

```bash
# تشغيل اختبارات E2E
npm run test:e2e

# تشغيل مع مراقبة التغييرات
npm run test:e2e:watch
```

**السيناريو الكامل للتاجر:**

- ✅ تسجيل حساب جديد
- ✅ تفعيل الحساب وتسجيل الدخول
- ✅ إنشاء وإدارة المنتجات
- ✅ استقبال ومعالجة الطلبات
- ✅ ردود البوت والذكي الاصطناعي
- ✅ التواصل عبر WebSocket
- ✅ التقارير والإحصائيات
- ✅ إدارة الجلسات وتسجيل الخروج

## تشغيل جميع الاختبارات

```bash
# تشغيل جميع أنواع الاختبارات
npm run test:all

# تشغيل للـ CI/CD (مع تقرير التغطية)
npm run test:ci
```

## متطلبات التغطية

تم تعيين الحد الأدنى للتغطية على:

- **Statements:** 70%
- **Branches:** 60%
- **Lines:** 70%
- **Functions:** 70%

## إعداد البيئة للاختبارات

### متغيرات البيئة المطلوبة

```bash
NODE_ENV=test
MONGO_URI=mongodb://localhost:27017/test-db
REDIS_URL=redis://localhost:6379
JWT_SECRET=test-secret
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
```

### الخدمات الخارجية

- **MongoDB:** يتم استخدام MongoDB Memory Server تلقائياً
- **Redis:** يتم استخدام ioredis-mock للاختبارات
- **Vector Service:** يتم محاكاة خدمة الـ embedding

## هيكل ملفات الاختبار

```
test/
├── README.md                 # هذا الملف
├── jest.setup.ts            # إعداد عام للاختبارات
├── integration-setup.ts     # إعداد اختبارات التكامل
├── e2e-setup.ts            # إعداد اختبارات E2E
├── integration/
│   └── app.integration.spec.ts
└── e2e/
    └── merchant-journey.e2e-spec.ts
```

## نصائح للمطورين

### كتابة اختبارات جديدة

1. **اختبارات الوحدة:**

   ```typescript
   describe('ServiceName', () => {
     let service: ServiceName;

     beforeEach(async () => {
       // إعداد الـ mocks والتبعيات
     });

     it('should do something', () => {
       // الاختبار
     });
   });
   ```

2. **اختبارات التكامل:**
   ```typescript
   describe('API Integration', () => {
     let app: INestApplication;

     beforeAll(async () => {
       // إعداد التطبيق وقاعدة البيانات
     });

     it('should handle API call', async () => {
       await request(app.getHttpServer())
         .post('/api/endpoint')
         .send(data)
         .expect(200);
     });
   });
   ```

### أفضل الممارسات

1. **استخدم أسماء وصفية للاختبارات**
2. **اختبر السيناريوهات الإيجابية والسلبية**
3. **استخدم الـ mocks للخدمات الخارجية**
4. **تأكد من تنظيف البيانات بعد كل اختبار**
5. **اكتب اختبارات مستقلة (لا تعتمد على ترتيب التشغيل)**

### تشخيص الأخطاء

```bash
# تشغيل اختبار محدد
npm run test:unit -- --testNamePattern="TokenService"

# تشغيل مع تفاصيل إضافية
npm run test:unit -- --verbose

# تشغيل في وضع التشخيص
npm run test:debug
```

## التكامل مع CI/CD

يمكن استخدام الأمر التالي في pipeline الـ CI/CD:

```bash
npm run test:ci
```

هذا الأمر سيقوم بـ:

1. تشغيل اختبارات الوحدة مع تقرير التغطية
2. تشغيل اختبارات التكامل
3. تشغيل اختبارات E2E
4. فشل البناء إذا لم تتحقق متطلبات التغطية

## إضافة اختبارات جديدة

عند إضافة خدمة أو ميزة جديدة:

1. أنشئ ملف `service-name.spec.ts` في نفس مجلد الخدمة
2. أضف اختبارات التكامل إذا كانت الخدمة تتفاعل مع APIs
3. حدّث اختبارات E2E إذا كانت جزء من تدفق المستخدم الرئيسي
4. تأكد من الحفاظ على نسبة التغطية المطلوبة
