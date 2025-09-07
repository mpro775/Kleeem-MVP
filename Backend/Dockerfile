# syntax=docker/dockerfile:1.7

########### تبعيات الإنتاج فقط ###########
FROM node:20-alpine AS deps-prod
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

########### تبعيات التطوير (لبناء TypeScript) ###########
FROM node:20-alpine AS deps-dev
WORKDIR /app
COPY package*.json ./
RUN npm ci && npm cache clean --force

########### البناء ###########
FROM node:20-alpine AS builder
WORKDIR /app
# لازم package*.json هنا علشان npm run build
COPY package*.json ./
COPY tsconfig*.json nest-cli.json ./
COPY src ./src
COPY --from=deps-dev /app/node_modules ./node_modules
# لو تحتاج أوامر قبل البناء (مثلاً prisma generate) ضعها هنا
# RUN npm run prisma:generate
RUN npm run build -- --webpack=false

########### التشغيل (صورة نهائية صغيرة) ###########
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps-prod /app/node_modules ./node_modules
COPY --from=builder  /app/dist        ./dist
COPY package*.json ./
RUN addgroup -S app && adduser -S app -G app
USER app
CMD ["node", "dist/main.js"]
