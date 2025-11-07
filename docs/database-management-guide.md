# 🔐 دليل إدارة قواعد البيانات عن بُعد

دليل شامل لإدارة قواعد بيانات VPS من حاسوبك الشخصي باستخدام SSH Tunnel و Desktop Applications.

---

## 📋 جدول المحتويات

- [المتطلبات الأساسية](#المتطلبات-الأساسية)
- [إعداد SSH الآمن](#إعداد-ssh-الآمن)
- [إدارة MongoDB](#إدارة-mongodb)
- [إدارة Redis](#إدارة-redis)
- [إدارة RabbitMQ](#إدارة-rabbitmq)
- [إدارة MinIO](#إدارة-minio)
- [استكشاف الأخطاء](#استكشاف-الأخطاء)
- [نصائح الأمان](#نصائح-الأمان)

---

## 🎯 المتطلبات الأساسية

### على الـ VPS

تأكد من أن Docker Compose يربط المنافذ بـ `localhost` فقط:

```yaml
# في docker-compose.mvp.yml
services:
  mongo:
    ports:
      - '127.0.0.1:27017:27017'  # ✅ آمن
      
  redis:
    ports:
      - '127.0.0.1:6379:6379'  # ✅ آمن
      
  rabbitmq:
    ports:
      - '127.0.0.1:5672:5672'
      - '127.0.0.1:15672:15672'
      
  minio:
    ports:
      - '127.0.0.1:9000:9000'
      - '127.0.0.1:9001:9001'
```

### على حاسوبك الشخصي

قم بتحميل التطبيقات التالية:

| التطبيق | الاستخدام | رابط التحميل |
|---------|-----------|--------------|
| **MongoDB Compass** | إدارة MongoDB | [تحميل](https://www.mongodb.com/try/download/compass) |
| **RedisInsight** | إدارة Redis | [تحميل](https://redis.com/redis-enterprise/redis-insight/) |
| **متصفح حديث** | RabbitMQ, MinIO | Chrome/Edge/Firefox |

---

## 🔐 إعداد SSH الآمن

### الخطوة 1: إنشاء SSH Key (موصى به)

#### على Windows

```powershell
# افتح PowerShell وأنشئ مفتاح SSH
ssh-keygen -t ed25519 -C "your-email@example.com"

# مسار المفتاح الافتراضي: C:\Users\YOUR_USERNAME\.ssh\id_ed25519
# اضغط Enter لقبول المسار الافتراضي
# يمكنك إضافة passphrase أو اتركه فارغًا
```

#### على Mac/Linux

```bash
# في Terminal
ssh-keygen -t ed25519 -C "your-email@example.com"

# مسار المفتاح: ~/.ssh/id_ed25519
```

### الخطوة 2: نسخ المفتاح للـ VPS

```powershell
# على Windows PowerShell
type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh root@YOUR_VPS_IP "cat >> ~/.ssh/authorized_keys"
```

```bash
# على Mac/Linux
ssh-copy-id root@YOUR_VPS_IP
```

### الخطوة 3: إنشاء ملف SSH Config

هذا الملف يسهّل الاتصال ويُنشئ الـ tunnels تلقائيًا.

#### على Windows

**الملف**: `C:\Users\YOUR_USERNAME\.ssh\config`

```
Host kaleem-vps
    HostName YOUR_VPS_IP_ADDRESS
    User root
    Port 22
    IdentityFile ~/.ssh/id_ed25519
    
    # MongoDB Tunnel
    LocalForward 27017 127.0.0.1:27017
    
    # Redis Tunnel  
    LocalForward 6379 127.0.0.1:6379
    
    # RabbitMQ Management UI
    LocalForward 15672 127.0.0.1:15672
    
    # RabbitMQ AMQP (اختياري)
    LocalForward 5672 127.0.0.1:5672
    
    # MinIO Console
    LocalForward 9001 127.0.0.1:9001
    
    # MinIO API (اختياري)
    LocalForward 9000 127.0.0.1:9000
    
    # Keep connection alive
    ServerAliveInterval 60
    ServerAliveCountMax 3
```

#### على Mac/Linux

**الملف**: `~/.ssh/config`

```
Host kaleem-vps
    HostName YOUR_VPS_IP_ADDRESS
    User root
    Port 22
    IdentityFile ~/.ssh/id_ed25519
    
    # MongoDB Tunnel
    LocalForward 27017 127.0.0.1:27017
    
    # Redis Tunnel  
    LocalForward 6379 127.0.0.1:6379
    
    # RabbitMQ Management UI
    LocalForward 15672 127.0.0.1:15672
    
    # MinIO Console
    LocalForward 9001 127.0.0.1:9001
    
    ServerAliveInterval 60
    ServerAliveCountMax 3
```

### الخطوة 4: الاتصال بالـ VPS

```powershell
# الآن ببساطة نفذ:
ssh kaleem-vps

# ستظهر رسالة مثل:
# Welcome to Ubuntu 22.04 LTS...
# 
# جميع الـ tunnels أصبحت جاهزة تلقائيًا! ✅
```

**ملاحظة هامة**: اترك نافذة SSH مفتوحة طوال فترة العمل.

---

## 🗄️ إدارة MongoDB

### 1. فتح SSH Tunnel

```powershell
# الطريقة 1: باستخدام config file (موصى بها)
ssh kaleem-vps

# الطريقة 2: يدويًا
ssh -L 27017:localhost:27017 root@YOUR_VPS_IP -N
```

### 2. فتح MongoDB Compass

بعد تشغيل Compass، استخدم أحد طرق الاتصال:

#### الطريقة الأولى: Connection String

```
mongodb://kaleem:kaleem@123@localhost:27017/admin?authSource=admin
```

#### الطريقة الثانية: Advanced Connection

```
General Tab:
- Host: localhost
- Port: 27017

Authentication Tab:
- Method: Username/Password
- Username: kaleem
- Password: kaleem@123
- Authentication Database: admin

Advanced Tab:
- Default Database: kaleem-db (أو أي database تريدها)
```

### 3. العمليات الشائعة في Compass

#### عرض المجموعات (Collections)

1. في الشريط الجانبي، اختر Database (مثل `kaleem-db`)
2. ستظهر جميع الـ Collections
3. انقر على أي collection لعرض البيانات

#### البحث عن بيانات (Query)

```javascript
// البحث عن مستخدم محدد
{ email: "user@example.com" }

// البحث باستخدام regex
{ name: { $regex: "أحمد", $options: "i" } }

// البحث بتاريخ معين
{ createdAt: { $gte: ISODate("2024-01-01") } }
```

#### إضافة وثيقة (Document)

```json
{
  "name": "أحمد محمد",
  "email": "ahmed@example.com",
  "role": "user",
  "createdAt": { "$date": "2024-01-15T10:30:00Z" }
}
```

#### تحديث بيانات

1. ابحث عن الوثيقة
2. انقر على زر "Edit Document"
3. عدّل القيم
4. انقر "Update"

#### حذف بيانات

1. ابحث عن الوثيقة
2. انقر على أيقونة سلة المهملات
3. أكّد الحذف

#### تصدير بيانات

```
Collection → Export Collection → Choose Format (JSON/CSV) → Export
```

#### استيراد بيانات

```
Collection → Import Data → Select File → Import
```

---

## 🔴 إدارة Redis

### 1. فتح SSH Tunnel

```powershell
# مع config file
ssh kaleem-vps

# أو يدويًا
ssh -L 6379:localhost:6379 root@YOUR_VPS_IP -N
```

### 2. فتح RedisInsight

#### إضافة اتصال جديد

```
Add Redis Database → Manual Connection

Host: localhost
Port: 6379
Database Alias: Kleeem VPS Redis
Username: (اتركه فارغًا إلا إذا فعّلت ACL)
Password: (إذا كان موجودًا في docker-compose)

Test Connection → Add Redis Database
```

### 3. العمليات الشائعة في RedisInsight

#### عرض جميع الـ Keys

```
Browser Tab → Tree View
```

سترى جميع الـ keys مرتبة حسب الـ pattern (مثل `user:*`, `session:*`)

#### البحث عن Key محدد

```
Search Box → أدخل pattern
مثال: session:*
```

#### عرض قيمة Key

```
انقر على الـ key → سيعرض القيمة والنوع (String, Hash, List, etc.)
```

#### إضافة Key جديد

```
+ Add Key

Key Name: user:123
Type: Hash
TTL: -1 (بدون انتهاء) أو حدد seconds

Fields (للـ Hash):
name: أحمد
email: ahmed@example.com
```

#### حذف Key

```
انقر على الـ Key → Delete Icon → Confirm
```

#### عرض إحصائيات الذاكرة

```
Analysis Tools → Memory Analysis

سيعرض:
- أكثر Keys استهلاكًا للذاكرة
- توزيع أنواع البيانات
- Keys المنتهية صلاحيتها
```

#### تنفيذ أوامر Redis مباشرة

```
CLI Tab → أدخل الأوامر

أمثلة:
> KEYS *
> GET session:abc123
> HGETALL user:456
> DEL cache:old-data
> FLUSHDB  (⚠️ احذر: يحذف كل قاعدة البيانات!)
```

#### مراقبة الأداء

```
Profiler Tab → Start

سيعرض جميع الأوامر المنفذة في الوقت الفعلي
مفيد لتشخيص مشاكل الأداء
```

---

## 🐰 إدارة RabbitMQ

### 1. فتح SSH Tunnel

```powershell
ssh kaleem-vps
```

### 2. فتح Management Console

افتح متصفحك واذهب إلى:

```
http://localhost:15672
```

**بيانات الدخول**:
- **Username**: `kaleem`
- **Password**: `supersecret` (أو حسب ما في `.env`)

### 3. العمليات الشائعة

#### مراقبة الـ Queues

```
Queues Tab → اختر Virtual Host: kleem

ستظهر:
- Ready: عدد الرسائل الجاهزة
- Unacked: الرسائل قيد المعالجة
- Total: المجموع
```

#### عرض الرسائل في Queue

```
انقر على اسم الـ Queue → Get Messages

Options:
- Ack Mode: Automatic (للتجربة)
- Messages: 10 (عدد الرسائل)

Get Message(s) → سيعرض محتوى الرسائل
```

#### حذف Queue

```
Queues Tab → اختر الـ Queue → Delete Queue
⚠️ سيحذف جميع الرسائل المنتظرة!
```

#### إرسال رسالة تجريبية

```
Queues Tab → اختر Queue → Publish Message

Payload:
{
  "type": "test",
  "message": "رسالة تجريبية"
}

Properties (اختياري):
- Delivery mode: 2 (Persistent)

Publish Message
```

#### مراقبة الاتصالات

```
Connections Tab → سيعرض جميع الاتصالات النشطة
Channels Tab → القنوات النشطة
```

---

## 📦 إدارة MinIO

### 1. فتح SSH Tunnel

```powershell
ssh kaleem-vps
```

### 2. فتح MinIO Console

افتح متصفحك واذهب إلى:

```
http://localhost:9001
```

**بيانات الدخول**:
- **Username**: قيمة `MINIO_ACCESS_KEY` من `.env`
- **Password**: قيمة `MINIO_SECRET_KEY` من `.env`

### 3. العمليات الشائعة

#### إنشاء Bucket جديد

```
Buckets → Create Bucket

Bucket Name: user-uploads
Versioning: Enabled (موصى به)
Quota: (اتركه فارغًا أو حدد حد أقصى)

Create
```

#### رفع ملفات

```
اختر الـ Bucket → Upload → اختر الملفات

أو Drag & Drop
```

#### تحميل ملفات

```
اختر الـ Bucket → انقر على الملف → Download
```

#### مشاركة ملف (Generate Link)

```
انقر على الملف → Share

Expiry: 7 days (أو حسب رغبتك)

Copy Link
```

#### حذف ملفات

```
اختر الملف → Delete Icon → Confirm
```

#### إنشاء Access Key للتطبيق

```
Identity → Service Accounts → Create Service Account

Policy: readwrite

Create → احفظ Access Key و Secret Key
```

---

## 🔍 استكشاف الأخطاء

### مشكلة: "Connection Refused"

**السبب**: SSH Tunnel غير متصل أو تم إيقافه.

**الحل**:

```powershell
# تحقق من أن SSH Tunnel يعمل
# يجب أن تكون نافذة SSH مفتوحة

# إذا أغلقتها، أعد فتحها:
ssh kaleem-vps
```

### مشكلة: "Authentication Failed" في MongoDB

**الحل**:

```powershell
# تحقق من بيانات الاعتماد على VPS
ssh kaleem-vps
docker exec -it kaleem-mongo mongo admin -u kaleem -p

# أدخل password وتحقق من أنه يعمل
```

### مشكلة: "Port Already in Use"

**السبب**: منفذ محلي مستخدم من تطبيق آخر.

**الحل**:

```powershell
# على Windows: تحقق من المنفذ المستخدم
netstat -ano | findstr :27017

# أغلق التطبيق المستخدم للمنفذ
# أو غيّر المنفذ المحلي في SSH config:
LocalForward 27018 127.0.0.1:27017
```

### مشكلة: SSH Tunnel ينقطع باستمرار

**الحل**: أضف هذه السطور لـ SSH config:

```
ServerAliveInterval 60
ServerAliveCountMax 3
TCPKeepAlive yes
```

### مشكلة: بطء في الاتصال

**السبب**: تأخر في الشبكة (latency).

**الحل**:

```powershell
# استخدم Compression في SSH
ssh -C kaleem-vps

# أو أضف في config:
Compression yes
```

---

## 🛡️ نصائح الأمان

### 1. استخدم كلمات مرور قوية

```bash
# على VPS، غيّر كلمات المرور في .env:
MONGO_PASSWORD=$(openssl rand -base64 32)
RABBITMQ_PASSWORD=$(openssl rand -base64 32)
MINIO_SECRET_KEY=$(openssl rand -base64 32)

# ثم أعد بناء الحاويات:
docker-compose down
docker-compose up -d
```

### 2. لا تفتح المنافذ للإنترنت

```yaml
# ✅ صحيح
ports:
  - '127.0.0.1:27017:27017'

# ❌ خطأ (يفتح للإنترنت!)
ports:
  - '27017:27017'
```

### 3. فعّل Firewall على VPS

```bash
sudo ufw enable
sudo ufw allow 22/tcp      # SSH فقط
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw status            # تحقق من القواعد
```

### 4. استخدم SSH Key بدلاً من Password

```bash
# عطّل password authentication
sudo nano /etc/ssh/sshd_config

# غيّر هذا السطر:
PasswordAuthentication no

# أعد تشغيل SSH
sudo systemctl restart sshd
```

### 5. راقب المحاولات المشبوهة

```bash
# على VPS
sudo apt install fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# سيمنع IP بعد 5 محاولات فاشلة
```

### 6. قم بعمل Backup دوري

```bash
# MongoDB Backup
docker exec kaleem-mongo mongodump \
  --username=kaleem \
  --password=kaleem@123 \
  --authenticationDatabase=admin \
  --out=/backup

# Redis Backup
docker exec kaleem-redis redis-cli BGSAVE
```

---

## 📚 موارد إضافية

### التوثيق الرسمي

- [MongoDB Compass Documentation](https://docs.mongodb.com/compass/)
- [RedisInsight Documentation](https://redis.io/docs/stack/insight/)
- [RabbitMQ Management Plugin](https://www.rabbitmq.com/management.html)
- [MinIO Console](https://min.io/docs/minio/linux/administration/minio-console.html)

### فيديوهات تعليمية

- [MongoDB Compass Tutorial](https://www.youtube.com/watch?v=YBOiX8DwinE)
- [RedisInsight Overview](https://www.youtube.com/watch?v=9pYTTQCEU8M)

### مجتمعات الدعم

- [MongoDB Community Forum](https://www.mongodb.com/community/forums/)
- [Redis Discord](https://discord.gg/redis)
- [Stack Overflow - SSH Tunneling](https://stackoverflow.com/questions/tagged/ssh-tunnel)

---

## ✅ Checklist السريع

قبل البدء بالعمل:

- [ ] SSH Tunnel متصل: `ssh kaleem-vps`
- [ ] MongoDB Compass يتصل بـ `localhost:27017`
- [ ] RedisInsight يتصل بـ `localhost:6379`
- [ ] RabbitMQ Management يفتح على `http://localhost:15672`
- [ ] MinIO Console يفتح على `http://localhost:9001`

عند الانتهاء من العمل:

- [ ] احفظ أي تغييرات
- [ ] أغلق التطبيقات
- [ ] أغلق SSH Tunnel (`Ctrl+C` في نافذة SSH)

---

## 🆘 الدعم

إذا واجهت أي مشكلة:

1. تحقق من [قسم استكشاف الأخطاء](#استكشاف-الأخطاء)
2. تأكد من أن Docker Containers تعمل على VPS:
   ```bash
   docker ps
   docker logs kaleem-mongo
   ```
3. تحقق من اتصال الشبكة:
   ```bash
   ping YOUR_VPS_IP
   ```

---

**آخر تحديث**: نوفمبر 2024  
**الإصدار**: 1.0.0


