**النسخة:** 1.0  
**التاريخ:** 2025-08-15

منصّة **Kleem** توفّر دردشة ذكية **Omnichannel** للتجّار العرب (واتساب + تيليجرام + ويب شات)، بذكاء **Intent-first** (فهم النيّة قبل اختيار المسار) و**Truth‑Before‑Generation** (لا نرد على أسئلة المنتجات إلا بعد الرجوع لكتالوج حقيقي). تدعم متجرًا مصغّرًا (Catalog + Chat‑to‑Buy)، تدريب المعرفة من ملفات Word/Excel/PDF وروابط وFAQs، وفهم الصوت/النص داخل الصور (ASR/OCR).

---

## المحتوى
- [المزايا](#المزايا)
- [البنية المختصرة](#البنية-المختصرة)
- [مخطط بسيط](#مخطط-بسيط)
- [تشغيل سريع بـ Docker](#تشغيل-سريع-ب-docker)
- [تشغيل يدوي (بدون Docker)](#تشغيل-يدوي-بدون-docker)
- [المتغيرات البيئية (.env)](#المتغيرات-البيئية-env)
- [هيكل المجلدات](#هيكل-المجلدات)
- [n8n / orchestrator](#n8n--orchestrator)
- [اختبارات وجودة](#اختبارات-وجودة)
- [تغذية بيانات أولية (اختياري)](#تغذية-بيانات-أولية-اختياري)
- [أمان مختصر](#أمان-مختصر)
- [أشهر الأعطال وحلولها](#أشهر-الأعطال-وحلولها)
- [المساهمة](#المساهمة)
- [الترخيص](#الترخيص)

---

## المزايا
- **Omnichannel Inbox**: واتساب + تيليجرام + ويب شات من لوحة واحدة (V1)، وخارطة طريق لإنستغرام/فيسبوك.
- **Intent‑first**: لا نبحث في المنتجات إلا إذا فهمنا أن السؤال عنها.
- **Truth‑Before‑Generation**: إجابات المنتجات **ملزَم** أن تمر عبر أداة البحث الدلالي (اسم/سعر/رابط/بدائل).
- **متجر مصغّر**: كتالوج خفيف + زر **Chat‑to‑Buy** يفتح المحادثة مع تمرير سياق المنتج وتسجيل **نية الشراء**.
- **معرفة وتدريب**: رفع Word/Excel/PDF وروابط وFAQs؛ فهرسة وبحث دلالي.
- **وسائط**: ASR (تحويل صوت لنص) + OCR (نص داخل الصور) + قراءة محتوى الملفات.
- **ذاكرة المحادثة (V1)**: استرجاع آخر **10** محادثات لكل عميل؛ تطويرها لملف عميل كامل في V2.
- **تحليلات**: زمن الاستجابة، الأسئلة المتكررة، التقييمات، الأسئلة غير المجابة (missing_response).

---

## البنية المختصرة
- **Frontend**: React + Vite + MUI (لوحة التاجر + ودجت الويب شات + متجر مصغّر).
- **Backend API**: NestJS/TypeScript (Auth/RBAC، Conversations، Products، Knowledge، Storefront، Integrations).
- **Orchestrator (n8n)**: فهم النيّة، Tool‑gating، Quality Gate، Analytics Hook.
- **Datastores**: MongoDB (المعاملات)، Qdrant (المتجهات)، MinIO (ملفات)، Redis (كاش)، RabbitMQ (رسائل).

منافذ افتراضية شائعة:  
API: `3000` — Frontend: `5173` — n8n: `5678` — Mongo: `27017` — Redis: `6379` — RabbitMQ: `5672/15672` — Qdrant: `6333` — MinIO: `9000/9001`

---

## مخطط بسيط
> (Mermaid للتصوّر السريع — اختياري)

```mermaid
flowchart LR
  A[Client: WhatsApp/Telegram/WebChat] -->|Message| B(API: NestJS)
  B -->|Intent Router| C[n8n Orchestrator]
  C -->|Product intent| D[searchProducts]
  C -->|Knowledge intent| E[searchKnowledge]
  D --> Q[(Qdrant)]
  E --> M[MongoDB Knowledge]
  B --> R[(Redis)]
  B --> O[(MinIO)]
  B --> X[(MongoDB)]
  B --> AMQ[(RabbitMQ)]
  B <--> FE[Frontend Admin/Widget]
  FE -->|Embed| A
```

---

## تشغيل سريع بـ Docker

> **ملاحظة:** تأكد أن ملفات `.env` موجودة ومضبوطة (راجع القسم التالي).

```bash
# بناء وتشغيل
docker compose up -d --build

# متابعة السجلات (خدمة معيّنة)
docker compose logs -f api
```

الوصول:
- **Backend API**: http://localhost:3000  
- **Frontend Admin**: http://localhost:5173  
- **n8n**: http://localhost:5678  
- **Qdrant**: http://localhost:6333  
- **MinIO Console**: http://localhost:9001

> إن لم تُطابق هذه المنافذ بيئتك، راجع `docker-compose.yml` أو استخدم `docker-compose.override.yml`.

---

## تشغيل يدوي (بدون Docker)

### المتطلبات
- Node.js 20 LTS، pnpm 9+ (أو yarn/npm)، Python 3.10+ (لخدمات الاستخراج)، Git
- MongoDB 6+، Redis 7+، Qdrant 1.8+، MinIO أو S3 متوافق، RabbitMQ 3.12+

### Backend
```bash
cd backend
pnpm install
cp .env.example .env
pnpm start:dev
```

### Frontend
```bash
cd frontend
pnpm install
cp .env.example .env
pnpm dev
```

### n8n
- شغّل n8n على `http://localhost:5678`
- استورد ملف الـ workflow
- اضبط الاعتمادات وقيم البيئة (روابط الـ API، أسرار التوقيع، …إلخ)

---

## المتغيرات البيئية (.env)

> **لا تُرفَع ملفات `.env` للمستودع**. استخدم نسخة `.env.example` كمرجع فقط.

أمثلة رئيسية (بدون أسرار):

```dotenv
# Core
NODE_ENV=development
PORT=3000

# Mongo / Redis / RabbitMQ
MONGODB_URI=mongodb://admin:CHANGE_ME@mongo:27017/kleem?authSource=admin
REDIS_URL=redis://redis:6379
# استخدم vhost واحد متسق (مثلاً /kleem)
AMQP_VHOST=/kleem
RABBIT_URL=amqp://kleem:CHANGE_ME@rabbitmq:5672/kleem

# Vectors / Files
QDRANT_URL=http://qdrant:6333
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_ACCESS_KEY=CHANGE_ME
MINIO_SECRET_KEY=CHANGE_ME
MINIO_USE_SSL=false
MINIO_BUCKET=kleem-files

# Auth / JWT (RS256 مُستحسن)
JWT_ALGO=RS256
JWT_PRIVATE_KEY_PATH=./secrets/jwtRS256.key
JWT_PUBLIC_KEY_PATH=./secrets/jwtRS256.key.pub
ACCESS_TOKEN_TTL=1800
REFRESH_TOKEN_TTL=2592000

# Channels / Integrations
TELEGRAM_BOT_TOKEN=CHANGE_ME
WHATSAPP_API_BASE=https://graph.facebook.com/v19.0
WHATSAPP_WEBHOOK_SECRET=CHANGE_ME

# Salla / Zid / Shopify / WooCommerce (صحّح المسارات لكل مزوّد)
SALLA_CLIENT_ID=CHANGE_ME
SALLA_CLIENT_SECRET=CHANGE_ME
SALLA_REDIRECT_URI=https://YOUR_DOMAIN/api/auth/salla/callback
SALLA_WEBHOOK_URL=https://YOUR_DOMAIN/api/auth/salla/webhook
ZID_CLIENT_ID=CHANGE_ME
ZID_CLIENT_SECRET=CHANGE_ME
ZID_REDIRECT_URI=https://YOUR_DOMAIN/api/auth/zid/callback
ZID_WEBHOOK_URL=https://YOUR_DOMAIN/api/auth/zid/webhook

# Orchestrator / AI
N8N_BASE=http://n8n:5678
N8N_INCOMING_PATH=/webhook/ai-agent
N8N_SIGNING_SECRET=CHANGE_ME
EMBEDDING_SERVICE_URL=http://embed:8000
EXTRACTOR_URL=http://extractor:8001

# Public URLs / CORS
API_PUBLIC_URL=http://localhost:3000
WEB_BASE_URL=http://localhost:5173
FRONTEND_ORIGIN=http://localhost:5173
```

**توليد مفاتيح JWT (RS256):**
```bash
mkdir -p backend/secrets
openssl genrsa -out backend/secrets/jwtRS256.key 2048
openssl rsa -in backend/secrets/jwtRS256.key -pubout -out backend/secrets/jwtRS256.key.pub
```

---

## هيكل المجلدات
```
root/
├─ backend/                # NestJS API (auth, conversations, products, knowledge, storefront, integrations, analytics)
│  ├─ src/
│  ├─ test/
│  └─ README.md
├─ frontend/               # React + Vite + MUI (admin + widget + micro storefront)
│  └─ README.md
├─ n8n/                    # workflows / credentials (محليًا فقط)
├─ docs/                   # وثائق (SRS/Architecture/Security/…)
└─ docker-compose.yml
```

**تضمين الودجت في متجر خارجي (مثال):**
```html
<script defer src="https://cdn.kleem.dev/widget.js"
        data-kleem-merchant="MERCHANT_ID"
        data-primary-color="#FF8500"
        data-language="ar"></script>
```

---

## n8n / orchestrator
- **Intent‑first Router**: يوجّه السؤال إلى مسار المنتجات أو المعرفة أو التصعيد.
- **Tool‑gating للمنتجات**: يمنع إرسال رد منتج بدون استدعاء أداة البحث الدلالي بنجاح.
- **Quality Gate**: يلتقط الردود غير الكافية ويضيفها لقائمة **الأسئلة غير المجابة** للمراجعة.
- **Analytics Hook**: يرسل أحداث (سؤال/رد/قناة/زمن/تقييم) للتحليلات.

---

## اختبارات وجودة
```bash
# Backend
pnpm test           # وحدات
pnpm test:cov       # تغطية
pnpm test:e2e       # تكامل
pnpm lint && pnpm format && pnpm typecheck
```

---

## تغذية بيانات أولية (اختياري)
- فعّل العلم `ALLOW_SEED=true` مؤقتًا ثم استدعِ سكربت البذور أو endpoint مخصص
  لإنشاء أدمن (مثلاً `admin@kaleem.com`). **أعد تعطيله** بعد الاستخدام.

---

## أمان مختصر
- **لا تضع أسرارًا في المستودع**؛ استخدم Vault/Secret Manager إن أمكن.
- **توقيع Webhook + طابع زمني** + **Idempotency‑Key** على العمليات الحساسة.
- **CSP/CSRF/XSS**: تفعيل حماية الواجهة (Helmet، تنظيف HTML، SameSite).
- فحص الملفات (AV) للملفات المرفوعة، وأنواع/أحجام **Allow‑list** فقط.
- تدوير دوري للأسرار والمفاتيح، وتحديد معدلات (Rate‑limits) لكل قناة/مستخدم/تاجر.

---

## أشهر الأعطال وحلولها

**1) `getaddrinfo ENOTFOUND api.kaleem-ai`**  
استخدم **اسم خدمة Docker** بدل الدومين داخل الشبكة (مثل `api`) أو فعّل DNS/hosts بشكل صحيح. تأكد من `API_PUBLIC_URL` و `N8N_BASE` ضمن نفس الشبكة/المجال.

**2) RabbitMQ vhost mismatch**  
وحّد `RABBIT_URL` و`AMQP_VHOST` (مثال كلاهما على `/kleem`)؛ وأنشئ الـ vhost في RabbitMQ وامنح صلاحيات المستخدم عليه.

**3) Mongo credentials mismatch**  
تأكد أن `MONGODB_URI` يطابق اسم المستخدم/كلمة المرور المعرّفة لمحرك Mongo (init أو Secrets).

**4) مزوّدي المتاجر (Salla/Zid)**  
صحّح `*_REDIRECT_URI` و `*_WEBHOOK_URL` لكل مزوّد (لا تخلط المسارات بينهما).

**5) عناوين IP صلبة**  
استبدلها بأسماء خدمات Docker (`mongo`, `redis`, `qdrant`, `minio`, `rabbitmq`, `n8n`) أو دومينات رسمية.

---

## المساهمة
- **Conventional Commits**:  
  `feat: add omnichannel inbox`  
  `fix(auth): handle token rotation`  
  `chore(deps): update qdrant client`
- قبل أي PR: **lint/format/typecheck/tests**، مع لقطات للشاشة لتغييرات الواجهة.

---

## الترخيص
© Kleem. جميع الحقوق محفوظة. (أدرج رخصة مناسبة لاحقًا إن لزم.)
#   K l e e e m - M V P 
 
 