# 5.2 IAM وأدوار الوصول والـRACI

## نظرة عامة على إدارة الهوية والوصول

نظام كليم AI يطبق نموذج إدارة الهوية والوصول (IAM) متدرج مع نظام أدوار واضح ومسؤوليات محددة لكل مستوى.

## 1. هيكل الأدوار (Role Structure)

### 1.1 الأدوار الأساسية

#### أ. ADMIN (المدير العام)

```typescript
enum UserRole {
  ADMIN = "ADMIN",
}
```

**الصلاحيات:**

- إدارة النظام بالكامل
- إدارة المستخدمين والتجار
- الوصول لجميع البيانات والإحصائيات
- إدارة التكاملات والخدمات
- إعدادات الأمان والمراقبة

**القيود:**

- لا يمكن حذف الحساب الرئيسي
- جميع العمليات مسجلة للتدقيق

#### ب. MERCHANT (التاجر)

```typescript
enum UserRole {
  MERCHANT = "MERCHANT",
}
```

**الصلاحيات:**

- إدارة متجر التاجر
- إدارة المنتجات والطلبات
- إعدادات المحادثات والردود
- التقارير والإحصائيات الخاصة بالمتجر
- إدارة أعضاء الفريق

**القيود:**

- مقيد ببيانات متجره فقط
- لا يمكن الوصول لإعدادات النظام العامة

#### ج. MEMBER (العضو)

```typescript
enum UserRole {
  MEMBER = "MEMBER",
}
```

**الصلاحيات:**

- الوصول للمحادثات المخصصة له
- عرض التقارير المحدودة
- إدارة الملف الشخصي

**القيود:**

- لا يمكن إدارة إعدادات المتجر
- لا يمكن الوصول للبيانات الحساسة

### 1.2 نظام التفويض المتدرج

```typescript
// Guard Hierarchy
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const user = request.user;
    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException("Insufficient role");
    }

    return true;
  }
}
```

## 2. مصفوفة الصلاحيات (Permission Matrix)

### 2.1 إدارة المستخدمين

| الوظيفة             | ADMIN | MERCHANT         | MEMBER            |
| ------------------- | ----- | ---------------- | ----------------- |
| إنشاء مستخدمين      | ✅    | ✅ (فريق المتجر) | ❌                |
| تعديل المستخدمين    | ✅    | ✅ (فريق المتجر) | ✅ (الملف الشخصي) |
| حذف المستخدمين      | ✅    | ✅ (فريق المتجر) | ❌                |
| عرض جميع المستخدمين | ✅    | ❌               | ❌                |
| عرض فريق المتجر     | ✅    | ✅               | ❌                |

### 2.2 إدارة البيانات

| الوظيفة           | ADMIN | MERCHANT      | MEMBER |
| ----------------- | ----- | ------------- | ------ |
| عرض جميع البيانات | ✅    | ❌            | ❌     |
| عرض بيانات المتجر | ✅    | ✅            | ❌     |
| تعديل البيانات    | ✅    | ✅ (متجر فقط) | ❌     |
| حذف البيانات      | ✅    | ✅ (متجر فقط) | ❌     |
| تصدير البيانات    | ✅    | ✅ (متجر فقط) | ❌     |

### 2.3 إدارة النظام

| الوظيفة          | ADMIN | MERCHANT      | MEMBER |
| ---------------- | ----- | ------------- | ------ |
| إعدادات النظام   | ✅    | ❌            | ❌     |
| إدارة التكاملات  | ✅    | ✅ (متجر فقط) | ❌     |
| مراقبة الأداء    | ✅    | ✅ (متجر فقط) | ❌     |
| إدارة الأمان     | ✅    | ❌            | ❌     |
| النسخ الاحتياطية | ✅    | ❌            | ❌     |

## 3. مصفوفة RACI (Responsibility Assignment Matrix)

### 3.1 إدارة الأمان

| النشاط              | ADMIN | MERCHANT | MEMBER | Security Team |
| ------------------- | ----- | -------- | ------ | ------------- |
| **R** - Responsible | ✅    | ❌       | ❌     | ❌            |
| **A** - Accountable | ✅    | ❌       | ❌     | ✅            |
| **C** - Consulted   | ❌    | ✅       | ❌     | ✅            |
| **I** - Informed    | ❌    | ✅       | ✅     | ❌            |

### 3.2 إدارة البيانات

| النشاط              | ADMIN | MERCHANT | MEMBER | Data Team |
| ------------------- | ----- | -------- | ------ | --------- |
| **R** - Responsible | ✅    | ✅       | ❌     | ❌        |
| **A** - Accountable | ✅    | ❌       | ❌     | ✅        |
| **C** - Consulted   | ❌    | ✅       | ❌     | ✅        |
| **I** - Informed    | ❌    | ❌       | ✅     | ❌        |

### 3.3 إدارة التطبيق

| النشاط              | ADMIN | MERCHANT | MEMBER | Dev Team |
| ------------------- | ----- | -------- | ------ | -------- |
| **R** - Responsible | ✅    | ❌       | ❌     | ✅       |
| **A** - Accountable | ✅    | ❌       | ❌     | ✅       |
| **C** - Consulted   | ❌    | ✅       | ❌     | ✅       |
| **I** - Informed    | ❌    | ✅       | ✅     | ❌       |

## 4. سياسات الوصول (Access Policies)

### 4.1 سياسة المصادقة

```typescript
// Authentication Policy
export class AuthService {
  async login(loginDto: LoginDto) {
    // التحقق من صحة البيانات
    const userDoc = await this.userModel
      .findOne({ email })
      .select("+password active merchantId emailVerified role")
      .exec();

    // التحقق من حالة الحساب
    if (userDoc.active === false) {
      throw new BadRequestException("الحساب معطّل، تواصل مع الدعم");
    }

    // التحقق من تفعيل البريد
    if (!userDoc.emailVerified) {
      throw new BadRequestException(
        "يجب تفعيل البريد الإلكتروني قبل تسجيل الدخول"
      );
    }

    // التحقق من حالة التاجر
    if (userDoc.merchantId && userDoc.role !== "ADMIN") {
      const merchant = await this.merchantModel
        .findById(userDoc.merchantId)
        .select("_id active deletedAt")
        .lean();

      if (merchant && (merchant.active === false || merchant.deletedAt)) {
        throw new BadRequestException("تم إيقاف حساب التاجر مؤقتًا");
      }
    }
  }
}
```

### 4.2 سياسة التفويض

```typescript
// Authorization Policy
export class IdentityGuard implements CanActivate {
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<RequestWithUser>();
    const payload = req.user;

    if (!payload?.userId) throw new UnauthorizedException("Unauthorized");

    const user = await this.userModel
      .findById(payload.userId)
      .select("role emailVerified active merchantId")
      .lean();

    if (!user) throw new UnauthorizedException("الحساب غير موجود");

    // إضافة معلومات المستخدم للطلب
    req.authUser = {
      _id: user["_id"],
      role: user.role,
      emailVerified: !!user.emailVerified,
      active: user.active !== false,
      merchantId: user.merchantId ?? null,
    };

    return true;
  }
}
```

### 4.3 سياسة إدارة الجلسات

```typescript
// Session Management Policy
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        cookieExtractor,
      ]),
      secretOrKey: secret,
      ignoreExpiration: false,
      algorithms: ["HS256"],
      issuer: config.get<string>("JWT_ISSUER"),
      audience: config.get<string>("JWT_AUDIENCE"),
    });
  }
}
```

## 5. إدارة دورة حياة الهوية (Identity Lifecycle Management)

### 5.1 إنشاء الحساب

```typescript
// Account Creation Process
export class AuthService {
  async register(registerDto: RegisterDto) {
    // 1. التحقق من صحة البيانات
    // 2. تشفير كلمة المرور
    // 3. إنشاء الحساب
    // 4. إرسال رابط التفعيل
    // 5. تسجيل العملية
  }
}
```

### 5.2 تفعيل الحساب

```typescript
// Account Activation Process
export class AuthService {
  async verifyEmail(dto: VerifyEmailDto) {
    // 1. التحقق من رمز التفعيل
    // 2. تفعيل الحساب
    // 3. إنشاء JWT token
    // 4. تسجيل العملية
  }
}
```

### 5.3 إدارة كلمة المرور

```typescript
// Password Management
export class AuthService {
  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string
  ) {
    // 1. التحقق من كلمة المرور القديمة
    // 2. التحقق من قوة كلمة المرور الجديدة
    // 3. تشفير كلمة المرور الجديدة
    // 4. تحديث قاعدة البيانات
    // 5. إرسال إشعار
  }
}
```

### 5.4 إلغاء الحساب

```typescript
// Account Deactivation
export class AuthService {
  async deactivateAccount(userId: string) {
    // 1. التحقق من الصلاحيات
    // 2. إلغاء الجلسات النشطة
    // 3. تحديث حالة الحساب
    // 4. إشعار المستخدم
    // 5. تسجيل العملية
  }
}
```

## 6. مراقبة الوصول (Access Monitoring)

### 6.1 تسجيل الوصول

```typescript
// Access Logging
export class AccessLogger {
  logAccess(userId: string, resource: string, action: string, result: string) {
    const logEntry = {
      timestamp: new Date(),
      userId,
      resource,
      action,
      result,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    };

    this.logger.info("Access attempt", logEntry);
  }
}
```

### 6.2 تحليل الأنماط

```typescript
// Pattern Analysis
export class AccessAnalyzer {
  analyzeAccessPatterns(userId: string) {
    // 1. تحليل أوقات الوصول
    // 2. تحليل الموارد المستخدمة
    // 3. كشف الأنماط غير العادية
    // 4. إرسال تنبيهات
  }
}
```

## 7. سياسات الامتثال (Compliance Policies)

### 7.1 GDPR Compliance

- **حق النسيان**: إمكانية حذف البيانات الشخصية
- **حق الوصول**: إمكانية طلب نسخة من البيانات
- **الموافقة**: موافقة صريحة على معالجة البيانات
- **الشفافية**: وضوح في كيفية استخدام البيانات

### 7.2 SOC 2 Compliance

- **الوصول**: التحكم في الوصول للأنظمة
- **المراقبة**: مراقبة مستمرة للأنشطة
- **التشفير**: تشفير البيانات في الراحة والنقل
- **النسخ الاحتياطية**: نسخ احتياطية منتظمة ومشفرة

## 8. خطة التحسين (Improvement Plan)

### 8.1 تحسينات قصيرة المدى

1. **إضافة 2FA**: مصادقة ثنائية العوامل
2. **تحسين المراقبة**: مراقبة أكثر تفصيلاً
3. **تدريب المستخدمين**: تدريب على الأمان

### 8.2 تحسينات متوسطة المدى

1. **SSO**: تسجيل دخول موحد
2. **RBAC متقدم**: صلاحيات أكثر تفصيلاً
3. **تحليل السلوك**: كشف الأنماط غير العادية

### 8.3 تحسينات طويلة المدى

1. **Zero Trust**: نموذج عدم الثقة
2. **AI Security**: ذكاء اصطناعي للأمان
3. **Blockchain Identity**: هوية قائمة على البلوك تشين

---

**آخر تحديث**: ديسمبر 2024  
**الإصدار**: 1.0.0  
**المسؤول**: فريق الأمان والهوية
