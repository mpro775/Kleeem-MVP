# إعداد البنية التحتية - Kaleem API

## 🚀 البدء السريع

### 1. متطلبات النظام

```bash
# Node.js 20+
node --version

# Docker & Docker Compose
docker --version
docker compose version

# Git
git --version
```

### 2. إعداد البيئة

```bash
# استنساخ المشروع
git clone <repository-url>
cd kaleem-backend

# إعداد متغيرات البيئة
cp .env.example .env.production
# حرر .env.production بالقيم الصحيحة

# تثبيت التبعيات
npm install
```

### 3. تشغيل محلي للتطوير

```bash
# تشغيل الخدمات المساعدة
docker compose up -d redis mongo rabbitmq

# تشغيل التطبيق
npm run start:dev
```

### 4. تشغيل الإنتاج

```bash
# بناء ونشر
docker compose -f docker-compose.prod.yml up -d

# فحص الحالة
curl http://localhost:3000/api/health
```

---

## 📊 المراقبة

### الوصول للخدمات:

- **API**: http://localhost:3000
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001
- **API Docs**: http://localhost:3000/api/docs

### فحص الصحة:

```bash
# فحص أساسي
curl http://localhost:3000/api/health

# فحص مفصل
curl http://localhost:3000/api/health/detailed

# مقاييس Prometheus
curl http://localhost:3000/metrics
```

---

## 🔧 إدارة الكاش

### عبر API:

```bash
# إحصائيات الكاش
curl http://localhost:3000/admin/cache/stats

# تسخين الكاش
curl -X POST http://localhost:3000/admin/cache/warm

# مسح الكاش
curl -X DELETE http://localhost:3000/admin/cache/clear
```

---

## 🚀 النشر

### GitHub Actions:

1. Push إلى main branch
2. تشغيل تلقائي للـ CI/CD
3. موافقة يدوية للنشر
4. نشر تلقائي مع health checks

### النشر اليدوي:

```bash
# سحب أحدث صورة
docker pull ghcr.io/kaleem/kaleem-api:latest

# تحديث الخدمة
docker compose -f docker-compose.prod.yml up -d api

# فحص النشر
curl -f http://localhost:3000/api/health
```

---

## 📈 المقاييس المهمة

### Prometheus Queries:

#### الأداء:

```promql
# زمن الاستجابة P95
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))

# معدل الطلبات
sum(rate(http_request_duration_seconds_count[1m]))

# معدل الأخطاء
sum(rate(http_errors_total{status_code=~"5.."}[5m])) / sum(rate(http_request_duration_seconds_count[5m]))
```

#### الكاش:

```promql
# معدل إصابة الكاش
sum(rate(cache_hit_total[5m])) / (sum(rate(cache_hit_total[5m])) + sum(rate(cache_miss_total[5m])))
```

#### قاعدة البيانات:

```promql
# زمن الاستعلامات
histogram_quantile(0.95, sum(rate(database_query_duration_seconds_bucket[5m])) by (le))
```

---

## 🛠️ استكشاف الأخطاء

### مشاكل شائعة:

#### 1. فشل Health Check

```bash
# فحص اللوجات
docker logs kaleem-api-prod

# فحص الخدمات المساعدة
docker compose ps
```

#### 2. بطء الأداء

```bash
# فحص المقاييس
curl http://localhost:3000/metrics | grep http_request_duration

# فحص الكاش
curl http://localhost:3000/admin/cache/stats
```

#### 3. مشاكل الكاش

```bash
# فحص Redis
docker exec kaleem-redis-prod redis-cli ping

# مسح الكاش
curl -X DELETE http://localhost:3000/admin/cache/clear
```

---

## 🔒 الأمان

### Best Practices المطبقة:

- Non-root containers
- Secrets management
- Network isolation
- Security scanning
- Data redaction
- Rate limiting

### فحص الأمان:

```bash
# مسح الثغرات
trivy image kaleem/api:latest

# فحص الإعدادات
docker run --rm -it -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy config .
```

---

**النظام جاهز للإنتاج مع جميع المعايير المطلوبة!** ✅
