# N8N Workflow Module Tests

## نظرة عامة

هذا الملف يحتوي على اختبارات شاملة لوحدة N8N Workflow التي تتضمن:

- **N8nWorkflowController**: اختبار جميع endpoints
- **N8nWorkflowService**: اختبار جميع العمليات مع n8n API
- **معالجة الأخطاء**: اختبار السيناريوهات الاستثنائية
- **Integration Tests**: اختبار تدفق كامل للعمليات

## الميزات المختبرة

### N8nWorkflowService

1. **createForMerchant**: إنشاء workflow جديد
   - إنشاء workflow من القالب
   - تعديل مسار webhook للتاجر
   - تفعيل workflow تلقائياً
   - حفظ في تاريخ الإصدارات
   - تحديث معلومات التاجر

2. **get**: جلب تفاصيل workflow
   - استرجاع JSON كامل من n8n
   - معالجة حالات عدم الوجود

3. **update**: تحديث workflow
   - تطبيق تغييرات على workflow موجود
   - إنشاء إصدار جديد في التاريخ
   - حساب رقم الإصدار التلقائي

4. **rollback**: استرجاع إصدار سابق
   - البحث عن إصدار محدد
   - تطبيق الإصدار القديم
   - حفظ عملية الاسترجاع في التاريخ

5. **cloneToMerchant**: استنساخ workflow
   - نسخ workflow لتاجر جديد
   - تعديل webhook path للتاجر الجديد
   - تنظيف البيانات الحساسة
   - حفظ النسخة الجديدة

6. **setActive**: تفعيل/تعطيل workflow
   - تفعيل workflow
   - تعطيل workflow
   - معالجة أخطاء API

7. **sanitizeTemplate**: تنظيف القالب
   - إزالة حقول محظورة (id, active, webhookId...)
   - التحقق من صحة البيانات
   - تنظيف structure للإرسال لـ n8n

### N8nWorkflowController

1. **POST /:merchantId**: إنشاء workflow
2. **GET /:workflowId**: جلب workflow
3. **PATCH /:workflowId**: تحديث workflow
4. **POST /:workflowId/rollback**: استرجاع إصدار
5. **POST /:workflowId/clone/:targetMerchantId**: استنساخ
6. **PATCH /:workflowId/active**: تفعيل/تعطيل

## تشغيل الاختبارات

```bash
# تشغيل اختبارات هذه الوحدة فقط
npm test -- n8n-workflow.spec.ts

# تشغيل مع تغطية الكود
npm test -- --coverage n8n-workflow.spec.ts

# تشغيل في watch mode
npm test -- --watch n8n-workflow.spec.ts
```

## Mocking Strategy

### External Dependencies

- **axios**: مُحاكى بالكامل لمنع الطلبات الحقيقية
- **WorkflowHistoryService**: mock للتحكم في إدارة الإصدارات
- **MerchantsService**: mock لتحديث بيانات التجار
- **workflow-template.json**: mock لقالب ثابت ومتوقع

### Test Data

```typescript
const merchantId = '507f1f77bcf86cd799439011';
const workflowId = 'wf_123456789';
const mockTemplate = {
  name: 'Template Workflow',
  nodes: [/* webhook + http request nodes */],
  connections: {},
  settings: {}
};
```

## السيناريوهات المختبرة

### Happy Path
- إنشاء workflow جديد بنجاح
- تحديث workflow موجود
- استنساخ بين التجار
- استرجاع إصدارات سابقة

### Error Handling
- فشل n8n API calls
- workflow غير موجود
- إصدار غير موجود
- أخطاء الشبكة
- استجابات غير متوقعة

### Edge Cases
- فشل تفعيل workflow بعد الإنشاء (يستمر العمل)
- عدم وجود تاريخ إصدارات (يبدأ من 1)
- قوالب متسخة (تنظيف تلقائي)

## Integration Test

يختبر تدفق كامل:
1. إنشاء workflow
2. تحديث workflow
3. استنساخ لتاجر آخر
4. تفعيل النسخة المستنسخة

## بنية الاختبارات

```
describe('N8nWorkflowService')
├── constructor (axios setup)
├── createForMerchant
├── get
├── update
├── rollback
├── cloneToMerchant
├── setActive
├── sanitizeTemplate (غير مباشر)
└── wrapError

describe('N8nWorkflowController')
├── createForMerchant
├── get
├── update
├── rollback
├── clone
├── setActive
└── Integration Tests
```

## ملاحظات مهمة

1. **No Real API Calls**: جميع الطلبات محاكاة
2. **Complete Coverage**: تغطية جميع methods و endpoints
3. **Error Scenarios**: اختبار شامل لمعالجة الأخطاء
4. **Type Safety**: استخدام TypeScript بالكامل
5. **Arabic Comments**: تعليقات بالعربية لسهولة الفهم

## الإضافات المستقبلية

- اختبار performance للعمليات الكبيرة
- اختبار concurrent operations
- اختبار webhook validation
- اختبار node dependencies
