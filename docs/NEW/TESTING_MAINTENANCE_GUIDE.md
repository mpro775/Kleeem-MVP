# 🛠️ دليل صيانة الاختبارات - مشروع كليم

## 📋 نظرة عامة

هذا الدليل يوضح كيفية صيانة وإدارة نظام الاختبارات في مشروع كليم للحفاظ على جودة وأداء الاختبارات على المدى الطويل.

---

## 🔄 الصيانة اليومية

### ⏰ **المهام اليومية (5-10 دقائق)**

#### 1. مراقبة حالة الاختبارات
```bash
# تشغيل جميع الاختبارات
npm run test

# فحص التغطية
npm run test:coverage

# تشغيل اختبارات محددة إذا لزم الأمر
npm run test -- --reporter=verbose
```

#### 2. مراجعة التقارير
```bash
# عرض تقرير الأداء
cat FINAL_PERFORMANCE_REPORT.md | grep "بطيء جداً"

# فحص الاختبارات الجديدة
git diff --name-only HEAD~1 | grep ".test.tsx"
```

#### 3. تنظيف سريع
```bash
# حذف ملفات مؤقتة
npm run test:clean

# تحديث snapshots إذا لزم الأمر  
npm run test:update-snapshots
```

---

## 📅 الصيانة الأسبوعية

### 🔍 **مراجعة الأداء الأسبوعية**

#### 1. تحليل الاختبارات البطيئة
```typescript
// script/analyze-slow-tests.ts
import { execSync } from 'child_process';

const analyzeSlowTests = () => {
  const result = execSync('npm run test -- --reporter=verbose --run');
  const output = result.toString();
  
  // استخراج الاختبارات البطيئة (>1000ms)
  const slowTests = output
    .split('\n')
    .filter(line => line.includes('ms') && parseInt(line.match(/(\d+)ms/)?.[1] || '0') > 1000)
    .sort((a, b) => {
      const timeA = parseInt(a.match(/(\d+)ms/)?.[1] || '0');
      const timeB = parseInt(b.match(/(\d+)ms/)?.[1] || '0');
      return timeB - timeA;
    });
    
  console.log('🐌 الاختبارات البطيئة:');
  slowTests.forEach(test => console.log(test));
};
```

#### 2. فحص التغطية
```bash
# إنشاء تقرير تغطية مفصل
npm run test:coverage:detailed

# فحص الملفات غير المغطاة
npx nyc report --reporter=text | grep "0%"
```

#### 3. تحديث التوثيق
```markdown
# تحديث TESTING_PROGRESS_REPORT.md
- إجمالي الاختبارات: XXX
- معدل النجاح: XX%
- متوسط وقت التنفيذ: X.Xs
- الاختبارات المضافة هذا الأسبوع: X
```

---

## 🗓️ الصيانة الشهرية

### 🔧 **المراجعة الشاملة الشهرية**

#### 1. تحسين الأداء
```typescript
// تحديد الاختبارات التي تحتاج تحسين
const PERFORMANCE_THRESHOLDS = {
  SLOW: 1000,      // >1s
  VERY_SLOW: 5000, // >5s
  CRITICAL: 10000  // >10s
};

// إعادة هيكلة الاختبارات البطيئة
const optimizeSlowTests = async (testFile: string) => {
  // 1. تحليل سبب البطء
  // 2. تحسين المؤكات (mocks)
  // 3. تقليل التفاعلات غير الضرورية
  // 4. استخدام تقنيات التوازي
};
```

#### 2. تنظيف الكود
```bash
# إزالة الاختبارات المكررة
npm run test:dedupe

# تنظيف ملفات mock غير المستخدمة
find src -name "*.test.tsx" -exec grep -l "vi.mock" {} \; | xargs grep -h "vi.mock" | sort | uniq

# فحص imports غير المستخدمة
npx eslint src/**/*.test.tsx --rule "unused-imports/no-unused-imports: error"
```

#### 3. تحديث المعايير
```json
// vitest.config.ts - تحديث إعدادات الأداء
{
  "test": {
    "timeout": 5000,
    "hookTimeout": 3000,
    "setupFilesAfterEnv": ["<rootDir>/src/test/setup.ts"],
    "slowTestThreshold": 1000
  }
}
```

---

## 🚨 استكشاف الأخطاء وإصلاحها

### ❌ **المشاكل الشائعة والحلول**

#### 1. الاختبارات البطيئة
```typescript
// المشكلة: اختبار يستغرق >10 ثوانٍ
// الحل:
describe('LoginPage', () => {
  // ❌ بطيء - كثرة التفاعلات
  test('complex user interaction', async () => {
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password');
    await user.click(submitButton);
    await waitFor(() => screen.getByText('Success'));
    // ... المزيد من التفاعلات
  });
  
  // ✅ سريع - اختبارات مفصولة
  test('email input works', () => {
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    expect(emailInput).toHaveValue('test@example.com');
  });
});
```

#### 2. فشل الاختبارات المتقطع
```typescript
// المشكلة: اختبارات تفشل أحياناً
// الحل: استخدام waitFor وتحسين timing

// ❌ غير مستقر
test('async operation', () => {
  fireEvent.click(button);
  expect(screen.getByText('Loading...')).toBeInTheDocument();
  expect(screen.getByText('Success')).toBeInTheDocument(); // قد يفشل
});

// ✅ مستقر
test('async operation', async () => {
  fireEvent.click(button);
  expect(screen.getByText('Loading...')).toBeInTheDocument();
  await waitFor(() => {
    expect(screen.getByText('Success')).toBeInTheDocument();
  });
});
```

#### 3. مشاكل Memory Leaks
```typescript
// المشكلة: تسريب في الذاكرة
// الحل: تنظيف بعد كل اختبار

afterEach(() => {
  // تنظيف المؤكات
  vi.clearAllMocks();
  
  // تنظيف DOM
  cleanup();
  
  // تنظيف Local Storage
  localStorage.clear();
  
  // تنظيف Session Storage
  sessionStorage.clear();
});
```

### 🔧 **أدوات التشخيص**

#### 1. تحليل الأداء
```bash
# قياس وقت كل اختبار
npm run test -- --reporter=verbose | tee test-timing.log

# تحليل استخدام الذاكرة
node --inspect-brk ./node_modules/vitest/vitest.mjs run --no-coverage
```

#### 2. فحص التغطية المفقودة
```bash
# عرض الأسطر غير المغطاة
npm run test:coverage -- --reporter=html
open coverage/index.html
```

#### 3. تتبع الأخطاء
```typescript
// إضافة logging مفصل
console.log('[TEST DEBUG]', {
  testName: expect.getState().currentTestName,
  timestamp: new Date().toISOString(),
  memoryUsage: process.memoryUsage()
});
```

---

## 📊 مراقبة الجودة

### 🎯 **مؤشرات الجودة المطلوبة**

```typescript
interface QualityMetrics {
  coverage: {
    statements: number; // >95%
    branches: number;   // >90%
    functions: number;  // >95%
    lines: number;      // >95%
  };
  performance: {
    averageTestTime: number;    // <500ms
    totalSuiteTime: number;     // <300s
    slowTestsCount: number;     // <5
  };
  reliability: {
    passRate: number;           // 100%
    flakyTestsCount: number;    // 0
  };
}
```

### 📈 **تتبع الاتجاهات**
```bash
# إنشاء تقرير أداء تاريخي
echo "$(date): $(npm run test 2>&1 | grep 'Test Files.*passed')" >> test-history.log

# رسم بياني للاتجاهات (اختياري)
python scripts/plot-test-trends.py test-history.log
```

---

## 🔄 عمليات التحديث

### 📦 **تحديث Dependencies**

#### 1. تحديث أدوات الاختبار
```bash
# فحص التحديثات المتاحة
npm outdated @testing-library/react @testing-library/jest-dom vitest

# تحديث تدريجي مع اختبار
npm update @testing-library/react
npm run test  # تأكد من عدم كسر شيء

npm update vitest
npm run test  # اختبار مرة أخرى
```

#### 2. تحديث إعدادات Vitest
```typescript
// vitest.config.ts - إعدادات محدثة
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
    
    // إعدادات الأداء المحدثة
    timeout: 5000,
    hookTimeout: 3000,
    slowTestThreshold: 1000,
    
    // إعدادات التغطية
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      thresholds: {
        statements: 95,
        branches: 90,
        functions: 95,
        lines: 95
      }
    }
  }
});
```

### 🔧 **تحديث المؤكات (Mocks)**
```typescript
// تحديث defs للمكتبات الجديدة
// src/test/mocks/mui.ts
export const mockUseTheme = vi.fn(() => ({
  palette: { primary: { main: '#1976d2' } },
  spacing: vi.fn((value: number) => `${value * 8}px`),
  // إضافة خصائص جديدة حسب الحاجة
}));
```

---

## 📚 أفضل الممارسات

### ✅ **Do's - يُنصح بها**

1. **كتابة اختبارات قبل الكود**
```typescript
// ✅ TDD Approach
describe('NewFeature', () => {
  test('should work correctly', () => {
    // كتابة الاختبار أولاً
    expect(newFeature()).toBe(expectedResult);
  });
});
// ثم كتابة التطبيق
```

2. **استخدام أسماء وصفية**
```typescript
// ✅ واضح ومفهوم
test('should display error message when email is invalid', () => {});

// ❌ غامض
test('email test', () => {});
```

3. **تجميع الاختبارات منطقياً**
```typescript
describe('LoginForm', () => {
  describe('validation', () => {
    test('email validation');
    test('password validation');
  });
  
  describe('submission', () => {
    test('successful login');
    test('failed login');
  });
});
```

### ❌ **Don'ts - يُمنع فعلها**

1. **تجنب الاختبارات المعتمدة على بعضها**
```typescript
// ❌ خطأ - اختبارات مترابطة
let userData;
test('should login user', () => {
  userData = loginUser();
});
test('should show user profile', () => {
  expect(userData.name).toBe('John'); // يعتمد على الاختبار السابق
});
```

2. **تجنب الأرقام السحرية**
```typescript
// ❌ غير واضح
await waitFor(() => {}, { timeout: 5000 });

// ✅ واضح
const ASYNC_OPERATION_TIMEOUT = 5000;
await waitFor(() => {}, { timeout: ASYNC_OPERATION_TIMEOUT });
```

3. **تجنب اختبار التفاصيل الداخلية**
```typescript
// ❌ اختبار implementation details
expect(component.state.isLoading).toBe(true);

// ✅ اختبار behavior
expect(screen.getByText('Loading...')).toBeInTheDocument();
```

---

## 🔔 نظام التنبيهات

### 🚨 **تنبيهات فورية**
```typescript
// إعداد تنبيهات للمشاكل الحرجة
const ALERT_THRESHOLDS = {
  FAILED_TESTS: 1,        // أي فشل
  SLOW_TESTS: 10000,      // >10s
  LOW_COVERAGE: 95,       // <95%
  MEMORY_LEAK: 100        // >100MB
};

// إرسال تنبيه عبر Slack/Email
const sendAlert = (type: string, details: any) => {
  console.error(`🚨 ALERT: ${type}`, details);
  // إضافة integration مع Slack/Discord/Email
};
```

### 📊 **تقارير دورية**
```bash
# تقرير أسبوعي مؤتمت
# schedule: every Sunday at 9 AM
0 9 * * 0 cd /path/to/project && npm run test:weekly-report
```

---

## 🎯 الخلاصة والتوصيات

### 🏆 **أهداف الصيانة**
1. **الحفاظ على 100% نجاح** في جميع الأوقات
2. **تحسين الأداء تدريجياً** (هدف: <3 دقائق للمجموعة كاملة)
3. **ضمان الجودة المستمرة** مع نمو المشروع
4. **توفير تجربة تطوير ممتازة** للفريق

### 📋 **مراجعة شهرية**
- [ ] مراجعة هذا الدليل وتحديثه
- [ ] فحص فعالية الإجراءات المطبقة
- [ ] تحديث الأهداف والمعايير
- [ ] تقييم الحاجة لأدوات جديدة

### 🚀 **التطوير المستقبلي**
- **الأتمتة الكاملة** للصيانة
- **AI-powered test optimization**
- **predictive failure detection**
- **Self-healing test suites**

---

## 📞 جهات الاتصال والدعم

### 🆘 **في حالة الطوارئ**
- **Test Failures:** فريق التطوير الأساسي
- **Performance Issues:** فريق DevOps
- **Infrastructure Problems:** مدير النظام

### 📚 **موارد إضافية**
- [Vitest Documentation](https://vitest.dev)
- [Testing Library Best Practices](https://testing-library.com/docs/guiding-principles)
- [React Testing Patterns](https://react-testing-patterns.com)

---

*هذا الدليل يتم تحديثه بانتظام. آخر تحديث: ${new Date().toLocaleDateString('ar-SA')}* 📅
