# ☁️ ربط Kleeem بـ Grafana Cloud

هذا الدليل يشرح، خطوة بخطوة، كيفية توجيه المقاييس (Metrics) من نسخة الـ MVP إلى حسابك على Grafana Cloud (`https://kaleemaiye.grafana.net`) بدون تشغيل Prometheus أو Grafana محليًا.

---

## 📋 ملخص سريع

1. تجهيز حساب Grafana Cloud والحصول على بيانات الربط.
2. إضافة المتغيرات اللازمة إلى ملف `.env`.
3. إنشاء ملف إعدادات لـ Grafana Agent.
4. إضافة خدمة `grafana-agent` داخل `docker-compose.mvp.yml`.
5. تشغيل الحاوية والتأكد من وصول المقاييس إلى Grafana Cloud.

---

## 1️⃣ تجهيز حساب Grafana Cloud

1. سجّل الدخول إلى لوحة التحكم: <https://kaleemaiye.grafana.net>.
2. من القائمة العلوية اختر **Connections → Data sources → Prometheus → Send metrics**.
3. دوّن القيم التالية (ستحتاجها لاحقًا):
   - `Prometheus remote_write endpoint` (رابط يبدأ بـ `https://prometheus-prod-XX.grafana.net/api/prom/push`).
   - `User` أو `Instance ID` (رقم غالبًا مكوَّن من 6 أرقام).
4. أنشئ **API Key** جديدة (الدور Role = `Metrics Publisher`) من خلال **Administration → API Keys** ثم احفظها في مكان آمن (تُعرض مرة واحدة فقط).

> 💡 **ملاحظة**: إذا رغبت في إرسال Logs أو Traces لاحقًا يمكنك إنشاء مفاتيح إضافية (`Logs Writer` و`Traces Publisher`) بنفس الطريقة أو إعادة استخدام المفتاح نفسه إذا كان لديك سياسات داخلية تسمح بذلك.

---

## 2️⃣ تحديث ملف البيئة (.env)

أضف المتغيرات التالية إلى الملف الذي يقرأه Docker Compose (مثلاً `Backend/.env` أو ملف `.env` في الجذر):

```env
# Grafana Cloud Metrics
GRAFANA_CLOUD_METRICS_URL=https://prometheus-prod-XX.grafana.net/api/prom/push
GRAFANA_CLOUD_METRICS_USERNAME=123456
GRAFANA_CLOUD_API_KEY=glc_********************************
```

استبدل:

- `XX` برقم الـ cluster الذي ظهر لك في Grafana.
- `123456` برقم المستخدم/instance ID.
- `glc_***` بمفتاح الـ API الحقيقي.

> ⚠️ **تنبيه أمني**: لا تقم برفع هذه القيم إلى Git. تأكد أن ملف `.env` موجود ضمن `.gitignore`.

---

## 3️⃣ إنشاء ملف إعدادات Grafana Agent

أنشئ ملفًا باسم `Backend/observability/grafana-agent.yaml` بالمحتوى التالي:

```yaml
server:
  log_level: info

metrics:
  global:
    scrape_interval: 15s
    scrape_timeout: 10s

  configs:
    - name: kaleem
      scrape_configs:
        - job_name: api
          metrics_path: /metrics
          static_configs:
            - targets: ['api:3000']

        - job_name: rabbitmq
          metrics_path: /metrics
          static_configs:
            - targets: ['rabbitmq:15692']

      remote_write:
        - url: ${GRAFANA_CLOUD_METRICS_URL}
          basic_auth:
            username: ${GRAFANA_CLOUD_METRICS_USERNAME}
            password: ${GRAFANA_CLOUD_API_KEY}
```

### ما يمكن تعديله

- أضف أو احذف وظائف `job_name` بحسب الخدمات التي لديها مسار `/metrics`.
- إذا كانت خدمة ما تستمع على منفذ مختلف، عدّل `targets`.
- لو أردت مراقبة الـ frontend (إن كان يعرِض `/metrics`) أضف:

  ```yaml
        - job_name: frontend
          metrics_path: /metrics
          static_configs:
            - targets: ['frontend:3000']
  ```

---

## 4️⃣ تعديل `docker-compose.mvp.yml`

داخل الملف أضف خدمة جديدة باسم `grafana-agent` (يفضَّل وضعها قرب نهاية ملف الخدمات):

```yaml
  grafana-agent:
    image: grafana/agent:v0.40.4
    container_name: kaleem-grafana-agent
    command:
      - --config.file=/etc/agent/grafana-agent.yaml
    environment:
      - GRAFANA_CLOUD_METRICS_URL=${GRAFANA_CLOUD_METRICS_URL}
      - GRAFANA_CLOUD_METRICS_USERNAME=${GRAFANA_CLOUD_METRICS_USERNAME}
      - GRAFANA_CLOUD_API_KEY=${GRAFANA_CLOUD_API_KEY}
    volumes:
      - ./Backend/observability/grafana-agent.yaml:/etc/agent/grafana-agent.yaml:ro
    depends_on:
      - api
      - rabbitmq
    restart: unless-stopped
    networks:
      - kaleem-net
```

> ✅ **مهم**: الحاوية تعمل فقط داخل الشبكة الداخلية `kaleem-net` ولا تفتح منافذ على الإنترنت.

---

## 5️⃣ التشغيل والتحقق

1. أعد تحميل الخدمات:

   ```powershell
   docker compose -f docker-compose.mvp.yml up -d grafana-agent
   ```

2. راقب السجلات للتأكد من عدم وجود أخطاء:

   ```powershell
   docker logs -f kaleem-grafana-agent
   ```

   ابحث عن سطر يحتوي `msg="successful write request"` أو بلا أخطاء.

3. في Grafana Cloud:
   - افتح **Explore → Metrics**.
   - اختر Data source باسم `grafanacloud-<your-instance>-prom`.
   - اكتب في الـ Query: `{job="api"}`
   - إذا ظهرت نتائج، فالمقاييس وصلت بنجاح.

---

## 6️⃣ (اختياري) إرسال الـ Logs أو الـ Traces

- **Logs**: يمكنك تشغيل `promtail` أو استخدام Grafana Agent بقسم `logs` مع توجيه البيانات إلى `https://logs-prod-XX.grafana.net/loki/api/v1/push`.
- **Traces**: استخدم Grafana Agent بقسم `traces` أو حدِّث إعدادات OpenTelemetry في التطبيق ليرسل البيانات إلى `https://tempo-prod-XX.grafana.net/tempo`.
- لمزيد من التفاصيل، راجع وثائق Grafana Agent: <https://grafana.com/docs/agent/latest/>.

---

## 7️⃣ نصائح أمان

- اجعل ملفات الإعداد (`grafana-agent.yaml`, `.env`) مملوكة للمستخدم المناسب، وصلاحيات القراءة فقط.
- بدِّل مفاتيح الـ API دوريًا من خلال Grafana Cloud.
- راقب Dashboard جاهز مثل **Grafana Cloud Agent Overview** للتأكد من أن الحاوية تعمل بشكل مستقر.
- تأكد من أن `docker-compose.mvp.yml` لا يُنشر للعامة مع بيانات حساسة.

---

## 8️⃣ استكشاف الأخطاء

| العَرَض | السبب المحتمل | الحل |
|--------|---------------|------|
| `401 Unauthorized` في سجلات Agent | اسم المستخدم أو الـ API Key خاطئ | تحقق من القيم في `.env` |
| `context deadline exceeded` | انقطاع في الشبكة أو منع اتصال خارجي | افحص اتصال الإنترنت في الـ VPS وجدار الحماية |
| لا تظهر مقاييس في Grafana | الحاوية لم تُشغَّل أو تكرر خطأً | `docker logs kaleem-grafana-agent` أو تأكد من أن الخدمات تستمع على `/metrics` |
| معدل عينات عالٍ جدًا | معدل `scrape_interval` 15 ثانية قد يكون سريعًا | عدِّل القيمة إلى 30s أو 60s إن كان الحمل كبيرًا |

---

## ✅ قائمة التحقق النهائية

- [ ] تم الحصول على `remote_write URL` و `Instance ID`.
- [ ] تم إنشاء `Metrics Publisher API Key`.
- [ ] تم تحديث ملف `.env` بالقيم الصحيحة.
- [ ] تم إنشاء ملف `grafana-agent.yaml`.
- [ ] تم إضافة خدمة `grafana-agent` إلى `docker-compose.mvp.yml`.
- [ ] الحاوية تعمل دون أخطاء (`docker logs kaleem-grafana-agent`).
- [ ] تظهر المقاييس في Grafana Cloud.

---

**آخر تحديث**: نوفمبر 2024  
**إعداد**: فريق Kleeem  
**للأسئلة**: راجع قناة DevOps أو افتح تذكرة داخل النظام الداخلي.


