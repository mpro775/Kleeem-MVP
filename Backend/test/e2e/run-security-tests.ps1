# test/e2e/run-security-tests.ps1
# ✅ H1-H4: اختبارات الأمان الشاملة

Write-Host "🧪 Running Security & Integration Tests" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green

# إعداد متغيرات البيئة للاختبار
$env:NODE_ENV = "test"
$env:JWT_SECRET = "test-secret-32-chars-minimum-for-testing"
$env:JWT_ACCESS_TTL = "15m"
$env:JWT_REFRESH_TTL = "7d"
$env:REDIS_URL = "redis://localhost:6379"
$env:TELEGRAM_WEBHOOK_SECRET = "test-telegram-secret-16chars"
$env:EVOLUTION_APIKEY = "test-evolution-key-16chars-min"
$env:DATABASE_URL = "mongodb://localhost:27017/kaleem-test"

Write-Host "🔧 Environment configured for testing" -ForegroundColor Yellow

# تحقق من الخدمات المطلوبة
Write-Host "🚀 Checking required services..." -ForegroundColor Blue

# تحقق من Redis
try {
    $redisTest = redis-cli ping 2>$null
    if ($redisTest -ne "PONG") {
        throw "Redis not responding"
    }
    Write-Host "✅ Redis is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Redis is not running. Please start Redis first:" -ForegroundColor Red
    Write-Host "   docker run -d -p 6379:6379 redis:alpine" -ForegroundColor Yellow
    exit 1
}

# تحقق من MongoDB
try {
    mongosh --eval "db.adminCommand('ping')" --quiet 2>$null | Out-Null
    Write-Host "✅ MongoDB is running" -ForegroundColor Green
} catch {
    Write-Host "❌ MongoDB is not running. Please start MongoDB first:" -ForegroundColor Red
    Write-Host "   docker run -d -p 27017:27017 mongo:latest" -ForegroundColor Yellow
    exit 1
}

# تشغيل الاختبارات
Write-Host "🧪 Running E2E Security Tests..." -ForegroundColor Blue

# H1: WhatsApp Cloud Scenario
Write-Host "📱 Testing WhatsApp Cloud Webhook Security..." -ForegroundColor Cyan
npx jest test/e2e/webhooks/whatsapp-cloud.e2e.spec.ts --verbose

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ WhatsApp Cloud tests failed" -ForegroundColor Red
    exit 1
}

# H2: Telegram Scenario  
Write-Host "📨 Testing Telegram Webhook Security..." -ForegroundColor Cyan
npx jest test/e2e/webhooks/telegram.e2e.spec.ts --verbose

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Telegram tests failed" -ForegroundColor Red
    exit 1
}

# H3: Evolution API Scenario
Write-Host "💬 Testing Evolution API Security..." -ForegroundColor Cyan
npx jest test/e2e/webhooks/evolution.e2e.spec.ts --verbose

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Evolution API tests failed" -ForegroundColor Red
    exit 1
}

# H4: JWT & WebSocket Scenario
Write-Host "🔐 Testing JWT & WebSocket Security..." -ForegroundColor Cyan
npx jest test/e2e/auth/jwt-websocket.e2e.spec.ts --verbose

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ JWT & WebSocket tests failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ All security tests completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 To check metrics after tests:" -ForegroundColor Yellow
Write-Host "   curl http://localhost:3000/metrics | Select-String -Pattern '(http_errors|security_events|jwt_operations|websocket_events)'" -ForegroundColor Gray
Write-Host ""
Write-Host "🔍 To check logs for redacted data:" -ForegroundColor Yellow
Write-Host "   Get-Content logs/app.log | Where-Object { $_ -notmatch '\[REDACTED\]' }" -ForegroundColor Gray
