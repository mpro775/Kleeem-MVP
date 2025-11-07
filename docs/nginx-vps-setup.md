# 🛡️ دليل إعداد Nginx على الـ VPS الجديد

هذا الدليل يشرح كيفية تهيئة خادوم Nginx (داخل الحاوية) لبيئة Kleeem على الـ VPS الجديد (`ssh root@72.61.5.166`). جميع الخطوات مكتوبة بالعربية وتفترض أنك تستخدم نسخة الـ MVP المحدثة (`docker-compose.mvp.yml`).

---

## 1️⃣ المتطلبات الأساسية

| المتطلب | الحالة |
|---------|---------|
| VPS يعمل بنظام Ubuntu 20+ أو Debian 11 | ✅ |
| الوصول الجذري: `ssh root@72.61.5.166` | ✅ |
| Docker + Docker Compose مثبتين | ✅ (انظر دليل النشر إن لزم) |
| أسماء النطاقات / السّب دومينات مسجلة (DNS) | ✅ |
| شهادات SSL صالحة لكل نطاق | 🔑 |
| نسخة المشروع على الخادوم | ✅ |

> 💡 **نصيحة**: إذا كنت تستخدم Cloudflare أو مزود DNS آخر، تأكد من تحديث السجلات قبل تشغيل الحاويات.

---

## 2️⃣ السّب دومينات المقترحة

| الخدمة | السّب دومين | الوصف |
|--------|-------------|--------|
| واجهة المستخدم | `app.kaleem-ai.com` | يوجه إلى خدمة `frontend` |
| واجهة الـ API | `api.kaleem-ai.com` | يوجه إلى خدمة `api` خلف Nginx |
| أتمتة n8n | `n8n.kaleem-ai.com` | يوجه إلى خدمة `n8n` |
| Evolution API | `evolution.kaleem-ai.com` أو `wa.kaleem-ai.com` | يوجه إلى الخدمة `evolution-api` |
| MinIO Console | `storage.kaleem-ai.com` (اختياري) | يوجه إلى MinIO (للإدارة) |

يمكنك تعديل الأسماء بما يتناسب مع البنية لديك، لكن تأكد من أن كل نطاق يشير إلى عنوان الـ VPS الجديد (`72.61.5.166`).

---

## 3️⃣ تحديث سجلات DNS

1. ادخل إلى لوحة التحكم في مزود DNS (Cloudflare مثلًا).
2. أضف أو عدّل سجلات `A` لكل نطاق/سب دومين:
   - `app` → `72.61.5.166`
   - `api` → `72.61.5.166`
   - `n8n` → `72.61.5.166`
   - …
3. إذا كنت تستخدم Cloudflare مع بروتوكول قريبًا (Proxy enabled)، تأكد من تفعيل SSL/TLS على وضع `Full (Strict)`.
4. انتظر انتشار السجلات (عادةً دقائق إلى ساعة).

---

## 4️⃣ تنظيم ملفات Nginx في المشروع

نستخدم حاوية Nginx ضمن `docker-compose.mvp.yml`، لذا نحتاج إعداد الملفات التالية:

```
Backend/
├── nginx.lb.conf      # ملف إعداد Nginx الرئيسي
└── nginx.ssl/         # مجلد الشهادات (سيتم إنشاؤه)
    ├── api.kaleem-ai.com.crt
    ├── api.kaleem-ai.com.key
    ├── app.kaleem-ai.com.crt
    ├── app.kaleem-ai.com.key
    └── ... (باقي الشهادات)
```

### 4.1 إنشاء مجلد الشهادات

على الـ VPS:

```bash
mkdir -p /root/Kleeem-MVP/Backend/nginx.ssl
chmod 700 /root/Kleeem-MVP/Backend/nginx.ssl
```

> 🔐 **أمان**: حافظ على صلاحيات ضيقة (`700`) لضمان خصوصية المفاتيح.

### 4.2 نسخ الشهادات

- إذا كانت الشهادات لديك في جهازك المحلي، استخدم `scp`:

  ```bash
  scp /path/to/api.kaleem-ai.com.crt root@72.61.5.166:/root/Kleeem-MVP/Backend/nginx.ssl/
  scp /path/to/api.kaleem-ai.com.key root@72.61.5.166:/root/Kleeem-MVP/Backend/nginx.ssl/
  ```

- كرر لكل نطاق (app، n8n، الخ).
- إذا كنت تستخدم شهادات Let’s Encrypt مباشرة على الخادوم، انسخها أو أنشئ روابط رمزية داخل `nginx.ssl`.

### 4.3 مثال ملف Nginx (`Backend/nginx.lb.conf`)

```nginx
user  nginx;
worker_processes  auto;
pid /tmp/nginx.pid;

events {
    worker_connections  1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;
    sendfile      on;
    keepalive_timeout 65;

    map $http_upgrade $connection_upgrade {
        default upgrade;
        ''      close;
    }

    upstream api_upstream {
        server api:3000;
    }

    upstream frontend_upstream {
        server frontend:3000;
    }

    upstream n8n_upstream {
        server n8n:5678;
    }

    upstream evolution_upstream {
        server evolution-api:8080;
    }

    server {
        listen 80;
        server_name api.kaleem-ai.com app.kaleem-ai.com n8n.kaleem-ai.com evolution.kaleem-ai.com;
        return 301 https://$host$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name api.kaleem-ai.com;

        ssl_certificate     /etc/nginx/ssl/api.kaleem-ai.com.crt;
        ssl_certificate_key /etc/nginx/ssl/api.kaleem-ai.com.key;

        location / {
            proxy_pass http://api_upstream;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }

    server {
        listen 443 ssl http2;
        server_name app.kaleem-ai.com;

        ssl_certificate     /etc/nginx/ssl/app.kaleem-ai.com.crt;
        ssl_certificate_key /etc/nginx/ssl/app.kaleem-ai.com.key;

        location / {
            proxy_pass http://frontend_upstream;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection $connection_upgrade;
        }
    }

    server {
        listen 443 ssl http2;
        server_name n8n.kaleem-ai.com;

        ssl_certificate     /etc/nginx/ssl/n8n.kaleem-ai.com.crt;
        ssl_certificate_key /etc/nginx/ssl/n8n.kaleem-ai.com.key;

        location / {
            proxy_pass http://n8n_upstream;
            proxy_set_header Host $host;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection $connection_upgrade;
        }
    }

    server {
        listen 443 ssl http2;
        server_name evolution.kaleem-ai.com;

        ssl_certificate     /etc/nginx/ssl/evolution.kaleem-ai.com.crt;
        ssl_certificate_key /etc/nginx/ssl/evolution.kaleem-ai.com.key;

        location / {
            proxy_pass http://evolution_upstream;
            proxy_set_header Host $host;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

> ✍️ عدّل أسماء النطاقات ومسارات الشهادات حسب احتياجك. إضافة خدمات أخرى (MinIO مثلًا) تتم بإضافة `upstream` و `server` جديدين.

#### 4.4 تفعيل MinIO عبر `cdn.kaleem-ai.com`

```nginx
  upstream minio_upstream {
      server minio:9000 resolve;
      keepalive 16;
  }

  server {
      listen 443 ssl http2;
      server_name cdn.kaleem-ai.com;

      ssl_certificate     /etc/nginx/ssl/cdn.kaleem-ai.com.crt;
      ssl_certificate_key /etc/nginx/ssl/cdn.kaleem-ai.com.key;

      location / {
          proxy_pass http://minio_upstream;
          proxy_set_header Host $host;
          proxy_set_header X-Real-IP $remote_addr;
          proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
          proxy_set_header X-Forwarded-Proto $scheme;
      }
  }
```

- احتفظ بمنافذ MinIO (`9000` و`9001`) مربوطة على `127.0.0.1` داخل Docker كما هي.
- عند استخدام Cloudflare أو CDN آخر أمام `cdn.kaleem-ai.com`، يكفي ضبط DNS من دون أي تغيير في Docker.
- حدّث `MINIO_PUBLIC_URL` في ملف `.env` إلى `https://cdn.kaleem-ai.com`.

---

## 5️⃣ تحديث `docker-compose.mvp.yml`

تأكد أن خدمة `nginx` تحتوي على الأسطر التالية (موجودة في النسخة الحالية، فقط راجع):

```yaml
  nginx:
    image: nginx:alpine
    container_name: kaleem-nginx
    depends_on:
      - api
      - frontend
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - ./Backend/nginx.lb.conf:/etc/nginx/nginx.conf:ro
      - ./Backend/nginx.ssl:/etc/nginx/ssl:ro
      - nginx_cache:/var/cache/nginx
    restart: unless-stopped
    mem_limit: 128m
    cpus: 0.2
    networks:
      - kaleem-net
```

> ⚠️ إذا عدلت المسارات أو الأسماء، تأكد من تحديثها في كلا المكانين (التكوين وملف Nginx).

---

## 6️⃣ تشغيل الخدمات والتحقق

1. اتصل بالـ VPS:

   ```bash
   ssh root@72.61.5.166
   ```

2. انتقل إلى مجلد المشروع وشغّل الحاويات:

   ```bash
   cd /root/Kleeem-MVP
   docker compose -f docker-compose.mvp.yml up -d nginx
   ```

   (سيعيد تشغيل Nginx فقط. لتشغيل المجموعة كاملة استخدم `up -d` بدون تسمية خدمة.)

3. تحقق من حالة الحاويات:

   ```bash
   docker compose ps
   ```

4. راقب سجلات Nginx:

   ```bash
   docker logs -f kaleem-nginx
   ```

   ابحث عن سطور تشير إلى أن Nginx بدأ دون أخطاء (`start worker processes`).

---

## 7️⃣ اختبار الوصول عبر المتصفح

1. افتح `https://api.kaleem-ai.com/api/health` وتأكد أنها تعيد استجابة 200.
2. افتح `https://app.kaleem-ai.com` وتأكد من تحميل الواجهة.
3. جرّب `https://n8n.kaleem-ai.com` لتأكيد الوصول إلى لوحة n8n.

> 🔍 استخدم أدوات مثل `https://www.ssllabs.com/ssltest/` للتأكد من صحة الشهادات وتثبيت السلسلة (Chain).

---

## 8️⃣ إعدادات أمان إضافية

- تأكد من تفعيل UFW:

  ```bash
  ufw allow 22/tcp
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw enable
  ```

- حدّث النظام:

  ```bash
  apt update && apt upgrade -y
  ```

- اجعل خامة Docker محدّثة: `docker system prune -f` دوريًا.
- راقب الاستهلاك: `docker stats`, `htop`.

---

## 9️⃣ استكشاف الأخطاء

| المشكلة | السبب المحتمل | الحل |
|---------|---------------|------|
| `502 Bad Gateway` | الخدمة الخلفية غير شغالة أو المنفذ غير صحيح | تأكد من `docker compose ps` ومن أن `proxy_pass` يشير للمنفذ الصحيح |
| `ERR_SSL_PROTOCOL_ERROR` | شهادة غير صحيحة أو المسار خاطئ | تحقق من الملفات داخل `Backend/nginx.ssl` |
| إعادة توجيه اللانهاية (loop) | رأس البروتوكول غير مضبوط | تأكد من `proxy_set_header X-Forwarded-Proto $scheme;` |
| عدم تحميل الواجهة | الـ DNS لم يحدث بعد | تحقق من سجلات DNS أو استخدم `ping app.kaleem-ai.com` |

---

## ✅ قائمة التحقق النهائية

- [ ] تم تحديث سجلات DNS إلى العنوان `72.61.5.166`.
- [ ] تم رفع الشهادات إلى `Backend/nginx.ssl`.
- [ ] تم مراجعة/تعديل `Backend/nginx.lb.conf`.
- [ ] تم تشغيل خدمة `nginx` بنجاح (`docker compose ps`).
- [ ] الروابط `app/api/n8n` تعمل عبر HTTPS.
- [ ] تم تفعيل الجدار الناري (UFW).
- [ ] تم توثيق الخطوات في منصة التوثيق الداخلية (إن وجدت).

---

**آخر تحديث**: نوفمبر 2024  
**إعداد**: فريق البنية التحتية لـ Kleeem  
**للاستفسار**: راسل قناة DevOps أو افتح تذكرة عبر النظام.


