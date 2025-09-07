# التبعيات المطلوبة للمكونات المشتركة

## 📦 التبعيات الأساسية

```json
{
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/jwt": "^10.0.0",
    "@nestjs/swagger": "^7.0.0",
    "class-validator": "^0.14.0",
    "class-transformer": "^0.5.1",
    "helmet": "^7.0.0",
    "compression": "^1.7.4",
    "express-rate-limit": "^6.0.0"
  }
}
```

## 🔧 تثبيت التبعيات

```bash
# تثبيت التبعيات الأساسية
npm install @nestjs/common @nestjs/core @nestjs/jwt @nestjs/swagger

# تثبيت مكتبات التحقق والتحويل
npm install class-validator class-transformer

# تثبيت مكتبات الأمان والأداء
npm install helmet compression express-rate-limit

# تثبيت التبعيات للتطوير
npm install --save-dev @types/compression
```

## ⚙️ متغيرات البيئة المطلوبة

```env
# JWT
JWT_SECRET=your-super-secret-jwt-key-here

# CORS
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com

# التطبيق
PORT=3000
NODE_ENV=development
```

## 🔍 التحقق من التثبيت

بعد تثبيت التبعيات، يمكنك التحقق من أن كل شيء يعمل بشكل صحيح:

```typescript
// في أي ملف في مشروعك
import {
  DomainError,
  ResponseInterceptor,
  AuthGuard,
  PaginationDto
} from '../common';

// إذا لم تظهر أخطاء، فهذا يعني أن كل شيء مثبت بشكل صحيح
```

## 🚨 ملاحظات مهمة

1. **JWT_SECRET**: تأكد من تعيين مفتاح JWT قوي وآمن
2. **CORS**: قم بتكوين ALLOWED_ORIGINS حسب بيئة التطوير والإنتاج
3. **Rate Limiting**: يمكن تخصيص حدود الطلبات حسب احتياجات التطبيق
4. **Validation**: تأكد من تفعيل ValidationPipe في التطبيق الرئيسي

## 🔧 التخصيص

يمكنك تخصيص إعدادات التطبيق حسب احتياجاتك:

```typescript
// في main.ts
import { setupApp } from '../common';

const app = await NestFactory.create(AppModule);

// تخصيص إعدادات CORS
app.enableCors({
  origin: ['http://localhost:3000', 'https://yourdomain.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

// تخصيص Rate Limiting
const rateLimit = require('express-rate-limit');
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 دقيقة
    max: 200, // زيادة الحد الأقصى
    message: {
      status: 429,
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'تم تجاوز حد الطلبات',
    },
  })
);
```
