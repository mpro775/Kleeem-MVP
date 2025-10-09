# 5.4 البريد: SPF/DKIM/DMARC, Postmaster, List-Unsubscribe

## نظرة عامة على أمان البريد الإلكتروني

نظام كليم AI يطبق معايير أمان البريد الإلكتروني المتقدمة لحماية من التصيد الاحتيالي والرسائل المزيفة وضمان تسليم الرسائل بشكل آمن.

## 1. إعدادات SPF (Sender Policy Framework)

### 1.1 سجل SPF الحالي

```dns
# DNS Record for kaleem-ai.com
kaleem-ai.com. IN TXT "v=spf1 include:_spf.google.com include:mailgun.org include:sendgrid.net ~all"

# DNS Record for api.kaleem-ai.com
api.kaleem-ai.com. IN TXT "v=spf1 include:_spf.google.com include:mailgun.org ~all"
```

### 1.2 تحليل سجل SPF

#### المكونات المدرجة

- **v=spf1**: إصدار SPF
- **include:\_spf.google.com**: Google Workspace
- **include:mailgun.org**: Mailgun للرسائل التسويقية
- **include:sendgrid.net**: SendGrid للرسائل النظامية
- **~all**: Soft fail للمرسلين غير المدرجين

#### التوصيات

```dns
# SPF Record Optimized
kaleem-ai.com. IN TXT "v=spf1 include:_spf.google.com include:mailgun.org include:sendgrid.net ip4:192.168.1.100 ip6:2001:db8::1 -all"

# معالجة الأخطاء
- استخدام -all بدلاً من ~all للفشل الصارم
- إضافة عناوين IP الثابتة
- مراقبة SPF lookups
```

### 1.3 مراقبة SPF

#### مؤشرات الأداء

```yaml
SPF Monitoring:
  - SPF Record Validity: 100%
  - SPF Lookup Time: < 1 second
  - SPF Pass Rate: > 95%
  - SPF Fail Rate: < 2%
```

#### أدوات المراقبة

- **MXToolbox**: فحص SPF
- **SPF Record Testing**: اختبار السجلات
- **DNS Propagation**: مراقبة الانتشار

## 2. إعدادات DKIM (DomainKeys Identified Mail)

### 2.1 مفاتيح DKIM

#### مفتاح Google Workspace

```dns
# DKIM Record for Google
google._domainkey.kaleem-ai.com. IN CNAME google._domainkey.gmail.com.

# DKIM Selector
google._domainkey.kaleem-ai.com. IN TXT "v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC..."
```

#### مفتاح Mailgun

```dns
# DKIM Record for Mailgun
mg._domainkey.kaleem-ai.com. IN TXT "v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC..."
```

#### مفتاح SendGrid

```dns
# DKIM Record for SendGrid
s1._domainkey.kaleem-ai.com. IN TXT "v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC..."
```

### 2.2 إدارة مفاتيح DKIM

#### دورة حياة المفاتيح

```yaml
DKIM Key Lifecycle:
  - Key Generation: 2048-bit RSA
  - Key Rotation: Every 90 days
  - Key Validation: Daily
  - Key Revocation: Immediate on compromise
```

#### إعدادات التوقيع

```yaml
DKIM Signing:
  - Algorithm: RSA-SHA256
  - Key Length: 2048 bits
  - Headers: From, To, Subject, Date
  - Canonicalization: relaxed/simple
```

### 2.3 مراقبة DKIM

#### مؤشرات الأداء

```yaml
DKIM Monitoring:
  - DKIM Sign Rate: > 98%
  - DKIM Pass Rate: > 95%
  - DKIM Key Validity: 100%
  - DKIM Lookup Time: < 500ms
```

## 3. إعدادات DMARC (Domain-based Message Authentication)

### 3.1 سجل DMARC

```dns
# DMARC Record
_dmarc.kaleem-ai.com. IN TXT "v=DMARC1; p=quarantine; rua=mailto:dmarc@kaleem-ai.com; ruf=mailto:dmarc-failures@kaleem-ai.com; pct=100; adkim=r; aspf=r; ri=86400; fo=1"

# DMARC Record for Subdomains
_dmarc.api.kaleem-ai.com. IN TXT "v=DMARC1; p=reject; rua=mailto:dmarc-api@kaleem-ai.com; ruf=mailto:dmarc-failures-api@kaleem-ai.com; pct=100; adkim=r; aspf=r; ri=86400; fo=1"
```

### 3.2 تحليل سجل DMARC

#### المعاملات

- **v=DMARC1**: إصدار DMARC
- **p=quarantine**: سياسة الحجر الصحي
- **rua**: تقارير المجاميع
- **ruf**: تقارير الفشل
- **pct=100**: نسبة الرسائل المطبقة
- **adkim=r**: محاذاة DKIM
- **aspf=r**: محاذاة SPF
- **ri=86400**: فاصل التقارير (24 ساعة)
- **fo=1**: خيارات الفشل

#### التوصيات

```dns
# DMARC Record Optimized
_dmarc.kaleem-ai.com. IN TXT "v=DMARC1; p=reject; rua=mailto:dmarc@kaleem-ai.com; ruf=mailto:dmarc-failures@kaleem-ai.com; pct=100; adkim=r; aspf=r; ri=86400; fo=1; sp=reject;"

# إضافة سياسة للفرعية
# sp=reject: سياسة للفرعية
```

### 3.3 مراقبة DMARC

#### مؤشرات الأداء

```yaml
DMARC Monitoring:
  - DMARC Pass Rate: > 90%
  - DMARC Quarantine Rate: < 5%
  - DMARC Reject Rate: < 2%
  - DMARC Report Coverage: > 95%
```

## 4. إعدادات Postmaster

### 4.1 سجلات Postmaster

```dns
# Postmaster Address
postmaster.kaleem-ai.com. IN A 192.168.1.100
postmaster.kaleem-ai.com. IN AAAA 2001:db8::1

# Abuse Address
abuse.kaleem-ai.com. IN A 192.168.1.100
abuse.kaleem-ai.com. IN AAAA 2001:db8::1

# Security Address
security.kaleem-ai.com. IN A 192.168.1.100
security.kaleem-ai.com. IN AAAA 2001:db8::1
```

### 4.2 إعدادات Postmaster

#### عناوين البريد المطلوبة

```yaml
Required Email Addresses:
  - postmaster@kaleem-ai.com: إدارة البريد
  - abuse@kaleem-ai.com: البلاغات
  - security@kaleem-ai.com: الأمان
  - dmarc@kaleem-ai.com: تقارير DMARC
  - dmarc-failures@kaleem-ai.com: فشل DMARC
```

#### إعدادات الاستجابة

```yaml
Postmaster Configuration:
  - Auto-Response: Enabled
  - Response Time: < 24 hours
  - Escalation: Security Team
  - Logging: Full audit trail
```

### 4.3 معالجة البلاغات

#### أنواع البلاغات

```yaml
Report Types:
  - Spam Reports: معالجة فورية
  - Abuse Reports: معالجة خلال 24 ساعة
  - Security Reports: معالجة فورية
  - DMARC Reports: معالجة يومية
```

#### عملية المعالجة

```yaml
Report Processing:
  1. Receipt: استلام البلاغ
  2. Classification: تصنيف البلاغ
  3. Investigation: التحقيق
  4. Action: اتخاذ الإجراء
  5. Response: الرد على المرسل
  6. Documentation: توثيق العملية
```

## 5. إعدادات List-Unsubscribe

### 5.1 رؤوس List-Unsubscribe

#### للرسائل التسويقية

```http
List-Unsubscribe: <mailto:unsubscribe@kaleem-ai.com?subject=unsubscribe>, <https://kaleem-ai.com/unsubscribe?token=abc123>
List-Unsubscribe-Post: List-Unsubscribe=One-Click
```

#### للرسائل النظامية

```http
List-Unsubscribe: <mailto:unsubscribe@kaleem-ai.com?subject=unsubscribe>
List-Unsubscribe-Post: List-Unsubscribe=One-Click
```

### 5.2 تطبيق List-Unsubscribe

#### في NestJS

```typescript
// Email Service with List-Unsubscribe
@Injectable()
export class EmailService {
  async sendMarketingEmail(to: string, subject: string, content: string) {
    const unsubscribeToken = this.generateUnsubscribeToken(to);

    const headers = {
      "List-Unsubscribe": `<mailto:unsubscribe@kaleem-ai.com?subject=unsubscribe>, <https://kaleem-ai.com/unsubscribe?token=${unsubscribeToken}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    };

    await this.mailgun.messages().send({
      to,
      subject,
      html: content,
      headers,
    });
  }
}
```

#### في React Frontend

```typescript
// Unsubscribe Component
export const UnsubscribePage = () => {
  const [token, setToken] = useState<string>("");
  const [email, setEmail] = useState<string>("");

  const handleUnsubscribe = async () => {
    try {
      await api.post("/unsubscribe", { token, email });
      setMessage("تم إلغاء الاشتراك بنجاح");
    } catch (error) {
      setError("حدث خطأ في إلغاء الاشتراك");
    }
  };

  return (
    <div>
      <h1>إلغاء الاشتراك</h1>
      <form onSubmit={handleUnsubscribe}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="البريد الإلكتروني"
        />
        <button type="submit">إلغاء الاشتراك</button>
      </form>
    </div>
  );
};
```

### 5.3 إدارة الاشتراكات

#### قاعدة بيانات الاشتراكات

```typescript
// Subscription Schema
@Schema()
export class Subscription {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  token: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: Date.now })
  subscribedAt: Date;

  @Prop()
  unsubscribedAt?: Date;

  @Prop({ type: [String], default: [] })
  preferences: string[];
}
```

#### API لإدارة الاشتراكات

```typescript
// Unsubscribe Controller
@Controller("unsubscribe")
export class UnsubscribeController {
  @Post()
  async unsubscribe(@Body() dto: UnsubscribeDto) {
    const subscription = await this.subscriptionService.findByToken(dto.token);

    if (!subscription) {
      throw new NotFoundException("رمز إلغاء الاشتراك غير صالح");
    }

    await this.subscriptionService.unsubscribe(subscription.email);

    return { message: "تم إلغاء الاشتراك بنجاح" };
  }
}
```

## 6. مراقبة أمان البريد

### 6.1 مؤشرات الأداء الرئيسية

```yaml
Email Security KPIs:
  - SPF Pass Rate: > 95%
  - DKIM Pass Rate: > 95%
  - DMARC Pass Rate: > 90%
  - Spam Rate: < 1%
  - Bounce Rate: < 5%
  - Unsubscribe Rate: < 2%
```

### 6.2 أدوات المراقبة

#### أدوات المراقبة

```yaml
Monitoring Tools:
  - Google Postmaster Tools
  - Microsoft SNDS
  - DMARC Analyzer
  - Mailgun Analytics
  - SendGrid Activity
```

#### التقارير اليومية

```yaml
Daily Reports:
  - SPF/DKIM/DMARC Status
  - Bounce Analysis
  - Spam Complaints
  - Unsubscribe Activity
  - Delivery Issues
```

### 6.3 تنبيهات الأمان

#### أنواع التنبيهات

```yaml
Security Alerts:
  - DMARC Failures: فورية
  - Spam Complaints: فورية
  - Bounce Rate Spike: 15 دقيقة
  - Unsubscribe Spike: 30 دقيقة
  - Authentication Failures: فورية
```

## 7. خطة التحسين

### 7.1 تحسينات قصيرة المدى

1. **تحسين SPF**: إضافة عناوين IP المفقودة
2. **تدوير مفاتيح DKIM**: كل 90 يوم
3. **تحسين DMARC**: الانتقال لسياسة reject
4. **تحسين List-Unsubscribe**: إضافة One-Click

### 7.2 تحسينات متوسطة المدى

1. **BIMI**: Brand Indicators for Message Identification
2. **ARC**: Authenticated Received Chain
3. **MTA-STS**: Mail Transfer Agent Strict Transport Security
4. **TLS-RPT**: TLS Reporting

### 7.3 تحسينات طويلة المدى

1. **AI-powered Spam Detection**: كشف التصيد بالذكاء الاصطناعي
2. **Advanced Threat Protection**: حماية متقدمة من التهديدات
3. **Email Encryption**: تشفير البريد الإلكتروني
4. **Zero Trust Email**: نموذج عدم الثقة للبريد

---

**آخر تحديث**: ديسمبر 2024  
**الإصدار**: 1.0.0  
**المسؤول**: فريق الأمان والاتصالات
