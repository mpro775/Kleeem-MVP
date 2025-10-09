# 🛡️ Kaleem — Backup & DR Handbook (تفصيلي ومتكامل)

> الإصدار: 1.0 — التاريخ: 2025-10-01 — المالك: فريق Kaleem SRE  
> هذا الدليل يشرح **كل ما يخص النسخ الاحتياطي** في بيئة Kaleem: التصميم، السكربتات، الجداول الزمنية، التخزين الخارجي، الاستعادة، المراقبة، الأمان، واستكشاف الأخطاء.

---

## 0) نظرة عامة

- **أهدافنا**: حماية بيانات Kaleem وملفات التهيئة عبر استراتيجية **3-2-1** (3 نسخ، 2 وسائط، 1 خارج الموقع)، مع توثيق استعادة واضح وعملي.  
- **نطاق البيانات**:
  - MongoDB (قاعدة `kaleem`)
  - Qdrant (向向 vectors) عبر Snapshots
  - RabbitMQ (التعريفات: Exchanges/Queues/Bindings/Users/Policies)
  - Configs (Nginx, Cron, /opt/kaleem)
  - n8n (معطّل افتراضيًا)
- **الموقع المحلي للنسخ**: `/backups`  
- **مستودع restic المحلي**: `/backups/restic-local`  
- **التخزين الخارجي**: Cloudflare R2 عبر `rclone` إلى `r2:kaleem-backup/restic`  
- **منطقة زمنية السيرفر**: تظهر السجلات بـ `+00:00` (UTC). عدّل الجداول إذا تغيّر التوقيت.

---

## 1) المكوّنات والطرق

| المكوّن | طريقة النسخ | مكان الإخراج |
|---|---|---|
| **MongoDB** | `mongodump` (بدون `--oplog` لنسخة DB واحدة) | `/backups/mongo/mongo-<DATE>.archive.gz` |
| **Qdrant** | API `POST /snapshots` ثم نسخ أحدث `*.snapshot` من الحاوية | `/backups/qdrant/full-snapshot-<DATE>.snapshot` |
| **RabbitMQ** | REST `GET /api/definitions` | `/backups/rabbitmq/defs-<DATE>.json` |
| **Configs** | `tar` لمسارات النظام | `/backups/configs/configs-<DATE>.tar.gz` |
| **n8n** | **معطّل** (يمكن تفعيله لاحقًا) | `/backups/n8n/n8n-sqlite-<DATE>.tar.gz` (عند التفعيل) |
| **التجميع النهائي** | restic backup + retention | `/backups/restic-local` ثم **sync** إلى R2 |

**سياسة الاحتفاظ (Retention)**: يومي 7، أسبوعي 4، شهري 6.

---

## 2) السكربتات والملفات الحرجة

### 2.1 كلمات المرور والمتغيرات
- `RESTIC_PASSWORD_FILE`: **`/etc/restic.pass`** (صلاحيات: `600`)
- ملف بيئة النسخ المحلي: **`/etc/kaleem-backups.env`**
  - يحتوي مثلًا:  
    ```bash
    MONGO_MODE=host
    MONGO_URI="mongodb://backup:<PASS>@127.0.0.1:27017/kaleem?authSource=admin"
    N8N_ENABLED=0
    ```
- إعداد rclone: **`/root/.config/rclone/rclone.conf`** (صلاحيات: `600`)  
- (اختياري) مراقبة Healthchecks: `RESTORE_HC_URL="https://hc-ping.com/<UUID>"`

> 🔒 **أمان**: لا تضع أسرارًا داخل سطور cron. استخدم ملفات بيئة بصلاحيات مقيدة.

### 2.2 سكربت النسخ المحلي
**`/opt/kaleem/scripts/kaleem-backup.v2.1.sh`**  
- Mongo (host / docker)، Qdrant، RabbitMQ، Configs، restic backup + forget/prune  
- لوج: `/var/log/kaleem-backups/backup.log` (عبر cron)

### 2.3 سكربت النسخ الخارجي إلى R2
**`/opt/kaleem/scripts/kaleem-backup.r2.sh`** (يستخدم backend `rclone:`)  
- يرفع مجلدات: `/etc`, `/opt/kaleem`, `/backups/{mongo,qdrant,rabbitmq,configs}`  
- tags: `r2`, `server:<HOST>`  
- لوج: `/var/log/kaleem-backups/backup-<STAMP>.log`

### 2.4 اختبار الاستعادة (محلي + R2)
- محلي: **`/opt/kaleem/scripts/kaleem-restore-test.sh`** → لوج: `/var/log/kaleem-backups/restore-test.log`  
- R2: **`/opt/kaleem/scripts/kaleem-restore-test.r2.sh`** → لوج: `restore-test-<STAMP>.log`

---

## 3) الجدولة (Cron/Systemd)

### 3.1 النسخ المحلي (Cron – 03:00 يوميًا)
ملف: **`/etc/cron.d/kaleem-backups`**  
مثال سطر التنفيذ (بدون أسرار):
```cron
0 3 * * * root /bin/bash -lc ". /etc/kaleem-backups.env; BACKUP_ROOT=/backups RESTIC_REPO=/backups/restic-local RESTIC_PASSWORD_FILE=/etc/restic.pass /opt/kaleem/scripts/kaleem-backup.v2.1.sh >> /var/log/kaleem-backups/backup.log 2>&1"
```

### 3.2 النسخ إلى R2 (Systemd Timer – 03:30 يوميًا)
- خدمة: **`/etc/systemd/system/kaleem-backup-r2.service`**
- مؤقت: **`/etc/systemd/system/kaleem-backup-r2.timer`**
- بيئة كاش لتفادي التحذير:
  ```ini
  [Service]
  Environment=HOME=/root
  Environment=XDG_CACHE_HOME=/var/cache/restic
  Environment=RESTIC_CACHE_DIR=/var/cache/restic
  ```
- تفعيل/فحص:
  ```bash
  systemctl enable --now kaleem-backup-r2.timer
  systemctl list-timers --all | grep -i kaleem-backup-r2
  ```

### 3.3 اختبار الاستعادة الشهري (Cron – يوم 1 الساعة 03:20)
```cron
20 3 1 * * root /bin/bash -lc ". /etc/kaleem-backups.env; RESTIC_REPO=/backups/restic-local RESTIC_PASSWORD_FILE=/etc/restic.pass /opt/kaleem/scripts/kaleem-restore-test.sh >> /var/log/kaleem-backups/restore-test.log 2>&1"
```

> ✅ يمكنك إضافة مؤقّت مماثل لـ **R2 restore test** إذا رغبت.

---

## 4) التهيئة الفعلية (ما تم إنجازه)

- restic محلي **مُهيأ**: `/backups/restic-local` (ID يظهر في السجلات)  
- عمل نسخة محلية ناجحة (`snapshot 4d36af04` كمثال)  
- Qdrant snapshot يعمل، والملفات تظهر تحت `/backups/qdrant`  
- Mongo يعمل بيوزر `backup` وصلاحيات `read@kaleem` + `backup@admin`  
- n8n مُعطّل (N8N_ENABLED=0)  
- **خارج الموقع (R2)**:
  - إنشاء remote `r2` في rclone (endpoint R2)
  - مزامنة ريبو restic محليًا ← R2 بنجاح (وأيضًا restic عبر backend rclone)  
  - خدمة systemd لنسخ R2 تعمل وتم توليد `snapshot b78f0d7d`

---

## 5) عمليات التحقق واللوجات

```bash
# snapshots محليًا
restic -r /backups/restic-local snapshots --password-file /etc/restic.pass

# snapshots على R2 (backend rclone)
export RESTIC_REPOSITORY="rclone:r2:kaleem-backup/restic"
export RESTIC_PASSWORD_FILE="/etc/restic.pass"
restic snapshots

# لوجات
tail -n 200 /var/log/kaleem-backups/backup.log
tail -n 200 /var/log/kaleem-backups/backup-*.log
tail -n 200 /var/log/kaleem-backups/restore-test.log
journalctl -u kaleem-backup-r2.service -n 100 --no-pager
```

---

## 6) استعادة (Runbooks)

### 6.1 MongoDB
**استعادة إلى قاعدة kaleem (يحذف ويعيد بناء البيانات):**
```bash
DUMP=$(ls -t /backups/mongo/mongo-*.archive.gz | head -n1)
mongorestore --uri "mongodb://backup:<PASS>@127.0.0.1:27017/?authSource=admin"   --archive="$DUMP" --gzip --drop
```
**داخل الحاوية:**
```bash
docker cp "$DUMP" kaleem-mongo:/tmp/restore.archive.gz
docker exec -it kaleem-mongo sh -lc '
  mongorestore --uri "mongodb://backup:<PASS>@127.0.0.1:27017/?authSource=admin"   --archive=/tmp/restore.archive.gz --gzip --drop'
```

### 6.2 Qdrant (Full snapshot)
```bash
SNAP=$(ls -t /backups/qdrant/full-snapshot-*.snapshot | head -n1)
docker exec kaleem-qdrant mkdir -p /qdrant/snapshots
docker cp "$SNAP" kaleem-qdrant:/qdrant/snapshots/
NAME=$(basename "$SNAP")
curl -fsS -X POST "http://127.0.0.1:6333/snapshots/recover"   -H 'content-type: application/json'   -d "{"location":"/qdrant/snapshots/$NAME"}"
docker logs --tail=200 kaleem-qdrant
```

### 6.3 RabbitMQ
```bash
DEF=$(ls -t /backups/rabbitmq/defs-*.json | head -n1)
curl -u "kaleem:supersecret" -H "content-type: application/json"   -X POST http://127.0.0.1:15672/api/definitions   -d @"$DEF"
```

### 6.4 Configs
```bash
CFG=$(ls -t /backups/configs/configs-*.tar.gz | head -n1)
sudo tar -xzf "$CFG" -C /
sudo nginx -t && sudo systemctl reload nginx
sudo service cron reload
```

### 6.5 استعادة كاملة من restic (محلي)
```bash
restic -r /backups/restic-local snapshots --password-file /etc/restic.pass
sudo mkdir -p /tmp/restore-local
sudo restic -r /backups/restic-local restore latest   --password-file /etc/restic.pass --target /tmp/restore-local
```

### 6.6 استعادة كاملة من R2
**الخيار السريع (backend rclone):**
```bash
export RESTIC_REPOSITORY="rclone:r2:kaleem-backup/restic"
export RESTIC_PASSWORD_FILE="/etc/restic.pass"
restic snapshots
sudo mkdir -p /tmp/restore-r2
sudo restic restore latest --target /tmp/restore-r2
```

**أو تنزيل الريبو أولًا:**
```bash
sudo rm -rf /tmp/restic-remote && sudo mkdir -p /tmp/restic-remote
rclone sync r2:kaleem-backup/restic /tmp/restic-remote --config=/root/.config/rclone/rclone.conf
restic -r /tmp/restic-remote snapshots --password-file /etc/restic.pass
sudo mkdir -p /tmp/restore-r2
sudo restic -r /tmp/restic-remote restore latest   --password-file /etc/restic.pass --target /tmp/restore-r2
```

---

## 7) مراقبة وتنبيهات (اختياري/موصى به)

- Healthchecks لكل مهمة:
  - النسخ المحلي (start/ok/fail)
  - نسخ R2 (start/ok/fail) — عبر إضافة `curl` قبل/بعد السكربت
  - اختبار الاستعادة الشهري
- تنبيهات Prometheus/Grafana (موجودة بيئياً) لمراقبة مساحة القرص ونجاح المهام.

---

## 8) الأمان وأفضل الممارسات

- **تدوير مفاتيح R2** فورًا إذا تسربت (تمت مشاركتها هنا أثناء الإعداد — يلزم Rotate).  
- صلاحيات ملفات الأسرار: `chmod 600` وملكية root.  
- عدم وضع الأسرار في سطور cron مباشرة.  
- تقييد وصول لوحة RabbitMQ وMongo-Express.  
- تمكين Lifecycle على البكت لتقليل التكلفة (اختياري).  
- توثيق كلمة مرور restic في خزنة أسرار آمنة (ضياعها = فقدان الوصول للنسخ).

---

## 9) استكشاف الأخطاء (Troubleshooting)

| العرض | السبب | الحل |
|---|---|---|
| `--oplog mode only supported on full dumps` | استخدام `--oplog` مع DB واحدة | أزل `--oplog` من `mongodump` |
| `Authentication failed` لِـ Mongo | مستخدم غير موجود/كلمة مرور غير ASCII | أنشئ `backup`، واستخدم كلمة ASCII نظيفة |
| Qdrant snapshot غير موجود | المسار داخل الحاوية اختلف | استخدم `/qdrant/snapshots` ثم fallback إلى `/qdrant/storage/snapshots` |
| TLS handshake مع R2 | IPv6/طريقة lookup | استخدم IPv4 أو backend `rclone:` |
| `option s3.endpoint is not known` | restic قديم | استخدم rclone backend أو حدّث restic |
| `Credential access key has length 20` | مفاتيح غير متوافقة | أنشئ مفاتيح R2 جديدة صحيحة (طول 32) |
| تحذير cache restic | لا يوجد HOME/CACHE للخدمة | أضف `RESTIC_CACHE_DIR=/var/cache/restic` في service |

---

## 10) RPO/RTO (مبدئي)

- **RPO** (أقصى فقد بيانات مقبول): حتى **24 ساعة** (نسخ يومي). يمكن تقليصه بزيادة التكرار.  
- **RTO** (زمن الاستعادة): **1–3 ساعات** حسب حجم البيانات والباندويث (Mongo + Qdrant + Configs + تشغيل).

---

## 11) قوائم فحص (Checklists)

### 11.1 فحص يومي سريع
- [ ] نجاح مهمة 03:00 (راجع `/var/log/kaleem-backups/backup.log`)  
- [ ] مساحة القرص > 20%  
- [ ] Snapshot restic محلي ظهر اليوم

### 11.2 فحص أسبوعي
- [ ] Snapshot ظهر على **R2** (راجع `restic snapshots` على backend rclone)  
- [ ] لا أخطاء في `journalctl -u kaleem-backup-r2.service`  
- [ ] لا تراكم غير مبرر في `/backups`

### 11.3 فحص شهري (استعادة)
- [ ] نجح `kaleem-restore-test.sh` (راجع اللوج)  
- [ ] تحقق يدويًا من محتوى `/tmp/restore-*`

---

## 12) تغيير/صيانة

- عند تحديث مسارات/حاويات، عدّل السكربتات والبيئات:  
  - `MONGO_URI`, `QDRANT_CONTAINER`, `RABBIT_*`  
  - تمكين/تعطيل n8n عبر `N8N_ENABLED`  
- عند تغيير سياسات الاحتفاظ، عدّل:  
  - `KEEP_DAILY`, `KEEP_WEEKLY`, `KEEP_MONTHLY` في سكربتات restic

---

## 13) ملاحق

### 13.1 أوامر restic مفيدة
```bash
# تحقق من سلامة الريبو
restic -r /backups/restic-local check --password-file /etc/restic.pass

# إزالة لقطات قديمة يدوياً (مع الحذر)
restic -r /backups/restic-local forget --keep-daily 7 --keep-weekly 4 --keep-monthly 6 --prune --password-file /etc/restic.pass

# استثناءات (إذا رغبت)
restic backup /path --iexclude-file=/etc/restic.exclude
```

### 13.2 أوامر rclone مفيدة
```bash
rclone lsd r2:
rclone lsf r2:kaleem-backup
rclone size r2:kaleem-backup/restic
rclone sync /backups/restic-local r2:kaleem-backup/restic
```

---

**تم الإعداد والتوثيق — Kaleem SRE**  
> لأي تعديل/تحسين، حدّث هذا الدليل وادفع نسخة إلى مستودع التوثيق الداخلي.
