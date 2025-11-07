# ⚡ الوصول السريع لقواعد البيانات

مرجع سريع للوصول إلى قواعد بيانات Kleeem VPS من حاسوبك الشخصي.

---

## 🚀 البدء السريع (3 خطوات)

### 1️⃣ فتح SSH Tunnel

```powershell
ssh kaleem-vps
```

**أو يدويًا**:
```powershell
ssh -L 27017:localhost:27017 -L 6379:localhost:6379 -L 15672:localhost:15672 -L 9001:localhost:9001 root@YOUR_VPS_IP
```

### 2️⃣ فتح التطبيق المطلوب

| القاعدة | التطبيق | الاتصال |
|---------|---------|---------|
| MongoDB | MongoDB Compass | `mongodb://kaleem:kaleem@123@localhost:27017/admin` |
| Redis | RedisInsight | `localhost:6379` |
| RabbitMQ | المتصفح | `http://localhost:15672` |
| MinIO | المتصفح | `http://localhost:9001` |

### 3️⃣ العمل والإدارة ✨

---

## 📝 ملف SSH Config (نسخة سريعة)

**الملف**: `C:\Users\YOUR_USERNAME\.ssh\config`

```
Host kaleem-vps
    HostName YOUR_VPS_IP
    User root
    IdentityFile ~/.ssh/id_ed25519
    LocalForward 27017 127.0.0.1:27017
    LocalForward 6379 127.0.0.1:6379
    LocalForward 15672 127.0.0.1:15672
    LocalForward 9001 127.0.0.1:9001
    ServerAliveInterval 60
```

**بعدها ببساطة**:
```powershell
ssh kaleem-vps
```

---

## 🗄️ MongoDB - أوامر سريعة

### الاتصال
```
mongodb://kaleem:kaleem@123@localhost:27017/admin?authSource=admin
```

### Query أمثلة
```javascript
// بحث
{ email: "user@example.com" }

// regex
{ name: { $regex: "أحمد", $options: "i" } }

// تاريخ
{ createdAt: { $gte: ISODate("2024-01-01") } }
```

---

## 🔴 Redis - أوامر سريعة

### الاتصال
```
Host: localhost
Port: 6379
```

### CLI أوامر
```redis
KEYS *                          # جميع الـ keys
GET key_name                    # قراءة قيمة
SET key_name "value"            # كتابة قيمة
HGETALL user:123                # قراءة hash
DEL key_name                    # حذف
TTL key_name                    # وقت الانتهاء
```

---

## 🐰 RabbitMQ - وصول سريع

### Management Console
```
URL: http://localhost:15672
Username: kaleem
Password: supersecret
```

### عمليات سريعة
- **Queues** → عرض الرسائل المنتظرة
- **Get Messages** → قراءة رسالة من queue
- **Publish** → إرسال رسالة تجريبية

---

## 📦 MinIO - وصول سريع

### Console
```
URL: http://localhost:9001
Username: (من MINIO_ACCESS_KEY)
Password: (من MINIO_SECRET_KEY)
```

### عمليات سريعة
- **Buckets** → إنشاء/عرض buckets
- **Upload** → رفع ملفات
- **Share** → مشاركة ملف (generate link)

---

## ❌ استكشاف الأخطاء السريع

| المشكلة | الحل |
|---------|------|
| Connection Refused | تحقق من SSH Tunnel (يجب أن يكون مفتوح) |
| Authentication Failed | تحقق من username/password |
| Port Already in Use | أغلق التطبيق المستخدم للمنفذ أو غيّر المنفذ |
| SSH ينقطع | أضف `ServerAliveInterval 60` في SSH config |

---

## 🛡️ نصائح أمان سريعة

✅ **افعل**:
- استخدم SSH Key
- اربط المنافذ بـ `127.0.0.1` في docker-compose
- استخدم كلمات مرور قوية
- فعّل UFW firewall

❌ **لا تفعل**:
- لا تفتح منافذ قواعد البيانات للإنترنت
- لا تشارك SSH keys
- لا تحفظ كلمات المرور في ملفات نصية

---

## 📥 تحميل التطبيقات

- **MongoDB Compass**: https://www.mongodb.com/try/download/compass
- **RedisInsight**: https://redis.com/redis-enterprise/redis-insight/

---

## 📚 الدليل الشامل

للتفاصيل الكاملة، راجع: [دليل إدارة قواعد البيانات](./database-management-guide.md)

---

**آخر تحديث**: نوفمبر 2024

