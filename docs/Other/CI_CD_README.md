# 🚀 CI/CD Pipeline - Kaleem Frontend

## 📋 نظرة عامة

تم إعداد نظام CI/CD شامل لضمان جودة الكود والاختبارات التلقائية. النظام يتضمن:

- 🔍 **فحص جودة الكود** - ESLint + Prettier
- 🧪 **اختبارات تلقائية** - Unit Tests + Performance
- 📊 **تقارير التغطية** - Codecov Integration
- 🚀 **نشر تلقائي** - Production Deployment
- 🔄 **تحديثات تلقائية** - Dependabot

## 🏗️ ملفات Workflow

### 1. **`ci.yml`** - Pipeline الرئيسي
- **التشغيل:** Push/Pull Request على `main` و `develop`
- **المهام:**
  - فحص جودة الكود
  - اختبارات الوحدة (Node 18, 20, 21)
  - تقارير التغطية
  - النشر التلقائي (main فقط)
  - ملخص النتائج

### 2. **`quick-tests.yml`** - اختبارات سريعة
- **التشغيل:** كل Push/PR
- **المهام:**
  - فحص سريع للكود
  - اختبارات أساسية
  - تحليل الأداء السريع
  - timeout: 10 دقائق

### 3. **`nightly-tests.yml`** - اختبارات ليلية
- **التشغيل:** يومياً في الساعة 3 صباحاً
- **المهام:**
  - فحص شامل للكود
  - اختبارات شاملة
  - تحليل الأداء
  - اختبارات التغطية

## 🎯 Status Checks المطلوبة

### **للفرع الرئيسي (`main`):**
```
✅ lint-and-format
✅ unit-tests
✅ coverage
```

### **للفروع الأخرى:**
```
✅ quick-tests
```

## 🔧 كيفية الاستخدام

### **1. تشغيل الاختبارات محلياً**
```bash
# اختبارات سريعة
npm test -- --run

# اختبارات مع التغطية
npm run test:coverage

# تحليل الأداء
npm run test:performance
```

### **2. فحص جودة الكود**
```bash
# ESLint
npm run lint

# Prettier
npm run format:check
npm run format:write
```

### **3. فحص الأمان**
```bash
npm audit
npm audit --fix
```

## 📊 مراقبة الأداء

### **سكريبت مراقبة الأداء**
```bash
# تشغيل مع تحليل
npm run test:performance

# تعيين baseline جديد
npm run test:performance:baseline
```

### **لوحة التحكم**
- افتح `test-dashboard.html` في المتصفح
- عرض الإحصائيات في الوقت الفعلي
- تصدير التقارير

## 🛡️ Branch Protection

### **القواعد المطلوبة:**
- ✅ **Pull Request مطلوب** للدمج
- ✅ **موافقات مطلوبة** (main: 2, develop: 1)
- ✅ **Status Checks** يجب أن تنجح
- ✅ **Branches** يجب أن تكون محدثة

### **إعداد Branch Protection:**
1. Repository → Settings → Branches
2. Add rule → Branch name pattern
3. تحديد القواعد المطلوبة
4. Save changes

## 🔄 Dependabot

### **التحديثات التلقائية:**
- **npm:** أسبوعياً (الاثنين 9 صباحاً)
- **GitHub Actions:** شهرياً
- **Docker:** شهرياً

### **إعدادات التحديث:**
- تجاهل التحديثات الكبيرة (Major)
- فحص الاختبارات قبل الدمج
- استهداف فرع `develop`

## 📋 Templates

### **Issue Templates:**
- 🐛 **تقرير خطأ** - `bug_report.md`
- ✨ **طلب ميزة** - `feature_request.md`

### **Pull Request Template:**
- 📝 **وصف التغييرات**
- 🎯 **نوع التغيير**
- 🔍 **الاختبارات**
- 📱 **الأجهزة المتأثرة**

## 🚨 استكشاف الأخطاء

### **مشاكل شائعة:**

#### **1. الاختبارات تفشل**
```bash
# تشغيل اختبار واحد
npm test -- src/path/to/test.test.tsx

# تشغيل مع verbose
npm test -- --reporter=verbose --run
```

#### **2. مشاكل ESLint**
```bash
# فحص ملف واحد
npm run lint src/path/to/file.tsx

# إصلاح تلقائي
npm run lint:fix
```

#### **3. مشاكل الأداء**
```bash
# تحليل مفصل
npm run test:performance

# مقارنة مع baseline
npm run test:performance:baseline
```

### **Logs و Artifacts:**
- **GitHub Actions:** Actions tab
- **Test Results:** test-performance/ folder
- **Coverage:** coverage/ folder
- **Artifacts:** Actions → Artifacts

## 📈 المقاييس والأهداف

### **أهداف الأداء:**
- ⚡ **اختبارات سريعة:** < 100ms
- 🟡 **اختبارات متوسطة:** 100-500ms
- 🟠 **اختبارات بطيئة:** 500-1000ms
- 🔴 **اختبارات بطيئة جداً:** > 1000ms

### **أهداف التغطية:**
- 📊 **إجمالي التغطية:** > 80%
- 🧪 **اختبارات الوحدة:** > 90%
- 🔧 **المكونات الأساسية:** > 95%

## 🔮 التطوير المستقبلي

### **الميزات المخطط لها:**
- 🎭 **اختبارات E2E** - Playwright
- 📱 **اختبارات Mobile** - Device Testing
- 🚀 **Deployment Strategies** - Blue/Green
- 📊 **Advanced Analytics** - Performance Metrics

### **التكاملات:**
- **Slack/Discord:** إشعارات تلقائية
- **Jira:** ربط Issues
- **SonarQube:** تحليل جودة الكود
- **AWS/Cloud:** نشر تلقائي

## 📞 الدعم

### **فريق CI/CD:**
- **Lead:** @kaleem-team
- **Support:** GitHub Issues
- **Documentation:** هذا الملف

### **الموارد:**
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Vitest Docs](https://vitest.dev/)
- [ESLint Docs](https://eslint.org/)

---

*تم إنشاء هذا الملف بواسطة نظام CI/CD* 🤖

**آخر تحديث:** {{ new Date().toLocaleDateString('ar-SA') }}
