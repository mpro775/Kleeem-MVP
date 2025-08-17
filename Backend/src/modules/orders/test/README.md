# Orders Module Tests

## نظرة عامة

هذا الملف يحتوي على اختبارات شاملة لوحدة Orders التي تتضمن:

- **OrdersController**: اختبار جميع endpoints لإدارة الطلبات
- **OrdersService**: اختبار جميع العمليات مع قاعدة البيانات
- **تكامل ZID**: اختبار التزامن مع منصة زد
- **تكامل Leads**: اختبار حفظ العملاء المحتملين

## الميزات المختبرة

### OrdersService

1. **create**: إنشاء طلب جديد
   - إنشاء سجل طلب في قاعدة البيانات
   - حفظ بيانات العميل في نظام Leads
   - معالجة فشل إنشاء Lead
   - التحقق من صحة البيانات

2. **findAll**: استرجاع جميع الطلبات
   - جلب الطلبات مرتبة بالتاريخ (الأحدث أولاً)
   - التعامل مع حالة عدم وجود طلبات

3. **findOne**: استرجاع طلب محدد
   - جلب تفاصيل طلب بمعرف محدد
   - تحويل البيانات إلى OrderType
   - معالجة التواريخ بأشكال مختلفة
   - إرجاع null عند عدم الوجود

4. **updateStatus**: تحديث حالة الطلب
   - تغيير حالة طلب موجود
   - إرجاع البيانات المحدثة
   - معالجة طلبات غير موجودة

5. **findByCustomer**: البحث بطلبات العميل
   - البحث بناءً على رقم الهاتف
   - البحث بناءً على معرف التاجر
   - ترتيب النتائج بالتاريخ

6. **findMerchantByStoreId**: البحث عن التاجر
   - ربط storeId بمعرف التاجر
   - دعم تكامل ZID

### تكامل ZID

7. **upsertFromZid**: مزامنة طلبات ZID
   - إنشاء طلب جديد من بيانات ZID
   - تحديث طلب موجود
   - معالجة البيانات الناقصة
   - ربط التاجر بـ storeId

8. **updateOrderStatusFromZid**: تحديث الحالة من ZID
   - تحديث حالة طلب موجود
   - التحقق من وجود التاجر والطلب
   - معالجة الأخطاء

### OrdersController

1. **POST /orders**: إنشاء طلب جديد
2. **GET /orders**: استرجاع جميع الطلبات
3. **GET /orders/:id**: استرجاع طلب محدد (عام - بدون مصادقة)
4. **PATCH /orders/:id/status**: تحديث حالة الطلب
5. **GET /orders/by-customer/:merchantId/:phone**: طلبات العميل (عام)

## تشغيل الاختبارات

```bash
# تشغيل اختبارات هذه الوحدة فقط
npm test -- orders.spec.ts

# تشغيل مع تغطية الكود
npm test -- --coverage orders.spec.ts

# تشغيل في watch mode
npm test -- --watch orders.spec.ts

# تشغيل اختبارات معينة
npm test -- --testNamePattern="create" orders.spec.ts
```

## Mocking Strategy

### Database Models

- **Order Model**: محاكاة كاملة لعمليات MongoDB
- **Merchant Model**: محاكاة للبحث عن التجار
- **LeadsService**: محاكاة لحفظ العملاء المحتملين

### Test Data

```typescript
const mockOrderData: CreateOrderDto = {
  merchantId: 'merchant-123',
  sessionId: 'session-456',
  customer: {
    name: 'محمد أحمد',
    phone: '+966501234567',
    email: 'customer@example.com',
    address: { /* عنوان كامل */ }
  },
  items: [/* منتجات */],
  products: [/* بيانات منتجات */],
  status: 'pending'
};
```

## السيناريوهات المختبرة

### Happy Path
- إنشاء طلب جديد بكامل البيانات
- استرجاع الطلبات بنجاح
- تحديث حالة الطلب
- البحث بطلبات العميل
- مزامنة مع ZID

### Error Handling
- فشل قاعدة البيانات
- بيانات ناقصة من ZID
- تاجر غير موجود
- طلب غير موجود
- فشل خدمة Leads

### Edge Cases
- بيانات ZID ناقصة أو null
- تواريخ بصيغ مختلفة
- عملاء بدون طلبات سابقة
- طلبات بدون منتجات
- رقم هاتف غير موجود

## تكامل ZID

### upsertFromZid
```typescript
const zidOrder = {
  id: 'zid-order-123',
  session_id: 'session-456',
  status: 'paid',
  customer: {
    name: 'عميل زد',
    phone: '+966509876543'
  },
  products: [/* منتجات */],
  created_at: '2023-01-01T10:00:00.000Z'
};
```

### Data Mapping
- `zid_order.id` → `order.externalId`
- `zid_order.session_id` → `order.sessionId`
- `zid_order.status` → `order.status`
- `zid_order.customer` → `order.customer`
- `zid_order.products` → `order.products`
- `zid_order.created_at` → `order.createdAt`

## تكامل Leads

عند إنشاء طلب جديد:
```typescript
await leadsService.create(merchantId, {
  sessionId: dto.sessionId,
  data: dto.customer,
  source: 'order'
});
```

## Integration Tests

يختبر تدفق كامل:
1. إنشاء طلب → `POST /orders`
2. استرجاع الطلب → `GET /orders/:id`
3. تحديث الحالة → `PATCH /orders/:id/status`
4. البحث بطلبات العميل → `GET /orders/by-customer/:merchantId/:phone`

## بنية الاختبارات

```
describe('OrdersService')
├── create (إنشاء طلب + leads)
├── findAll (استرجاع جميع الطلبات)
├── findOne (طلب محدد + تحويل البيانات)
├── updateStatus (تحديث الحالة)
├── findByCustomer (طلبات العميل)
├── findMerchantByStoreId (ربط ZID)
├── upsertFromZid (مزامنة ZID)
└── updateOrderStatusFromZid (تحديث من ZID)

describe('OrdersController')
├── create (POST /orders)
├── findAll (GET /orders)
├── findOne (GET /orders/:id)
├── updateStatus (PATCH /orders/:id/status)
├── findByCustomer (GET /orders/by-customer/:merchantId/:phone)
└── Integration Tests
```

## أنواع البيانات المختبرة

### CreateOrderDto
- ✅ بيانات كاملة مع جميع الحقول
- ✅ بيانات أساسية فقط
- ✅ بيانات ZID محولة
- ✅ بيانات ناقصة (error cases)

### Customer Data
- ✅ عميل سعودي برقم محلي
- ✅ عميل مع بريد إلكتروني
- ✅ عميل مع عنوان كامل
- ✅ بيانات ناقصة من ZID

### Order Status
- ✅ `pending` (افتراضي)
- ✅ `paid` (مدفوع)
- ✅ `shipped` (مُرسل)
- ✅ `delivered` (مُسلم)
- ✅ `canceled` (ملغي)

## ملاحظات مهمة

1. **No Real Database**: جميع العمليات محاكاة
2. **Complete Coverage**: تغطية جميع methods و endpoints
3. **ZID Integration**: اختبار شامل لتكامل منصة زد
4. **Leads Integration**: اختبار حفظ العملاء المحتملين
5. **Error Scenarios**: اختبار شامل لمعالجة الأخطاء
6. **Type Safety**: استخدام TypeScript بالكامل
7. **Arabic Support**: دعم كامل للمحتوى العربي

## الإضافات المستقبلية

- اختبار تكامل طرق الدفع
- اختبار إشعارات العملاء
- اختبار تتبع الشحنات
- اختبار تقارير الطلبات
- اختبار bulk operations
- اختبار order validation rules
