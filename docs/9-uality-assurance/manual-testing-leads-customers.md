# دليل الاختبار اليدوي — العملاء المحتملون والعملاء (Leads, Customers)

> يغطي وحدتين أساسيتين: **Leads** (العملاء المحتملون) و **Customers** (العملاء المسجّلون).  
> **التركيز:** التكامل بينهما (تحويل lead → customer)، OTP، العناوين، التاجات، وإحصائيات الطلبات.  
> **ملاحظة:** مصادقة العميل (OTP/JWT) موثّقة في `manual-testing-customer-auth.md` — هذا الدليل يركز على عمليات CRUD والتكاملات.

---

## 1) نطاق الدليل

| البند | الوصف |
|--------|--------|
| **Leads** | العملاء المحتملون من نماذج الموقع/الشات — إنشاء، قائمة، تحويل إلى customer |
| **Customers** | العملاء المسجّلون — OTP، إنشاء يدوي، تحديث، تاجات، عناوين، إحصائيات |
| **التكامل** | تحويل leads إلى customers عند التحقق من OTP؛ OrdersService يحدّث إحصائيات العميل؛ StorefrontService يستخدم getPhoneBySession |
| **المراجع** | `leads.service.ts`, `leads.controller.ts`, `storefront-leads.controller.ts`, `customers.service.ts`, `customers.controller.ts`, `otp.service.ts` |

---

## 2) البيئة والحسابات

| البند | القيمة (مثال) |
|--------|---------------|
| **البيئة** | Staging / UAT |
| **Base URL API** | `https://<your-api>/api` أو `http://localhost:3000/api` |
| **حساب تاجر** | JWT مع merchantId صالح (للـ Leads GET، Customers CRUD) |
| **عميل المتجر** | JWT عميل (من OTP verify) لمسارات `/customers/me` والعناوين |
| **Leads: إنشاء** | Public — لا يتطلب مصادقة |
| **Storefront Leads** | Public — POST storefront/merchant/:merchantId/leads |

---

## 3) مخطط التكامل

```
┌────────────────────┐     ┌────────────────────┐     ┌────────────────────┐
│  Leads (محتملون)   │     │  Customers (عملاء)  │     │      Orders        │
│  create, list      │     │  OTP, CRUD, tags   │     │  تأكيد الطلب      │
│  convertToCustomer │     │  addresses, stats   │     │                    │
└────────┬───────────┘     └────────┬───────────┘     └────────┬───────────┘
         │                          │                          │
         │ convertRelatedLeads      │ updateCustomerStats      │
         │ (عند OTP verify)         │ (بعد إنشاء الطلب)       │
         ◄──────────────────────────┤                          │
                                     ▲──────────────────────────┘

┌────────────────────┐     ┌────────────────────┐
│   Storefront       │     │    OtpService       │
│   getPhoneBySession│────►│  sendOtp, verifyOtp │
│   (رقم من lead)    │     │  SMS / Mail        │
└────────────────────┘     └────────────────────┘
```

---

## 4) قائمة العمليات (Process List)

### Leads

1. **إنشاء lead** — POST `/merchants/:merchantId/leads` (Public)
2. **قائمة leads** — GET `/merchants/:merchantId/leads` (JWT تاجر)
3. **إنشاء lead من المتجر (lite)** — POST `/storefront/merchant/:merchantId/leads` (Public)

### Customers — OTP (موثق أيضاً في manual-testing-customer-auth)

4. **إرسال OTP** — POST `/customers/otp/send`
5. **التحقق من OTP** — POST `/customers/otp/verify`
6. **تسجيل (Signup)** — POST `/customers/signup`

### Customers — لوحة التاجر (CRUD)

7. **قائمة العملاء** — GET `/customers` (IdentityGuard + merchantId)
8. **تفاصيل عميل** — GET `/customers/:id`
9. **إنشاء عميل يدوياً** — POST `/customers`
10. **تحديث عميل** — PATCH `/customers/:id`
11. **إضافة تاج** — POST `/customers/:id/tags`
12. **حذف تاج** — POST `/customers/:id/tags/remove`

### Customers — المتجر (مسارات العميل الحالي)

13. **بياناتي** — GET `/customers/me` (CustomerGuard)
14. **تحديث بياناتي** — PATCH `/customers/me`

### Customers — العناوين (لوحة التاجر)

15. **قائمة عناوين عميل** — GET `/customers/:id/addresses`
16. **إضافة عنوان** — POST `/customers/:id/addresses`
17. **تحديث عنوان** — PATCH `/customers/:id/addresses/:addressId`
18. **حذف عنوان** — DELETE `/customers/:id/addresses/:addressId`

### Customers — العناوين (المتجر)

19. **عناويني** — GET `/customers/me/addresses`
20. **إضافة عنواني** — POST `/customers/me/addresses`
21. **تحديث عنواني** — PATCH `/customers/me/addresses/:addressId`
22. **حذف عنواني** — DELETE `/customers/me/addresses/:addressId`

---

## 5) حالات الاختبار حسب القسم

---

## 5.1 Leads

### العملية: إنشاء lead (POST /merchants/:merchantId/leads)

**Body:** `CreateLeadDto` — sessionId (مطلوب)، data (كائن مطلوب)، source (اختياري).  
**ملاحظة:** الهاتف يُستخرج من `data.phone` أو `data.mobile` أو `data.phoneNumber` أو `data.whatsapp`؛ الاسم من `data.name` أو `data.fullName` أو `data.customerName`.

#### السيناريو السعيد

| المعرّف | LDS-CRE-001 |
|----------|-------------|
| **العنوان** | إنشاء lead ببيانات كاملة |
| **الخطوات** | POST بـ `{ sessionId: "sess_001", data: { name: "أحمد", phone: "+966501234567", email: "a@ex.com" }, source: "الموقع" }` |
| **النتيجة المتوقعة** | 201، lead مُنشأ مع `phoneNormalized` و `name` مُستخرجين |
| **الأولوية** | حرج |

| المعرّف | LDS-CRE-002 |
|----------|-------------|
| **العنوان** | إنشاء lead بدون مصادقة (Public) |
| **الخطوات** | POST بدون Authorization header |
| **النتيجة المتوقعة** | 201 |
| **الأولوية** | حرج |

#### تباينات

| المعرّف | LDS-CRE-003 |
|----------|-------------|
| **العنوان** | استخراج الهاتف من حقول مختلفة |
| **الخطوات** | POST مع `data.mobile` بدلاً من `data.phone` |
| **النتيجة المتوقعة** | 201، `phoneNormalized` مُعبأ |
| **الأولوية** | عالي |

#### سيناريوهات فشل

| المعرّف | العنوان | الخطوات | النتيجة المتوقعة | الأولوية |
|----------|---------|---------|-------------------|----------|
| LDS-CRE-004 | sessionId ناقص | body بدون sessionId | 400 | عالي |
| LDS-CRE-005 | data ناقص | body بدون data أو data فارغ | 400 | عالي |
| LDS-CRE-006 | merchantId غير صالح | استخدام merchantId غير موجود | 201 (إن لم يُتحقق من وجود التاجر عند الإنشاء) | متوسط |

---

### العملية: قائمة leads (GET /merchants/:merchantId/leads)

**المصادقة:** JWT تاجر (مطلوب).

#### السيناريو السعيد

| المعرّف | LDS-LST-001 |
|----------|-------------|
| **العنوان** | جلب قائمة leads للتاجر |
| **الخطوات** | GET مع Authorization: Bearer \<merchant-jwt\> |
| **النتيجة المتوقعة** | 200، مصفوفة leads مرتبة حسب createdAt |
| **الأولوية** | حرج |

#### سيناريوهات فشل

| المعرّف | العنوان | الخطوات | النتيجة المتوقعة | الأولوية |
|----------|---------|---------|-------------------|----------|
| LDS-LST-002 | بدون JWT | GET بدون Authorization | 401 | عالي |
| LDS-LST-003 | JWT عميل | استخدام JWT عميل بدلاً من تاجر | 403 أو 401 | متوسط |

---

### العملية: إنشاء lead من المتجر (POST /storefront/merchant/:merchantId/leads)

**Body:** `{ sessionId: string, data: Record<string, unknown>, source?: string }`

#### السيناريو السعيد

| المعرّف | LDS-SF-001 |
|----------|------------|
| **العنوان** | إنشاء lead من واجهة المتجر |
| **الخطوات** | POST بـ `{ sessionId: "chat_sess_1", data: { name: "سارة", phone: "0501234567" } }` |
| **النتيجة المتوقعة** | 201، نفس سلوك create العادي |
| **الأولوية** | عالي |

---

## 5.2 Customers — OTP

انظر `manual-testing-customer-auth.md` للتفاصيل. ملخص سريع:

| المعرّف | العملية | النتيجة |
|----------|---------|---------|
| CUS-OTP-001 | send OTP — بريد | 200 |
| CUS-OTP-002 | send OTP — هاتف | 200 |
| CUS-OTP-003 | verify — عميل جديد | 200، isNewCustomer: true |
| CUS-OTP-004 | verify — عميل موجود + lead مرتبط | 200، isNewCustomer: false؛ lead يُحوّل تلقائياً |

---

## 5.3 Customers — CRUD (لوحة التاجر)

**المصادقة:** IdentityGuard + JWT تاجر. **merchantId:** يُمرَّر في body للطلبات التي تتطلبها (GET/POST/PATCH/DELETE للعملاء).

### العملية: قائمة العملاء (GET /customers)

**Query:** `GetCustomersDto` — search, tags, isBlocked, signupSource, sortBy, sortOrder, page, limit.  
**Body:** `{ merchantId: string }` (حسب تصميم الـ API — قد يُستمد من JWT في تطبيقات أخرى).

#### السيناريو السعيد

| المعرّف | CUS-LST-001 |
|----------|-------------|
| **العنوان** | قائمة العملاء بدون فلاتر |
| **الخطوات** | GET مع query: page=1, limit=20 و merchantId في body |
| **النتيجة المتوقعة** | 200، `{ customers, total, page, limit, totalPages }` |
| **الأولوية** | حرج |

| المعرّف | CUS-LST-002 |
|----------|-------------|
| **العنوان** | بحث نصي (search) |
| **الخطوات** | GET مع `search=أحمد` |
| **النتيجة المتوقعة** | 200، عملاء مطابقون (بحث في الاسم، البريد، الهاتف) |
| **الأولوية** | عالي |

#### تباينات

| المعرّف | CUS-LST-003 |
|----------|-------------|
| **العنوان** | تصفية بالتاجات |
| **الخطوات** | GET مع `tags[]=VIP` |
| **النتيجة المتوقعة** | 200، عملاء لديهم التاج |
| **الأولوية** | متوسط |

---

### العملية: إنشاء عميل يدوياً (POST /customers)

**Body:** `CreateCustomerDto` — merchantId، name (مطلوب)، email؟، phone؟، marketingConsent؟، isBlocked؟، tags؟، metadata؟، signupSource؟

#### السيناريو السعيد

| المعرّف | CUS-CRE-001 |
|----------|-------------|
| **العنوان** | إنشاء عميل ببيانات كاملة |
| **الخطوات** | POST بـ `{ merchantId, name: "عميل جديد", email: "new@ex.com", phone: "+966501234567" }` |
| **النتيجة المتوقعة** | 201، عميل مُنشأ، signupSource: manual |
| **الأولوية** | حرج |

#### سيناريوهات فشل

| المعرّف | العنوان | الخطوات | النتيجة المتوقعة | الأولوية |
|----------|---------|---------|-------------------|----------|
| CUS-CRE-002 | بريد مكرر | إنشاء عميل ببريد موجود لنفس التاجر | 400 "يوجد عميل آخر بنفس البريد الإلكتروني" | حرج |
| CUS-CRE-003 | هاتف مكرر | إنشاء عميل بهاتف موجود | 400 "يوجد عميل آخر بنفس رقم الهاتف" | حرج |
| CUS-CRE-004 | name ناقص | body بدون name | 400 | عالي |

---

### العملية: تحديث عميل (PATCH /customers/:id)

**Body:** `UpdateCustomerDto` + merchantId.

#### السيناريو السعيد

| المعرّف | CUS-UPD-001 |
|----------|-------------|
| **العنوان** | تحديث الاسم |
| **الخطوات** | PATCH بـ `{ merchantId, name: "اسم محدث" }` |
| **النتيجة المتوقعة** | 200، عميل محدث |
| **الأولوية** | حرج |

#### سيناريوهات فشل

| المعرّف | العنوان | الخطوات | النتيجة المتوقعة | الأولوية |
|----------|---------|---------|-------------------|----------|
| CUS-UPD-002 | عميل آخر للتاجر | استخدام customerId يخص تاجراً آخر | 400 "العميل غير موجود" | عالي |

---

### العملية: إضافة/حذف تاج (POST /customers/:id/tags و /tags/remove)

**Body:** `{ merchantId, tag: "VIP" }`

#### السيناريو السعيد

| المعرّف | CUS-TAG-001 |
|----------|-------------|
| **العنوان** | إضافة تاج جديد |
| **الخطوات** | POST /customers/:id/tags بـ `{ merchantId, tag: "VIP" }` |
| **النتيجة المتوقعة** | 200، العميل محدث مع tags تحتوي "VIP" |
| **الأولوية** | عالي |

| المعرّف | CUS-TAG-002 |
|----------|-------------|
| **العنوان** | حذف تاج |
| **الخطوات** | POST /customers/:id/tags/remove بـ `{ merchantId, tag: "VIP" }` |
| **النتيجة المتوقعة** | 200 |
| **الأولوية** | عالي |

#### سيناريوهات فشل

| المعرّف | العنوان | الخطوات | النتيجة المتوقعة | الأولوية |
|----------|---------|---------|-------------------|----------|
| CUS-TAG-003 | تاج موجود مسبقاً | إضافة نفس التاج مرتين | 400 "التاج موجود بالفعل" | متوسط |

---

## 5.4 Customers — عناوين

**CreateAddressDto:** label (home/work/other)، country، city، address1، address2؟، zip؟.

### السيناريو السعيد (لوحة التاجر)

| المعرّف | CUS-ADR-001 |
|----------|-------------|
| **العنوان** | إضافة عنوان لعميل |
| **الخطوات** | POST /customers/:id/addresses بـ `{ merchantId, label: "home", country: "SA", city: "الرياض", address1: "شارع الملك" }` |
| **النتيجة المتوقعة** | 201، عنوان مُنشأ |
| **الأولوية** | حرج |

| المعرّف | CUS-ADR-002 |
|----------|-------------|
| **العنوان** | تحديث عنوان |
| **الخطوات** | PATCH /customers/:id/addresses/:addressId |
| **النتيجة المتوقعة** | 200 |
| **الأولوية** | عالي |

| المعرّف | CUS-ADR-003 |
|----------|-------------|
| **العنوان** | حذف عنوان |
| **الخطوات** | DELETE /customers/:id/addresses/:addressId |
| **النتيجة المتوقعة** | 200، `{ success: true }` |
| **الأولوية** | عالي |

### المتجر (مسارات me)

| المعرّف | CUS-ADR-004 |
|----------|-------------|
| **العنوان** | إضافة عنواني (عميل متسوّق) |
| **الخطوات** | POST /customers/me/addresses مع JWT عميل |
| **النتيجة المتوقعة** | 201 |
| **الأولوية** | حرج |

#### سيناريوهات فشل

| المعرّف | العنوان | الخطوات | النتيجة المتوقعة | الأولوية |
|----------|---------|---------|-------------------|----------|
| CUS-ADR-005 | عنوان عميل آخر | تحديث/حذف addressId يخص عميلاً آخر | 400 "العنوان غير موجود أو لا ينتمي لهذا العميل" | عالي |

---

## 5.5 تكامل Lead → Customer

### السيناريو السعيد

| المعرّف | INT-LC-001 |
|----------|------------|
| **العنوان** | تحويل lead تلقائياً عند التحقق من OTP |
| **المتطلبات** | lead موجود بنفس الهاتف أو البريد (غير مُحوّل) |
| **الخطوات** | 1. إنشاء lead بـ `data.phone: "+966501234567"`. 2. إرسال OTP لنفس الرقم. 3. التحقق من OTP وإنشاء/تحديث عميل. |
| **النتيجة المتوقعة** | Lead يُحدّث: converted=true، customerId=معرف العميل الجديد. العميل يُنشأ أو يُحدّث. |
| **الأولوية** | حرج |

| المعرّف | INT-LC-002 |
|----------|------------|
| **العنوان** | getPhoneBySession في Storefront |
| **المتطلبات** | lead مع sessionId و phoneNormalized |
| **الخطوات** | استدعاء LeadsService.getPhoneBySession(merchantId, sessionId) |
| **النتيجة المتوقعة** | إرجاع رقم الهاتف المُستخرج من أحدث lead لهذه الجلسة |
| **الأولوية** | عالي |

---

## 5.6 تكامل Orders → Customer Stats

| المعرّف | INT-OC-001 |
|----------|------------|
| **العنوان** | تحديث إحصائيات العميل بعد الطلب |
| **المتطلبات** | طلب مؤكّد مع customerId |
| **الخطوات** | إنشاء طلب كعميل (أو بربط عميل بالطلب) وتأكيده |
| **النتيجة المتوقعة** | customer.stats: totalOrders+1، totalSpend محدث، lastOrderId محدث |
| **الأولوية** | حرج |

---

## 6) قائمة تحقق نهائية (Checklist)

### Leads
- [ ] LDS-CRE-001، LDS-CRE-002: إنشاء lead (Public)
- [ ] LDS-CRE-003: استخراج الهاتف من حقول مختلفة
- [ ] LDS-LST-001: قائمة leads (JWT تاجر)
- [ ] LDS-SF-001: إنشاء lead من المتجر
- [ ] INT-LC-001: تحويل lead عند OTP verify

### Customers — OTP
- [ ] إرسال والتحقق من OTP (انظر manual-testing-customer-auth)
- [ ] تحويل lead مرتبط عند verify

### Customers — CRUD
- [ ] CUS-LST-001، CUS-LST-002: قائمة وبحث
- [ ] CUS-CRE-001: إنشاء يدوي
- [ ] CUS-CRE-002، CUS-CRE-003: منع التكرار (بريد/هاتف)
- [ ] CUS-UPD-001: تحديث
- [ ] CUS-TAG-001، CUS-TAG-002: إضافة وحذف تاج

### Customers — عناوين
- [ ] CUS-ADR-001 إلى CUS-ADR-004: إضافة، تحديث، حذف (لوحة + متجر)
- [ ] CUS-ADR-005: منع تعديل عنوان عميل آخر

### التكاملات
- [ ] INT-LC-001، INT-LC-002: Lead → Customer، getPhoneBySession
- [ ] INT-OC-001: إحصائيات الطلبات

---

## 7) مراجع تقنية

| الملف | الوصف |
|-------|-------|
| `Backend/src/modules/leads/leads.controller.ts` | إنشاء وقائمة leads |
| `Backend/src/modules/leads/storefront-leads.controller.ts` | إنشاء من المتجر |
| `Backend/src/modules/leads/leads.service.ts` | create, findAllForMerchant, getPhoneBySession, findLeadByContact, convertLeadToCustomer |
| `Backend/src/modules/leads/schemas/lead.schema.ts` | Lead: merchantId, sessionId, data, source, phoneNormalized, name, converted, customerId |
| `Backend/src/modules/customers/customers.controller.ts` | OTP، CRUD، tags، عناوين |
| `Backend/src/modules/customers/customers.service.ts` | convertRelatedLeads، updateCustomerStats، createManualCustomer |
| `Backend/src/modules/customers/services/otp.service.ts` | sendOtp، verifyOtp |
| `Backend/src/modules/orders/orders.service.ts` | updateCustomerStatsIfNeeded |
| `Backend/src/modules/storefront/storefront.service.ts` | getPhoneBySession من LeadsService |
