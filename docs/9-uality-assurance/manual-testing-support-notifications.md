# دليل الاختبار اليدوي — الدعم والإشعارات (Support, Notifications)

> يغطي وحدتين: **Support** (تذاكر الدعم/نموذج التواصل) و **Notifications** (إشعارات المستخدم).  
> **التركيز:** Support — multipart/form-data، رفع ملفات، S3، Mail؛ Notifications — قائمة، وضع كمقروء، إشعار تجريبي.  
> **ملاحظة:** تفضيلات الإشعارات (channels، topics، quietHours) مُدارة في `users/:id/notifications` — موثق في manual-testing-merchant-auth.

---

## 1) نطاق الدليل

| البند | الوصف |
|--------|--------|
| **Support** | نموذج تواصل الليندنج (Public)، تذكرة دعم من لوحة التاجر (JWT) — multipart مع payload + files |
| **Notifications** | قائمة إشعاراتي، وضع كمقروء، وضع الكل كمقروءة، إشعار تجريبي |
| **التكامل** | Support → S3 (مرفقات)، Mail (إشعارات)، NotificationsService؛ Notifications → EventEmitter، MongoDB |
| **المراجع** | `support.controller.ts`, `support.service.ts`, `notifications.controller.ts`, `notifications.service.ts` |

---

## 2) البيئة والحسابات

| البند | القيمة (مثال) |
|--------|---------------|
| **البيئة** | Staging / UAT |
| **Base URL API** | `https://<your-api>/api` أو `http://localhost:3000/api` |
| **حساب تاجر** | JWT للـ support/contact/merchant و notifications/me |
| **Support: تواصل عام** | Public — لا يتطلب مصادقة |
| **Support: من التاجر** | JWT تاجر مطلوب |
| **Notifications** | JWT مطلوب لجميع المسارات |

---

## 3) قائمة العمليات (Process List)

### Support

1. **نموذج تواصل (ليندنج)** — POST `/support/contact` (Public)
2. **تذكرة دعم من التاجر** — POST `/support/contact/merchant` (JWT)

### Notifications

3. **قائمة إشعاراتي** — GET `/notifications/me`
4. **وضع إشعار كمقروء** — PATCH `/notifications/:id/read`
5. **وضع الكل كمقروءة** — PATCH `/notifications/read-all`
6. **إشعار تجريبي** — POST `/notifications/test`

---

## 4) حالات الاختبار حسب القسم

---

## 4.1 Support

**Payload (CreateContactDto):** name (≥2)، email، phone؟، topic (sales|support|billing|partnership)، subject (5-200 حرف)، message (20-MAX)، website؟، recaptchaToken؟.  
**Content-Type:** multipart/form-data — حقل `payload` (JSON string) وحقل `files` (مرفقات).  
**حدود الملفات:** افتراضي 5 ملفات، 5 ميجا لكل ملف. أنواع مسموحة: png, jpg, jpeg, pdf, doc, docx (قابل للتعديل عبر SUPPORT_ALLOWED_FILE_TYPES).

### العملية 1: نموذج تواصل الليندنج (POST /support/contact)

| المعرّف | SUP-001 |
|----------|---------|
| **العنوان** | إنشاء تذكرة تواصل بدون مرفقات |
| **الخطوات** | POST multipart بـ `payload`: `{"name":"أحمد","email":"a@ex.com","topic":"support","subject":"طلب مساعدة","message":"أرغب في معرفة المزيد عن الخدمات المقدمة والتفاصيل الكاملة"}` |
| **النتيجة المتوقعة** | 201، `{ id, ticketNumber, status, createdAt }` |
| **الأولوية** | حرج |

| المعرّف | SUP-002 |
|----------|---------|
| **العنوان** | إنشاء تذكرة مع مرفقات |
| **الخطوات** | POST multipart بـ payload + files (png/pdf ضمن الحدود) |
| **النتيجة المتوقعة** | 201، تذكرة مع مرفقات مُرفعة إلى S3 |
| **الأولوية** | حرج |

| المعرّف | SUP-003 |
|----------|---------|
| **العنوان** | topic غير صالح |
| **الخطوات** | payload مع `topic: "invalid"` |
| **النتيجة المتوقعة** | 400 (topic must be one of: sales, support, billing, partnership) |
| **الأولوية** | عالي |

| المعرّف | SUP-004 |
|----------|---------|
| **العنوان** | payload ناقص |
| **الخطوات** | POST بدون حقل payload أو payload فارغ |
| **النتيجة المتوقعة** | 400 "payload required" |
| **الأولوية** | عالي |

| المعرّف | SUP-005 |
|----------|---------|
| **العنوان** | payload JSON غير صالح |
| **الخطوات** | payload: "not valid json" |
| **النتيجة المتوقعة** | 400 "invalid JSON payload" |
| **الأولوية** | عالي |

| المعرّف | SUP-006 |
|----------|---------|
| **العنوان** | نوع ملف غير مسموح |
| **الخطوات** | رفع ملف .exe أو نوع غير مدرج في SUPPORT_ALLOWED_FILE_TYPES |
| **النتيجة المتوقعة** | 400 "نوع الملف غير مسموح" |
| **الأولوية** | عالي |

| المعرّف | SUP-007 |
|----------|---------|
| **العنوان** | تجاوز حد الملفات أو الحجم |
| **الخطوات** | رفع أكثر من 5 ملفات أو ملف أكبر من 5 ميجا |
| **النتيجة المتوقعة** | 400 (من multer) |
| **الأولوية** | متوسط |

| المعرّف | SUP-008 |
|----------|---------|
| **العنوان** | message أقصر من 20 حرفاً |
| **الخطوات** | payload مع message: "قصير" |
| **النتيجة المتوقعة** | 400 (تحقق validation) |
| **الأولوية** | عالي |

---

### العملية 2: تذكرة دعم من لوحة التاجر (POST /support/contact/merchant)

| المعرّف | SUP-009 |
|----------|---------|
| **العنوان** | إنشاء تذكرة بتسجيل الدخول |
| **الخطوات** | POST /support/contact/merchant مع JWT تاجر و payload + files اختياري |
| **النتيجة المتوقعة** | 201، تذكرة مع source: merchant، وربط merchantId و userId |
| **الأولوية** | حرج |

| المعرّف | SUP-010 |
|----------|---------|
| **العنوان** | بدون JWT |
| **الخطوات** | POST بدون Authorization |
| **النتيجة المتوقعة** | 401 |
| **الأولوية** | عالي |

---

## 4.2 Notifications

**المصادقة:** JWT مطلوب لجميع المسارات.

### العملية 3: قائمة إشعاراتي (GET /notifications/me)

**Query:** page؟ (افتراضي 1)، limit؟ (افتراضي 20، أقصى 100)، unreadOnly؟ (true|false).

| المعرّف | NOT-001 |
|----------|---------|
| **العنوان** | جلب قائمة الإشعارات |
| **الخطوات** | GET /notifications/me مع JWT |
| **النتيجة المتوقعة** | 200، `{ items, total, page, limit }` |
| **الأولوية** | حرج |

| المعرّف | NOT-002 |
|----------|---------|
| **العنوان** | إشعارات غير مقروءة فقط |
| **الخطوات** | GET /notifications/me?unreadOnly=true |
| **النتيجة المتوقعة** | 200، items تحتوي إشعارات read: false فقط |
| **الأولوية** | عالي |

| المعرّف | NOT-003 |
|----------|---------|
| **العنوان** | بدون JWT |
| **الخطوات** | GET بدون Authorization |
| **النتيجة المتوقعة** | 401 |
| **الأولوية** | عالي |

---

### العملية 4: وضع إشعار كمقروء (PATCH /notifications/:id/read)

| المعرّف | NOT-004 |
|----------|---------|
| **العنوان** | وضع إشعار كمقروء |
| **الخطوات** | PATCH /notifications/:id/read حيث id إشعار يخص المستخدم |
| **النتيجة المتوقعة** | 200، `{ ok: true }` |
| **الأولوية** | حرج |

| المعرّف | NOT-005 |
|----------|---------|
| **العنوان** | إشعار لا يخص المستخدم |
| **الخطوات** | PATCH بإشعار يخص مستخدماً آخر |
| **النتيجة المتوقعة** | 200 مع ok: false أو 403/404 حسب التصميم |
| **الأولوية** | عالي |

---

### العملية 5: وضع الكل كمقروءة (PATCH /notifications/read-all)

| المعرّف | NOT-006 |
|----------|---------|
| **العنوان** | وضع كل إشعاراتي كمقروءة |
| **الخطوات** | PATCH /notifications/read-all مع JWT |
| **النتيجة المتوقعة** | 200، `{ ok: true }` |
| **الأولوية** | عالي |

---

### العملية 6: إشعار تجريبي (POST /notifications/test)

**Body:** `{ title?: string, body?: string }`.

| المعرّف | NOT-007 |
|----------|---------|
| **العنوان** | إرسال إشعار تجريبي |
| **الخطوات** | POST /notifications/test مع JWT و body اختياري |
| **النتيجة المتوقعة** | 200، `NotificationDocument` — إشعار جديد type: test |
| **الأولوية** | متوسط |

| المعرّف | NOT-008 |
|----------|---------|
| **العنوان** | إشعار تجريبي مخصص |
| **الخطوات** | POST بـ `{ title: "عنوان مخصص", body: "نص مخصص" }` |
| **النتيجة المتوقعة** | 200، إشعار بالعنوان والنص المخصصين |
| **الأولوية** | متوسط |

---

## 5) قائمة تحقق نهائية (Checklist)

### Support
- [ ] SUP-001، SUP-002: تواصل ليندنج (بدون/مع مرفقات)
- [ ] SUP-003 إلى SUP-008: فشل — topic، payload، ملفات، message
- [ ] SUP-009، SUP-010: تذكرة من التاجر (JWT، بدون JWT)

### Notifications
- [ ] NOT-001، NOT-002، NOT-003: قائمة إشعاراتي
- [ ] NOT-004، NOT-005: وضع كمقروء
- [ ] NOT-006: وضع الكل كمقروءة
- [ ] NOT-007، NOT-008: إشعار تجريبي

---

## 6) مراجع تقنية

| الملف | الوصف |
|-------|-------|
| `support.controller.ts` | contact (Public)، contactFromMerchant (JWT)؛ multipart، FileFieldsInterceptor |
| `support.service.ts` | create، S3، Mail، NotificationsService |
| `support/dto/create-contact.dto.ts` | name، email، topic، subject، message |
| `support/support.enums.ts` | CONTACT_TOPIC_VALUES: sales، support، billing، partnership |
| `notifications.controller.ts` | myList، readOne، readAll، test |
| `notifications.service.ts` | listForUser، markRead، markAllRead، notifyUser |
