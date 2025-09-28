# 5.5 الاحتفاظ بالبيانات والحذف، DPA، Sub-processors

## نظرة عامة على إدارة البيانات

نظام كليم AI يطبق سياسات شاملة لإدارة دورة حياة البيانات بما يتماشى مع معايير GDPR و SOC 2 واللوائح المحلية.

## 1. سياسات الاحتفاظ بالبيانات (Data Retention Policies)

### 1.1 تصنيف البيانات

#### البيانات الشخصية (Personal Data)

```yaml
Personal Data Categories:
  - User Information: اسم، بريد إلكتروني، رقم هاتف
  - Authentication Data: كلمات مرور، رموز التحقق
  - Communication Data: محادثات، رسائل
  - Behavioral Data: تفضيلات، أنشطة
  - Financial Data: معلومات الدفع، الفواتير
```

#### البيانات التجارية (Business Data)

```yaml
Business Data Categories:
  - Product Information: منتجات، أسعار، أوصاف
  - Order Data: طلبات، معاملات
  - Analytics Data: إحصائيات، تقارير
  - Integration Data: بيانات التكامل
  - System Logs: سجلات النظام
```

### 1.2 فترات الاحتفاظ

#### البيانات الشخصية

```yaml
Personal Data Retention:
  - User Accounts: 7 سنوات بعد الحذف
  - Communication Logs: 3 سنوات
  - Authentication Logs: 1 سنة
  - Payment Data: 7 سنوات (متطلبات قانونية)
  - Marketing Data: 2 سنة بعد آخر تفاعل
```

#### البيانات التجارية

```yaml
Business Data Retention:
  - Product Data: 10 سنوات
  - Order Data: 7 سنوات
  - Analytics Data: 3 سنوات
  - System Logs: 1 سنة
  - Backup Data: 5 سنوات
```

### 1.3 تطبيق سياسات الاحتفاظ

#### في قاعدة البيانات

```typescript
// Data Retention Service
@Injectable()
export class DataRetentionService {
  async applyRetentionPolicies() {
    // حذف البيانات المنتهية الصلاحية
    await this.deleteExpiredUserData();
    await this.deleteExpiredLogs();
    await this.deleteExpiredAnalytics();
  }

  async deleteExpiredUserData() {
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - 7);

    await this.userModel.deleteMany({
      deletedAt: { $lt: cutoffDate },
      retentionExpired: true,
    });
  }
}
```

#### في التخزين

```typescript
// File Retention Service
@Injectable()
export class FileRetentionService {
  async cleanupExpiredFiles() {
    const expiredFiles = await this.fileModel.find({
      createdAt: { $lt: this.getRetentionCutoff() },
      deleted: true,
    });

    for (const file of expiredFiles) {
      await this.minioService.removeObject(file.bucket, file.key);
      await this.fileModel.findByIdAndDelete(file._id);
    }
  }
}
```

## 2. سياسات حذف البيانات (Data Deletion Policies)

### 2.1 أنواع الحذف

#### الحذف الناعم (Soft Delete)

```typescript
// Soft Delete Implementation
@Schema()
export class User {
  @Prop({ default: true })
  active: boolean;

  @Prop()
  deletedAt?: Date;

  @Prop()
  deletionReason?: string;

  @Prop()
  retentionExpired?: boolean;
}

// Soft Delete Service
@Injectable()
export class SoftDeleteService {
  async softDeleteUser(userId: string, reason: string) {
    await this.userModel.findByIdAndUpdate(userId, {
      active: false,
      deletedAt: new Date(),
      deletionReason: reason,
    });
  }
}
```

#### الحذف الصلب (Hard Delete)

```typescript
// Hard Delete Service
@Injectable()
export class HardDeleteService {
  async hardDeleteUser(userId: string) {
    // 1. حذف البيانات المرتبطة
    await this.deleteUserConversations(userId);
    await this.deleteUserFiles(userId);
    await this.deleteUserAnalytics(userId);

    // 2. حذف البيانات الشخصية
    await this.userModel.findByIdAndDelete(userId);

    // 3. تسجيل العملية
    await this.auditService.logDeletion(userId, "HARD_DELETE");
  }
}
```

### 2.2 حق النسيان (Right to be Forgotten)

#### طلب حذف البيانات

```typescript
// Data Deletion Request
@Controller("data-deletion")
export class DataDeletionController {
  @Post("request")
  async requestDataDeletion(@Body() dto: DataDeletionRequestDto) {
    const request = await this.deletionService.createRequest(dto);

    // إرسال إشعار للمستخدم
    await this.notificationService.sendDeletionConfirmation(dto.email);

    return { requestId: request.id, status: "PENDING" };
  }

  @Post("verify")
  async verifyDeletionRequest(@Body() dto: VerifyDeletionDto) {
    const request = await this.deletionService.verifyRequest(dto);

    if (request.verified) {
      await this.deletionService.processDeletion(request);
    }

    return { status: "PROCESSING" };
  }
}
```

#### معالجة طلبات الحذف

```typescript
// Data Deletion Processor
@Injectable()
export class DataDeletionProcessor {
  async processDeletionRequest(requestId: string) {
    const request = await this.deletionService.findById(requestId);

    // 1. التحقق من الهوية
    await this.verifyIdentity(request);

    // 2. حذف البيانات الشخصية
    await this.deletePersonalData(request.userId);

    // 3. حذف البيانات المرتبطة
    await this.deleteRelatedData(request.userId);

    // 4. تأكيد الحذف
    await this.confirmDeletion(request);
  }
}
```

## 3. اتفاقيات معالجة البيانات (Data Processing Agreements - DPA)

### 3.1 DPA مع المزودين

#### Google Cloud Platform

```yaml
Google Cloud DPA:
  - Data Controller: Kaleem AI
  - Data Processor: Google Cloud
  - Data Categories: User data, Analytics, Logs
  - Processing Purposes: Cloud hosting, Analytics
  - Data Location: EU/US (configurable)
  - Retention Period: As per contract
  - Security Measures: SOC 2, ISO 27001
  - Sub-processors: Listed in Google's DPA
```

#### MongoDB Atlas

```yaml
MongoDB Atlas DPA:
  - Data Controller: Kaleem AI
  - Data Processor: MongoDB
  - Data Categories: User data, Application data
  - Processing Purposes: Database hosting
  - Data Location: EU/US (configurable)
  - Retention Period: As per contract
  - Security Measures: SOC 2, ISO 27001
  - Sub-processors: Listed in MongoDB's DPA
```

#### SendGrid

```yaml
SendGrid DPA:
  - Data Controller: Kaleem AI
  - Data Processor: SendGrid
  - Data Categories: Email addresses, Communication data
  - Processing Purposes: Email delivery
  - Data Location: US
  - Retention Period: 30 days
  - Security Measures: SOC 2, ISO 27001
  - Sub-processors: Listed in SendGrid's DPA
```

### 3.2 DPA مع العملاء

#### نموذج DPA للعملاء

```yaml
Customer DPA:
  - Data Controller: Customer
  - Data Processor: Kaleem AI
  - Data Categories: Customer data, Communication data
  - Processing Purposes: AI chat services
  - Data Location: EU/US (customer choice)
  - Retention Period: As per customer requirements
  - Security Measures: SOC 2, ISO 27001
  - Sub-processors: Listed in our DPA
```

## 4. إدارة Sub-processors

### 4.1 قائمة Sub-processors

#### Sub-processors الأساسيون

```yaml
Core Sub-processors:
  - Google Cloud Platform: Cloud hosting
  - MongoDB Atlas: Database hosting
  - Redis Labs: Caching and sessions
  - MinIO: Object storage
  - RabbitMQ: Message queuing
```

#### Sub-processors للخدمات

```yaml
Service Sub-processors:
  - SendGrid: Email delivery
  - Mailgun: Email marketing
  - OpenAI: AI services
  - WhatsApp Business API: Messaging
  - Telegram Bot API: Messaging
```

#### Sub-processors للمراقبة

```yaml
Monitoring Sub-processors:
  - Sentry: Error tracking
  - DataDog: Application monitoring
  - Prometheus: Metrics collection
  - Grafana: Visualization
  - Loki: Log aggregation
```

### 4.2 إدارة Sub-processors

#### عملية الموافقة

```yaml
Sub-processor Approval Process:
  1. Vendor Assessment: تقييم المزود
  2. Security Review: مراجعة الأمان
  3. Legal Review: مراجعة قانونية
  4. DPA Negotiation: تفاوض على DPA
  5. Approval: موافقة نهائية
  6. Documentation: توثيق العملية
```

#### مراقبة Sub-processors

```yaml
Sub-processor Monitoring:
  - Security Audits: سنوية
  - Compliance Checks: ربع سنوية
  - Performance Reviews: شهرية
  - Incident Reporting: فورية
  - Contract Renewals: سنوية
```

### 4.3 إشعارات Sub-processors

#### إشعار العملاء

```typescript
// Sub-processor Notification Service
@Injectable()
export class SubProcessorNotificationService {
  async notifyCustomersOfNewSubProcessor(subProcessor: SubProcessor) {
    const customers = await this.customerService.findAll();

    for (const customer of customers) {
      await this.emailService.sendSubProcessorNotification(
        customer.email,
        subProcessor
      );
    }
  }
}
```

## 5. حماية البيانات (Data Protection)

### 5.1 تشفير البيانات

#### تشفير في الراحة (Encryption at Rest)

```typescript
// Data Encryption Service
@Injectable()
export class DataEncryptionService {
  private readonly algorithm = "aes-256-gcm";
  private readonly keyLength = 32;

  encrypt(data: string): string {
    const key = this.getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.algorithm, key);

    let encrypted = cipher.update(data, "utf8", "hex");
    encrypted += cipher.final("hex");

    return iv.toString("hex") + ":" + encrypted;
  }

  decrypt(encryptedData: string): string {
    const [ivHex, encrypted] = encryptedData.split(":");
    const key = this.getEncryptionKey();
    const iv = Buffer.from(ivHex, "hex");
    const decipher = crypto.createDecipher(this.algorithm, key);

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  }
}
```

#### تشفير في النقل (Encryption in Transit)

```yaml
Encryption in Transit:
  - HTTPS: TLS 1.2/1.3
  - Database: TLS connections
  - API: JWT tokens
  - File Transfer: SFTP/SCP
  - Email: TLS/SMTP
```

### 5.2 التحكم في الوصول

#### صلاحيات الوصول للبيانات

```typescript
// Data Access Control
@Injectable()
export class DataAccessControlService {
  async canAccessUserData(
    userId: string,
    requesterId: string,
    requesterRole: string
  ): Promise<boolean> {
    // ADMIN يمكنه الوصول لجميع البيانات
    if (requesterRole === "ADMIN") return true;

    // MERCHANT يمكنه الوصول لبيانات متجره فقط
    if (requesterRole === "MERCHANT") {
      const requester = await this.userService.findById(requesterId);
      const targetUser = await this.userService.findById(userId);

      return (
        requester.merchantId?.toString() === targetUser.merchantId?.toString()
      );
    }

    // MEMBER يمكنه الوصول لبياناته فقط
    return userId === requesterId;
  }
}
```

## 6. مراقبة الامتثال (Compliance Monitoring)

### 6.1 مؤشرات الامتثال

#### مؤشرات GDPR

```yaml
GDPR Compliance KPIs:
  - Data Subject Requests: < 30 days response
  - Data Breach Notifications: < 72 hours
  - Consent Rate: > 95%
  - Data Deletion Success: > 99%
  - Privacy Impact Assessments: 100% coverage
```

#### مؤشرات SOC 2

```yaml
SOC 2 Compliance KPIs:
  - Access Control: 100% coverage
  - Data Encryption: 100% coverage
  - Incident Response: < 4 hours
  - Backup Success: > 99%
  - Security Training: 100% completion
```

### 6.2 تقارير الامتثال

#### تقرير GDPR الشهري

```typescript
// GDPR Compliance Report
@Injectable()
export class GDPRComplianceService {
  async generateMonthlyReport(): Promise<GDPRReport> {
    const report = {
      period: this.getCurrentMonth(),
      dataSubjectRequests: await this.getDataSubjectRequests(),
      dataBreaches: await this.getDataBreaches(),
      consentWithdrawals: await this.getConsentWithdrawals(),
      dataDeletions: await this.getDataDeletions(),
      privacyImpactAssessments: await this.getPIAs(),
    };

    return report;
  }
}
```

## 7. خطة التحسين

### 7.1 تحسينات قصيرة المدى

1. **تحسين DPA**: تحديث اتفاقيات معالجة البيانات
2. **تحسين الحذف**: أتمتة عمليات حذف البيانات
3. **تحسين المراقبة**: مراقبة أفضل للامتثال

### 7.2 تحسينات متوسطة المدى

1. **Privacy by Design**: تصميم يراعي الخصوصية
2. **Data Minimization**: تقليل البيانات
3. **Consent Management**: إدارة الموافقة

### 7.3 تحسينات طويلة المدى

1. **AI Privacy**: خصوصية الذكاء الاصطناعي
2. **Blockchain Privacy**: خصوصية البلوك تشين
3. **Quantum-Safe Encryption**: تشفير آمن كمياً

---

**آخر تحديث**: ديسمبر 2024  
**الإصدار**: 1.0.0  
**المسؤول**: فريق الأمان والامتثال
