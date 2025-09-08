# 🔐 متغيرات البيئة الحرجة - دليل الإعداد

## ✅ F1: المتغيرات الأساسية المطلوبة

### 🔐 JWT Configuration (CRITICAL)

```env
JWT_SECRET=your-super-secret-jwt-key-here-must-be-at-least-32-chars
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d
```

### 🗄️ Database Configuration (CRITICAL)

```env
DATABASE_URL=mongodb://localhost:27017/kaleem-ai
# For MongoDB Atlas:
# DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/kaleem-ai
```

### 🔴 Redis Configuration (CRITICAL)

```env
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 🌐 Server Configuration

```env
NODE_ENV=production
PORT=3000
ALLOWED_ORIGINS=https://app.kaleem-ai.com,https://kaleem-ai.com
```

### 📡 Webhook Configuration (CRITICAL)

```env
PUBLIC_WEBHOOK_BASE=https://api.kaleem-ai.com
TELEGRAM_WEBHOOK_SECRET=your-telegram-webhook-secret-token-16chars-min
EVOLUTION_APIKEY=your-evolution-api-key-16chars-minimum
```

## 🔍 التحقق من صحة المتغيرات

سيتم التحقق تلقائياً من:

- **JWT_SECRET:** الحد الأدنى 32 حرف
- **JWT_ACCESS_TTL/JWT_REFRESH_TTL:** صيغة صحيحة (15m, 7d, etc.)
- **REDIS_URL:** يبدأ بـ redis:// أو rediss://
- **PUBLIC_WEBHOOK_BASE:** HTTPS بدون / في النهاية
- **TELEGRAM_WEBHOOK_SECRET:** الحد الأدنى 16 حرف
- **EVOLUTION_APIKEY:** الحد الأدنى 16 حرف
- **DATABASE_URL:** MongoDB URL صالح
- **NODE_ENV:** development/production/test
- **PORT:** رقم منفذ صالح

## 🚨 ملاحظات الأمان

1. **غيّر جميع القيم الافتراضية قبل الإنتاج**
2. **استخدم أسرار قوية ومولدة عشوائياً**
3. **احفظ القيم الحساسة في نظام إدارة أسرار آمن**
4. **دوّر الأسرار بانتظام (انظر F2)**
5. **لا تُرسل القيم الحقيقية إلى version control**
6. **استخدم أسرار مختلفة لبيئات مختلفة**

## ⚡ Fail Fast

إذا كان أي متغير مطلوب مفقود أو غير صحيح، سيتوقف التطبيق فوراً مع رسالة خطأ واضحة.

## 🔄 F2: استراتيجية دوران الأسرار

### الأسرار التي تحتاج دوران منتظم:

1. **JWT_SECRET** - كل 6 أشهر
2. **TELEGRAM_WEBHOOK_SECRET** - كل 3 أشهر
3. **EVOLUTION_APIKEY** - كل 3 أشهر
4. **Database passwords** - كل 6 أشهر
5. **Redis passwords** - كل 6 أشهر

### خطوات الدوران الآمن:

1. **تحضير السر الجديد** في نظام إدارة الأسرار
2. **تحديث متغير البيئة** في جميع البيئات
3. **إعادة نشر الخدمات** واحدة تلو الأخرى
4. **التحقق من عمل النظام** بالسر الجديد
5. **إبطال السر القديم** في الخدمات الخارجية
6. **توثيق التغيير** مع التاريخ والسبب
