# syntax=docker/dockerfile:1.7

########### 🧱 مرحلة البناء (Build Stage) ###########
FROM node:22-alpine AS build
WORKDIR /app

# تثبيت التبعيات الأساسية اللازمة للبناء
RUN apk add --no-cache \
    libc6-compat \
    python3 \
    make \
    g++ \
    curl

# تحسين الكاش: نسخ ملفات الحزم أولاً لتسريع البناء اللاحق
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev=false && npm cache clean --force

# نسخ ملفات التكوين
COPY tsconfig*.json nest-cli.json ./

# نسخ الكود المصدري
COPY . .

# تحديد وضع البيئة أثناء البناء
ARG NODE_ENV=production
ENV NODE_ENV=$NODE_ENV

# بناء التطبيق ثم حذف التبعيات الخاصة بالتطوير
RUN npm run build && npm prune --omit=dev

########### 🚀 مرحلة التشغيل (Runtime Stage) ###########
FROM node:22-alpine AS runtime
WORKDIR /app

# إعداد متغيرات البيئة
ENV NODE_ENV=production \
    PORT=3000 \
    TZ=Asia/Riyadh

# تثبيت أدوات خفيفة لتحسين إدارة الإشارات والشهادات
RUN apk add --no-cache \
    dumb-init \
    curl \
    wget \
    ca-certificates \
    && update-ca-certificates

# إنشاء مستخدم غير جذري لأمان أعلى
RUN addgroup -S app && adduser -S app -G app

# نسخ الملفات من مرحلة البناء
COPY --from=build --chown=app:app /app/dist ./dist
COPY --from=build --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/package*.json ./

# فحص الصحة (Healthcheck)
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://127.0.0.1:${PORT}/api/health || exit 1

# فتح المنفذ
EXPOSE 3000

# التشغيل كمستخدم غير جذري
USER app

# نقطة الدخول
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
