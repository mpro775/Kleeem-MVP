# دليل الاختبار اليدوي — التجار (Merchants)

> يغطي عمليات **لوحة تحكم التاجر** من `merchants.controller.ts` و `merchant-prompt.controller.ts` — بدون عمليات الأدمن (مثل findAll، purge).  
> **المتطلبات:** JWT تاجر صالح، و merchantId في التوكن يطابق التاجر المستهدف (ما لم يُذكر خلاف ذلك).

---

## 1) نطاق الدليل

| البند | الوصف |
|--------|--------|
| **النطاق** | مسارات `/merchants/*` و `/merchants/:id/prompt/*` — عمليات المالك (owner) فقط |
| **غير مشمول** | عمليات الأدمن: GET /merchants (findAll)، POST /merchants (create)، POST :id/purge |
| **المراجع** | `merchants.controller.ts`, `merchant-prompt.controller.ts` |

---

## 2) البيئة والحسابات

| البند | القيمة (مثال) |
|--------|---------------|
| **البيئة** | Staging / UAT |
| **Base URL API** | `https://<your-api>/api` أو `http://localhost:3000/api` |
| **حساب تاجر** | JWT مع merchantId صالح |
| **معرّف تاجر للاختبار** | `merchantId` من user.merchantId بعد تسجيل الدخول |

---

## 3) قائمة العمليات (Process List)

### من merchants.controller

1. **التحقق من slug عام** — GET check-public-slug (عام).
2. **عرض التاجر** — GET :id (عام).
3. **تحديث التاجر** — PUT :id.
4. **الحذف الناعم** — PUT :id/soft-delete أو DELETE :id.
5. **استعادة التاجر** — PUT :id/restore.
6. **Checklist** — GET :id/checklist.
7. **تخطي عنصر Checklist** — POST :id/checklist/:itemKey/skip.
8. **إعدادات Leads** — GET/PATCH :id/leads-settings.
9. **رفع الشعار** — POST :id/logo.
10. **حالة الاشتراك** — GET :id/subscription-status.
11. **Onboarding أساسي** — PATCH :id/onboarding/basic.
12. **تأكيد Workflow** — POST :id/workflow/ensure.
13. **سياق المتجر للـ AI** — GET :id/ai/store-context (عام).
14. **مصدر المنتجات** — PATCH :id/product-source.

### من merchant-prompt.controller

15. **Quick Config** — GET/PATCH :id/prompt/quick-config.
16. **القالب المتقدّم** — GET/POST :id/prompt/advanced-template.
17. **نسخ القالب** — GET :id/prompt/advanced-versions، POST :id/prompt/advanced-versions/:index/revert.
18. **معاينة الـ Prompt** — POST :id/prompt/preview.
19. **Final Prompt** — GET :id/prompt/final-prompt.

---

## 4) حالات الاختبار حسب العملية

---

### العملية 1: التحقق من slug عام (check-public-slug)

**الـ API:** `GET /merchants/check-public-slug?slug=...`  
**عام (لا يتطلب JWT).**  
**صيغة slug:** `^[a-z](?:[a-z0-9-]{1,48}[a-z0-9])$` — يبدأ بحرف، 2–50 حرفاً.

#### السيناريو السعيد

| المعرّف | MCH-SLUG-001 |
|----------|--------------|
| **العنوان** | slug متاح (غير مستخدم) |
| **الخطوات** | GET ?slug=my-store-2025 |
| **النتيجة المتوقعة** | 200، `{ "available": true }` |
| **الأولوية** | عالي |

#### سيناريوهات فشل

| المعرّف | العنوان | الخطوات | النتيجة المتوقعة | الأولوية |
|----------|---------|---------|-------------------|----------|
| MCH-SLUG-002 | slug مستخدم مسبقاً | GET ?slug=slug-موجود-للتاجر | 200، `{ "available": false }` | عالي |
| MCH-SLUG-003 | slug بصيغة غير صحيحة | GET ?slug=123 أو ?slug=Ab أو ?slug= | 400 (invalid slug) | عالي |
| MCH-SLUG-004 | slug ناقص | GET بدون query slug | 400 | متوسط |

---

### العملية 2: عرض التاجر (findOne)

**الـ API:** `GET /merchants/:id`  
**عام.**

#### السيناريو السعيد

| المعرّف | MCH-GET-001 |
|----------|-------------|
| **العنوان** | عرض تاجر موجود |
| **الخطوات** | GET /merchants/:id بـ ObjectId صالح |
| **النتيجة المتوقعة** | 200، كائن التاجر (مع email، storefrontUrl إن وُجد) |
| **الأولوية** | حرج |

#### سيناريوهات فشل

| المعرّف | العنوان | الخطوات | النتيجة المتوقعة | الأولوية |
|----------|---------|---------|-------------------|----------|
| MCH-GET-002 | id غير صالح | GET بـ id غير ObjectId | 400 | عالي |
| MCH-GET-003 | تاجر غير موجود | GET بـ ObjectId غير موجود | 404 | عالي |

---

### العملية 3: تحديث التاجر (update)

**الـ API:** `PUT /merchants/:id`  
**التوثيق:** Bearer JWT، و merchantId في التوكن = id.  
**Body:** UpdateMerchantDto (حقول اختيارية).

#### السيناريو السعيد

| المعرّف | MCH-UPD-001 |
|----------|-------------|
| **العنوان** | تحديث حقول التاجر (اسم، logoUrl، إلخ) |
| **الخطوات** | PUT مع Bearer token و body: `{ "name": "متجر محدّث" }` |
| **النتيجة المتوقعة** | 200، التاجر المحدّث |
| **الأولوية** | حرج |

#### سيناريوهات فشل

| المعرّف | العنوان | الخطوات | النتيجة المتوقعة | الأولوية |
|----------|---------|---------|-------------------|----------|
| MCH-UPD-002 | الوصول لتاجر آخر | JWT لـ merchantId مختلف عن :id | 403 Forbidden | حرج |
| MCH-UPD-003 | تاجر غير موجود | PUT بـ id غير موجود | 404 | عالي |
| MCH-UPD-004 | عدم إرسال توكن | 401 | عالي |

---

### العملية 4: الحذف الناعم (soft-delete)

**الـ API:** `PUT /merchants/:id/soft-delete` أو `DELETE /merchants/:id`  
**التوثيق:** Bearer JWT، owner أو admin.

#### السيناريو السعيد

| المعرّف | MCH-DEL-001 |
|----------|-------------|
| **العنوان** | حذف ناعم للتاجر |
| **الخطوات** | PUT soft-delete أو DELETE مع Bearer token |
| **النتيجة المتوقعة** | 200، message، at (تاريخ الحذف) |
| **الأولوية** | عالي |

#### سيناريوهات فشل

| المعرّف | العنوان | الخطوات | النتيجة المتوقعة | الأولوية |
|----------|---------|---------|-------------------|----------|
| MCH-DEL-002 | الوصول لتاجر آخر | 403 | عالي |
| MCH-DEL-003 | تاجر غير موجود | 404 | متوسط |

---

### العملية 5: استعادة التاجر (restore)

**الـ API:** `PUT /merchants/:id/restore`

#### السيناريو السعيد

| المعرّف | MCH-RES-001 |
|----------|-------------|
| **العنوان** | استعادة تاجر محذوف ناعماً |
| **الخطوات** | PUT restore بعد soft-delete |
| **النتيجة المتوقعة** | 200، message |
| **الأولوية** | عالي |

#### سيناريوهات فشل

| المعرّف | العنوان | الخطوات | النتيجة المتوقعة | الأولوية |
|----------|---------|---------|-------------------|----------|
| MCH-RES-002 | الوصول لتاجر آخر | 403 | عالي |

---

### العملية 6: Checklist

**الـ API:** `GET /merchants/:id/checklist`

#### السيناريو السعيد

| المعرّف | MCH-CHK-001 |
|----------|-------------|
| **العنوان** | جلب قائمة checklist للتاجر |
| **الخطوات** | GET مع Bearer token (owner) |
| **النتيجة المتوقعة** | 200، مصفوفة ChecklistGroup |
| **الأولوية** | عالي |

#### سيناريوهات فشل

| المعرّف | العنوان | الخطوات | النتيجة المتوقعة | الأولوية |
|----------|---------|---------|-------------------|----------|
| MCH-CHK-002 | الوصول لتاجر آخر | 403 | عالي |
| MCH-CHK-003 | تاجر غير موجود | 404 | متوسط |

---

### العملية 7: تخطي عنصر Checklist

**الـ API:** `POST /merchants/:id/checklist/:itemKey/skip`  
**ملاحظة:** للمالك فقط (لا يدعم admin عبر assertOwnerOrAdmin هنا).

#### السيناريو السعيد

| المعرّف | MCH-SKIP-001 |
|----------|--------------|
| **العنوان** | تخطي عنصر checklist |
| **الخطوات** | POST مع itemKey صالح (مثل "add-products") |
| **النتيجة المتوقعة** | 200، message، skippedChecklistItems |
| **الأولوية** | متوسط |

#### سيناريوهات فشل

| المعرّف | العنوان | الخطوات | النتيجة المتوقعة | الأولوية |
|----------|---------|---------|-------------------|----------|
| MCH-SKIP-002 | الوصول لتاجر آخر | jwtMerchantId ≠ merchantId | 403 | عالي |
| MCH-SKIP-003 | تاجر غير موجود | 404 | متوسط |

---

### العملية 8: إعدادات Leads

**الـ API:** `GET /merchants/:id/leads-settings`، `PATCH /merchants/:id/leads-settings`  
**Body (PATCH):** `{ "enabled"?: boolean, "fields"?: LeadFieldDto[] }` — fieldType: name | email | phone | address | custom.

#### السيناريو السعيد

| المعرّف | MCH-LEAD-001 |
|----------|--------------|
| **العنوان** | جلب إعدادات Leads |
| **الخطوات** | GET leads-settings |
| **النتيجة المتوقعة** | 200، `{ enabled, fields }` |
| **الأولوية** | عالي |

| المعرّف | MCH-LEAD-002 |
|----------|--------------|
| **العنوان** | تحديث إعدادات Leads |
| **الخطوات** | PATCH بـ `{ "enabled": true, "fields": [{ "key": "email", "fieldType": "email", "required": true }] }` |
| **النتيجة المتوقعة** | 200، التاجر المحدّث |
| **الأولوية** | عالي |

#### سيناريوهات فشل

| المعرّف | العنوان | الخطوات | النتيجة المتوقعة | الأولوية |
|----------|---------|---------|-------------------|----------|
| MCH-LEAD-003 | fieldType غير صالح | PATCH بـ fieldType: "invalid" | 400 | متوسط |
| MCH-LEAD-004 | الوصول لتاجر آخر | 403 | عالي |

---

### العملية 9: رفع الشعار (upload logo)

**الـ API:** `POST /merchants/:id/logo`  
**Content-Type:** multipart/form-data، حقل `file`.  
**الحدود:** png/jpeg/webp، حجم أقصى 2MB.

#### السيناريو السعيد

| المعرّف | MCH-LOGO-001 |
|----------|--------------|
| **العنوان** | رفع شعار بصيغة وحجم صحيحين |
| **الخطوات** | POST مع file (image/png أو jpeg أو webp، < 2MB) |
| **النتيجة المتوقعة** | 200، `{ "url": "..." }` |
| **الأولوية** | عالي |

#### سيناريوهات فشل

| المعرّف | العنوان | الخطوات | النتيجة المتوقعة | الأولوية |
|----------|---------|---------|-------------------|----------|
| MCH-LOGO-002 | عدم إرفاق ملف | POST بدون file | 400 (no file attached) | عالي |
| MCH-LOGO-003 | صيغة غير مدعومة | file بصيغة pdf أو gif | 400 (file not supported) | عالي |
| MCH-LOGO-004 | حجم أكبر من 2MB | file > 2MB | 400 (file too large) | عالي |
| MCH-LOGO-005 | الوصول لتاجر آخر | 403 | عالي |

---

### العملية 10: حالة الاشتراك

**الـ API:** `GET /merchants/:id/subscription-status`

#### السيناريو السعيد

| المعرّف | MCH-SUB-001 |
|----------|-------------|
| **العنوان** | جلب حالة الاشتراك |
| **الخطوات** | GET subscription-status |
| **النتيجة المتوقعة** | 200، `{ merchantId, subscriptionActive }` |
| **الأولوية** | متوسط |

#### سيناريوهات فشل

| المعرّف | العنوان | الخطوات | النتيجة المتوقعة | الأولوية |
|----------|---------|---------|-------------------|----------|
| MCH-SUB-002 | الوصول لتاجر آخر | 403 | عالي |

---

### العملية 11: Onboarding أساسي

**الـ API:** `PATCH /merchants/:id/onboarding/basic`  
**Body:** OnboardingBasicDto — name (مطلوب، 3–100)، businessType، businessDescription، phone، categories، customCategory، logoUrl، addresses، currencySettings.

#### السيناريو السعيد

| المعرّف | MCH-ONB-001 |
|----------|-------------|
| **العنوان** | حفظ معلومات onboarding أساسية |
| **الخطوات** | PATCH بـ `{ "name": "متجر الإلكترونيات", "businessType": "شركة تجارية" }` |
| **النتيجة المتوقعة** | 200، التاجر المحدّث |
| **الأولوية** | حرج |

#### سيناريوهات فشل

| المعرّف | العنوان | الخطوات | النتيجة المتوقعة | الأولوية |
|----------|---------|---------|-------------------|----------|
| MCH-ONB-002 | name أقصر من 3 أحرف | `{ "name": "ab" }` | 400 | عالي |
| MCH-ONB-003 | name أطول من 100 حرف | إرسال name طوله > 100 | 400 | عالي |
| MCH-ONB-004 | رقم هاتف بصيغة غير صحيحة | `{ "phone": "invalid" }` | 400 | متوسط |
| MCH-ONB-005 | تاجر غير موجود | 404 | عالي |

---

### العملية 12: تأكيد Workflow

**الـ API:** `POST /merchants/:id/workflow/ensure`  
**ملاحظة:** لا يتحقق من ownership في الكود الحالي.

#### السيناريو السعيد

| المعرّف | MCH-WF-001 |
|----------|------------|
| **العنوان** | إنشاء أو استرجاع workflow للتاجر |
| **الخطوات** | POST workflow/ensure |
| **النتيجة المتوقعة** | 200، `{ "workflowId": "..." }` |
| **الأولوية** | حرج |

#### سيناريوهات فشل

| المعرّف | العنوان | الخطوات | النتيجة المتوقعة | الأولوية |
|----------|---------|---------|-------------------|----------|
| MCH-WF-002 | تاجر غير موجود | 404 | عالي |
| MCH-WF-003 | فشل n8n (انقطاع، خطأ API) | 5xx أو خطأ من n8n | عالي |

---

### العملية 13: سياق المتجر للـ AI

**الـ API:** `GET /merchants/:id/ai/store-context`  
**عام.**

#### السيناريو السعيد

| المعرّف | MCH-AI-001 |
|----------|------------|
| **العنوان** | جلب سياق المتجر للـ AI |
| **الخطوات** | GET ai/store-context |
| **النتيجة المتوقعة** | 200، كائن سياق (منتجات، فئات، إلخ) |
| **الأولوية** | عالي |

#### سيناريوهات فشل

| المعرّف | العنوان | الخطوات | النتيجة المتوقعة | الأولوية |
|----------|---------|---------|-------------------|----------|
| MCH-AI-002 | تاجر غير موجود | 404 | متوسط |

---

### العملية 14: مصدر المنتجات (product-source)

**الـ API:** `PATCH /merchants/:id/product-source`  
**Body:** `{ "source": "internal" | "salla" | "zid", "syncMode"?: "immediate" | "background" | "none", "confirmPassword"?: string }`  
**ملاحظة:** confirmPassword مطلوب عند source !== internal أو syncMode === immediate.

#### السيناريو السعيد

| المعرّف | MCH-SRC-001 |
|----------|-------------|
| **العنوان** | تغيير المصدر إلى internal بدون مزامنة |
| **الخطوات** | PATCH بـ `{ "source": "internal" }` |
| **النتيجة المتوقعة** | 200، merchant، sync |
| **الأولوية** | حرج |

| المعرّف | MCH-SRC-002 |
|----------|-------------|
| **العنوان** | تغيير المصدر مع مزامنة فورية |
| **الخطوات** | PATCH بـ `{ "source": "salla", "syncMode": "immediate", "confirmPassword": "..." }` |
| **النتيجة المتوقعة** | 200، sync.mode: "immediate"، imported/updated |
| **الأولوية** | عالي |

#### سيناريوهات فشل

| المعرّف | العنوان | الخطوات | النتيجة المتوقعة | الأولوية |
|----------|---------|---------|-------------------|----------|
| MCH-SRC-003 | كلمة مرور ناقصة عند الحاجة | PATCH بـ syncMode: immediate بدون confirmPassword | 400 (كلمة المرور مطلوبة) | حرج |
| MCH-SRC-004 | كلمة مرور خاطئة | confirmPassword غير صحيحة | 400 (invalid credentials) | عالي |
| MCH-SRC-005 | source غير صالح | `{ "source": "invalid" }` | 400 | عالي |
| MCH-SRC-006 | الوصول لتاجر آخر | 403 | عالي |

---

### العملية 15: Quick Config (Prompt)

**الـ API:** `GET /merchants/:id/prompt/quick-config`، `PATCH /merchants/:id/prompt/quick-config`  
**Body (PATCH):** QuickConfigDto — dialect، tone، customInstructions، includeClosingPhrase، customerServicePhone، customerServiceWhatsapp، closingText.

#### السيناريو السعيد

| المعرّف | MCH-QC-001 |
|----------|------------|
| **العنوان** | جلب Quick Config |
| **الخطوات** | GET prompt/quick-config |
| **النتيجة المتوقعة** | 200، كائن quickConfig |
| **الأولوية** | حرج |

| المعرّف | MCH-QC-002 |
|----------|-------------|
| **العنوان** | تحديث Quick Config |
| **الخطوات** | PATCH بـ `{ "dialect": "خليجي", "tone": "ودّي" }` |
| **النتيجة المتوقعة** | 200، quickConfig محدّث |
| **الأولوية** | حرج |

#### سيناريوهات فشل

| المعرّف | العنوان | الخطوات | النتيجة المتوقعة | الأولوية |
|----------|---------|---------|-------------------|----------|
| MCH-QC-003 | الوصول لتاجر آخر | assertOwnership يفشل | 403 | حرج |
| MCH-QC-004 | تاجر غير موجود | 404 | عالي |

---

### العملية 16: القالب المتقدّم (Advanced Template)

**الـ API:** `GET /merchants/:id/prompt/advanced-template`، `POST /merchants/:id/prompt/advanced-template`  
**Body (POST):** `{ "template"?: string, "note"?: string }` — template مطلوب وغير فارغ بعد trim.

#### السيناريو السعيد

| المعرّف | MCH-ADV-001 |
|----------|-------------|
| **العنوان** | جلب القالب المتقدّم |
| **الخطوات** | GET advanced-template |
| **النتيجة المتوقعة** | 200، `{ template, note }` |
| **الأولوية** | عالي |

| المعرّف | MCH-ADV-002 |
|----------|-------------|
| **العنوان** | حفظ قالب متقدّم جديد |
| **الخطوات** | POST بـ `{ "template": "أنت مساعد {{merchantName}}...", "note": "تحديث" }` |
| **النتيجة المتوقعة** | 200، `{ "message": "Advanced template saved" }` |
| **الأولوية** | حرج |

#### سيناريوهات فشل

| المعرّف | العنوان | الخطوات | النتيجة المتوقعة | الأولوية |
|----------|---------|---------|-------------------|----------|
| MCH-ADV-003 | template ناقص أو فارغ | POST بـ template: "" أو بدون template | 400 (template is required) | حرج |
| MCH-ADV-004 | template أطول من الحد | تجاوز MAX_TEMPLATE_LENGTH | 400 | متوسط |
| MCH-ADV-005 | الوصول لتاجر آخر | 403 | عالي |

---

### العملية 17: نسخ القالب (Advanced Versions)

**الـ API:** `GET /merchants/:id/prompt/advanced-versions`، `POST /merchants/:id/prompt/advanced-versions/:index/revert`

#### السيناريو السعيد

| المعرّف | MCH-VER-001 |
|----------|-------------|
| **العنوان** | جلب سجل نسخ القالب |
| **الخطوات** | GET advanced-versions |
| **النتيجة المتوقعة** | 200، مصفوفة `{ template, note?, updatedAt }[]` |
| **الأولوية** | عالي |

| المعرّف | MCH-VER-002 |
|----------|-------------|
| **العنوان** | التراجع لنسخة سابقة |
| **الخطوات** | POST advanced-versions/0/revert (مثلاً index=0 للنسخة الأقدم) |
| **النتيجة المتوقعة** | 200، `{ "message": "Reverted to version 0" }` |
| **الأولوية** | عالي |

#### سيناريوهات فشل

| المعرّف | العنوان | الخطوات | النتيجة المتوقعة | الأولوية |
|----------|---------|---------|-------------------|----------|
| MCH-VER-003 | index غير صالح | POST advanced-versions/abc/revert | 400 | متوسط |
| MCH-VER-004 | index خارج النطاق | index أكبر من عدد النسخ | حسب التصميم (400 أو 404) | متوسط |

---

### العملية 18: معاينة الـ Prompt (preview)

**الـ API:** `POST /merchants/:id/prompt/preview`  
**Body:** PreviewPromptDto — useAdvanced?، quickConfig?، testVars?.

#### السيناريو السعيد

| المعرّف | MCH-PRV-001 |
|----------|-------------|
| **العنوان** | معاينة الـ prompt (من quick config) |
| **الخطوات** | POST بـ `{ "quickConfig": { "dialect": "خليجي" } }` أو body فارغ |
| **النتيجة المتوقعة** | 200، `{ "preview": "..." }` |
| **الأولوية** | عالي |

#### سيناريوهات فشل

| المعرّف | العنوان | الخطوات | النتيجة المتوقعة | الأولوية |
|----------|---------|---------|-------------------|----------|
| MCH-PRV-002 | الوصول لتاجر آخر | 403 | عالي |

---

### العملية 19: Final Prompt

**الـ API:** `GET /merchants/:id/prompt/final-prompt`

#### السيناريو السعيد

| المعرّف | MCH-FIN-001 |
|----------|-------------|
| **العنوان** | جلب الـ final prompt النصي |
| **الخطوات** | GET final-prompt |
| **النتيجة المتوقعة** | 200، `{ "prompt": "..." }` |
| **الأولوية** | حرج |

#### سيناريوهات فشل

| المعرّف | العنوان | الخطوات | النتيجة المتوقعة | الأولوية |
|----------|---------|---------|-------------------|----------|
| MCH-FIN-002 | Final prompt غير مُهيأ | التاجر لم يُجمّع له القالب بعد | 400 (Final prompt not configured) | عالي |
| MCH-FIN-003 | الوصول لتاجر آخر | 403 | عالي |

---

## 5) ملخص الحالات وترتيب التنفيذ

| الأولوية | الحالات (أمثلة) |
|----------|-----------------|
| **حرج** | MCH-GET-001؛ MCH-UPD-001، MCH-UPD-002؛ MCH-ONB-001؛ MCH-WF-001؛ MCH-SRC-001، MCH-SRC-003؛ MCH-QC-001، MCH-QC-002، MCH-QC-003؛ MCH-ADV-002، MCH-ADV-003؛ MCH-FIN-001 |
| **عالي** | MCH-SLUG-001–004؛ MCH-LEAD-001–002؛ MCH-LOGO-001–005؛ MCH-CHK-001؛ MCH-SRC-002، MCH-SRC-004–006؛ MCH-ADV-001، MCH-VER-001–002؛ MCH-PRV-001؛ MCH-FIN-002 |
| **متوسط** | MCH-DEL-001، MCH-RES-001؛ MCH-SKIP-001؛ MCH-SUB-001؛ MCH-VER-003–004؛ MCH-AI-001 |

**ترتيب مقترح للتنفيذ:**

1. التحقق من slug وعرض التاجر (عام).
2. تحديث التاجر، onboarding، workflow ensure.
3. إعدادات Leads، رفع الشعار، checklist.
4. مصدر المنتجات (مع/بدون كلمة مرور).
5. Quick Config، القالب المتقدّم، النسخ، المعاينة، Final Prompt.
6. الحذف الناعم والاستعادة.

---

## 6) قائمة التحقق السريعة (Checklist)

| المعرّف | الوصف | النتيجة | ملاحظات |
|----------|--------|---------|----------|
| MCH-SLUG-001 – 004 | التحقق من slug | | |
| MCH-GET-001 – 003 | عرض التاجر | | |
| MCH-UPD-001 – 004 | تحديث التاجر | | |
| MCH-DEL-001 – 003 | حذف ناعم | | |
| MCH-RES-001 – 002 | استعادة | | |
| MCH-CHK-001 – 003 | Checklist | | |
| MCH-SKIP-001 – 003 | تخطي عنصر | | |
| MCH-LEAD-001 – 004 | إعدادات Leads | | |
| MCH-LOGO-001 – 005 | رفع الشعار | | |
| MCH-SUB-001 – 002 | حالة الاشتراك | | |
| MCH-ONB-001 – 005 | Onboarding | | |
| MCH-WF-001 – 003 | Workflow ensure | | |
| MCH-AI-001 – 002 | سياق AI | | |
| MCH-SRC-001 – 006 | مصدر المنتجات | | |
| MCH-QC-001 – 004 | Quick Config | | |
| MCH-ADV-001 – 005 | القالب المتقدّم | | |
| MCH-VER-001 – 004 | نسخ القالب | | |
| MCH-PRV-001 – 002 | معاينة Prompt | | |
| MCH-FIN-001 – 003 | Final Prompt | | |

---

## 7) مراجع تقنية سريعة

- **Base path:** `/api/merchants`، `/api/merchants/:id/prompt`
- **التوثيق:** Bearer JWT مع merchantId للمسارات المحمية.
- **عام (بدون JWT):** check-public-slug، GET :id، GET :id/ai/store-context
- **صلاحيات:** assertOwnerOrAdmin (owner أو admin) لمعظم المسارات؛ skip checklist للمالك فقط.
- **Onboarding:** name مطلوب (3–100)، phone بصيغة IsPhoneNumber، categories مصفوفة غير فارغة.
- **Leads:** fieldType: name | email | phone | address | custom.
- **Product source:** internal | salla | zid؛ confirmPassword مطلوب عند تغيير لمصدر خارجي أو syncMode: immediate.

---

_آخر تحديث: فبراير 2025 — إصدار 1.0_
