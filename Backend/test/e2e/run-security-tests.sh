#!/bin/bash
# test/e2e/run-security-tests.sh
# ✅ H1-H4: اختبارات الأمان الشاملة

echo "🧪 Running Security & Integration Tests"
echo "======================================"

# إعداد متغيرات البيئة للاختبار
export NODE_ENV=test
export JWT_SECRET=test-secret-32-chars-minimum-for-testing
export JWT_ACCESS_TTL=15m
export JWT_REFRESH_TTL=7d
export REDIS_URL=redis://localhost:6379
export TELEGRAM_WEBHOOK_SECRET=test-telegram-secret-16chars
export EVOLUTION_APIKEY=test-evolution-key-16chars-min
export DATABASE_URL=mongodb://localhost:27017/kaleem-test

echo "🔧 Environment configured for testing"

# بدء الخدمات المطلوبة
echo "🚀 Starting required services..."

# تحقق من Redis
if ! redis-cli ping > /dev/null 2>&1; then
    echo "❌ Redis is not running. Please start Redis first:"
    echo "   docker run -d -p 6379:6379 redis:alpine"
    exit 1
fi

# تحقق من MongoDB
if ! mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
    echo "❌ MongoDB is not running. Please start MongoDB first:"
    echo "   docker run -d -p 27017:27017 mongo:latest"
    exit 1
fi

echo "✅ Services are running"

# تشغيل الاختبارات
echo "🧪 Running E2E Security Tests..."

# H1: WhatsApp Cloud Scenario
echo "📱 Testing WhatsApp Cloud Webhook Security..."
npx jest test/e2e/webhooks/whatsapp-cloud.e2e.spec.ts --verbose

# H2: Telegram Scenario  
echo "📨 Testing Telegram Webhook Security..."
npx jest test/e2e/webhooks/telegram.e2e.spec.ts --verbose

# H3: Evolution API Scenario
echo "💬 Testing Evolution API Security..."
npx jest test/e2e/webhooks/evolution.e2e.spec.ts --verbose

# H4: JWT & WebSocket Scenario
echo "🔐 Testing JWT & WebSocket Security..."
npx jest test/e2e/auth/jwt-websocket.e2e.spec.ts --verbose

echo ""
echo "✅ All security tests completed!"
echo ""
echo "📊 To check metrics after tests:"
echo "   curl http://localhost:3000/metrics | grep -E '(http_errors|security_events|jwt_operations|websocket_events)'"
echo ""
echo "🔍 To check logs for redacted data:"
echo "   tail -f logs/app.log | grep -v '[REDACTED]' # Should not show sensitive data"
