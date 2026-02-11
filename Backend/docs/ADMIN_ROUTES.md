# مسارات لوحة الإدارة (Admin Routes)

جميع المسارات التالية تتطلب **مصادقة JWT** (Bearer) ودور **ADMIN**.

**ال base URL**: `{API_BASE}/` — مثلاً `https://api.kleem.sa/` أو `http://localhost:3000/api/`

---

## الفهرس

| القسم | الصفحة |
|-------|--------|
| [لوحة رئيسية](#لوحة-رئيسية) | إحصائيات وترندات |
| [التقارير](#التقارير-reports) | تقارير نشاط وتسجيل واستهلاك |
| [التجار](#التجار-merchants) | إدارة التجار |
| [المستخدمون](#المستخدمون-users) | إدارة المستخدمين |
| [الاستهلاك](#الاستهلاك-usage) | الاستهلاك والفوترة |
| [الخطط](#الخطط-plans) | إدارة خطط الاشتراك |
| [القنوات](#القنوات-channels) | إدارة القنوات |
| [التوجيهات](#التوجيهات-instructions) | إدارة التوجيهات |
| [AI](#ai) | فحص صحة Gemini |
| [التحليلات](#التحليلات-analytics) | الردود المفقودة |
| [الكاش](#الكاش-cache) | إدارة الكاش |
| [الدعم والتذاكر](#الدعم-والتذاكر-support) | إدارة التذاكر |
| [النظام والأمان](#النظام-والأمان-system) | سجل تدقيق، جلسات، feature flags، نسخ احتياطي |
| [كليم (Kleem)](#كليم-kleem) | إعدادات، برومبتات، FAQs، محادثات، تقييمات |

---

## لوحة رئيسية

| Method | المسار | Query | الوصف |
|--------|--------|-------|--------|
| GET | `/admin/dashboard` | — | إحصائيات مجمعة (تجار، مستخدمين، استهلاك) |
| GET | `/admin/dashboard/trends` | `period=7d\|30d` | ترند زمني (تجار/مستخدمين يومي، استهلاك شهري) |

---

## التقارير (Reports)

| Method | المسار | Query | الوصف |
|--------|--------|-------|--------|
| GET | `/admin/reports/merchant-activity/:merchantId` | — | تقرير نشاط تاجر (آخر نشاط، محادثات، قنوات) |
| GET | `/admin/reports/signups` | `from=YYYY-MM-DD`, `to=YYYY-MM-DD` | تقرير التحويلات/التسجيل حسب الفترة |
| GET | `/admin/reports/kleem-summary` | — | ملخص تحليلات كليم (ردود مفقودة مفتوحة/محلولة) |
| GET | `/admin/reports/usage-by-plan` | `monthKey=YYYY-MM` | تقرير الاستخدام حسب الخطة |

---

## التجار (Merchants)

| Method | المسار | Query/Body | الوصف |
|--------|--------|------------|--------|
| GET | `/admin/merchants` | `status`, `active`, `subscriptionTier`, `search`, `sortBy`, `sortOrder`, `limit`, `page` | قائمة التجار |
| GET | `/admin/merchants/stats` | — | إحصائيات التجار |
| GET | `/admin/merchants/export` | نفس فلترة القائمة | تصدير CSV |
| GET | `/admin/merchants/:id` | — | تفاصيل تاجر |
| GET | `/admin/merchants/:id/audit-log` | `limit`, `page` | سجل إجراءات تاجر |
| PATCH | `/admin/merchants/:id` | `{ active?, status? }` | تحديث حالة |
| POST | `/admin/merchants/:id/suspend` | `{ reason? }` | تعليق تاجر |
| POST | `/admin/merchants/:id/unsuspend` | — | إعادة تفعيل تاجر معلّق |

---

## المستخدمون (Users)

| Method | المسار | Query/Body | الوصف |
|--------|--------|------------|--------|
| GET | `/admin/users` | `role`, `active`, `search`, `sortBy`, `sortOrder`, `limit`, `page` | قائمة المستخدمين |
| GET | `/admin/users/stats` | — | إحصائيات المستخدمين |
| GET | `/admin/users/export` | نفس فلترة القائمة | تصدير CSV |
| GET | `/admin/users/:id` | — | تفاصيل مستخدم |
| PATCH | `/admin/users/:id` | `{ active?, role?, reason?, merchantId? }` | تحديث دور/حالة/ربط تاجر |
| POST | `/admin/users/:id/reset-password` | — | إعادة تعيين كلمة مرور (يُرجع `temporaryPassword`) |

---

## الاستهلاك (Usage)

| Method | المسار | Query/Body | الوصف |
|--------|--------|------------|--------|
| GET | `/admin/usage` | `monthKey`, `search`, `sortBy`, `sortOrder`, `limit`, `page` | قائمة استهلاك (مع الحد ونسبة الاستهلاك) |
| GET | `/admin/usage/alerts` | `monthKey`, `thresholdPercent`, `limit` | تنبيهات تجار تجاوزوا الحد أو قاربوه |
| GET | `/admin/usage/report` | `from=YYYY-MM`, `to=YYYY-MM` | تقرير استهلاك لفترة مخصصة |
| GET | `/admin/usage/stats` | — | إحصائيات الاستهلاك الشهري |
| GET | `/admin/usage/export` | — | تصدير CSV |
| GET | `/admin/usage/:merchantId` | — | استهلاك تاجر معيّن |
| POST | `/admin/usage/:merchantId/reset` | `monthKey=YYYY-MM` | إعادة تعيين استهلاك شهر (مع سجل) |

---

## الخطط (Plans)

| Method | المسار | Body | الوصف |
|--------|--------|------|--------|
| GET | `/admin/plans` | — | قائمة الخطط |
| GET | `/admin/plans/:id` | — | تفاصيل خطة |
| POST | `/admin/plans` | `{ name, ... }` | إنشاء خطة |
| PUT | `/admin/plans/:id` | `{ ... }` | تحديث خطة |
| DELETE | `/admin/plans/:id` | — | حذف خطة |
| PATCH | `/admin/plans/:id/active` | — | تفعيل/تعطيل خطة |
| PATCH | `/admin/plans/:id/archive` | — | أرشفة خطة |

---

## القنوات (Channels)

| Method | المسار | الوصف |
|--------|--------|--------|
| GET | `/admin/channels` | قائمة القنوات |
| GET | `/admin/channels/stats` | إحصائيات القنوات |
| GET | `/admin/channels/:id` | تفاصيل قناة |
| PATCH | `/admin/channels/:id` | تحديث قناة |
| POST | `/admin/channels/:id/actions/disconnect` | فصل القناة |

---

## التوجيهات (Instructions)

| Method | المسار | الوصف |
|--------|--------|--------|
| GET | `/admin/instructions` | قائمة التوجيهات |
| GET | `/admin/instructions/:id` | تفاصيل توجيه |
| PATCH | `/admin/instructions/:id` | تحديث توجيه |
| DELETE | `/admin/instructions/:id` | حذف توجيه |
| POST | `/admin/instructions/bulk-activate` | تفعيل جماعي |
| POST | `/admin/instructions/bulk-deactivate` | إلغاء تفعيل جماعي |

---

## AI

| Method | المسار | الوصف |
|--------|--------|--------|
| GET | `/admin/ai/health` | فحص صحة خدمة Gemini |

---

## التحليلات (Analytics)

| Method | المسار | Query/Body | الوصف |
|--------|--------|------------|--------|
| GET | `/admin/analytics/kleem-missing-responses` | `channel`, `resolved`, `q`, `limit`, `page` | قائمة الردود المفقودة |
| PATCH | `/admin/analytics/kleem-missing-responses/:id` | `{ resolved?, manualReply?, category? }` | تحديث سجل |
| POST | `/admin/analytics/kleem-missing-responses/bulk-resolve` | `{ ids: string[] }` | حل جماعي |

---

## الكاش (Cache)

| Method | المسار | الوصف |
|--------|--------|--------|
| GET | `/admin/cache/stats` | إحصائيات الكاش |
| POST | `/admin/cache/stats/reset` | إعادة تعيين الإحصائيات |
| DELETE | `/admin/cache/clear` | مسح الكاش |

---

## الدعم والتذاكر (Support)

| Method | المسار | Query/Body | الوصف |
|--------|--------|------------|--------|
| GET | `/admin/support` | `status`, `search`, `sortBy`, `sortOrder`, `limit`, `page` | قائمة التذاكر |
| GET | `/admin/support/stats` | — | إحصائيات التذاكر (حسب الحالة، متوسط وقت الحل) |
| GET | `/admin/support/export` | — | تصدير CSV |
| GET | `/admin/support/:id` | — | تفاصيل تذكرة |
| PATCH | `/admin/support/:id` | `{ status?, assignedTo? }` | تحديث حالة أو تعيين موظف |
| POST | `/admin/support/:id/replies` | `{ body, isInternal? }` | إضافة رد/تعليق |

---

## النظام والأمان (System)

| Method | المسار | Query/Body | الوصف |
|--------|--------|------------|--------|
| GET | `/admin/system/audit-log` | `actorId`, `resource`, `from`, `to`, `limit`, `page` | سجل تدقيق أدمن |
| GET | `/admin/system/sessions` | `adminId` | قائمة جلسات الأدمن النشطة |
| DELETE | `/admin/system/sessions/:jti` | — | إلغاء جلسة أدمن |
| GET | `/admin/system/feature-flags` | — | إعدادات قفل/فتح (merchantSignupEnabled، userSignupEnabled) |
| POST | `/admin/system/backup` | — | تفعيل نسخ احتياطي (يتطلب BACKUP_TRIGGER_URL) |

---

## كليم (Kleem) — خدمة العملاء الخاصة

كليم هي خدمة المحادثة الآلية مع العملاء. يُتحكّم بكل عملياتها من لوحة الأدمن.

### إعدادات البوت (Settings)

| Method | المسار | Query/Body | الوصف |
|--------|--------|------------|--------|
| GET | `/admin/kleem/settings/chat` | — | استرجاع إعدادات تشغيل البوت |
| PUT | `/admin/kleem/settings/chat` | `{ ... }` | تحديث إعدادات البوت (روابط، نصوص مخصصة) |

### البرومبتات (Bot Prompts)

| Method | المسار | Query/Body | الوصف |
|--------|--------|------------|--------|
| GET | `/admin/kleem/bot-prompts` | `type=system\|user`, `includeArchived` | قائمة البرومبتات |
| GET | `/admin/kleem/bot-prompts/:id` | — | تفاصيل برومبت |
| POST | `/admin/kleem/bot-prompts` | `{ name, content, type, ... }` | إنشاء برومبت |
| PATCH | `/admin/kleem/bot-prompts/:id` | `{ ... }` | تحديث برومبت |
| POST | `/admin/kleem/bot-prompts/:id/active` | `{ active }` | تفعيل/تعطيل برومبت |
| POST | `/admin/kleem/bot-prompts/:id/archive` | — | أرشفة برومبت |
| DELETE | `/admin/kleem/bot-prompts/:id` | — | حذف برومبت |
| GET | `/admin/kleem/bot-prompts/system/active` | — | البرومبت النشط للنظام |
| GET | `/admin/kleem/bot-prompts/system/active/content` | — | محتوى البرومبت النشط فقط |
| POST | `/admin/kleem/prompts/sandbox` | `{ ... }` | اختبار البرومبت (sandbox) |

### الأسئلة الشائعة (Bot FAQs)

| Method | المسار | Query/Body | الوصف |
|--------|--------|------------|--------|
| GET | `/admin/kleem/bot-faqs` | — | قائمة الأسئلة الشائعة |
| POST | `/admin/kleem/bot-faqs` | `{ question, answer }` | إنشاء سؤال شائع |
| PATCH | `/admin/kleem/bot-faqs/:id` | `{ ... }` | تحديث سؤال |
| DELETE | `/admin/kleem/bot-faqs/:id` | — | حذف سؤال |
| POST | `/admin/kleem/bot-faqs/import` | `{ items: [...] }` | استيراد جماعي (حتى 500) |
| POST | `/admin/kleem/bot-faqs/import/file` | `file` (multipart) | استيراد من ملف JSON |
| POST | `/admin/kleem/bot-faqs/reindex` | — | إعادة فهرسة الأسئلة في محرك البحث |

### المحادثات والتقييمات (Bot Chats)

| Method | المسار | Query/Body | الوصف |
|--------|--------|------------|--------|
| GET | `/admin/kleem/bot-chats` | `page`, `limit`, `q` | قائمة المحادثات |
| GET | `/admin/kleem/bot-chats/:sessionId` | — | محادثة محددة |
| POST | `/admin/kleem/bot-chats/:sessionId` | `{ messages: [...] }` | حفظ رسائل في جلسة |
| PATCH | `/admin/kleem/bot-chats/:sessionId/rate/:msgIdx` | `{ rating, feedback? }` | تقييم رسالة (0=سيء، 1=جيد) |
| GET | `/admin/kleem/bot-chats/stats/top-questions/list` | `limit` | أكثر الأسئلة شيوعاً |
| GET | `/admin/kleem/bot-chats/stats/bad-bot-replies/list` | `limit` | الردود ذات التقييم السيء |

### تقييمات كليم (Ratings)

| Method | المسار | Query | الوصف |
|--------|--------|-------|--------|
| GET | `/admin/kleem/bot-chats/ratings` | `page`, `limit`, `...` | قائمة التقييمات |
| GET | `/admin/kleem/bot-chats/ratings/stats` | `from`, `to` | إحصائيات التقييمات (إجمالي، إيجابي، سلبي، topBad) |

---

## مسارات المصادقة (للأدمن)

| Method | المسار | الوصف |
|--------|--------|--------|
| POST | `/auth/login` | تسجيل الدخول (email, password) — يُرجع accessToken + refreshToken |
| POST | `/auth/refresh` | تجديد التوكن |
| POST | `/auth/logout` | تسجيل الخروج |

استخدم `Authorization: Bearer {accessToken}` في رؤوس طلبات الأدمن.

---

*في Swagger (api/docs) تظهر كل مسارات الأدمن تحت الوسم **Admin**.*
