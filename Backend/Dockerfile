FROM node:18-alpine

# تثبيت تبعيات النظام الضرورية (Playwright والأدوات)
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    libgcc \
    libstdc++ \
    dumb-init

WORKDIR /usr/src/app

# نسخ ملفات تعريف الاعتماديات أولاً للحفاظ على الكاش
COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./

# تثبيت الاعتماديات قبل نسخ الشيفرة لتجنب إعادة التثبيت عند تغيّر الكود
RUN npm ci
RUN npx playwright install

# ثم نسخ باقي الشيفرة
COPY src/ ./src

# البناء
RUN npm run build -- --webpack=false

# ضبط بيئة التشغيل
ENV NODE_ENV=production

# نقطة الدخول للتطبيق
CMD ["node", "dist/main.js"]
