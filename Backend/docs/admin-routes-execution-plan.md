# خطة تنفيذ المسارات الإدارية (Admin Routes)

> وثيقة تنفيذ الحد الأدنى من المسارات الإدارية اللازمة لتشغيل المشروع كمنصة SaaS.

---

## 1. الوضع الحالي

### 1.1 المسارات الإدارية الموجودة

| المسار | الوحدة | الوظيفة |
|--------|--------|---------|
| `GET/PATCH admin/channels` | channels | قائمة القنوات، إحصائيات، تفاصيل، تحديث، فصل |
| `GET/PATCH/DELETE/POST admin/instructions` | instructions | قائمة، تفاصيل، تحديث، حذف، تفعيل/إلغاء جماعي |
| `GET admin/ai/health` | ai | فحص صحة خدمة Gemini |
| `admin/kleem/*` | kleem | إعدادات الدردشة، prompts، FAQs، محادثات، تقييمات |
| `GET/PATCH/POST admin/analytics/kleem-missing-responses` | analytics | تحليلات الردود المفقودة + bulk resolve |
| `GET/POST/DELETE admin/cache` | common/cache | إحصائيات الكاش، مسح، إعادة تعيين |
| `POST/PUT/PATCH/DELETE plans` (مع `@Roles('ADMIN')`) | plans | إنشاء/تعديل/حذف الخطط |
| `GET usage/:merchantId` (مع `@Roles('ADMIN')`) | usage | استهلاك تاجر معين |
| `GET users` (مع تحقق أدمن) | users | قائمة مستخدمين + صلاحيات حسب الدور |

### 1.2 الثغرات للحد الأدنى SaaS

- لا يوجد **مسار إداري موحد** لإدارة المستخدمين (`admin/users`).
- لا يوجد **قائمة تجار شاملة** للأدمن (`admin/merchants`).
- لا يوجد **عرض مركزي للاستهلاك** (`admin/usage`).
- لا يوجد **لوحة رئيسية/إحصائيات عامة** (`admin/dashboard` أو `admin/stats`).
- مسارات الخطط والاستهلاك غير موحدة تحت بادئة `admin/`.

---

## 2. خطة التنفيذ

### المرحلة 1: إدارة التجار (أولوية عالية)

**الهدف:** لوحة أدمن لرؤية وإدارة كل التجار (multi-tenant).

| # | المهمة | المسار المقترح | الوصف |
|---|--------|----------------|--------|
| 1.1 | إنشاء `MerchantsAdminController` | `admin/merchants` | Controller جديد تحت `modules/merchants/` |
| 1.2 | قائمة التجار مع فلترة وباجينيشين | `GET admin/merchants` | استدعاء repository/خدمة لقائمة كل التجار مع query params |
| 1.3 | تفاصيل تاجر | `GET admin/merchants/:id` | عرض تفاصيل تاجر واحد (قنوات، خطة، حالة) |
| 1.4 | إحصائيات التجار | `GET admin/merchants/stats` | أرقام مجمعة (عدد التجار، مفعلين، إلخ) |
| 1.5 | تعطيل/تفعيل تاجر (اختياري) | `PATCH admin/merchants/:id` | تحديث حالة (مثلاً `isActive`) |

**الملفات المتوقعة:**

- `src/modules/merchants/merchants.admin.controller.ts`
- `src/modules/merchants/dto/query-admin-merchants.dto.ts`
- إضافة دوال في `MerchantsService` أو repository للقائمة والإحصائيات الإدارية
- تسجيل الـ controller في `merchants.module.ts`

---

### المرحلة 2: إدارة المستخدمين (أولوية عالية)

**الهدف:** لوحة أدمن لإدارة حسابات المستخدمين والأدوار.

| # | المهمة | المسار المقترح | الوصف |
|---|--------|----------------|--------|
| 2.1 | إنشاء `UsersAdminController` | `admin/users` | Controller جديد تحت `modules/users/` |
| 2.2 | قائمة المستخدمين مع فلترة | `GET admin/users` | قائمة كل المستخدمين مع بحث/فلترة (دور، حالة) |
| 2.3 | تفاصيل مستخدم | `GET admin/users/:id` | عرض وتعديل مستخدم (دور، تفعيل/تعطيل) |
| 2.4 | تحديث مستخدم (دور/حالة) | `PATCH admin/users/:id` | تحديث الدور أو تفعيل/تعطيل الحساب |
| 2.5 | إحصائيات المستخدمين (اختياري) | `GET admin/users/stats` | أرقام مجمعة حسب الدور أو الحالة |

**الملفات المتوقعة:**

- `src/modules/users/users.admin.controller.ts`
- `src/modules/users/dto/query-admin-users.dto.ts`
- دوال في `UsersService` للقائمة والإحصائيات الإدارية (أو استخدام الموجود مع تحقق الدور)
- تسجيل الـ controller في `users.module.ts`

---

### المرحلة 3: الاستهلاك والإحصائيات (أولوية متوسطة)

**الهدف:** عرض مركزي لاستهلاك التجار لدعم الفوترة والحدود.

| # | المهمة | المسار المقترح | الوصف |
|---|--------|----------------|--------|
| 3.1 | إنشاء `UsageAdminController` أو توسيع الموجود | `admin/usage` | توحيد تحت بادئة إدارية |
| 3.2 | قائمة استهلاك التجار | `GET admin/usage` | قائمة استهلاك (مرتبطة بكل التجار أو فلترة حسب شهر/خطة) |
| 3.3 | تفاصيل استهلاك تاجر | `GET admin/usage/:merchantId` | يمكن إبقاء المنطق الحالي مع نقل المسار إلى `admin/usage/:merchantId` |

**الملفات المتوقعة:**

- `src/modules/usage/usage.admin.controller.ts` (أو إعادة تسمية/توسيع الـ controller الحالي)
- توسيع `UsageService` لدعم قائمة استهلاك متعددة التجار إن لزم

---

### المرحلة 4: لوحة رئيسية / إحصائيات عامة (أولوية متوسطة)

**الهدف:** نظرة سريعة للأدمن على صحة المنصة.

| # | المهمة | المسار المقترح | الوصف |
|---|--------|----------------|--------|
| 4.1 | إنشاء وحدة أو controller للوحة الإدارية | `admin/dashboard` أو `admin/stats` | يمكن تحت `system` أو وحدة جديدة `admin-dashboard` |
| 4.2 | إحصائيات مجمعة | `GET admin/dashboard` أو `GET admin/stats` | أرقام: عدد التجار، المستخدمين، الطلبات النشطة، اشتراكات، إلخ |

**الملفات المتوقعة:**

- `src/modules/system/admin-dashboard.controller.ts` أو `src/modules/admin/` (وحدة جديدة)
- خدمة تجمع أرقاماً من `merchants`, `users`, `orders`, `plans` حسب الحاجة

---

### المرحلة 5: توحيد المسارات تحت بادئة Admin (أولوية منخفضة)

**الهدف:** اتساق واجهة الـ API وسهولة التأمين (مثلاً guard واحد لـ `/admin/*`).

| # | المهمة | الوصف |
|---|--------|--------|
| 5.1 | توحيد Plans | إضافة `PlansAdminController` تحت `admin/plans` أو إعادة توجيه `plans` إلى نفس المنطق مع prefix `admin/plans` |
| 5.2 | توثيق المسارات | توثيق كل مسارات `admin/*` في Swagger/OpenAPI وتصنيفها تحت tag موحد (مثل "Admin") |

---

### المرحلة 6: الدعم والتذاكر (اختياري)

**الهدف:** إدارة تذاكر الدعم من لوحة الأدمن.

| # | المهمة | المسار المقترح | الوصف |
|---|--------|----------------|--------|
| 6.1 | قائمة التذاكر | `GET admin/support` أو `admin/tickets` | قائمة تذاكر الدعم مع فلترة |
| 6.2 | تحديث حالة تذكرة | `PATCH admin/support/:id` | تغيير الحالة، تعيين، إلخ |

---

## 3. ترتيب التنفيذ المقترح

```
1 → admin/merchants   (أساس multi-tenant)
2 → admin/users       (إدارة الفريق والصلاحيات)
3 → admin/usage       (الاستهلاك والفوترة)
4 → admin/dashboard   (نظرة عامة)
5 → توحيد admin/plans + توثيق
6 → admin/support     (حسب الحاجة)
```

---

## 4. معايير تقنية موحدة

- **الحماية:** جميع مسارات `admin/*` محمية بـ `JwtAuthGuard` + `RolesGuard` مع دور `ADMIN`.
- **البادئة:** استخدام بادئة `admin/` لجميع المسارات الإدارية (مثال: `admin/merchants`, `admin/users`).
- **التوثيق:** استخدام `@ApiTags('Admin ...')` في Swagger لكل controller إداري.
- **الاختبارات:** إضافة unit tests لكل admin controller (على غرار `channels.admin.controller.spec.ts`).

---

## 5. مراجع في المشروع

- نموذج controller إداري: `src/modules/channels/channels.admin.controller.ts`
- نموذج DTO للاستعلام: `src/modules/channels/dto/query-admin-channels.dto.ts`
- نموذج اختبار: `src/modules/channels/__tests__/channels.admin.controller.spec.ts`
- Guard الأدوار: `src/common/guards/roles.guard.ts` و `@Roles()` من `src/common/decorators/roles.decorator.ts`

---

*آخر تحديث: 2025-02-11*
