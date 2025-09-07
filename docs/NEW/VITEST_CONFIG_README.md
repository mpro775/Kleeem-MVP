# ⚡ إعدادات Vitest المحسنة - Kaleem Frontend

## 📋 نظرة عامة

تم إنشاء مجموعة من ملفات إعدادات Vitest المحسنة لتحسين أداء الاختبارات وتنظيمها حسب الاحتياجات المختلفة.

## 🏗️ ملفات الإعدادات

### 1. **`vitest.config.ts`** - الإعداد الرئيسي
- **الاستخدام:** الاختبارات العادية
- **الميزات:**
  - إعدادات متوازنة للأداء والتغطية
  - عتبات تغطية: 75% عام، 85% للمكونات الأساسية
  - 4 forks متوازية
  - timeout: 20 ثانية للاختبار، 10 ثوانٍ للـ hooks

### 2. **`vitest.config.fast.ts`** - اختبارات سريعة
- **الاستخدام:** اختبارات سريعة للـ CI/CD
- **الميزات:**
  - fork واحد للأداء الأفضل
  - timeout: 10 ثوانٍ للاختبار، 5 ثوانٍ للـ hooks
  - عتبات تغطية: 70%
  - إعدادات مبسطة

### 3. **`vitest.config.comprehensive.ts`** - اختبارات شاملة
- **الاستخدام:** اختبارات التغطية الكاملة
- **الميزات:**
  - 2-4 forks متوازية
  - timeout: 30 ثانية للاختبار، 15 ثانية للـ hooks
  - عتبات تغطية: 80% عام، 90% للمكونات الأساسية
  - تقارير متعددة (HTML, LCOV, Cobertura)

### 4. **`vitest.config.parallel.ts`** - اختبارات متوازية
- **الاستخدام:** أقصى أداء متوازي
- **الميزات:**
  - 4-8 forks متوازية
  - timeout: 15 ثانية للاختبار، 8 ثوانٍ للـ hooks
  - عتبات تغطية: 75%
  - إعدادات للأداء الأقصى

### 5. **`vitest.config.e2e.ts`** - اختبارات E2E
- **الاستخدام:** اختبارات End-to-End
- **الميزات:**
  - fork واحد مع عزل كامل
  - timeout: 60 ثانية للاختبار، 30 ثانية للـ hooks
  - عتبات تغطية: 60%
  - إعدادات متخصصة لـ E2E

## 🚀 كيفية الاستخدام

### **الاختبارات العادية:**
```bash
npm test                    # تشغيل عادي
npm run test:run           # تشغيل مرة واحدة
npm run test:watch         # مراقبة التغييرات
npm run test:ui            # واجهة المستخدم
```

### **الاختبارات السريعة:**
```bash
npm run test:fast          # اختبارات سريعة
npm run test:ci            # اختبارات CI
npm run test:debug         # اختبارات debug
```

### **الاختبارات الشاملة:**
```bash
npm run test:comprehensive # اختبارات شاملة
npm run test:coverage      # اختبارات مع التغطية
npm run test:parallel      # اختبارات متوازية
```

### **اختبارات E2E:**
```bash
npm run test:e2e           # اختبارات E2E
npm run e2e                # Playwright E2E
```

### **جميع الاختبارات:**
```bash
npm run test:all           # تشغيل جميع الأنواع
```

## 📊 مقارنة الأداء

| الإعداد | Forks | Timeout | Coverage | الاستخدام |
|---------|-------|---------|----------|-----------|
| **Fast** | 1 | 10s | 70% | CI/CD السريع |
| **Main** | 4 | 20s | 75% | الاستخدام اليومي |
| **Comprehensive** | 2-4 | 30s | 80% | التغطية الكاملة |
| **Parallel** | 4-8 | 15s | 75% | الأداء الأقصى |
| **E2E** | 1 | 60s | 60% | اختبارات E2E |

## 🔧 إعدادات مخصصة

### **إعدادات الأداء:**
```typescript
// في ملف الإعدادات
test: {
  pool: 'forks',           // استخدام forks بدلاً من threads
  poolOptions: {
    forks: {
      singleFork: false,   // السماح بـ forks متعددة
      maxForks: 4,         // عدد أقصى من forks
      minForks: 2,         // عدد أدنى من forks
      isolate: false,      // إيقاف العزل للأداء
      memoryLimit: '2GB',  // حد الذاكرة لكل fork
    }
  },
  maxConcurrency: 4,       // عدد الاختبارات المتزامنة
}
```

### **إعدادات التوقيت:**
```typescript
test: {
  testTimeout: 20000,      // timeout للاختبار
  hookTimeout: 10000,      // timeout للـ hooks
  teardownTimeout: 8000,   // timeout للتنظيف
}
```

### **إعدادات التغطية:**
```typescript
coverage: {
  provider: 'v8',          // مزود التغطية
  reporter: ['text', 'json', 'html', 'lcov'],
  thresholds: {
    global: {
      branches: 75,        // عتبة الفروع
      functions: 75,       // عتبة الدوال
      lines: 75,           // عتبة الأسطر
      statements: 75       // عتبة العبارات
    }
  }
}
```

## 🎯 عتبات التغطية

### **العتبات العامة:**
- **Fast:** 70%
- **Main:** 75%
- **Comprehensive:** 80%
- **Parallel:** 75%
- **E2E:** 60%

### **عتبات المكونات الأساسية:**
- **App:** 85%
- **Context:** 85%
- **Auth:** 85%

## 📁 ملفات Setup

### **`src/test/setup.ts`** - الإعداد العام
- Mock للـ console methods
- Mock للـ JSDOM APIs
- Mock للـ Browser APIs
- Utilities مساعدة

### **`src/test/setup-e2e.ts`** - إعداد E2E
- Mock للـ fetch API
- Mock للـ localStorage
- Mock للـ FormData
- Mock للـ FileReader

## 🔍 استكشاف الأخطاء

### **مشاكل شائعة:**

#### **1. الاختبارات بطيئة:**
```bash
# استخدام الإعداد السريع
npm run test:fast

# تقليل عدد Forks
# تعديل maxForks في الإعدادات
```

#### **2. مشاكل الذاكرة:**
```bash
# تقليل memoryLimit
memoryLimit: '1GB'

# تقليل عدد Forks
maxForks: 2
```

#### **3. مشاكل التوقيت:**
```bash
# زيادة timeout
testTimeout: 30000

# زيادة hook timeout
hookTimeout: 15000
```

### **أوامر التشخيص:**
```bash
# اختبار مع verbose
npm run test:debug

# اختبار واحد
npm test -- src/path/to/test.test.tsx

# اختبار مع coverage
npm run test:coverage
```

## 📈 تحسينات الأداء

### **نصائح للتحسين:**

1. **استخدام Forks بدلاً من Threads:**
   ```typescript
   pool: 'forks'  // أفضل للأداء
   ```

2. **إيقاف العزل:**
   ```typescript
   isolate: false  // أسرع
   ```

3. **تحسين عدد Forks:**
   ```typescript
   maxForks: 4,    // توازن بين الأداء والذاكرة
   ```

4. **إيقاف المراقبة:**
   ```typescript
   watch: false    // للاختبارات السريعة
   ```

5. **استخدام Reporters مناسبة:**
   ```typescript
   reporters: ['basic', 'json']  // أسرع
   ```

## 🚀 التطوير المستقبلي

### **الميزات المخطط لها:**
- **اختبارات متوازية متقدمة** - تقسيم ذكي للاختبارات
- **تحليل الأداء التلقائي** - اكتشاف الاختبارات البطيئة
- **إعدادات ديناميكية** - تعديل تلقائي حسب الأداء
- **تكامل مع CI/CD** - إعدادات تلقائية حسب البيئة

### **التكاملات:**
- **GitHub Actions** - إعدادات تلقائية
- **Docker** - بيئات اختبار معزولة
- **Cloud Testing** - اختبارات موزعة
- **Performance Monitoring** - مراقبة الأداء

## 📞 الدعم

### **فريق الاختبارات:**
- **Lead:** @kaleem-team
- **Support:** GitHub Issues
- **Documentation:** هذا الملف

### **الموارد:**
- [Vitest Docs](https://vitest.dev/)
- [Vitest Config](https://vitest.dev/config/)
- [Testing Library](https://testing-library.com/)

---

*تم إنشاء هذا الملف بواسطة نظام الاختبارات المحسن* ⚡

**آخر تحديث:** {{ new Date().toLocaleDateString('ar-SA') }}
