# ورك فلو إنشاء الحساب - نظام كليم الشامل

## نظرة عامة على النظام

نظام كليم هو منصة ذكاء اصطناعي متكاملة للتجار تتضمن:

- إدارة التجار والمستخدمين
- نظام الذكاء الاصطناعي المعتمد على n8n و Google Gemini
- نظام المراسلة متعدد القنوات (واتساب، تليجرام، ويب شات)
- إدارة المنتجات والطلبات
- نظام التحليلات والمراقبة

## 1. مخطط التدفق العام (Flowchart)

```mermaid
graph TD
    A[بدء التسجيل] --> B[إدخال البيانات<br/>الاسم، البريد، كلمة المرور]
    B --> C[التحقق من صحة البيانات<br/>البريد غير مستخدم، كلمات المرور متطابقة]
    C -->|نعم| D[إنشاء المستخدم<br/>role: MERCHANT<br/>firstLogin: true<br/>emailVerified: false]
    D --> E[توليد كود التحقق<br/>6 أرقام، صالح لـ15 دقيقة]
    E --> F[إرسال البريد الإلكتروني<br/>عبر MailService]
    F --> G[إرجاع Access Token<br/>للمستخدم غير المفعل]

    C -->|لا| H[خطأ في التسجيل<br/>البريد مستخدم أو بيانات خاطئة]

    I[تحقق البريد الإلكتروني] --> J[إدخال الكود<br/>البريد + الكود 6 أرقام]
    J --> K[التحقق من الكود<br/>التحقق من الهاش والصلاحية]
    K -->|صالح| L[تفعيل الحساب<br/>emailVerified: true<br/>firstLogin: true]
    L --> M[إنشاء/ربط التاجر<br/>عبر MerchantsService]
    M --> N[إرجاع Access Token جديد<br/>للمستخدم المفعل]

    K -->|غير صالح| O[خطأ في التحقق<br/>كود خاطئ أو منتهي الصلاحية]

    P[تسجيل الدخول] --> Q[إدخال البريد وكلمة المرور]
    Q --> R[التحقق من الحساب<br/>نشط ومفعل]
    R -->|نعم| S[التحقق من البريد المفعل]
    S -->|نعم| T[التحقق من حالة التاجر]
    T -->|نشط| U[إصدار التوكن<br/>Access + Refresh Token]
    T -->|معطل| V[رفض الدخول<br/>حساب التاجر معطل]

    S -->|لا| W[رفض الدخول<br/>البريد غير مفعل]
    R -->|لا| X[رفض الدخول<br/>الحساب معطل]

    Y[إعداد المتجر] --> Z[إعداد البوت<br/>ربط القنوات]
    Z --> AA[إضافة المنتجات<br/>عبر التكاملات]
    AA --> BB[تفعيل الذكاء الاصطناعي<br/>n8n workflow]
    BB --> CC[بدء استقبال الرسائل<br/>من العملاء]
```

## 2. مخطط التسلسل (Sequence Diagram)

```mermaid
sequenceDiagram
    participant F as Frontend
    participant B as Backend
    participant DB as Database
    participant MS as MailService
    participant N8N as n8n Workflow
    participant AI as Google Gemini
    participant AN as Analytics

    Note over F,B: مرحلة التسجيل
    F->>B: POST /auth/register<br/>{name, email, password, confirmPassword}
    B->>DB: إنشاء المستخدم (role: MERCHANT)
    DB-->>B: مستخدم جديد
    B->>B: توليد كود التحقق (6 أرقام)
    B->>DB: حفظ كود التحقق (مشفر + صلاحية 15د)
    B->>MS: إرسال بريد التحقق
    MS-->>B: تأكيد الإرسال
    B-->>F: 201 Created<br/>{accessToken, user: {emailVerified: false}}

    Note over F,B: مرحلة التحقق
    F->>B: POST /auth/verify-email<br/>{email, code}
    B->>DB: البحث عن المستخدم
    B->>DB: البحث عن كود التحقق
    B->>B: التحقق من الهاش والصلاحية
    B->>DB: تحديث المستخدم (emailVerified: true)
    B->>B: إنشاء/ربط التاجر
    B->>DB: حذف أكواد التحقق المستخدمة
    B-->>F: 200 OK<br/>{accessToken, user: {emailVerified: true}}

    Note over F,B: مرحلة تسجيل الدخول
    F->>B: POST /auth/login<br/>{email, password}
    B->>DB: البحث عن المستخدم
    B->>B: التحقق من كلمة المرور
    B->>B: التحقق من حالة التاجر
    B->>B: إنشاء Token Pair
    B-->>F: 200 OK<br/>{accessToken, refreshToken, user}

    Note over N8N,AI: مرحلة معالجة الرسائل
    N8N->>B: Webhook من العميل
    B->>DB: البحث عن التاجر
    B->>N8N: بيانات التاجر
    N8N->>AI: استدعاء Google Gemini
    AI-->>N8N: رد الذكاء الاصطناعي
    N8N->>N8N: تحليل الرد (فحص الجودة)
    N8N->>B: إرسال الرد للعميل
    B->>AN: تسجيل التحليلات
    AN-->>B: تأكيد التسجيل
```

## 3. آلة الحالات (State Machine)

```mermaid
stateDiagram-v2
    [*] --> تسجيل_جديد: إنشاء حساب

    تسجيل_جديد --> فحص_البيانات: إدخال البيانات
    فحص_البيانات --> خطأ_تسجيل: بيانات خاطئة
    فحص_البيانات --> إرسال_كود: بيانات صحيحة

    إرسال_كود --> في_انتظار_التحقق: إرسال البريد
    في_انتظار_التحقق --> تحقق_الكود: إدخال الكود
    تحقق_الكود --> خطأ_تحقق: كود خاطئ/منتهي
    تحقق_الكود --> مفعل: كود صحيح

    مفعل --> في_انتظار_التاجر: إنشاء التاجر
    في_انتظار_التاجر --> تاجر_نشط: إعداد التاجر
    تاجر_نشط --> في_انتظار_البوت: إعداد البوت
    في_انتظار_البوت --> بوت_نشط: تفعيل n8n
    بوت_نشط --> جاهز_للاستخدام: بدء استقبال الرسائل

    خطأ_تسجيل --> [*]: إنهاء
    خطأ_تحقق --> في_انتظار_التحقق: إعادة محاولة
    تاجر_نشط --> معطل_مؤقت: إيقاف التاجر
    معطل_مؤقت --> تاجر_نشط: إعادة تفعيل
    جاهز_للاستخدام --> معطل_نهائي: حذف التاجر
    معطل_نهائي --> [*]: إنهاء
```

### تعريف الحالات

| الحالة             | الوصف                        | الإجراءات المسموحة        |
| ------------------ | ---------------------------- | ------------------------- |
| `تسجيل_جديد`       | مستخدم جديد في مرحلة التسجيل | إدخال البيانات الأساسية   |
| `فحص_البيانات`     | التحقق من صحة البيانات       | التحقق من البريد والكلمات |
| `إرسال_كود`        | إرسال كود التحقق عبر البريد  | إنشاء وإرسال الكود        |
| `في_انتظار_التحقق` | انتظار إدخال كود التحقق      | إعادة إرسال الكود         |
| `تحقق_الكود`       | فحص صحة الكود المدخل         | التحقق من الهاش والصلاحية |
| `مفعل`             | الحساب مفعل والبريد موثق     | إنشاء التاجر              |
| `في_انتظار_التاجر` | في مرحلة إنشاء/ربط التاجر    | إعداد معلومات التاجر      |
| `تاجر_نشط`         | التاجر جاهز للاستخدام        | إعداد البوت والقنوات      |
| `في_انتظار_البوت`  | في مرحلة إعداد البوت         | ربط n8n workflow          |
| `بوت_نشط`          | البوت جاهز للعمل             | تفعيل الذكاء الاصطناعي    |
| `جاهز_للاستخدام`   | النظام جاهز بالكامل          | استقبال ومعالجة الرسائل   |
| `معطل_مؤقت`        | التاجر معطل مؤقتاً           | عرض رسالة تعليق           |
| `معطل_نهائي`       | التاجر محذوف نهائياً         | منع الوصول                |

## 4. مخطط سير العمل التجاري (BPMN)

```mermaid
graph TB
    Start([بدء]) --> UserInput[إدخال بيانات المستخدم]
    UserInput --> ValidateInput[التحقق من البيانات]

    ValidateInput --> EmailExists{البريد موجود؟}
    EmailExists -->|نعم| Error1[خطأ: البريد مستخدم]
    EmailExists -->|لا| PasswordMatch{كلمات المرور متطابقة؟}
    PasswordMatch -->|لا| Error2[خطأ: كلمات المرور غير متطابقة]
    PasswordMatch -->|نعم| CreateUser[إنشاء المستخدم]

    CreateUser --> GenerateCode[توليد كود التحقق]
    GenerateCode --> SaveCode[حفظ الكود المشفر]
    SaveCode --> SendEmail[إرسال البريد]

    SendEmail --> EmailSent{تم الإرسال؟}
    EmailSent -->|لا| LogError[تسجيل الخطأ]
    EmailSent -->|نعم| ReturnToken[إرجاع Access Token]

    ReturnToken --> UserReceivesToken[المستخدم يتلقى التوكن]

    UserReceivesToken --> VerifyInput[إدخال كود التحقق]
    VerifyInput --> ValidateCode[التحقق من الكود]

    ValidateCode --> CodeValid{الكود صالح؟}
    CodeValid -->|لا| Error3[خطأ: كود خاطئ/منتهي]
    CodeValid -->|نعم| ActivateUser[تفعيل الحساب]

    ActivateUser --> CreateMerchant[إنشاء التاجر]
    CreateMerchant --> UpdateUser[ربط المستخدم بالتاجر]
    UpdateUser --> DeleteCodes[حذف أكواد التحقق]
    DeleteCodes --> ReturnNewToken[إرجاع توكن جديد]

    Error1 --> End([نهاية])
    Error2 --> End
    Error3 --> ResendCode[إعادة إرسال الكود]
    ResendCode --> VerifyInput

    ReturnNewToken --> SetupBot[إعداد البوت]
    SetupBot --> ConfigureChannels[إعداد القنوات]
    ConfigureChannels --> AddProducts[إضافة المنتجات]
    AddProducts --> ActivateAI[تفعيل الذكاء الاصطناعي]
    ActivateAI --> Ready[جاهز للاستخدام]

    Ready --> ReceiveMessages[استقبال الرسائل]
    ReceiveMessages --> ProcessWithAI[معالجة بالذكاء الاصطناعي]
    ProcessWithAI --> SendResponse[إرسال الرد]
    SendResponse --> LogAnalytics[تسجيل التحليلات]
    LogAnalytics --> ReceiveMessages
```

## 5. تفاصيل تقنية لكل مرحلة

### 5.1 مرحلة التسجيل

**Endpoint**: `POST /auth/register`

**البيانات المطلوبة**:

```typescript
interface RegisterDto {
  email: string; // بريد إلكتروني صحيح
  password: string; // 6 أحرف على الأقل
  confirmPassword: string; // يجب أن يطابق password
  name: string; // 3 أحرف على الأقل
}
```

**الإجراءات الداخلية**:

1. التحقق من تطابق كلمات المرور
2. إنشاء المستخدم في قاعدة البيانات:
   ```javascript
   {
     name,
     email,
     password, // يتم هاشها تلقائياً
     role: 'MERCHANT',
     active: true,
     firstLogin: true,
     emailVerified: false
   }
   ```
3. توليد كود تحقق 6 أرقام عشوائي
4. حفظ الكود المشفر بصلاحية 15 دقيقة
5. إرسال البريد الإلكتروني
6. إرجاع Access Token للمستخدم غير المفعل

### 5.2 مرحلة التحقق من البريد

**Endpoint**: `POST /auth/verify-email`

**البيانات المطلوبة**:

```typescript
interface VerifyEmailDto {
  email: string;
  code: string; // 6 أرقام
}
```

**الإجراءات الداخلية**:

1. البحث عن المستخدم
2. البحث عن آخر كود تحقق للمستخدم
3. التحقق من:
   - تطابق الهاش مع الكود المدخل
   - عدم انتهاء صلاحية الكود
4. تحديث حالة المستخدم:
   ```javascript
   user.emailVerified = true;
   user.firstLogin = true;
   ```
5. إنشاء أو ربط حساب التاجر
6. حذف أكواد التحقق المستخدمة
7. إرجاع Access Token جديد

### 5.3 مرحلة تسجيل الدخول

**Endpoint**: `POST /auth/login`

**البيانات المطلوبة**:

```typescript
interface LoginDto {
  email: string;
  password: string;
}
```

**الإجراءات الداخلية**:

1. البحث عن المستخدم
2. التحقق من كلمة المرور بـ bcrypt
3. التحقق من:
   - حالة الحساب (نشط)
   - تفعيل البريد الإلكتروني
   - حالة التاجر (نشط)
4. إنشاء Token Pair:
   - Access Token: صالح لـ15 دقيقة
   - Refresh Token: صالح لـ7 أيام
5. إعداد Cookies آمنة

### 5.4 تكامل مع n8n والذكاء الاصطناعي

**مسار الرسائل**:

1. **Webhook Reception**: الرسائل تصل عبر webhooks
2. **Merchant Lookup**: البحث عن بيانات التاجر
3. **AI Processing**: إرسال الرسالة لـ Google Gemini
4. **Response Analysis**: تحليل جودة الرد
5. **Backend Integration**: إرسال الرد للعميل
6. **Analytics Logging**: تسجيل التحليلات

**الأدوات المتاحة للذكاء الاصطناعي**:

- **البحث عن المنتجات**: `POST /api/vector/products`
- **البحث في المعرفة**: `POST /api/vector/unified-search`
- **معلومات المتجر**: `GET /api/merchants/{id}/ai/store-context`

## 6. معايير الأمان والحماية

### 6.1 حماية من الهجمات

- **Rate Limiting**: 5 محاولات للتسجيل/60ث، 5 محاولات للدخول/60ث
- **CSRF Protection**: حماية من هجمات CSRF
- **Password Hashing**: تشفير كلمات المرور بـ bcrypt
- **Token Security**: JWT tokens مع انتهاء صلاحية
- **Code Hashing**: تشفير أكواد التحقق بـ SHA256

### 6.2 مراقبة الأداء

- **Metrics Tracking**: تتبع المقاييس التجارية
- **Error Monitoring**: مراقبة الأخطاء والاستثناءات
- **Cache Management**: إدارة الكاش للبحث السريع
- **Database Optimization**: فهرسة قواعد البيانات

## 7. مسارات الخطأ والتعامل معها

### 7.1 أخطاء التسجيل

```javascript
DUPLICATE_KEY_CODE; // البريد مستخدم مسبقاً
VALIDATION_ERROR; // بيانات غير صحيحة
THROTTLE_ERROR; // تجاوز عدد المحاولات
```

### 7.2 أخطاء التحقق

```javascript
INVALID_VERIFICATION_CODE; // كود خاطئ
VERIFICATION_CODE_EXPIRED; // انتهت صلاحية الكود
EMAIL_NOT_REGISTERED; // البريد غير مسجل
```

### 7.3 أخطاء تسجيل الدخول

```javascript
INVALID_CREDENTIALS; // بيانات دخول خاطئة
ACCOUNT_DISABLED; // الحساب معطل
EMAIL_NOT_VERIFIED; // البريد غير مفعل
MERCHANT_ACCOUNT_SUSPENDED; // حساب التاجر معلق
```

## 8. خطة الاختبار والتحقق

### 8.1 اختبارات الوحدة

- اختبار إنشاء المستخدم
- اختبار توليد أكواد التحقق
- اختبار إرسال البريد الإلكتروني
- اختبار تفعيل الحساب

### 8.2 اختبارات التكامل

- اختبار التدفق الكامل للتسجيل
- اختبار التكامل مع n8n
- اختبار تكامل الذكاء الاصطناعي
- اختبار معالجة الأخطاء

### 8.3 اختبارات الأداء

- اختبار الحمل على عمليات التسجيل
- اختبار زمن الاستجابة
- اختبار استهلاك الذاكرة
- اختبار قاعدة البيانات

---

_تم إنشاء هذا التوثيق بواسطة نظام كليم لإدارة المتاجر الذكية_
