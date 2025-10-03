# تمارين اليوم الأول: إعداد البيئة التطويرية

**الأسبوع:** الأول - أساسيات النظام الجديد  
**اليوم:** الأول - مقدمة شاملة وإعداد البيئة  
**المدة المقدرة:** 3 ساعات  
**المستوى:** مبتدئ إلى متوسط

---

## 🎯 أهداف التمارين

بنهاية هذه التمارين، ستكون قادراً على:
1. إعداد بيئة تطوير كاملة لمشروع Kaleem AI
2. فهم هيكل المشروع والتقنيات المستخدمة
3. تشغيل المشروع محلياً بنجاح
4. استخدام الأدوات الأساسية للتطوير
5. حل المشاكل الشائعة في الإعداد

---

## 📋 متطلبات ما قبل التمارين

### المتطلبات التقنية
- جهاز كمبيوتر بنظام Windows/Mac/Linux
- ذاكرة وصول عشوائي 8GB على الأقل
- مساحة تخزين فارغة 10GB على الأقل
- اتصال إنترنت مستقر

### الحسابات المطلوبة
- حساب GitHub (إنشاء مجاني)
- حساب Docker Hub (اختياري)
- حساب MongoDB Atlas (مجاني)

---

## 🛠️ التمرين الأول: تثبيت الأدوات الأساسية

### الهدف
تثبيت جميع الأدوات المطلوبة للتطوير

### الخطوات

#### 1. تثبيت Node.js
```bash
# للتحقق من وجود Node.js
node --version
npm --version

# إذا لم يكن مثبتاً، قم بتحميله من:
# https://nodejs.org/en/download/
# اختر LTS Version (18.x أو أحدث)
```

**التحقق من النجاح:**
```bash
# يجب أن تظهر أرقام الإصدارات
node --version  # v18.17.0 أو أحدث
npm --version   # 9.6.7 أو أحدث
```

#### 2. تثبيت Git
```bash
# للتحقق من وجود Git
git --version

# للتثبيت على Ubuntu/Debian
sudo apt update
sudo apt install git

# للتثبيت على macOS (باستخدام Homebrew)
brew install git

# للتثبيت على Windows
# تحميل من: https://git-scm.com/download/win
```

**إعداد Git:**
```bash
# إعداد المعلومات الشخصية
git config --global user.name "اسمك الكامل"
git config --global user.email "your.email@example.com"

# التحقق من الإعداد
git config --list
```

#### 3. تثبيت Docker
```bash
# للتحقق من وجود Docker
docker --version
docker-compose --version

# للتثبيت على Ubuntu
sudo apt update
sudo apt install docker.io docker-compose
sudo usermod -aG docker $USER

# للتثبيت على Windows/Mac
# تحميل Docker Desktop من: https://www.docker.com/products/docker-desktop
```

**اختبار Docker:**
```bash
# تشغيل اختبار بسيط
docker run hello-world

# يجب أن ترى رسالة "Hello from Docker!"
```

#### 4. تثبيت VS Code والإضافات
```bash
# تحميل VS Code من: https://code.visualstudio.com/

# تثبيت الإضافات المطلوبة (عبر Command Palette: Ctrl+Shift+P)
# أو استخدام الأوامر التالية:
code --install-extension ms-vscode.vscode-typescript-next
code --install-extension esbenp.prettier-vscode
code --install-extension ms-vscode.vscode-eslint
code --install-extension bradlc.vscode-tailwindcss
code --install-extension ms-vscode.vscode-json
code --install-extension humao.rest-client
code --install-extension mongodb.mongodb-vscode
```

### ✅ معايير النجاح
- [ ] Node.js v18+ مثبت ويعمل
- [ ] Git مثبت ومُعد بالمعلومات الشخصية
- [ ] Docker مثبت ويعمل (اختبار hello-world ناجح)
- [ ] VS Code مثبت مع جميع الإضافات المطلوبة

---

## 🚀 التمرين الثاني: استنساخ وإعداد المشروع

### الهدف
الحصول على نسخة من مشروع Kaleem AI وإعداده للتطوير

### الخطوات

#### 1. استنساخ المشروع
```bash
# إنشاء مجلد للمشاريع
mkdir ~/kaleem-projects
cd ~/kaleem-projects

# استنساخ المشروع (استبدل الرابط بالرابط الفعلي)
git clone https://github.com/kaleem-ai/api.git kaleem-api
cd kaleem-api

# التحقق من الفروع المتاحة
git branch -a

# التبديل للفرع التطويري
git checkout develop
```

#### 2. فحص هيكل المشروع
```bash
# عرض هيكل المشروع
tree -L 2 -a
# أو إذا لم يكن tree مثبتاً
ls -la

# فحص الملفات المهمة
cat package.json | head -20
cat README.md | head -10
ls src/
```

**هيكل المشروع المتوقع:**
```
kaleem-api/
├── .env.example
├── .gitignore
├── .eslintrc.js
├── .prettierrc
├── docker-compose.yml
├── Dockerfile
├── nest-cli.json
├── package.json
├── README.md
├── tsconfig.json
├── src/
│   ├── app.module.ts
│   ├── main.ts
│   ├── auth/
│   ├── products/
│   ├── users/
│   └── common/
├── test/
└── docs/
```

#### 3. تثبيت التبعيات
```bash
# تثبيت تبعيات Node.js
npm install

# التحقق من عدم وجود أخطاء
npm audit

# إصلاح الثغرات الأمنية إن وجدت
npm audit fix
```

#### 4. إعداد متغيرات البيئة
```bash
# نسخ ملف البيئة النموذجي
cp .env.example .env

# تحرير ملف البيئة
code .env
```

**محتوى .env النموذجي:**
```env
# Application
NODE_ENV=development
PORT=3000
APP_NAME=Kaleem AI API

# Database
DATABASE_URL=mongodb://localhost:27017/kaleem_dev
REDIS_URL=redis://localhost:6379

# JWT
JWT_ACCESS_SECRET=your-super-secret-jwt-access-key-here
JWT_REFRESH_SECRET=your-super-secret-jwt-refresh-key-here
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Encryption
ENCRYPTION_KEY=your-32-character-encryption-key-here
PASSWORD_PEPPER_SECRET=your-pepper-secret-here

# External APIs
OPENAI_API_KEY=your-openai-api-key-here
STRIPE_SECRET_KEY=your-stripe-secret-key-here

# Monitoring
PROMETHEUS_ENABLED=true
GRAFANA_ENABLED=true
```

### ✅ معايير النجاح
- [ ] المشروع مستنسخ بنجاح
- [ ] جميع التبعيات مثبتة بدون أخطاء
- [ ] ملف .env مُعد بالقيم المناسبة
- [ ] هيكل المشروع مفهوم وواضح

---

## 🐳 التمرين الثالث: تشغيل قواعد البيانات

### الهدف
تشغيل MongoDB و Redis باستخدام Docker

### الخطوات

#### 1. فحص ملف docker-compose.yml
```bash
# عرض محتوى ملف Docker Compose
cat docker-compose.yml
```

**محتوى docker-compose.yml المتوقع:**
```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:6.0
    container_name: kaleem-mongodb
    restart: unless-stopped
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password123
      MONGO_INITDB_DATABASE: kaleem_dev
    volumes:
      - mongodb_data:/data/db
      - ./scripts/init-mongo.js:/docker-entrypoint-initdb.d/init-mongo.js:ro
    networks:
      - kaleem-network

  redis:
    image: redis:7-alpine
    container_name: kaleem-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes --requirepass redis123
    volumes:
      - redis_data:/data
    networks:
      - kaleem-network

  redis-commander:
    image: rediscommander/redis-commander:latest
    container_name: kaleem-redis-commander
    restart: unless-stopped
    ports:
      - "8081:8081"
    environment:
      REDIS_HOSTS: local:redis:6379:1:redis123
    depends_on:
      - redis
    networks:
      - kaleem-network

volumes:
  mongodb_data:
  redis_data:

networks:
  kaleem-network:
    driver: bridge
```

#### 2. تشغيل قواعد البيانات
```bash
# تشغيل جميع الخدمات
docker-compose up -d

# التحقق من حالة الحاويات
docker-compose ps

# عرض سجلات الخدمات
docker-compose logs mongodb
docker-compose logs redis
```

#### 3. اختبار الاتصال بقواعد البيانات
```bash
# اختبار MongoDB
docker exec -it kaleem-mongodb mongosh --username admin --password password123

# داخل MongoDB shell
use kaleem_dev
db.test.insertOne({message: "Hello Kaleem!"})
db.test.find()
exit

# اختبار Redis
docker exec -it kaleem-redis redis-cli -a redis123

# داخل Redis CLI
ping
set test "Hello Redis"
get test
exit
```

#### 4. اختبار واجهات الإدارة
```bash
# فتح Redis Commander في المتصفح
# http://localhost:8081

# تثبيت MongoDB Compass (إذا لم يكن مثبتاً)
# تحميل من: https://www.mongodb.com/products/compass
# الاتصال باستخدام: mongodb://admin:password123@localhost:27017/kaleem_dev
```

### ✅ معايير النجاح
- [ ] MongoDB يعمل على المنفذ 27017
- [ ] Redis يعمل على المنفذ 6379
- [ ] Redis Commander متاح على http://localhost:8081
- [ ] اختبار الاتصال بكلا قاعدتي البيانات ناجح

---

## 🏃‍♂️ التمرين الرابع: تشغيل التطبيق

### الهدف
تشغيل تطبيق Kaleem AI محلياً والتأكد من عمله

### الخطوات

#### 1. تشغيل التطبيق في وضع التطوير
```bash
# التأكد من أن قواعد البيانات تعمل
docker-compose ps

# تشغيل التطبيق
npm run start:dev

# يجب أن ترى رسائل مشابهة لهذه:
# [Nest] 12345  - 09/14/2025, 10:30:00 AM     LOG [NestFactory] Starting Nest application...
# [Nest] 12345  - 09/14/2025, 10:30:01 AM     LOG [InstanceLoader] AppModule dependencies initialized
# [Nest] 12345  - 09/14/2025, 10:30:01 AM     LOG [NestApplication] Nest application successfully started
# [Nest] 12345  - 09/14/2025, 10:30:01 AM     LOG Application is running on: http://localhost:3000
```

#### 2. اختبار الـ API Endpoints
```bash
# في terminal جديد، اختبار Health Check
curl http://localhost:3000/health

# يجب أن ترى استجابة مشابهة لهذه:
# {
#   "status": "ok",
#   "info": {
#     "database": {"status": "up"},
#     "redis": {"status": "up"}
#   }
# }

# اختبار API Documentation
curl http://localhost:3000/api/docs
# أو فتح في المتصفح: http://localhost:3000/api/docs
```

#### 3. اختبار Swagger Documentation
```bash
# فتح Swagger UI في المتصفح
# http://localhost:3000/api/docs

# يجب أن ترى واجهة Swagger مع جميع الـ endpoints
```

#### 4. اختبار بعض الـ Endpoints الأساسية
```bash
# اختبار endpoint المنتجات
curl -X GET "http://localhost:3000/api/products" \
  -H "accept: application/json"

# اختبار endpoint المستخدمين (قد يتطلب authentication)
curl -X GET "http://localhost:3000/api/users" \
  -H "accept: application/json"
```

### ✅ معايير النجاح
- [ ] التطبيق يعمل على http://localhost:3000
- [ ] Health check يعيد status: "ok"
- [ ] Swagger documentation متاح ويعمل
- [ ] الـ API endpoints تستجيب بشكل صحيح

---

## 🧪 التمرين الخامس: تشغيل الاختبارات

### الهدف
التأكد من أن جميع الاختبارات تعمل بشكل صحيح

### الخطوات

#### 1. تشغيل اختبارات الوحدة
```bash
# تشغيل جميع اختبارات الوحدة
npm run test

# تشغيل اختبارات محددة
npm run test -- --testPathPattern=users

# تشغيل الاختبارات مع مراقبة التغييرات
npm run test:watch
```

#### 2. تشغيل اختبارات التكامل
```bash
# تشغيل اختبارات التكامل
npm run test:e2e

# تشغيل اختبار محدد
npm run test:e2e -- --testNamePattern="Products"
```

#### 3. فحص تغطية الاختبارات
```bash
# تشغيل اختبارات مع تقرير التغطية
npm run test:cov

# عرض تقرير التغطية في المتصفح
open coverage/lcov-report/index.html
# أو على Linux
xdg-open coverage/lcov-report/index.html
```

#### 4. تحليل نتائج الاختبارات
```bash
# يجب أن ترى نتائج مشابهة لهذه:
# Test Suites: 15 passed, 15 total
# Tests:       85 passed, 85 total
# Snapshots:   0 total
# Time:        12.345 s
# Ran all test suites.

# تقرير التغطية:
# Statements   : 72.5% ( 580/800 )
# Branches     : 65.2% ( 130/200 )
# Functions    : 78.1% ( 125/160 )
# Lines        : 71.8% ( 575/800 )
```

### ✅ معايير النجاح
- [ ] جميع اختبارات الوحدة تمر بنجاح
- [ ] جميع اختبارات التكامل تمر بنجاح
- [ ] تغطية الاختبارات أعلى من 70%
- [ ] لا توجد أخطاء في تشغيل الاختبارات

---

## 🔧 التمرين السادس: استكشاف الأخطاء وحلها

### الهدف
تعلم كيفية تشخيص وحل المشاكل الشائعة

### السيناريوهات الشائعة

#### السيناريو 1: خطأ في الاتصال بقاعدة البيانات
```bash
# الخطأ المتوقع:
# Error: connect ECONNREFUSED 127.0.0.1:27017

# خطوات الحل:
# 1. التحقق من حالة Docker
docker-compose ps

# 2. إعادة تشغيل قواعد البيانات
docker-compose down
docker-compose up -d

# 3. التحقق من السجلات
docker-compose logs mongodb

# 4. اختبار الاتصال
docker exec -it kaleem-mongodb mongosh --username admin --password password123
```

#### السيناريو 2: خطأ في تثبيت التبعيات
```bash
# الخطأ المتوقع:
# npm ERR! peer dep missing

# خطوات الحل:
# 1. حذف node_modules و package-lock.json
rm -rf node_modules package-lock.json

# 2. تنظيف cache
npm cache clean --force

# 3. إعادة التثبيت
npm install

# 4. إصلاح الثغرات
npm audit fix
```

#### السيناريو 3: خطأ في متغيرات البيئة
```bash
# الخطأ المتوقع:
# Error: JWT_ACCESS_SECRET is required

# خطوات الحل:
# 1. التحقق من وجود ملف .env
ls -la .env

# 2. مقارنة مع .env.example
diff .env .env.example

# 3. إضافة المتغيرات المفقودة
echo "JWT_ACCESS_SECRET=your-secret-key-here" >> .env

# 4. إعادة تشغيل التطبيق
npm run start:dev
```

#### السيناريو 4: تعارض في المنافذ
```bash
# الخطأ المتوقع:
# Error: listen EADDRINUSE :::3000

# خطوات الحل:
# 1. العثور على العملية المستخدمة للمنفذ
lsof -i :3000
# أو على Windows
netstat -ano | findstr :3000

# 2. إيقاف العملية
kill -9 <PID>
# أو على Windows
taskkill /PID <PID> /F

# 3. أو تغيير المنفذ في .env
echo "PORT=3001" >> .env
```

### مهمة عملية: حل مشكلة مُصطنعة
```bash
# سنقوم بإنشاء مشكلة مقصودة لتتدرب على حلها

# 1. أوقف قاعدة البيانات
docker-compose stop mongodb

# 2. حاول تشغيل التطبيق
npm run start:dev

# 3. ستحصل على خطأ - قم بتشخيصه وحله
# 4. وثق الخطوات التي اتبعتها للحل
```

### ✅ معايير النجاح
- [ ] تمكنت من تشخيص وحل مشكلة قاعدة البيانات
- [ ] تمكنت من حل مشكلة التبعيات
- [ ] تمكنت من إصلاح متغيرات البيئة
- [ ] تمكنت من حل تعارض المنافذ
- [ ] وثقت خطوات الحل لكل مشكلة

---

## 📝 التمرين السابع: إنشاء تقرير الإعداد

### الهدف
توثيق عملية الإعداد وإنشاء تقرير شامل

### المطلوب

#### 1. إنشاء ملف تقرير
```bash
# إنشاء ملف التقرير
touch setup-report.md
code setup-report.md
```

#### 2. محتوى التقرير
```markdown
# تقرير إعداد بيئة التطوير - Kaleem AI

**التاريخ:** [تاريخ اليوم]
**المتدرب:** [اسمك]
**المدة المستغرقة:** [الوقت الفعلي]

## ✅ المهام المكتملة

### تثبيت الأدوات
- [ ] Node.js v[رقم الإصدار]
- [ ] Git v[رقم الإصدار]
- [ ] Docker v[رقم الإصدار]
- [ ] VS Code مع الإضافات

### إعداد المشروع
- [ ] استنساخ المشروع
- [ ] تثبيت التبعيات
- [ ] إعداد متغيرات البيئة
- [ ] تشغيل قواعد البيانات

### اختبار النظام
- [ ] تشغيل التطبيق
- [ ] اختبار الـ APIs
- [ ] تشغيل الاختبارات
- [ ] فحص التغطية

## 🐛 المشاكل التي واجهتها

### المشكلة 1: [وصف المشكلة]
**الحل:** [كيف تم حلها]
**الوقت المستغرق:** [المدة]

### المشكلة 2: [وصف المشكلة]
**الحل:** [كيف تم حلها]
**الوقت المستغرق:** [المدة]

## 📊 إحصائيات النظام

### معلومات البيئة
- **نظام التشغيل:** [Windows/Mac/Linux]
- **معالج:** [نوع المعالج]
- **الذاكرة:** [حجم الذاكرة]
- **المساحة المستخدمة:** [حجم المشروع]

### أداء التطبيق
- **وقت بدء التشغيل:** [بالثواني]
- **استهلاك الذاكرة:** [بالـ MB]
- **زمن استجابة Health Check:** [بالـ ms]

### نتائج الاختبارات
- **عدد الاختبارات:** [العدد الكلي]
- **الاختبارات الناجحة:** [العدد]
- **تغطية الكود:** [النسبة المئوية]

## 💡 الدروس المستفادة

1. [درس مهم تعلمته]
2. [تحدي واجهته وكيف تغلبت عليه]
3. [شيء مفيد اكتشفته]

## 🔮 الخطوات التالية

- [ ] مراجعة الكود الموجود
- [ ] فهم المعمارية بشكل أعمق
- [ ] التحضير لليوم التالي
- [ ] قراءة الوثائق الإضافية

## 📞 الأسئلة المتبقية

1. [سؤال تقني]
2. [استفسار حول المشروع]
3. [طلب توضيح]
```

#### 3. إضافة لقطات شاشة
```bash
# أخذ لقطات شاشة للمراحل المهمة:
# - Swagger UI يعمل
# - نتائج الاختبارات
# - Docker containers تعمل
# - VS Code مع المشروع مفتوح

# إضافة اللقطات للتقرير
mkdir screenshots
# احفظ اللقطات في مجلد screenshots
```

### ✅ معايير النجاح
- [ ] تقرير شامل ومفصل
- [ ] توثيق جميع المشاكل والحلول
- [ ] إحصائيات دقيقة للنظام
- [ ] لقطات شاشة واضحة
- [ ] أسئلة محددة للمتابعة

---

## 🎯 التقييم النهائي

### قائمة فحص شاملة
```
🔧 البيئة التقنية:
- [ ] Node.js v18+ مثبت ويعمل
- [ ] Git مُعد بالمعلومات الصحيحة
- [ ] Docker يعمل بدون مشاكل
- [ ] VS Code مع جميع الإضافات

🚀 المشروع:
- [ ] الكود مستنسخ ومحدث
- [ ] التبعيات مثبتة بنجاح
- [ ] متغيرات البيئة مُعدة
- [ ] قواعد البيانات تعمل

✅ الوظائف:
- [ ] التطبيق يعمل على localhost:3000
- [ ] Health check يعيد نتائج صحيحة
- [ ] Swagger documentation متاح
- [ ] الاختبارات تمر بنجاح

📝 التوثيق:
- [ ] تقرير الإعداد مكتمل
- [ ] المشاكل موثقة مع الحلول
- [ ] لقطات الشاشة مرفقة
- [ ] الأسئلة محددة وواضحة
```

### نقاط التقييم
- **الإعداد التقني (40 نقطة):** تثبيت وإعداد جميع الأدوات
- **تشغيل المشروع (30 نقطة):** نجاح تشغيل التطبيق والاختبارات
- **حل المشاكل (20 نقطة):** القدرة على تشخيص وحل المشاكل
- **التوثيق (10 نقاط):** جودة التقرير والتوثيق

### الدرجة النهائية
- **90-100:** ممتاز - جاهز للانتقال لليوم التالي
- **80-89:** جيد جداً - مراجعة بسيطة مطلوبة
- **70-79:** جيد - مراجعة ودعم إضافي
- **أقل من 70:** يحتاج إعادة التمارين مع دعم مكثف

---

## 📚 موارد إضافية

### روابط مفيدة
- [Node.js Documentation](https://nodejs.org/en/docs/)
- [NestJS Documentation](https://docs.nestjs.com/)
- [Docker Documentation](https://docs.docker.com/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Git Documentation](https://git-scm.com/doc)

### فيديوهات تعليمية
- [Node.js Setup Guide](https://www.youtube.com/watch?v=example)
- [Docker for Beginners](https://www.youtube.com/watch?v=example)
- [VS Code Tips and Tricks](https://www.youtube.com/watch?v=example)

### مجتمعات الدعم
- [NestJS Discord](https://discord.gg/nestjs)
- [Node.js Community](https://nodejs.org/en/get-involved/)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/nestjs)

---

**تهانينا! 🎉 لقد أكملت بنجاح إعداد بيئة التطوير لمشروع Kaleem AI. أنت الآن جاهز للانتقال إلى اليوم التالي وتعلم NestJS Framework بعمق أكبر.**

---

*© 2025 Manus AI - تمارين التدريب التقني*

