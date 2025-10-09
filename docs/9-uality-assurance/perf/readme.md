# Performance Testing Scripts (k6)

## Overview
This directory contains k6 (https://k6.io) scripts for load testing and performance monitoring of Kaleem AI.

## Scripts

### 1. Authentication Smoke Test
**File**: `auth-login-smoke.js`
- **Purpose**: Test authentication endpoint under light load
- **Load**: 20 virtual users for 1 minute
- **Target**: < 400ms response time, < 10% error rate

### 2. Webhook Processing Test
**File**: `webhook-smoke.js`
- **Purpose**: Test webhook signature verification and processing
- **Load**: 10 virtual users for 1 minute
- **Target**: < 1000ms response time, webhook processing success

### 3. Products Search Load Test
**File**: `products-search-load.js`
- **Purpose**: Test product search with caching under moderate load
- **Load**: Ramp up from 50 to 100 users over 2 minutes
- **Target**: < 500ms response time, < 5% error rate

## Usage

### Prerequisites
```bash
# Install k6
curl -s https://api.github.com/repos/grafana/k6/releases/latest | grep "browser_download_url.*linux-amd64.tar.gz" | cut -d '"' -f 4 | xargs curl -L -o k6.tar.gz && tar -xzf k6.tar.gz && sudo mv k6 /usr/local/bin/

# Or use Docker
docker run --rm -i grafana/k6 run --vus 10 --duration 30s script.js
```

### Running Tests Locally
```bash
# Set environment variables
export API_BASE="http://localhost:3000"
export TEST_EMAIL="test@example.com"
export TEST_PASSWORD="testpassword123"
export MERCHANT_ID="507f1f77bcf86cd799439011"
export WEBHOOK_SECRET="your-webhook-secret"

# Run authentication test
k6 run auth-login-smoke.js

# Run webhook test
k6 run webhook-smoke.js

# Run products search test
k6 run products-search-load.js
```

### Running Tests Against Staging
```bash
# Set staging environment
export API_BASE="https://staging-api.kaleem-ai.com"
export MERCHANT_ID="your-staging-merchant-id"

# Run tests
k6 run products-search-load.js --out json=results.json
```

### Environment Variables
| Variable | Description | Example |
|----------|-------------|---------|
| `API_BASE` | Base URL for API | `http://localhost:3000` |
| `TEST_EMAIL` | Test user email | `test@example.com` |
| `TEST_PASSWORD` | Test user password | `testpassword123` |
| `MERCHANT_ID` | Test merchant ID | `507f1f77bcf86cd799439011` |
| `WEBHOOK_SECRET` | Webhook signature secret | `your-secret` |

## Test Scenarios

### Smoke Testing
- **Purpose**: Quick validation of critical functionality
- **Duration**: 1 minute
- **Users**: 10-20 virtual users
- **Frequency**: Before each deployment

### Load Testing
- **Purpose**: Test system under expected load
- **Duration**: 2-5 minutes
- **Users**: 50-200 virtual users
- **Frequency**: Weekly or before major releases

### Stress Testing
- **Purpose**: Find system breaking points
- **Duration**: 5-10 minutes
- **Users**: 200-1000 virtual users
- **Frequency**: Monthly or for capacity planning

## Metrics & Thresholds

### Performance Targets
| Endpoint | p95 Response Time | Error Rate | Throughput |
|----------|------------------|------------|------------|
| `/api/auth/login` | < 400ms | < 10% | 20 req/sec |
| `/api/webhooks/test-bot-reply` | < 1000ms | < 5% | 10 req/sec |
| `/api/products` | < 500ms | < 5% | 100 req/sec |

### Monitoring Metrics
- **Response Time**: p50, p95, p99 percentiles
- **Error Rate**: HTTP 4xx/5xx percentage
- **Throughput**: Requests per second
- **Resource Usage**: CPU, memory, disk I/O

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Performance Tests
on:
  schedule:
    - cron: '0 2 * * 1'  # Weekly on Monday at 2 AM
  workflow_dispatch:

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: grafana/k6-action@v0.3.1
        with:
          filename: perf/k6/products-search-load.js
        env:
          API_BASE: ${{ secrets.STAGING_API_URL }}
          MERCHANT_ID: ${{ secrets.TEST_MERCHANT_ID }}
```

## Results Analysis

### k6 Output Interpretation
```bash
# Example output
http_req_duration.............: avg=245.67ms, med=198ms, p95=456ms, p99=789ms
http_req_failed...............: 0.00% ✓
http_reqs.....................: 1234 requests
```

### Performance Issues to Watch
- **High p95/p99**: Indicates slow requests for some users
- **High Error Rate**: System instability or resource exhaustion
- **Low Throughput**: Bottlenecks in the system
- **Memory Leaks**: Gradual increase in response time

## Troubleshooting

### Common Issues
- **Connection Refused**: API server not running
- **Authentication Failed**: Invalid test credentials
- **Timeout Errors**: Server overloaded or network issues
- **High Error Rate**: Database or external service issues

### Debug Commands
```bash
# Check API health
curl http://localhost:3000/api/health

# Check database connectivity
docker exec mongo mongosh --eval "db.adminCommand('ping')"

# Check Redis connectivity
docker exec redis redis-cli ping

# Check system resources
docker stats
```

## Best Practices

### Test Design
- **Realistic Scenarios**: Use actual user behavior patterns
- **Gradual Ramp-up**: Don't shock the system with sudden load
- **Multiple Iterations**: Run tests multiple times for consistency
- **Environment Isolation**: Use staging environment for load testing

### Performance Optimization
- **Cache Warmup**: Ensure cache is populated before testing
- **Database Indexes**: Verify indexes are optimized
- **Connection Pooling**: Check database connection limits
- **Resource Monitoring**: Monitor CPU, memory, disk during tests

### Reporting
- **Automated Reports**: Save results to JSON/CSV
- **Trend Analysis**: Compare results over time
- **Alerting**: Set up alerts for performance regression
- **Documentation**: Document test results and findings
