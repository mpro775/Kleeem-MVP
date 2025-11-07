# 📖 الدليل التفصيلي لمتغيرات البيئة - Kaleem Backend

## 📌 نظرة عامة
هذا الدليل يشرح كل متغير بيئي بالتفصيل، مع توضيح:
- **ما هو**: وصف المتغير ودوره
- **من أين**: كيفية الحصول على القيمة
- **كيف**: طريقة إعداده بشكل صحيح

---

## 🌐 1. إعدادات Node.js والبيئة

### `NODE_ENV`
- **ما هو**: تحديد بيئة التشغيل (تطوير، إنتاج، اختبار)
- **القيم الممكنة**: 
  - `development` - للتطوير المحلي
  - `production` - للإنتاج
  - `test` - للاختبارات
- **من أين**: تحدده أنت حسب البيئة
- **مثال**: `NODE_ENV=production`
- **ملاحظة**: يؤثر على مستوى الأمان، التسجيل، والتحسينات

### `PORT`
- **ما هو**: رقم المنفذ الذي سيستمع عليه السيرفر
- **من أين**: تختاره أنت (عادة 3000 للتطوير)
- **القيمة الافتراضية**: `3000`
- **مثال**: `PORT=3000`
- **ملاحظة**: في الإنتاج، قد يكون 80 أو 443 خلف Nginx

### `APP_DEFAULT_PORT`
- **ما هو**: منفذ احتياطي إذا لم يتم تحديد PORT
- **من أين**: تختاره أنت
- **القيمة الافتراضية**: `3000`
- **مثال**: `APP_DEFAULT_PORT=3000`

### `APP_VERSION`
- **ما هو**: رقم إصدار التطبيق (للتتبع والمراقبة)
- **من أين**: من ملف `package.json` أو تحدده يدوياً
- **مثال**: `APP_VERSION=1.0.0`

### `APP_MINIMAL_BOOT`
- **ما هو**: تشغيل التطبيق في وضع الحد الأدنى (للاختبارات)
- **القيم الممكنة**: `0` (عادي) أو `1` (حد أدنى)
- **من أين**: للاختبارات فقط، اتركه `0` في الإنتاج
- **مثال**: `APP_MINIMAL_BOOT=0`

---

## 🗄️ 2. قاعدة البيانات - MongoDB

### `DATABASE_URL` / `MONGODB_URI`
- **ما هو**: رابط الاتصال بقاعدة بيانات MongoDB
- **من أين**:
  1. **MongoDB محلي**: 
     ```bash
     mongodb://username:password@localhost:27017/database_name?authSource=admin
     ```
  2. **MongoDB Atlas** (سحابي):
     - سجل في [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
     - أنشئ Cluster جديد
     - اضغط على "Connect" → "Connect your application"
     - انسخ connection string
     - استبدل `<password>` بكلمة المرور
  3. **MongoDB على VPS**:
     ```bash
     mongodb://username:password@your-server-ip:27017/database_name?authSource=admin
     ```
- **الصيغة**: `mongodb://[username:password@]host[:port]/database[?options]`
- **مثال**: 
  ```bash
  DATABASE_URL=mongodb://kaleem:secretpass@localhost:27017/kaleem?authSource=admin
  ```
- **ملاحظة**: يمكن استخدام أي من `DATABASE_URL` أو `MONGODB_URI`

### `MONGODB_SSL`
- **ما هو**: تفعيل SSL/TLS للاتصال بـ MongoDB
- **القيم الممكنة**: `true` أو `false`
- **من أين**: 
  - `true` للإنتاج مع MongoDB Atlas
  - `false` للتطوير المحلي
- **مثال**: `MONGODB_SSL=true`

---

## 🔴 3. Redis

### `REDIS_URL`
- **ما هو**: رابط الاتصال بـ Redis (للتخزين المؤقت والطوابير)
- **من أين**:
  1. **Redis محلي**:
     ```bash
     redis://localhost:6379
     ```
  2. **Redis Cloud**:
     - سجل في [Redis Cloud](https://redis.com/try-free/)
     - أنشئ قاعدة بيانات جديدة
     - انسخ endpoint من لوحة التحكم
     - الصيغة: `redis://username:password@endpoint:port`
  3. **Redis على VPS**:
     ```bash
     redis://your-server-ip:6379
     ```
  4. **مع كلمة مرور**:
     ```bash
     redis://:password@localhost:6379
     ```
  5. **مع SSL**:
     ```bash
     rediss://username:password@endpoint:port
     ```
- **الصيغة**: `redis://[username:password@]host[:port][/db-number]`
- **مثال**: `REDIS_URL=redis://localhost:6379`

---

## 🐰 4. RabbitMQ

### `RABBIT_URL`
- **ما هو**: رابط الاتصال بـ RabbitMQ (لنظام الرسائل والطوابير)
- **من أين**:
  1. **RabbitMQ محلي**:
     ```bash
     amqp://guest:guest@localhost:5672
     ```
  2. **CloudAMQP** (سحابي مجاني):
     - سجل في [CloudAMQP](https://www.cloudamqp.com/)
     - أنشئ instance جديد (خطة Little Lemur مجانية)
     - انسخ AMQP URL من لوحة التحكم
  3. **RabbitMQ على VPS**:
     ```bash
     amqp://username:password@your-server-ip:5672/vhost
     ```
- **الصيغة**: `amqp://[username:password@]host[:port][/vhost]`
- **مثال**: `RABBIT_URL=amqp://kaleem:supersecret@localhost:5672/kleem`

### `RABBIT_CONFIRM_TIMEOUT_MS`
- **ما هو**: مهلة انتظار تأكيد الرسائل (بالميلي ثانية)
- **من أين**: قيمة افتراضية، عدلها إذا واجهت مشاكل timeout
- **القيمة الافتراضية**: `10000` (10 ثوانٍ)
- **مثال**: `RABBIT_CONFIRM_TIMEOUT_MS=10000`

---

## 🔐 5. المصادقة - JWT

### `JWT_SECRET`
- **ما هو**: المفتاح السري لتوقيع وتحقق JWT tokens
- **من أين**: **توليد عشوائي** (يجب أن يكون 32 حرف على الأقل)
- **كيف تولده**:
  ```bash
  # في Linux/Mac/WSL
  openssl rand -hex 32
  
  # أو في Node.js
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  
  # أو أونلاين
  # https://generate-secret.vercel.app/32
  ```
- **مثال**: `JWT_SECRET=a3f8d9e2b4c6d8f0e1a3b5c7d9e1f3a5b7c9d1e3f5a7b9c1d3e5f7a9b1c3d5e7`
- **تحذير**: لا تستخدم قيم ضعيفة، ولا تشارك هذا السر

### `JWT_ACCESS_TTL`
- **ما هو**: مدة صلاحية Access Token
- **من أين**: تحدده أنت حسب متطلبات الأمان
- **الصيغة**: رقم + وحدة (`s` ثانية, `m` دقيقة, `h` ساعة, `d` يوم)
- **القيمة الموصى بها**: `15m` إلى `1h`
- **مثال**: `JWT_ACCESS_TTL=15m`

### `JWT_REFRESH_TTL`
- **ما هو**: مدة صلاحية Refresh Token
- **من أين**: تحدده أنت (عادة أطول من Access Token)
- **القيمة الموصى بها**: `7d` إلى `30d`
- **مثال**: `JWT_REFRESH_TTL=7d`

---

## 📧 6. البريد الإلكتروني (اختياري)

### `MAIL_HOST`
- **ما هو**: عنوان خادم SMTP لإرسال البريد
- **من أين**:
  1. **Gmail**:
     - استخدم: `smtp.gmail.com`
     - فعّل [App Passwords](https://myaccount.google.com/apppasswords)
  2. **SendGrid**:
     - سجل في [SendGrid](https://sendgrid.com/)
     - استخدم: `smtp.sendgrid.net`
  3. **Mailgun**:
     - سجل في [Mailgun](https://www.mailgun.com/)
     - استخدم: `smtp.mailgun.org`
  4. **خادم SMTP خاص**:
     - احصل على عنوان SMTP من مزود الاستضافة
- **مثال**: `MAIL_HOST=smtp.gmail.com`

### `MAIL_PORT`
- **ما هو**: رقم منفذ SMTP
- **من أين**: يعتمد على الخادم ونوع التشفير
- **القيم الشائعة**:
  - `587` - TLS/STARTTLS (الموصى به)
  - `465` - SSL
  - `25` - بدون تشفير (غير آمن)
- **مثال**: `MAIL_PORT=587`

### `MAIL_SECURE`
- **ما هو**: استخدام SSL/TLS المباشر
- **القيم الممكنة**:
  - `true` للمنفذ 465
  - `false` للمنفذ 587 (STARTTLS)
- **مثال**: `MAIL_SECURE=false`

### `MAIL_USER`
- **ما هو**: اسم المستخدم/البريد الإلكتروني للدخول
- **من أين**:
  - **Gmail**: بريدك الإلكتروني
  - **SendGrid**: `apikey` (حرفياً)
  - **Mailgun**: البريد من لوحة التحكم
- **مثال**: `MAIL_USER=your-email@gmail.com`

### `MAIL_PASS`
- **ما هو**: كلمة المرور أو API Key
- **من أين**:
  - **Gmail**: App Password (ليس كلمة المرور العادية!)
    - اذهب إلى: https://myaccount.google.com/apppasswords
    - اختر "Mail" و "Other device"
    - انسخ الـ 16 رقم المولد
  - **SendGrid**: API Key من لوحة التحكم
  - **Mailgun**: API Key من لوحة التحكم
- **مثال**: `MAIL_PASS=abcd efgh ijkl mnop` (Gmail App Password)

### `MAIL_FROM`
- **ما هو**: عنوان البريد المرسل (From address)
- **من أين**: تحدده أنت (يجب أن يكون تحت نطاقك)
- **مثال**: `MAIL_FROM=noreply@kaleem-ai.com`

---

## 🗂️ 7. التخزين - MinIO/S3 (اختياري)

### `MINIO_ENDPOINT`
- **ما هو**: عنوان خادم MinIO/S3
- **من أين**:
  1. **MinIO محلي**: `localhost`
  2. **MinIO على VPS**: `your-server-ip` أو `minio.yourdomain.com`
  3. **AWS S3**: `s3.amazonaws.com`
  4. **DigitalOcean Spaces**: `nyc3.digitaloceanspaces.com`
- **مثال**: `MINIO_ENDPOINT=localhost`

### `MINIO_PORT`
- **ما هو**: رقم منفذ MinIO
- **من أين**: 
  - MinIO الافتراضي: `9000`
  - AWS S3: `443`
- **مثال**: `MINIO_PORT=9000`

### `MINIO_USE_SSL`
- **ما هو**: استخدام HTTPS للاتصال
- **القيم الممكنة**: `true` أو `false`
- **من أين**:
  - `true` للإنتاج ومع AWS S3
  - `false` للتطوير المحلي
- **مثال**: `MINIO_USE_SSL=false`

### `MINIO_ACCESS_KEY` و `MINIO_SECRET_KEY`
- **ما هو**: مفاتيح الوصول إلى MinIO/S3
- **من أين**:
  1. **MinIO محلي**: الافتراضي `minioadmin` / `minioadmin`
  2. **AWS S3**:
     - اذهب إلى: AWS Console → IAM → Users
     - أنشئ مستخدم جديد
     - أعطه صلاحية `AmazonS3FullAccess`
     - احصل على Access Key ID & Secret Access Key
  3. **DigitalOcean Spaces**:
     - اذهب إلى: API → Spaces Keys
     - انقر "Generate New Key"
- **مثال**: 
  ```bash
  MINIO_ACCESS_KEY=AKIAIOSFODNN7EXAMPLE
  MINIO_SECRET_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
  ```

### `MINIO_BUCKET`
- **ما هو**: اسم الـ bucket الذي سيستخدم لرفع الملفات
- **من أين**: تنشئه في MinIO/S3
- **كيف**:
  1. **MinIO**: افتح واجهة MinIO → Create Bucket
  2. **AWS S3**: AWS Console → S3 → Create bucket
- **مثال**: `MINIO_BUCKET=kaleem-uploads`

### `MINIO_REGION`
- **ما هو**: المنطقة الجغرافية للـ bucket
- **من أين**:
  - MinIO محلي: `us-east-1` (افتراضي)
  - AWS S3: اختر المنطقة (`us-east-1`, `eu-west-1`, إلخ)
- **مثال**: `MINIO_REGION=us-east-1`

### `MINIO_PUBLIC_URL`
- **ما هو**: رابط عام للوصول للملفات المرفوعة
- **من أين**: تحدده أنت حسب إعداد MinIO/S3
- **أمثلة**:
  - محلي: `http://localhost:9000`
  - إنتاج: `https://cdn.kaleem-ai.com`
  - AWS S3: `https://bucket-name.s3.amazonaws.com`
- **مثال**: `MINIO_PUBLIC_URL=http://localhost:9000`

---

## 📱 8. WhatsApp - Evolution API

### `EVOLUTION_API_URL`
- **ما هو**: رابط Evolution API (لتكامل WhatsApp)
- **من أين**:
  1. **محلي**: إذا شغلت Evolution API محلياً
     ```bash
     http://localhost:8080
     ```
  2. **على VPS**: 
     ```bash
     http://your-server-ip:8080
     ```
  3. **Evolution API Cloud**:
     - سجل في خدمة Evolution API
     - احصل على endpoint من لوحة التحكم
- **مثال**: `EVOLUTION_API_URL=http://localhost:8080`
- **ملاحظة**: راجع [Evolution API Docs](https://doc.evolution-api.com/)

### `EVOLUTION_API_KEY` / `EVOLUTION_APIKEY`
- **ما هو**: مفتاح API للمصادقة مع Evolution API
- **من أين**: 
  - تحدده أنت عند تشغيل Evolution API
  - أو من لوحة التحكم إذا كنت تستخدم خدمة سحابية
- **كيف تضبطه**: في متغيرات بيئة Evolution API:
  ```yaml
  AUTHENTICATION_API_KEY=your-secret-key
  ```
- **مثال**: `EVOLUTION_API_KEY=my-secret-evolution-key-2024`
- **ملاحظة**: استخدم نفس القيمة في كلا المتغيرين

---

## 🤖 9. Telegram Bot

### `TELEGRAM_WEBHOOK_SECRET`
- **ما هو**: سر للتحقق من webhooks التليجرام
- **من أين**: **توليد عشوائي** (16 حرف على الأقل)
- **كيف تولده**:
  ```bash
  openssl rand -hex 16
  ```
- **مثال**: `TELEGRAM_WEBHOOK_SECRET=a3f8d9e2b4c6d8f0e1a3b5c7d9e1f3a5`

### `SUPPORT_TELEGRAM_BOT_TOKEN` (اختياري)
- **ما هو**: توكن بوت التليجرام لإرسال إشعارات الدعم
- **من أين**:
  1. تحدث مع [@BotFather](https://t.me/botfather) على التليجرام
  2. أرسل `/newbot`
  3. اتبع التعليمات لإنشاء بوت
  4. احصل على HTTP API token
- **الصيغة**: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`
- **مثال**: `SUPPORT_TELEGRAM_BOT_TOKEN=5913454321:AAHfiqksKZ8WmR2zSjiQ7_v4TMAKdiHm9T0`

### `SUPPORT_TELEGRAM_CHAT_ID` (اختياري)
- **ما هو**: معرف المحادثة/القناة لإرسال إشعارات الدعم
- **من أين**:
  1. أضف البوت إلى قناة أو مجموعة
  2. أرسل رسالة في القناة
  3. افتح: `https://api.telegram.org/bot<YourBOTToken>/getUpdates`
  4. ابحث عن `"chat":{"id":-123456789}`
- **الصيغة**: رقم (قد يبدأ بـ `-` للمجموعات)
- **مثال**: `SUPPORT_TELEGRAM_CHAT_ID=-1001234567890`

---

## 🔄 10. N8N Workflow Automation

### `N8N_API_KEY`
- **ما هو**: مفتاح API للتواصل مع N8N
- **من أين**:
  1. **N8N Cloud**:
     - سجل في [n8n.cloud](https://n8n.cloud/)
     - اذهب إلى: Settings → API Keys
     - أنشئ API Key جديد
  2. **N8N Self-hosted**:
     - شغل N8N مع متغير `N8N_API_KEY_AUTH_ENABLED=true`
     - أنشئ API key من الواجهة
- **مثال**: `N8N_API_KEY=n8n_api_1234567890abcdef`

### `N8N_API_URL`
- **ما هو**: رابط API الخاص بـ N8N
- **من أين**:
  - **N8N Cloud**: `https://your-instance.app.n8n.cloud`
  - **Self-hosted**: `https://n8n.yourdomain.com`
- **مثال**: `N8N_API_URL=https://n8n.kaleem-ai.com`

### `N8N_BASE_URL` / `N8N_BASE`
- **ما هو**: رابط أساسي لـ N8N (نفس `N8N_API_URL` عادة)
- **من أين**: نفس المصدر أعلاه
- **مثال**: `N8N_BASE_URL=https://n8n.kaleem-ai.com`

### `N8N_INCOMING_PATH`
- **ما هو**: مسار webhook الوارد في N8N
- **من أين**: تحدده أنت في workflow الخاص بـ N8N
- **الصيغة الافتراضية**: `/webhook/ai-agent-{merchantId}`
- **مثال**: `N8N_INCOMING_PATH=/webhook/ai-agent-{merchantId}`
- **ملاحظة**: `{merchantId}` يتم استبداله برقم التاجر

### `N8N_OPENAI_WEBHOOK_URL` (اختياري)
- **ما هو**: رابط webhook في N8N لمعالجة طلبات OpenAI
- **من أين**: من N8N workflow webhook URL
- **مثال**: `N8N_OPENAI_WEBHOOK_URL=https://n8n.kaleem-ai.com/webhook/openai`

### `N8N_SERVICE_TOKEN`
- **ما هو**: توكن للطلبات الداخلية بين الخدمات
- **من أين**: **توليد عشوائي**
- **كيف تولده**:
  ```bash
  openssl rand -hex 32
  ```
- **مثال**: `N8N_SERVICE_TOKEN=a3f8d9e2b4c6d8f0e1a3b5c7d9e1f3a5b7c9d1e3f5a7b9c1d3e5f7a9b1c3d5e7`

### `N8N_DIRECT_CALL_FALLBACK`
- **ما هو**: استخدام اتصال مباشر بـ N8N عند فشل RabbitMQ
- **القيم الممكنة**: `true` أو `false`
- **من أين**: تحدده أنت حسب استراتيجية error handling
- **مثال**: `N8N_DIRECT_CALL_FALLBACK=false`

---

## 🤖 11. خدمات الذكاء الاصطناعي

### `GEMINI_API_KEY`
- **ما هو**: مفتاح Google Gemini API
- **من أين**:
  1. اذهب إلى: [Google AI Studio](https://makersuite.google.com/app/apikey)
  2. سجل دخول بحساب Google
  3. انقر على "Get API key"
  4. أنشئ API key جديد
  5. انسخ المفتاح
- **الصيغة**: `AIza...` (يبدأ بـ AIza)
- **مثال**: `GEMINI_API_KEY=AIzaSyDaGmWKa4JsXZ-HjGw7Q9E_xYz1234567`
- **ملاحظة**: مجاني مع حدود استخدام معقولة

---

## 🌍 12. الروابط العامة

### `PUBLIC_WEBHOOK_BASE`
- **ما هو**: رابط عام أساسي لاستقبال webhooks من الخدمات الخارجية
- **من أين**: دومين API الخاص بك
- **المتطلبات**:
  - يجب أن يكون `https://` في الإنتاج
  - بدون `/` في النهاية
- **أمثلة**:
  - تطوير: `https://your-ngrok-url.ngrok.io`
  - إنتاج: `https://api.kaleem-ai.com`
- **كيف تحصل على رابط للتطوير**:
  1. استخدم [ngrok](https://ngrok.com/):
     ```bash
     ngrok http 3000
     ```
  2. انسخ HTTPS URL المولد
- **مثال**: `PUBLIC_WEBHOOK_BASE=https://api.kaleem-ai.com`

### `FRONTEND_URL`
- **ما هو**: رابط الواجهة الأمامية (للروابط في الإيميلات)
- **من أين**: دومين الفرونت إند الخاص بك
- **أمثلة**:
  - تطوير: `http://localhost:5173`
  - إنتاج: `https://app.kaleem-ai.com`
- **مثال**: `FRONTEND_URL=https://app.kaleem-ai.com`

---

## 🛒 13. تكامل ZID (اختياري)

### `ZID_CLIENT_ID`
- **ما هو**: معرف التطبيق في منصة Zid
- **من أين**:
  1. سجل في [Zid Developer Portal](https://developers.zid.sa/)
  2. أنشئ تطبيق جديد
  3. احصل على Client ID من لوحة التحكم
- **مثال**: `ZID_CLIENT_ID=zid_client_123abc`

### `ZID_CLIENT_SECRET`
- **ما هو**: السر الخاص بالتطبيق في Zid
- **من أين**: نفس المصدر أعلاه (Client Secret)
- **مثال**: `ZID_CLIENT_SECRET=zid_secret_abc123xyz789`

### `ZID_REDIRECT_URI`
- **ما هو**: رابط callback بعد OAuth
- **من أين**: يجب أن تسجله في تطبيق Zid
- **الصيغة**: `https://your-domain.com/api/integrations/zid/callback`
- **مثال**: `ZID_REDIRECT_URI=https://api.kaleem-ai.com/api/integrations/zid/callback`

### `ZID_WEBHOOK_URL`
- **ما هو**: رابط استقبال webhooks من Zid
- **من أين**: تحدده أنت وتسجله في تطبيق Zid
- **الصيغة**: `https://your-domain.com/api/integrations/zid/webhook`
- **مثال**: `ZID_WEBHOOK_URL=https://api.kaleem-ai.com/api/integrations/zid/webhook`

---

## 🔒 14. إعدادات CORS

### `CORS_STATIC_ORIGINS`
- **ما هو**: قائمة بـ Origins المسموح لها بالوصول للـ API
- **من أين**: تحدد روابط الفرونت إند المسموح لها
- **الصيغة**: روابط مفصولة بفاصلة `,`
- **مثال**: 
  ```bash
  CORS_STATIC_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,https://app.kaleem-ai.com
  ```
- **ملاحظة**: أضف جميع روابط الفرونت إند (تطوير + إنتاج)

### `CORS_ALLOW_SUBDOMAIN_BASE`
- **ما هو**: الدومين الأساسي للسماح لجميع subdomains
- **من أين**: دومينك الأساسي
- **مثال**: `CORS_ALLOW_SUBDOMAIN_BASE=kaleem-ai.com`
- **ملاحظة**: يسمح بـ `*.kaleem-ai.com`

### `CORS_SUBDOMAIN_ALLOW_PORTS`
- **ما هو**: السماح بمنافذ على subdomains
- **القيم الممكنة**: `true` أو `false`
- **من أين**: تحدده أنت (عادة `false` في الإنتاج)
- **مثال**: `CORS_SUBDOMAIN_ALLOW_PORTS=false`

### `CORS_ALLOW_EMPTY_ORIGIN`
- **ما هو**: السماح بطلبات بدون Origin header (curl, Postman)
- **القيم الممكنة**: `true` أو `false`
- **من أين**: تحدده أنت
- **مثال**: `CORS_ALLOW_EMPTY_ORIGIN=true`

### `CORS_ALLOW_ALL`
- **ما هو**: السماح لجميع Origins (خطر!)
- **القيم الممكنة**: `true` أو `false`
- **من أين**: استخدمه فقط للتطوير
- **تحذير**: لا تستخدم `true` في الإنتاج!
- **مثال**: `CORS_ALLOW_ALL=false`

### `CORS_CREDENTIALS`
- **ما هو**: السماح بإرسال credentials (cookies)
- **القيم الممكنة**: `true` أو `false`
- **من أين**: `true` إذا كنت تستخدم cookies/sessions
- **مثال**: `CORS_CREDENTIALS=true`

---

## 💬 15. إعدادات Chat

### `CHAT_N8N_ENDPOINT`
- **ما هو**: مسار webhook في N8N لمعالجة الرسائل
- **من أين**: من workflow N8N الخاص بك
- **القيمة الافتراضية**: `/webhook/webhooks/kleem/incoming`
- **مثال**: `CHAT_N8N_ENDPOINT=/webhook/webhooks/kleem/incoming`

### `CHAT_BOT_NAME`
- **ما هو**: اسم البوت (للعرض)
- **من أين**: تختاره أنت
- **القيمة الافتراضية**: `kleem`
- **مثال**: `CHAT_BOT_NAME=kleem`

### `CHAT_DEFAULT_CHANNEL`
- **ما هو**: القناة الافتراضية للمحادثات
- **من أين**: تحدده أنت
- **القيمة الافتراضية**: `webchat`
- **مثال**: `CHAT_DEFAULT_CHANNEL=webchat`

### `CHAT_TYPING_STOP_DELAY_MS`
- **ما هو**: تأخير قبل إيقاف مؤشر "يكتب..."
- **من أين**: تحدده أنت (بالميلي ثانية)
- **القيمة الافتراضية**: `3000` (3 ثوانٍ)
- **مثال**: `CHAT_TYPING_STOP_DELAY_MS=3000`

---

## 🧠 16. إعدادات Embeddings

### `EMBEDDINGS_EXPECTED_DIM`
- **ما هو**: الأبعاد المتوقعة للـ vector embeddings
- **من أين**: يعتمد على model الـ embeddings المستخدم
- **القيم الشائعة**:
  - `1536` - OpenAI text-embedding-ada-002
  - `768` - sentence-transformers
  - `384` - MiniLM models
- **القيمة الافتراضية**: `1536`
- **مثال**: `EMBEDDINGS_EXPECTED_DIM=1536`

### `EMBEDDINGS_HTTP_TIMEOUT_MS`
- **ما هو**: مهلة HTTP request للـ embeddings service
- **من أين**: تحدده أنت (بالميلي ثانية)
- **القيمة الافتراضية**: `30000` (30 ثانية)
- **مثال**: `EMBEDDINGS_HTTP_TIMEOUT_MS=30000`

### `EMBEDDINGS_RX_TIMEOUT_MS`
- **ما هو**: مهلة RxJS observable للـ embeddings
- **من أين**: تحدده أنت (أطول من HTTP timeout)
- **القيمة الافتراضية**: `35000` (35 ثانية)
- **مثال**: `EMBEDDINGS_RX_TIMEOUT_MS=35000`

### `EMBEDDINGS_MAX_TEXT_LENGTH`
- **ما هو**: الحد الأقصى لطول النص المُرسل للـ embeddings
- **من أين**: تحدده أنت حسب قدرة model
- **القيمة الافتراضية**: `8000`
- **مثال**: `EMBEDDINGS_MAX_TEXT_LENGTH=8000`

### `EMBEDDINGS_MAX_RETRIES`
- **ما هو**: عدد محاولات إعادة الطلب عند الفشل
- **من أين**: تحدده أنت
- **القيمة الافتراضية**: `3`
- **مثال**: `EMBEDDINGS_MAX_RETRIES=3`

### `EMBEDDINGS_BASE_RETRY_DELAY_MS`
- **ما هو**: التأخير الأساسي بين المحاولات (exponential backoff)
- **من أين**: تحدده أنت (بالميلي ثانية)
- **القيمة الافتراضية**: `1000` (1 ثانية)
- **مثال**: `EMBEDDINGS_BASE_RETRY_DELAY_MS=1000`

### `EMBEDDINGS_ENDPOINT_PATH`
- **ما هو**: مسار API endpoint للـ embeddings service
- **من أين**: من وثائق الـ embeddings service المستخدم
- **القيمة الافتراضية**: `/embed`
- **مثال**: `EMBEDDINGS_ENDPOINT_PATH=/embed`

---

## 🔐 17. إعدادات الأمان

### `SEC_HSTS_MAX_AGE`
- **ما هو**: مدة HSTS (HTTP Strict Transport Security) بالثواني
- **من أين**: قيمة موصى بها (سنة واحدة)
- **القيمة الافتراضية**: `31536000` (سنة واحدة)
- **مثال**: `SEC_HSTS_MAX_AGE=31536000`
- **ملاحظة**: فقط للإنتاج مع HTTPS

### `COOKIE_SECRET`
- **ما هو**: سر لتوقيع cookies
- **من أين**: **توليد عشوائي**
- **كيف تولده**:
  ```bash
  openssl rand -hex 32
  ```
- **مثال**: `COOKIE_SECRET=a3f8d9e2b4c6d8f0e1a3b5c7d9e1f3a5b7c9d1e3f5a7b9c1d3e5f7a9b1c3d5e7`

---

## ⏱️ 18. Rate Limiting

### `RATE_LIMIT_WINDOW_MS`
- **ما هو**: النافذة الزمنية لحساب عدد الطلبات
- **من أين**: تحدده أنت (بالميلي ثانية)
- **القيمة الافتراضية**: `900000` (15 دقيقة)
- **مثال**: `RATE_LIMIT_WINDOW_MS=900000`

### `RATE_LIMIT_MAX`
- **ما هو**: الحد الأقصى للطلبات في النافذة الزمنية
- **من أين**: تحدده أنت حسب سعة السيرفر
- **القيمة الافتراضية**: `100`
- **مثال**: `RATE_LIMIT_MAX=100`

### `RATE_LIMIT_CODE`
- **ما هو**: كود الخطأ عند تجاوز الحد
- **من أين**: تحدده أنت
- **القيمة الافتراضية**: `RATE_LIMIT_EXCEEDED`
- **مثال**: `RATE_LIMIT_CODE=RATE_LIMIT_EXCEEDED`

### `RATE_LIMIT_TEXT`
- **ما هو**: رسالة الخطأ بالعربية
- **من أين**: تحددها أنت
- **القيمة الافتراضية**: `تم تجاوز حد الطلبات، الرجاء المحاولة لاحقاً`
- **مثال**: `RATE_LIMIT_TEXT=تم تجاوز حد الطلبات، الرجاء المحاولة لاحقاً`

---

## 💾 19. إعدادات Cache

### `CACHE_MERCHANT_TTL_MS`
- **ما هو**: مدة تخزين بيانات التاجر في الذاكرة المؤقتة
- **من أين**: تحدده أنت (بالميلي ثانية)
- **القيمة الافتراضية**: `600000` (10 دقائق)
- **مثال**: `CACHE_MERCHANT_TTL_MS=600000`

### `CACHE_MERCHANT_PROMPT_TTL_MS`
- **ما هو**: مدة تخزين prompt التاجر
- **من أين**: تحدده أنت (عادة أطول من البيانات العادية)
- **القيمة الافتراضية**: `1800000` (30 دقيقة)
- **مثال**: `CACHE_MERCHANT_PROMPT_TTL_MS=1800000`

### `CACHE_MERCHANT_STATUS_TTL_MS`
- **ما هو**: مدة تخزين حالة التاجر
- **من أين**: تحدده أنت (عادة أقصر للحصول على بيانات محدثة)
- **القيمة الافتراضية**: `300000` (5 دقائق)
- **مثال**: `CACHE_MERCHANT_STATUS_TTL_MS=300000`

---

## 📊 20. المراقبة والتتبع (اختياري)

### `SENTRY_DSN`
- **ما هو**: Data Source Name لـ Sentry/GlitchTip (تتبع الأخطاء)
- **من أين**:
  1. **Sentry**:
     - سجل في [sentry.io](https://sentry.io/)
     - أنشئ مشروع جديد (Node.js)
     - انسخ DSN من Project Settings
  2. **GlitchTip** (بديل مفتوح المصدر):
     - استضف GlitchTip أو استخدم [glitchtip.com](https://glitchtip.com/)
     - أنشئ مشروع وانسخ DSN
- **الصيغة**: `https://public_key@host/project_id`
- **مثال**: `SENTRY_DSN=https://abc123@o123456.ingest.sentry.io/7891234`

### `SENTRY_DEBUG`
- **ما هو**: تفعيل debug mode لـ Sentry
- **القيم الممكنة**: `true` أو `false`
- **من أين**: `true` للتطوير فقط
- **مثال**: `SENTRY_DEBUG=false`

### `OTEL_EXPORTER_OTLP_ENDPOINT`
- **ما هو**: endpoint لـ OpenTelemetry Collector
- **من أين**: 
  - محلي: `http://localhost:4318/v1/traces`
  - على VPS: `http://otel-collector:4318/v1/traces`
- **مثال**: `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces`

---

## 🐳 21. Docker & MongoDB Init

### `MONGO_INITDB_ROOT_USERNAME`
- **ما هو**: اسم مستخدم root لـ MongoDB (للـ docker-compose)
- **من أين**: تحدده أنت في docker-compose.yml
- **مثال**: `MONGO_INITDB_ROOT_USERNAME=kaleem`

### `MONGO_INITDB_ROOT_PASSWORD`
- **ما هو**: كلمة مرور root لـ MongoDB
- **من أين**: تحددها أنت (استخدم قيمة قوية)
- **مثال**: `MONGO_INITDB_ROOT_PASSWORD=kaleem@123`
- **ملاحظة**: غيّر القيمة الافتراضية في الإنتاج!

---

## 🔍 22. Qdrant - Vector Database

### `QDRANT_URL`
- **ما هو**: رابط Qdrant لقاعدة البيانات Vector (للبحث الدلالي)
- **من أين**:
  1. **محلي**:
     ```bash
     http://localhost:6333
     ```
  2. **Docker**:
     ```bash
     http://qdrant:6333
     ```
  3. **Qdrant Cloud**:
     - سجل في [Qdrant Cloud](https://cloud.qdrant.io/)
     - أنشئ cluster جديد
     - انسخ API endpoint
     - الصيغة: `https://xyz-cluster.aws-region.aws.cloud.qdrant.io:6333`
  4. **على VPS**:
     ```bash
     http://your-server-ip:6333
     ```
- **مثال**: `QDRANT_URL=http://qdrant:6333`
- **ملاحظة**: هذا المتغير **إلزامي** للبحث الدلالي

### `QDRANT_HOST`
- **ما هو**: عنوان host لـ Qdrant (بديل عن URL الكامل)
- **من أين**: نفس مصدر QDRANT_URL ولكن بدون البروتوكول والمنفذ
- **مثال**: `QDRANT_HOST=qdrant`
- **ملاحظة**: يمكن استخدامه بدلاً من QDRANT_URL

---

## 🔐 23. Secrets & Workers

### `SECRETS_KEY`
- **ما هو**: مفتاح سري لتشفير البيانات الحساسة
- **من أين**: **توليد عشوائي** (32+ حرف)
- **كيف تولده**:
  ```bash
  openssl rand -hex 32
  ```
- **مثال**: `SECRETS_KEY=a3f8d9e2b4c6d8f0e1a3b5c7d9e1f3a5b7c9d1e3f5a7b9c1d3e5f7a9b1c3d5e7`
- **الاستخدام**: تشفير بيانات OAuth، API keys للتجار، إلخ

### `WORKER_TOKEN`
- **ما هو**: توكن للمصادقة بين Workers والـ API
- **من أين**: **توليد عشوائي**
- **كيف تولده**:
  ```bash
  openssl rand -hex 32
  ```
- **مثال**: `WORKER_TOKEN=super-secret-worker-token-change-this-in-production`
- **ملاحظة**: يستخدم في AI Workers للتواصل الآمن

---

## 📎 24. Support & File Upload

### `SUPPORT_UPLOAD_DIR`
- **ما هو**: مسار المجلد لحفظ ملفات الدعم المرفقة
- **من أين**: تحدده أنت (مسار على السيرفر)
- **القيمة الافتراضية**: `./uploads/support`
- **مثال**: `SUPPORT_UPLOAD_DIR=./uploads/support`
- **ملاحظة**: تأكد من صلاحيات الكتابة

### `SUPPORT_MAX_FILES`
- **ما هو**: الحد الأقصى لعدد الملفات المرفقة لكل تذكرة دعم
- **من أين**: تحدده أنت
- **القيمة الافتراضية**: `5`
- **مثال**: `SUPPORT_MAX_FILES=5`

### `SUPPORT_MAX_FILE_SIZE_MB`
- **ما هو**: الحد الأقصى لحجم الملف الواحد (بالميجابايت)
- **من أين**: تحدده أنت
- **القيمة الافتراضية**: `5`
- **مثال**: `SUPPORT_MAX_FILE_SIZE_MB=5`

### `SUPPORT_ALLOWED_FILE_TYPES`
- **ما هو**: أنواع الملفات المسموح برفعها (مفصولة بفاصلة)
- **من أين**: تحددها أنت
- **القيمة الافتراضية**: `png,jpg,jpeg,pdf,doc,docx`
- **مثال**: `SUPPORT_ALLOWED_FILE_TYPES=png,jpg,jpeg,pdf,doc,docx`

### `SUPPORT_SLACK_WEBHOOK_URL` (اختياري)
- **ما هو**: webhook URL لإرسال إشعارات الدعم إلى Slack
- **من أين**:
  1. اذهب إلى Slack workspace
  2. اذهب إلى: Settings → Integrations → Incoming Webhooks
  3. أنشئ webhook جديد
  4. انسخ URL
- **مثال**: `SUPPORT_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T00/B00/xxxx`

### `SUPPORT_N8N_WEBHOOK_URL` (اختياري)
- **ما هو**: webhook URL في N8N لمعالجة تذاكر الدعم
- **من أين**: من N8N workflow webhook
- **مثال**: `SUPPORT_N8N_WEBHOOK_URL=https://n8n.kaleem-ai.com/webhook/support`

---

## 🧠 25. Embedding Service

### `EMBEDDING_BASE_URL`
- **ما هو**: رابط خدمة Embeddings (لتحويل النصوص إلى vectors)
- **من أين**:
  1. **محلي**: إذا شغلت embedding service محلياً
     ```bash
     http://localhost:8000
     ```
  2. **Docker**:
     ```bash
     http://embedding:8000
     ```
  3. **على VPS**:
     ```bash
     http://your-server-ip:8000
     ```
- **مثال**: `EMBEDDING_BASE_URL=http://embedding:8000`
- **ملاحظة**: هذا المتغير **إلزامي** - الموجود في `Backend/embedding-service/`

### `EMBEDDING_DIM`
- **ما هو**: عدد الأبعاد للـ embedding vectors
- **من أين**: يعتمد على model المستخدم
- **القيم الشائعة**:
  - `384` - sentence-transformers/all-MiniLM-L6-v2 (افتراضي)
  - `768` - sentence-transformers/all-mpnet-base-v2
  - `1536` - OpenAI text-embedding-ada-002
- **القيمة الافتراضية**: `384`
- **مثال**: `EMBEDDING_DIM=384`

---

## 🔍 26. Extractor Service

### `EXTRACTOR_BASE_URL`
- **ما هو**: رابط خدمة Extractor (لاستخراج محتوى المواقع)
- **من أين**:
  1. **محلي**:
     ```bash
     http://localhost:8001
     ```
  2. **Docker**:
     ```bash
     http://extractor:8001
     ```
  3. **على VPS**:
     ```bash
     http://your-server-ip:8001
     ```
- **مثال**: `EXTRACTOR_BASE_URL=http://extractor:8001`
- **ملاحظة**: الموجود في `Backend/extractor-service/`

---

## 🛍️ 27. Salla E-commerce Integration

### `SALLA_CLIENT_ID`
- **ما هو**: معرف التطبيق في منصة Salla
- **من أين**:
  1. سجل في [Salla Partners Portal](https://salla.partners/)
  2. اذهب إلى: Developer → Apps
  3. أنشئ تطبيق جديد
  4. انسخ Client ID
- **مثال**: `SALLA_CLIENT_ID=fa23d9b6-145e-413a-82f9-6cfb77703271`

### `SALLA_CLIENT_SECRET`
- **ما هو**: السر الخاص بالتطبيق في Salla
- **من أين**: نفس المصدر أعلاه (Client Secret)
- **مثال**: `SALLA_CLIENT_SECRET=ec85d470677653148ea12cbe0a419705`

### `SALLA_REDIRECT_URI`
- **ما هو**: رابط callback بعد OAuth
- **من أين**: يجب أن تسجله في تطبيق Salla
- **الصيغة**: `https://your-domain.com/api/integrations/salla/callback`
- **مثال**: `SALLA_REDIRECT_URI=https://api.kaleem-ai.com/api/integrations/salla/callback`

### `SALLA_SCOPE`
- **ما هو**: الصلاحيات المطلوبة من Salla API
- **من أين**: حسب احتياجاتك
- **القيمة الموصى بها**: `offline_access products.read orders.read webhooks.read webhooks.write`
- **مثال**: `SALLA_SCOPE=offline_access products.read orders.read webhooks.read webhooks.write`

### `SALLA_WEBHOOK_URL`
- **ما هو**: رابط استقبال webhooks من Salla
- **من أين**: تحدده أنت وتسجله في تطبيق Salla
- **الصيغة**: `${PUBLIC_WEBHOOK_BASE}/salla/webhook`
- **مثال**: `SALLA_WEBHOOK_URL=https://api.kaleem-ai.com/api/integrations/salla/webhook`

### `SALLA_API_BASE`
- **ما هو**: رابط أساسي لـ Salla API
- **من أين**: ثابت من Salla
- **القيمة الافتراضية**: `https://api.salla.sa`
- **مثال**: `SALLA_API_BASE=https://api.salla.sa`

### `SALLA_WEBHOOK_PROTECTION`
- **ما هو**: طريقة التحقق من webhooks Salla
- **القيم الممكنة**:
  - `token` - استخدام token للتحقق
  - `signature` - استخدام HMAC signature
  - `none` - بدون تحقق (غير آمن)
- **من أين**: تختاره أنت
- **مثال**: `SALLA_WEBHOOK_PROTECTION=token`

### `SALLA_WEBHOOK_TOKEN`
- **ما هو**: token للتحقق من webhooks (إذا استخدمت `token` mode)
- **من أين**: **توليد عشوائي** أو من Salla dashboard
- **كيف تولده**:
  ```bash
  openssl rand -hex 16
  ```
- **مثال**: `SALLA_WEBHOOK_TOKEN=fbf2e04de36ddf764795fc1fdc1fc1a0`

### `SALLA_WEBHOOK_SECRET`
- **ما هو**: secret للتحقق من webhooks (إذا استخدمت `signature` mode)
- **من أين**: من Salla Partners Portal
- **مثال**: `SALLA_WEBHOOK_SECRET=your-salla-webhook-secret`

---

## 🌐 28. Public URLs & Origins

### `PUBLIC_WEBHOOK_BASE`
- **ما هو**: رابط عام أساسي لجميع integrations webhooks
- **من أين**: دومين API الخاص بك
- **الصيغة**: `https://your-domain.com/api/integrations`
- **مثال**: `PUBLIC_WEBHOOK_BASE=https://api.kaleem-ai.com/api/integrations`
- **ملاحظة**: بدون `/` في النهاية

### `PUBLIC_APP_ORIGIN`
- **ما هو**: رابط الواجهة الأمامية (للـ OAuth popups)
- **من أين**: دومين الفرونت إند
- **أمثلة**:
  - تطوير: `http://localhost:5173`
  - إنتاج: `https://app.kaleem-ai.com`
- **مثال**: `PUBLIC_APP_ORIGIN=https://app.kaleem-ai.com`
- **الاستخدام**: postMessage في OAuth flows

### `PUBLIC_WEB_BASE_URL`
- **ما هو**: رابط أساسي للموقع العام/Landing page
- **من أين**: دومينك العام
- **القيمة الافتراضية**: `https://kaleem-ai.com`
- **مثال**: `PUBLIC_WEB_BASE_URL=https://kaleem-ai.com`

### `STORE_PUBLIC_ORIGIN`
- **ما هو**: رابط متجر التاجر العام (للمنتجات)
- **من أين**: subdomain لكل تاجر
- **مثال**: `STORE_PUBLIC_ORIGIN=https://stores.kaleem-ai.com`
- **الاستخدام**: إنشاء روابط المنتجات العامة

---

## 🖼️ 29. Assets & CDN

### `ASSETS_CDN_BASE_URL`
- **ما هو**: رابط CDN للأصول الثابتة (صور، ملفات)
- **من أين**:
  1. **CloudFlare CDN**:
     - أضف domain إلى CloudFlare
     - فعّل proxy
     - استخدم: `https://cdn.yourdomain.com`
  2. **AWS CloudFront**:
     - أنشئ distribution
     - وجهه إلى S3 bucket
  3. **محلي**: نفس MINIO_PUBLIC_URL
- **مثال**: `ASSETS_CDN_BASE_URL=https://cdn.kaleem-ai.com`
- **ملاحظة**: يستخدم كـ fallback لـ MINIO_PUBLIC_URL

---

## 🤖 30. reCAPTCHA

### `RECAPTCHA_SECRET`
- **ما هو**: مفتاح سري لـ Google reCAPTCHA (لحماية النماذج)
- **من أين**:
  1. اذهب إلى: [Google reCAPTCHA Admin](https://www.google.com/recaptcha/admin)
  2. سجل موقع جديد
  3. اختر reCAPTCHA v2 أو v3
  4. انسخ Secret Key
- **مثال**: `RECAPTCHA_SECRET=6Lc...your-secret-key`
- **الاستخدام**: التحقق من نموذج التواصل

---

## ⚡ 31. Webhooks Rate Limiting

### `WEBHOOKS_INCOMING_TTL`
- **ما هو**: مدة النافذة الزمنية لـ rate limit على webhooks الواردة (بالثواني)
- **من أين**: تحدده أنت
- **القيمة الافتراضية**: `10`
- **مثال**: `WEBHOOKS_INCOMING_TTL=10`

### `WEBHOOKS_INCOMING_LIMIT`
- **ما هو**: الحد الأقصى للطلبات في النافذة الزمنية
- **من أين**: تحدده أنت
- **القيمة الافتراضية**: `1`
- **مثال**: `WEBHOOKS_INCOMING_LIMIT=1`

### `WEBHOOKS_BOT_REPLY_TTL`
- **ما هو**: مدة النافذة لـ rate limit على ردود البوت (بالثواني)
- **من أين**: تحدده أنت
- **القيمة الافتراضية**: `10`
- **مثال**: `WEBHOOKS_BOT_REPLY_TTL=10`

### `WEBHOOKS_BOT_REPLY_LIMIT`
- **ما هو**: الحد الأقصى لردود البوت في النافذة
- **من أين**: تحدده أنت
- **القيمة الافتراضية**: `1`
- **مثال**: `WEBHOOKS_BOT_REPLY_LIMIT=1`

### `WEBHOOKS_TEST_BOT_REPLY_TTL`
- **ما هو**: مدة النافذة لاختبار البوت
- **من أين**: تحدده أنت
- **القيمة الافتراضية**: `10`
- **مثال**: `WEBHOOKS_TEST_BOT_REPLY_TTL=10`

### `WEBHOOKS_TEST_BOT_REPLY_LIMIT`
- **ما هو**: الحد الأقصى لاختبارات البوت
- **من أين**: تحدده أنت
- **القيمة الافتراضية**: `1`
- **مثال**: `WEBHOOKS_TEST_BOT_REPLY_LIMIT=1`

### `WEBHOOKS_AGENT_REPLY_TTL`
- **ما هو**: مدة النافذة لردود الوكيل
- **من أين**: تحدده أنت
- **القيمة الافتراضية**: `10`
- **مثال**: `WEBHOOKS_AGENT_REPLY_TTL=10`

### `WEBHOOKS_AGENT_REPLY_LIMIT`
- **ما هو**: الحد الأقصى لردود الوكيل
- **من أين**: تحدده أنت
- **القيمة الافتراضية**: `1`
- **مثال**: `WEBHOOKS_AGENT_REPLY_LIMIT=1`

---

## 🔄 32. Fallback Options

### `DIRECT_SEND_FALLBACK`
- **ما هو**: استخدام إرسال مباشر عند فشل RabbitMQ
- **القيم الممكنة**: `true` أو `false`
- **من أين**: تحدده أنت حسب استراتيجية error handling
- **القيمة الافتراضية**: `false`
- **مثال**: `DIRECT_SEND_FALLBACK=true`
- **ملاحظة**: يستخدم fallback مباشر بدلاً من queue

---

## 📝 ملخص سريع: كيف تبدأ؟

### 1. المتغيرات الإلزامية الحرجة (لا يعمل التطبيق بدونها):
```bash
# 🔐 الأسرار - ولّدها بـ: openssl rand -hex 32
JWT_SECRET=
SECRETS_KEY=
WORKER_TOKEN=

# 🔐 Telegram - ولّده بـ: openssl rand -hex 16  
TELEGRAM_WEBHOOK_SECRET=

# 🗄️ قواعد البيانات
DATABASE_URL=mongodb://kaleem:password@localhost:27017/kaleem?authSource=admin
REDIS_URL=redis://localhost:6379
RABBIT_URL=amqp://kaleem:supersecret@localhost:5672/kleem
QDRANT_URL=http://qdrant:6333

# 🧠 خدمات الذكاء الاصطناعي
EMBEDDING_BASE_URL=http://embedding:8000
GEMINI_API_KEY=

# 🌐 روابط عامة
PUBLIC_WEBHOOK_BASE=https://api.kaleem-ai.com/api/integrations
FRONTEND_URL=https://app.kaleem-ai.com
PUBLIC_APP_ORIGIN=https://app.kaleem-ai.com

# 📱 WhatsApp
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=
EVOLUTION_APIKEY=

# 🔄 N8N
N8N_API_KEY=
N8N_API_URL=https://n8n.kaleem-ai.com
N8N_BASE_URL=https://n8n.kaleem-ai.com
N8N_BASE=https://n8n.kaleem-ai.com
N8N_SERVICE_TOKEN=
```

### 2. المتغيرات الموصى بها (للميزات الكاملة):
```bash
# 🔍 Extractor (لاستخراج المحتوى)
EXTRACTOR_BASE_URL=http://extractor:8001

# 🗂️ التخزين
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=kaleem-uploads
MINIO_PUBLIC_URL=http://localhost:9000

# 📧 البريد الإلكتروني
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your-email@gmail.com
MAIL_PASS=your-app-password
MAIL_FROM=noreply@kaleem-ai.com
```

### 3. تكاملات E-commerce (اختياري):
```bash
# 🛍️ ZID
ZID_CLIENT_ID=
ZID_CLIENT_SECRET=
ZID_REDIRECT_URI=https://api.kaleem-ai.com/api/integrations/zid/callback
ZID_WEBHOOK_URL=https://api.kaleem-ai.com/api/integrations/zid/webhook

# 🛒 SALLA
SALLA_CLIENT_ID=
SALLA_CLIENT_SECRET=
SALLA_REDIRECT_URI=https://api.kaleem-ai.com/api/integrations/salla/callback
SALLA_SCOPE=offline_access products.read orders.read webhooks.read webhooks.write
SALLA_WEBHOOK_URL=${PUBLIC_WEBHOOK_BASE}/salla/webhook
SALLA_WEBHOOK_PROTECTION=token
SALLA_WEBHOOK_TOKEN=
```

### 4. المتغيرات الاختيارية:
```bash
# 📎 Support
SUPPORT_UPLOAD_DIR=./uploads/support
SUPPORT_MAX_FILES=5
SUPPORT_MAX_FILE_SIZE_MB=5
SUPPORT_ALLOWED_FILE_TYPES=png,jpg,jpeg,pdf,doc,docx
SUPPORT_SLACK_WEBHOOK_URL=
SUPPORT_N8N_WEBHOOK_URL=

# 🖼️ CDN & Assets
ASSETS_CDN_BASE_URL=
STORE_PUBLIC_ORIGIN=
PUBLIC_WEB_BASE_URL=

# 🤖 reCAPTCHA
RECAPTCHA_SECRET=

# ⚡ Webhooks Rate Limiting
WEBHOOKS_INCOMING_TTL=10
WEBHOOKS_INCOMING_LIMIT=1
WEBHOOKS_BOT_REPLY_TTL=10
WEBHOOKS_BOT_REPLY_LIMIT=1

# 🔄 Fallbacks
DIRECT_SEND_FALLBACK=false
N8N_DIRECT_CALL_FALLBACK=false

# 📊 Monitoring
SENTRY_DSN=
SENTRY_DEBUG=false
OTEL_EXPORTER_OTLP_ENDPOINT=

# ⚙️ إعدادات متقدمة (CORS, Rate Limit, Cache)
# راجع الأقسام المفصلة أعلاه
```

---

## 🆘 روابط مفيدة

| الخدمة | الرابط | الملاحظات |
|--------|--------|-----------|
| **قواعد البيانات** | | |
| MongoDB Atlas | https://www.mongodb.com/cloud/atlas | قاعدة بيانات مجانية |
| Redis Cloud | https://redis.com/try-free/ | Redis مجاني |
| Qdrant Cloud | https://cloud.qdrant.io/ | Vector DB مجاني |
| CloudAMQP | https://www.cloudamqp.com/ | RabbitMQ مجاني |
| **الذكاء الاصطناعي** | | |
| Google AI Studio | https://makersuite.google.com/app/apikey | Gemini API مجاني |
| **Automation & Integration** | | |
| n8n Cloud | https://n8n.cloud/ | Workflow automation |
| **E-commerce** | | |
| Zid Developers | https://developers.zid.sa/ | تكامل Zid |
| Salla Partners | https://salla.partners/ | تكامل Salla |
| **Communication** | | |
| Telegram BotFather | https://t.me/botfather | إنشاء بوتات |
| Evolution API | https://doc.evolution-api.com/ | WhatsApp API |
| **Email & Notifications** | | |
| SendGrid | https://sendgrid.com/ | إرسال بريد مجاني |
| Mailgun | https://www.mailgun.com/ | خدمة بريد |
| **Storage & CDN** | | |
| AWS S3 | https://aws.amazon.com/s3/ | تخزين سحابي |
| DigitalOcean Spaces | https://www.digitalocean.com/products/spaces | تخزين S3-compatible |
| Cloudflare CDN | https://www.cloudflare.com/ | CDN مجاني |
| **Monitoring** | | |
| Sentry | https://sentry.io/ | تتبع الأخطاء |
| GlitchTip | https://glitchtip.com/ | بديل Sentry مفتوح |
| **Development Tools** | | |
| ngrok | https://ngrok.com/ | للحصول على رابط عام |
| Google reCAPTCHA | https://www.google.com/recaptcha/admin | حماية النماذج |

---

## ⚠️ تحذيرات هامة

1. **لا تشارك ملف `.env` أبداً** - يحتوي على أسرار حساسة
2. **غيّر القيم الافتراضية** - خاصة كلمات المرور والأسرار
3. **استخدم HTTPS في الإنتاج** - لجميع الروابط العامة
4. **احتفظ بنسخة آمنة** - من ملف `.env` الخاص بالإنتاج
5. **لا ترفع `.env` لـ Git** - تأكد من وجوده في `.gitignore`

---

## 📊 إحصائيات

هذا الدليل يغطي:
- **32 قسم** رئيسي
- **100+ متغير** بيئي
- **20+ خدمة** سحابية مجانية
- **جميع التكاملات** المطلوبة (WhatsApp, Telegram, Salla, Zid, N8N)

---

**آخر تحديث**: نوفمبر 2024  
**الإصدار**: 2.0.0 (محدّث بالكامل ✅)

### 📚 ملفات ذات صلة:
- `ENV_VARIABLES.md` - مرجع شامل بالجداول
- `SETUP_ENV.md` - دليل الإعداد السريع
- `ENV_DETAILED_GUIDE.md` - هذا الملف (الدليل التفصيلي)

### 🔍 كيف تستخدم هذا الدليل:
1. **ابدأ بالملخص السريع** (القسم 📝) لفهم المتغيرات الإلزامية
2. **ارجع للأقسام التفصيلية** لكل متغير لمعرفة كيفية الحصول عليه
3. **استخدم جدول الروابط** (القسم 🆘) للتسجيل في الخدمات
4. **اتبع التحذيرات** (القسم ⚠️) لضمان الأمان

---

**ملاحظة**: هذا الدليل مبني على فحص شامل للكود المصدري وجميع الملفات في `Backend/src`. إذا وجدت متغيراً مفقوداً، يرجى التواصل أو فتح issue.

