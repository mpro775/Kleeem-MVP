# syntax=docker/dockerfile:1.7

########### مرحلة البناء ###########
FROM node:20-alpine AS build
WORKDIR /app

# تثبيت التبعيات الأساسية
RUN apk add --no-cache \
    libc6-compat \
    python3 \
    make \
    g++ \
    curl

# تحسين الكاش - نسخ package.json أولاً
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev=false && npm cache clean --force
COPY tsconfig*.json nest-cli.json ./
# نسخ الكود المصدري
COPY . .


# إعداد متغير البيئة للبناء
ARG NODE_ENV=production
ENV NODE_ENV=$NODE_ENV

# بناء التطبيق وحذف dev dependencies
RUN npm run build && npm prune --omit=dev

########### مرحلة التشغيل ###########
FROM node:20-alpine AS runtime
WORKDIR /app

# إعداد متغيرات البيئة
ENV NODE_ENV=production \
    PORT=3000 \
    TZ=Asia/Riyadh

# تثبيت الأدوات الأساسية
RUN apk add --no-cache \
    dumb-init \
    curl \
    wget \
    ca-certificates \
    && update-ca-certificates

# إنشاء مستخدم غير جذري
RUN addgroup -S app && adduser -S app -G app

# نسخ الملفات من مرحلة البناء
COPY --from=build --chown=app:app /app/dist ./dist
COPY --from=build --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/package*.json ./

# إعداد فحص الصحة
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD curl -fsS http://127.0.0.1:${PORT}/api/health || exit 1

# فتح المنفذ
EXPOSE 3000

# تشغيل كمستخدم غير جذري
USER app

# تشغيل نظيف مع معالجة الإشارات
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
