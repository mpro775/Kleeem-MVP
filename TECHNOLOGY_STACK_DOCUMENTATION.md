# وثيقة التقنيات المستخدمة في مشروع Kaleem
## دليل شامل للتقنيات والأدوات والتعلم

**الإصدار:** 2.0
**التاريخ:** سبتمبر 2025
**المشروع:** منصة Kaleem - دردشة ذكية متعددة القنوات للتجار العرب

### آخر التحديثات (v2.0):
- ✅ **Kubernetes Support**: نشر سحابي كامل
- ✅ **Internationalization (i18n)**: دعم كامل للعربية والإنجليزية
- ✅ **Runbooks**: دليل تشغيل شامل للصيانة والحلول
- ✅ **Business Metrics**: مقاييس أعمال متقدمة
- ✅ **Security Hardening**: حماية CSRF والأمان المعزز
- ✅ **Development Tools**: Mailpit وأدوات تطوير محسّنة

---

## 📋 المحتوى

1. [نظرة عامة على المشروع](#نظرة-عامة-على-المشروع)
2. [البنية المعمارية](#البنية-المعمارية)
   - [Kubernetes Deployment (جديد v2.0)](#kubernetes-deployment-جديد-v20)
3. [🌍 التدويل واللغات (جديد v2.0)](#-التدويل-واللغات-جديد-v20)
4. [تقنيات Backend](#تقنيات-backend)
5. [تقنيات Frontend](#تقنيات-frontend)
6. [خدمات الذكاء الاصطناعي](#خدمات-الذكاء-الاصطناعي)
7. [قواعد البيانات والتخزين](#قواعد-البيانات-والتخزين)
8. [📊 أدوات المراقبة والمشاهدة](#-أدوات-المراقبة-والمشاهدة)
9. [📋 Runbooks ودليل التشغيل (جديد v2.0)](#-runbooks-ودليل-التشغيل-جديد-v20)
10. [🔄 أدوات DevOps و CI/CD](#-أدوات-devops-و-cicd)
11. [🧪 أدوات الاختبار](#-أدوات-الاختبار)
12. [🔒 أدوات الأمان](#-أدوات-الأمان)
13. [🛠️ أدوات التطوير](#-أدوات-التطوير)
14. [📚 مكتبات ومكونات إضافية](#-مكتبات-ومكونات-إضافية)
15. [🎓 خطة التعلم والتطوير](#-خطة-التعلم-والتطوير)

---

## 🎯 نظرة عامة على المشروع

**Kaleem** هو منصة دردشة ذكية متعددة القنوات (Omnichannel) مصممة للتجار العرب، تدعم:

- **القنوات**: WhatsApp + Telegram + Web Chat
- **الذكاء**: Intent-first + Truth-Before-Generation
- **التجارة**: متجر مصغر + Chat-to-Buy
- **المعرفة**: تدريب من ملفات متعددة الأنواع
- **الوسائط**: ASR (تحويل صوت لنص) + OCR (نص داخل الصور)

### المميزات الرئيسية:
- دردشة ذكية باللغة العربية
- فهم النية قبل البحث
- متجر إلكتروني مصغر
- دعم ملفات Word/Excel/PDF وروابط
- تحليلات شاملة وتقارير

---

## 🏗️ البنية المعمارية

### نمط المعمارية: **Microservices + Orchestrator**

```
┌─────────────────────────────────────────────────────────────┐
│                    User Channels                           │
│  WhatsApp • Telegram • Web Chat • Instagram (Future)       │
└─────────────────────┬───────────────────────────────────────┘
                      │
           ┌──────────▼──────────┐
           │   API Gateway       │
           │   (NestJS)          │
           └─────────┬───────────┘
                     │
          ┌──────────▼──────────┐
          │   Orchestrator      │
          │   (n8n)             │
          │                     │
          │ • Intent Router     │
          │ • Tool Gating       │
          │ • Quality Gate      │
          │ • Analytics Hook    │
          └─────────┬───────────┘
                    │
        ┌───────────▼───────────┐
        │   AI Services         │
        │                       │
        │ • Embedding Service   │
        │ • Extractor Service   │
        │ • AI Reply Workers    │
        └───────────┬───────────┘
                    │
        ┌───────────▼───────────┐
        │   Data Stores         │
        │                       │
        │ • MongoDB (Primary)   │
        │ • Redis (Cache)       │
        │ • Qdrant (Vectors)    │
        │ • MinIO (Files)       │
        │ • RabbitMQ (Queue)    │
        └───────────────────────┘
```

### **Kubernetes Deployment (جديد v2.0)**
```
┌─────────────────────────────────────────────────────────────┐
│                    Kubernetes Cluster                       │
├─────────────────┬─────────────────┬─────────────────────────┤
│   Ingress       │   Services      │    Deployments          │
│   (NGINX)       │   (Load Bal.)   │    (API + Workers)      │
├─────────────────┼─────────────────┼─────────────────────────┤
│   ConfigMaps    │   Secrets       │    HPA (Auto Scaling)   │
│   (Config)      │   (Credentials) │    (CPU/Memory)         │
└─────────────────┴─────────────────┴─────────────────────────┘
```

**المكونات:**
- **Deployments**: إدارة الـ pods والتحديثات المتداولة
- **Services**: موازنة التحميل والتوجيه
- **Ingress**: إدارة الدخول الخارجي
- **HPA**: توسع تلقائي حسب الاستخدام
- **ConfigMaps/Secrets**: إدارة التكوين والأسرار

---

## 🌍 التدويل واللغات (جديد v2.0)

### **NestJS i18n**
```typescript
// مثال على استخدام التدويل
@Injectable()
export class AuthService {
  constructor(private readonly i18n: I18nService) {}

  async login(user: LoginDto) {
    // رسالة مترجمة
    const message = this.i18n.t('auth.login.success', {
      lang: user.preferredLanguage || 'ar'
    });
    return { message, user };
  }
}
```

**المميزات:**
- **دعم كامل للعربية**: RTL وترجمة شاملة
- **17 ملف ترجمة**: لجميع وحدات النظام
- **Fallback**: الإنجليزية كلغة احتياطية
- **Context-aware**: ترجمة حسب السياق

**هيكل ملفات الترجمة:**
```
src/i18n/
├── ar/           # اللغة العربية
│   ├── auth.json
│   ├── products.json
│   ├── errors.json
│   └── ...
└── en/           # اللغة الإنجليزية
    ├── auth.json
    ├── products.json
    ├── errors.json
    └── ...
```

### **RTL Support**
```json
// مثال على ترجمة عربية
{
  "auth": {
    "login": {
      "success": "تم تسجيل الدخول بنجاح",
      "failed": "فشل في تسجيل الدخول"
    }
  },
  "products": {
    "not_found": "المنتج غير موجود",
    "out_of_stock": "المنتج غير متوفر في المخزون"
  }
}
```

---

## 🚀 تقنيات Backend

### **Framework الأساسي: NestJS**
```typescript
// مثال على controller في NestJS
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  async findAll(@Query() query: PaginationDto) {
    return this.conversationsService.findAll(query);
  }
}
```

**لماذا NestJS؟**
- بنية منظمة ومهيكلة (Modules, Controllers, Services)
- دعم TypeScript كامل
- Dependency Injection مدمج
- Middleware و Guards للأمان
- WebSocket دعم مدمج
- CLI قوي للتوليد التلقائي

**المكونات الأساسية:**
- **Controllers**: معالجة الطلبات HTTP/WebSocket
- **Services**: منطق العمل (Business Logic)
- **Modules**: تنظيم الكود والتبعيات
- **Guards**: المصادقة والإذن
- **Interceptors**: معالجة الاستجابات والأخطاء
- **Decorators**: للتحقق من البيانات والتوثيق

### **المكتبات الجديدة (v2.0):**
- **nestjs-i18n**: دعم التدويل واللغات المتعددة
- **@nestjs-modules/ioredis**: عميل Redis محسّن
- **csurf**: حماية متقدمة من CSRF
- **cookie-parser**: معالجة ملفات تعريف الارتباط
- **lint-staged**: تنفيذ ESLint على الملفات المُعدّلة فقط
- **husky**: Git hooks للتحقق من الكود قبل الارتكاب

### **Node.js Runtime**
- **الإصدار**: Node.js 20 LTS
- **Package Manager**: pnpm 9+ (أسرع من npm)
- **TypeScript**: 5.8.3 للكتابة الثابتة

### **قاعدة البيانات الأساسية: MongoDB**
```javascript
// مثال على schema في Mongoose
@Schema({ timestamps: true })
export class Product {
  @Prop({ required: true, index: true })
  name: string;

  @Prop({ type: [String] })
  categories: string[];

  @Prop({ type: Object })
  metadata: Record<string, any>;
}
```

**المميزات:**
- **Mongoose ODM**: للتعامل مع MongoDB
- **Connection Pooling**: 20 max, 5 min
- **Indexes**: مركبة ونصية محسّنة
- **Replica Set**: للإنتاج

### **Cache System: Redis**
```typescript
// مثال على استخدام Redis في NestJS
@Injectable()
export class CacheService {
  constructor(private readonly redis: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }
}
```

**المستويات:**
- **L1 Cache**: ذاكرة سريعة (in-memory)
- **L2 Cache**: Redis مشترك
- **Cache Warming**: تلقائي كل 15 دقيقة

### **Message Queue: RabbitMQ**
- **Protocol**: AMQP 0-9-1
- **Virtual Hosts**: لعزل البيئات
- **Workers**: معالجة المهام الخلفية
- **Monitoring**: عبر Management Plugin

### **File Storage: MinIO**
- **S3 Compatible**: API متوافق مع AWS S3
- **Buckets**: تنظيم الملفات
- **Security**: تشفير البيانات
- **CDN Ready**: للتوزيع السريع

### **Vector Database: Qdrant**
```typescript
// مثال على البحث الدلالي
const searchResult = await qdrant.search('products', {
  vector: embedding,
  limit: 10,
  filter: {
    must: [
      { key: 'merchantId', match: { value: merchantId } },
      { key: 'inStock', match: { value: true } }
    ]
  }
});
```

**الاستخدامات:**
- تخزين embeddings للمنتجات
- بحث دلالي سريع
- فلترة متقدمة
- metadata غني

---

## 🎨 تقنيات Frontend

### **Framework الأساسي: React 19**
```tsx
// مثال على component في React
function ConversationList({ conversations }: Props) {
  return (
    <List>
      {conversations.map((conv) => (
        <ConversationItem key={conv.id} conversation={conv} />
      ))}
    </List>
  );
}
```

**المميزات:**
- **React 19**: أحدث إصدار مع تحسينات الأداء
- **TypeScript**: كتابة ثابتة للـ props والـ state
- **Functional Components**: مع Hooks
- **Concurrent Features**: لتجربة مستخدم أفضل

### **Build Tool: Vite**
```typescript
// vite.config.ts
export default defineConfig({
  plugins: [
    react(),
    viteCompression({ algorithm: 'gzip' }),
    visualizer({ filename: 'dist/stats.html' })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          mui: ['@mui/material', '@emotion/react']
        }
      }
    }
  }
});
```

**لماذا Vite؟**
- **Fast HMR**: Hot Module Replacement سريع
- **ES Modules**: دعم أصلي للـ modules
- **Build Optimization**: تقسيم تلقائي للحزم
- **Plugin System**: مرن وقابل للتوسع

### **UI Framework: Material-UI (MUI)**
```tsx
// مثال على استخدام MUI
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { DataGrid } from '@mui/x-data-grid';

function ProductsTable({ products }) {
  return (
    <DataGrid
      rows={products}
      columns={columns}
      paginationModel={paginationModel}
      onPaginationModelChange={setPaginationModel}
    />
  );
}
```

**المكونات المستخدمة:**
- **@mui/material**: المكونات الأساسية
- **@mui/icons-material**: أيقونات Material Design
- **@mui/x-data-grid**: جداول متقدمة
- **@mui/lab**: مكونات تجريبية مفيدة
- **@emotion/react**: للـ styling

### **State Management: TanStack Query**
```tsx
// مثال على استخدام React Query
function useProducts() {
  return useQuery({
    queryKey: ['products', filters],
    queryFn: () => api.getProducts(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

**لماذا TanStack Query؟**
- **Server State**: إدارة البيانات من الخادم
- **Caching**: تلقائي وذكي
- **Background Updates**: تحديث البيانات في الخلفية
- **Error Handling**: معالجة الأخطاء المتقدمة

### **Routing: React Router DOM v7**
```tsx
// مثال على التوجيه
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/conversations" element={<Conversations />} />
        <Route path="/products" element={<Products />} />
      </Routes>
    </BrowserRouter>
  );
}
```

### **WebSocket Client: Socket.IO**
```tsx
// اتصال بالخادم
const socket = io('ws://localhost:3000', {
  auth: { token: userToken }
});

// استقبال الرسائل
socket.on('message', (message) => {
  setMessages(prev => [...prev, message]);
});
```

---

## 🤖 خدمات الذكاء الاصطناعي

### **Embedding Service (Python + FastAPI)**
```python
# main.py
from fastapi import FastAPI
from sentence_transformers import SentenceTransformer

app = FastAPI()
model = SentenceTransformer('all-MiniLM-L6-v2')

@app.post("/embed")
async def create_embedding(text: str):
    embedding = model.encode(text)
    return {"embedding": embedding.tolist()}
```

**التقنيات:**
- **FastAPI**: Framework سريع للـ APIs
- **Sentence Transformers**: لإنشاء embeddings
- **PyTorch**: محرك التعلم الآلي
- **Uvicorn**: خادم ASGI

### **Extractor Service (Python + FastAPI)**
```python
# استخراج بيانات المنتجات
@app.get("/extract/")
async def extract_product_data(url: str):
    html = fetch_html(url)

    # استخراج البيانات المنظمة
    data = full_extract(url)

    return {
        "name": data.name,
        "price": data.price,
        "description": data.description,
        "images": data.images
    }
```

**المكتبات:**
- **BeautifulSoup4**: لتحليل HTML
- **Requests**: لجلب الصفحات
- **Pandas**: لمعالجة البيانات
- **Tesseract**: للـ OCR
- **Sharp**: لمعالجة الصور

### **AI Integration**
- **OpenAI API**: للدردشة والإجابات
- **Google Generative AI**: كبديل
- **Hugging Face**: للنماذج المحلية

---

## 💾 قواعد البيانات والتخزين

### **MongoDB (Primary Database)**
```javascript
// إعدادات الاتصال
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI, {
  maxPoolSize: 20,
  minPoolSize: 5,
  maxIdleTimeMS: 30000,
  serverSelectionTimeoutMS: 5000,
});
```

**المجاميع المستخدمة:**
- **Users**: المستخدمين والصلاحيات
- **Merchants**: التجار وإعداداتهم
- **Conversations**: المحادثات والرسائل
- **Products**: المنتجات والبيانات
- **Orders**: الطلبات والمعاملات
- **Knowledge**: قاعدة المعرفة
- **Analytics**: البيانات التحليلية

### **Redis (Cache & Sessions)**
```bash
# أنواع البيانات المستخدمة
SET user_sessions:user123 "session_data"
HSET cache:products:123 "product_data"
ZADD leaderboard "score member"
```

**الاستخدامات:**
- **Session Storage**: حفظ جلسات المستخدمين
- **Cache**: تخزين البيانات المؤقتة
- **Rate Limiting**: تحديد معدلات الاستخدام
- **WebSocket Sessions**: إدارة الاتصالات

### **Qdrant (Vector Database)**
```python
# إنشاء collection
client.create_collection(
    collection_name="products",
    vectors_config=VectorParams(
        size=384,  # حجم الـ embedding
        distance=Distance.COSINE
    )
)
```

**المميزات:**
- **High Performance**: بحث سريع في المتجهات
- **Filtering**: بحث مع فلاتر
- **Metadata**: بيانات إضافية غنية
- **REST API**: سهل الاستخدام

### **MinIO (Object Storage)**
```typescript
// رفع الملفات
const minioClient = new Client({
  endPoint: 'minio',
  port: 9000,
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY,
  secretKey: process.env.MINIO_SECRET_KEY,
});

await minioClient.putObject(bucketName, fileName, fileStream);
```

**المميزات:**
- **S3 Compatible**: متوافق مع AWS S3
- **Multi-part Upload**: رفع الملفات الكبيرة
- **Versioning**: إصدارات الملفات
- **Encryption**: تشفير البيانات

---

## 📊 أدوات المراقبة والمشاهدة

### **Prometheus (Metrics Collection)**
```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'api'
    static_configs:
      - targets: ['api:3000']
    metrics_path: '/metrics'
```

**المقاييس المجمعة:**
- **HTTP Metrics**: استجابة الطلبات والأخطاء
- **Database Metrics**: استعلامات قاعدة البيانات
- **Cache Metrics**: معدلات الإصابة والإخفاق
- **System Metrics**: CPU، ذاكرة، قرص

### **Grafana (Visualization)**
```yaml
# لوحة تحكم للأداء
dashboard:
  title: 'API Performance'
  panels:
    - title: 'Response Time'
      type: 'graph'
      targets:
        - expr: 'http_request_duration_seconds{quantile="0.95"}'
```

**لوحات التحكم:**
- **API Performance**: زمن الاستجابة والإنتاجية
- **Database Health**: حالة قاعدة البيانات
- **Cache Analytics**: أداء نظام الكاش
- **System Resources**: موارد النظام
- **Business KPIs**: مقاييس الأعمال (جديد v2.0)

### **Business Metrics (جديد v2.0)**
```typescript
// أمثلة على مقاييس الأعمال
@Injectable()
export class BusinessMetrics {
  private readonly activeUsers = new Gauge({
    name: 'business_active_users_total',
    help: 'عدد المستخدمين النشطين'
  });

  private readonly conversationsStarted = new Counter({
    name: 'business_conversations_started_total',
    help: 'عدد المحادثات المبدأة',
    labelNames: ['channel', 'merchant_id']
  });

  private readonly productsViewed = new Counter({
    name: 'business_products_viewed_total',
    help: 'عدد مرات عرض المنتجات',
    labelNames: ['product_id', 'merchant_id']
  });

  // تسجيل مقياس عند بدء محادثة
  recordConversationStarted(channel: string, merchantId: string) {
    this.conversationsStarted.inc({ channel, merchant_id: merchantId });
  }

  // تحديث عدد المستخدمين النشطين
  updateActiveUsers(count: number) {
    this.activeUsers.set(count);
  }
}
```

**أنواع المقاييس:**
- **User Engagement**: المستخدمون النشطون، المحادثات، التفاعلات
- **Business Performance**: المبيعات، الطلبات، معدل التحويل
- **Channel Analytics**: أداء كل قناة (WhatsApp، Telegram، Web)
- **Product Metrics**: المنتجات الأكثر عرضاً وبيعاً

### **Loki (Log Aggregation)**
```yaml
# loki config
server:
  http_listen_port: 3100

schema_config:
  configs:
    - from: 2020-10-24
      store: boltdb-shipper
      object_store: filesystem
      schema: v11
```

**المميزات:**
- **LogQL**: لغة استعلام قوية
- **Multi-tenancy**: دعم عدة مستأجرين
- **Efficient Storage**: تخزين فعال
- **Grafana Integration**: تكامل مع Grafana

### **Tempo (Distributed Tracing)**
```yaml
# tempo config
server:
  http_listen_port: 3200

distributor:
  receivers:
    otlp:
      protocols:
        grpc:
          endpoint: 0.0.0.0:4317
        http:
          endpoint: 0.0.0.0:4318
```

**الاستخدامات:**
- **Request Tracing**: تتبع الطلبات عبر الخدمات
- **Performance Analysis**: تحليل الأداء
- **Error Correlation**: ربط الأخطاء بالطلبات
- **Service Dependencies**: رسم خرائط التبعيات

### **OpenTelemetry (Instrumentation)**
```typescript
// تتبع الطلبات
const tracer = trace.getTracer('api-service');

app.use((req, res, next) => {
  const span = tracer.startSpan(`HTTP ${req.method} ${req.path}`);
  span.setAttribute('http.method', req.method);
  span.setAttribute('http.url', req.url);

  res.on('finish', () => {
    span.setAttribute('http.status_code', res.statusCode);
    span.end();
  });

  next();
});
```

---

## 🔄 أدوات DevOps و CI/CD

### **Docker & Containerization**
```dockerfile
# Dockerfile متعدد المراحل
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine AS production

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

USER nestjs

EXPOSE 3000
CMD ["node", "dist/main.js"]
```

**المميزات:**
- **Multi-stage Builds**: حجم صغير للإنتاج
- **Non-root User**: أمان أعلى
- **Alpine Linux**: حجم أصغر
- **Health Checks**: فحص الحالة

### **Docker Compose**
```yaml
# docker-compose.yml
version: '3.8'

services:
  api:
    build: .
    ports:
      - '3000:3000'
    depends_on:
      redis:
        condition: service_healthy
      mongo:
        condition: service_healthy
```

**البيئات:**
- **Development**: مع hot reload
- **Production**: محسّن وآمن
- **Testing**: مع قواعد بيانات مؤقتة
- **Override Files**: تخصيص البيئات (جديد v2.0)

### **Kubernetes Deployment (جديد v2.0)**
```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kleem-api
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    spec:
      containers:
        - name: api
          image: kleem/api:1.0.0
          ports:
            - containerPort: 3000
          env:
            - name: NODE_ENV
              value: 'production'
          resources:
            requests:
              cpu: '250m'
              memory: '256Mi'
            limits:
              cpu: '500m'
              memory: '512Mi'
          livenessProbe:
            httpGet:
              path: /api/health/liveness
              port: 3000
```

**المكونات:**
- **Deployments**: إدارة الـ pods والتحديثات
- **Services**: موازنة التحميل
- **Ingress**: إدارة الدخول الخارجي
- **HPA**: توسع تلقائي
- **ConfigMaps/Secrets**: إدارة التكوين

### **Horizontal Pod Autoscaler**
```yaml
# k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: kleem-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: kleem-api
  minReplicas: 3
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

### **GitHub Actions (CI/CD)**
```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm run test:ci
```

**المراحل:**
- **Linting**: فحص الكود
- **Testing**: الاختبارات الآلية
- **Security Scanning**: فحص الثغرات
- **Build**: بناء الصور
- **Deploy**: النشر الآلي

### **Trivy (Security Scanning)**
```bash
# فحص الصور
trivy image --format json --output results.json myapp:latest

# فحص filesystem
trivy fs --format json --output fs-results.json .
```

**أنواع الفحص:**
- **Container Images**: ثغرات في الصور
- **Filesystem**: ملفات التكوين
- **Git Repository**: الكود المصدري

---

## 🧪 أدوات الاختبار

### **Backend Testing (Jest + Testing Library)**
```typescript
// unit test مثال
describe('ProductsService', () => {
  let service: ProductsService;
  let mockRepository: MockedObject<ProductsRepository>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: getRepositoryToken(Product),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  it('should return paginated products', async () => {
    const result = await service.findAll({ limit: 10, cursor: 'abc' });
    expect(result).toBeDefined();
  });
});
```

**أنواع الاختبارات:**
- **Unit Tests**: اختبار الوحدات المعزولة
- **Integration Tests**: اختبار التكامل
- **E2E Tests**: اختبار من البداية للنهاية

### **Frontend Testing (Vitest + Testing Library)**
```tsx
// component test مثال
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductsTable } from './ProductsTable';

test('renders products table', () => {
  const products = [
    { id: 1, name: 'Product 1', price: 100 },
    { id: 2, name: 'Product 2', price: 200 },
  ];

  render(<ProductsTable products={products} />);

  expect(screen.getByText('Product 1')).toBeInTheDocument();
  expect(screen.getByText('Product 2')).toBeInTheDocument();
});
```

**المكتبات:**
- **Vitest**: أداة الاختبار السريعة
- **@testing-library/react**: اختبار المكونات
- **@testing-library/jest-dom**: matchers إضافية
- **msw**: Mock Service Worker للـ APIs

### **E2E Testing (Playwright)**
```typescript
// e2e test مثال
test('user can login and view dashboard', async ({ page }) => {
  await page.goto('http://localhost:5173');

  await page.fill('[data-testid="email"]', 'admin@example.com');
  await page.fill('[data-testid="password"]', 'password');
  await page.click('[data-testid="login-button"]');

  await expect(page).toHaveURL(/.*dashboard/);
  await expect(page.locator('[data-testid="dashboard-title"]')).toBeVisible();
});
```

**المميزات:**
- **Cross-browser**: دعم جميع المتصفحات
- **Mobile Testing**: اختبار الأجهزة المحمولة
- **Visual Testing**: مقارنة الشاشات
- **API Testing**: اختبار الـ APIs

---

## 📋 Runbooks ودليل التشغيل (جديد v2.0)

### **Runbooks Structure**
```
docs/runbooks/
├── README.md                    # دليل التشغيل العام
├── high-latency.md             # مشاكل زمن الاستجابة
├── api-high-error-rate.md      # مشاكل معدل الأخطاء
└── [runbooks إضافية مستقبلاً]
```

### **Runbook Example: High Latency**
```markdown
# High Latency Runbook

## الأعراض
- زمن استجابة API > 500ms (P95)
- شكاوى من بطء النظام
- تنبيهات من Prometheus

## التشخيص السريع
1. فحص مقاييس Prometheus
2. مراجعة سجلات Loki
3. فحص أداء قاعدة البيانات

## خطوات الحل
1. تحديد المسارات البطيئة
2. فحص استخدام الموارد
3. تحسين الاستعلامات أو الكاش
4. توسع النظام إذا لزم الأمر
```

**الاستخدامات:**
- **Incident Response**: استجابة سريعة للأعطال
- **Problem Solving**: حل المشاكل المعقدة
- **Knowledge Base**: نقل المعرفة للفريق
- **Automation**: أساس للأتمتة المستقبلية

### **Monitoring Integration**
```yaml
# مثال على تنبيه مع runbook
alerts:
  - alert: HighLatency
    annotations:
      summary: "ارتفاع زمن الاستجابة"
      runbook_url: "https://kb.kaleem-ai.com/runbooks/high-latency"
```

---

## 🔒 أدوات الأمان

### **Authentication & Authorization**
```typescript
// JWT Strategy
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_PUBLIC_KEY,
    });
  }

  async validate(payload: any) {
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
```

**المكونات:**
- **Passport.js**: للمصادقة
- **JWT**: JSON Web Tokens
- **bcrypt**: تشفير كلمات المرور
- **RBAC**: Role-Based Access Control

### **Security Middleware**
```typescript
// Helmet configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));
```

**الحماية:**
- **Helmet**: HTTP headers الأمان
- **CORS**: Cross-Origin Resource Sharing
- **Rate Limiting**: تحديد معدلات الاستخدام
- **CSRF Protection**: حماية متقدمة من CSRF (جديد v2.0)
- **Security Hardening**: patches أمنية محسّنة

### **CSRF Protection (جديد v2.0)**
```typescript
// تطبيق حماية CSRF
import * as csurf from 'csurf';

app.use(csurf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }
}));

// التحقق من CSRF token في المسارات الحساسة
@Post('sensitive-endpoint')
async updateData(@Body() data: any, @Req() req: Request) {
  // التحقق من CSRF token
  if (!req.csrfToken) {
    throw new ForbiddenException('CSRF token missing');
  }
  // منطق التحديث...
}
```

### **Data Protection**
```typescript
// Data redaction في اللوجات
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    // إزالة البيانات الحساسة
    const sanitizedBody = this.redactSensitiveData(request.body);

    this.logger.log(`Request: ${request.method} ${request.url}`, sanitizedBody);

    return next.handle();
  }

  private redactSensitiveData(data: any): any {
    // منطق إزالة البيانات الحساسة
  }
}
```

---

## 🛠️ أدوات التطوير

### **TypeScript Configuration**
```json
// tsconfig.json
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2020",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": false
  }
}
```

### **ESLint + Prettier**
```javascript
// eslint.config.mjs
export default [
  {
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];
```

### **Pre-commit Hooks (Husky)**
```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "commit-msg": "commitlint -E HUSKY_GIT_PARAMS"
    }
  },
  "lint-staged": {
    "*.ts": [
      "eslint --fix",
      "prettier --write"
    ]
  }
}
```

### **Mailpit (SMTP Testing - جديد v2.0)**
```yaml
# docker-compose.override.yml
mailpit:
  image: axllent/mailpit:latest
  container_name: kaleem-mailpit
  ports:
    - '127.0.0.1:1025:1025' # SMTP
    - '127.0.0.1:8025:8025' # UI
  networks: [kaleem-net]
  restart: unless-stopped
```

**المميزات:**
- **SMTP Server وهمي**: لاختبار البريد الإلكتروني
- **Web UI**: واجهة ويب لعرض الرسائل المرسلة
- **No External Dependencies**: لا يحتاج اتصال خارجي
- **Development Only**: للبيئة التطوير فقط

**الاستخدام:**
```typescript
// إعدادات البريد للتطوير
{
  host: process.env.MAIL_HOST || 'mailpit',
  port: process.env.MAIL_PORT || 1025,
  secure: false, // لا تشفير للتطوير
}
```

**الوصول:** http://localhost:8025

### **VS Code Extensions**
- **TypeScript Importer**: استيراد تلقائي
- **Auto Rename Tag**: إعادة تسمية العناصر
- **Bracket Pair Colorizer**: تلوين الأقواس
- **GitLens**: معلومات Git مفصلة

---

## 📚 مكتبات ومكونات إضافية

### **HTTP Clients & APIs**
- **Axios**: للطلبات HTTP
- **Socket.IO Client**: للاتصالات المباشرة
- **OpenAI SDK**: للذكاء الاصطناعي
- **Google Generative AI**: نماذج Google

### **Data Processing**
- **Cheerio**: تحليل HTML
- **PapaParse**: معالجة CSV
- **Sharp**: معالجة الصور
- **Tesseract.js**: OCR للنصوص في الصور
- **Mammoth**: قراءة ملفات Word
- **xlsx**: معالجة ملفات Excel

### **Utilities**
- **Lodash**: دوال مساعدة
- **Day.js**: معالجة التواريخ
- **UUID**: إنشاء معرفات فريدة
- **Slugify**: تحويل النصوص لـ slugs
- **Class Validator**: التحقق من البيانات
- **Class Transformer**: تحويل الكائنات

### **Development Tools**
- **Nodemon**: إعادة تشغيل تلقائية
- **Ts-node**: تشغيل TypeScript مباشرة
- **Swagger**: توثيق الـ APIs
- **Compodoc**: توثيق الكود

---

## 🎓 خطة التعلم والتطوير

### **المستوى المبتدئ (1-3 أشهر)**

#### **أساسيات الويب**
1. **HTML/CSS/JavaScript**: أساسيات الويب
2. **Node.js**: Runtime البيئة
3. **npm/pnpm**: إدارة الحزم
4. **Git**: نظام التحكم في الإصدارات

#### **Backend مع NestJS**
1. **TypeScript**: الكتابة الثابتة
2. **NestJS Fundamentals**: Controllers, Services, Modules
3. **MongoDB**: قواعد البيانات غير المنظمة
4. **Mongoose**: ODM لـ MongoDB
5. **JWT Authentication**: المصادقة والإذن

#### **Frontend مع React**
1. **React Fundamentals**: Components, Props, State
2. **Hooks**: useState, useEffect, useContext
3. **React Router**: التنقل في التطبيق
4. **Axios**: الاتصال بالخادم

### **المستوى المتوسط (3-6 أشهر)**

#### **تقنيات متقدمة**
1. **Docker**: الحاويات والنشر
2. **Redis**: الكاش والجلسات
3. **WebSocket**: الاتصالات المباشرة
4. **Material-UI**: مكونات واجهة المستخدم

#### **الذكاء الاصطناعي**
1. **Python**: لغة البرمجة للذكاء الاصطناعي
2. **FastAPI**: APIs سريعة
3. **Sentence Transformers**: إنشاء embeddings
4. **Vector Databases**: Qdrant

#### **DevOps و النشر**
1. **CI/CD**: GitHub Actions
2. **Monitoring**: Prometheus, Grafana
3. **Security**: أفضل الممارسات
4. **Performance**: تحسين الأداء

### **المستوى المتقدم (6+ أشهر)**

#### **المعمارية والتصميم**
1. **Microservices**: بنية الخدمات الصغيرة
2. **Event-Driven Architecture**: البرمجة بالأحداث
3. **CQRS**: فصل القراءة عن الكتابة
4. **Domain-Driven Design**: تصميم يعتمد على المجال

#### **الأداء والقياس**
1. **Distributed Tracing**: Tempo, OpenTelemetry
2. **Load Balancing**: توزيع الحمل
3. **Database Optimization**: فهارس واستعلامات
4. **Caching Strategies**: استراتيجيات الكاش

#### **الأمان المتقدم**
1. **OAuth 2.0 / OpenID Connect**: مصادقة متقدمة
2. **API Security**: حماية الـ APIs
3. **Data Encryption**: تشفير البيانات
4. **Compliance**: الامتثال للمعايير

### **المصادر التعليمية الموصى بها**

#### **الكتب**
- **"Clean Code"** by Robert C. Martin
- **"The Clean Coder"** by Robert C. Martin
- **"Designing Data-Intensive Applications"** by Martin Kleppmann
- **"Node.js Design Patterns"** by Mario Casciaro

#### **الدورات عبر الإنترنت**
- **NestJS Course** على Udemy
- **React - The Complete Guide** على Udemy
- **Docker & Kubernetes** على Udemy
- **System Design** على Grokking

#### **المجتمعات**
- **NestJS Discord**: للدعم الفني
- **Reactiflux Discord**: لـ React
- **MongoDB Community**: لقاعدة البيانات
- **DevOps Communities**: للنشر والمراقبة

#### **الممارسة العملية**
- **LeetCode**: حل المشكلات البرمجية
- **Exercism**: تحسين المهارات
- **Contribute to Open Source**: المساهمة في المشاريع المفتوحة
- **Build Personal Projects**: بناء مشاريع شخصية

---

## 📞 الدعم والمساعدة

### **فريق التطوير**
- **Backend Team**: متخصصون في NestJS و Node.js
- **Frontend Team**: متخصصون في React و TypeScript
- **AI Team**: متخصصون في Python و Machine Learning
- **DevOps Team**: متخصصون في Docker و Kubernetes

### **قنوات التواصل**
- **Slack**: للتواصل اليومي
- **GitHub Issues**: للتقارير والطلبات
- **Confluence**: لوثائق المشروع
- **Jira**: لإدارة المهام

### **أفضل الممارسات**
- **Code Reviews**: مراجعة الكود قبل الدمج
- **Documentation**: توثيق الكود والتغييرات
- **Testing**: كتابة الاختبارات للكود الجديد
- **Security**: فحص الثغرات الأمنية

---

**هذه الوثيقة (الإصدار 2.0) تغطي جميع التقنيات والأدوات المستخدمة في مشروع Kaleem مع التحديثات الأخيرة بما في ذلك Kubernetes، التدويل، Runbooks، والمقاييس التجارية. تأكد من مراجعة الوثائق الرسمية لكل تقنية للحصول على معلومات أكثر تفصيلاً.**
