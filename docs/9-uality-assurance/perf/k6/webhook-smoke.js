/* global __ENV */
import http from 'k6/http';
import { check, sleep } from 'k6';
import crypto from 'k6/crypto';

// k6 Webhook Processing Smoke Test
// Tests webhook endpoint signature verification and processing

export const options = {
  vus: 10,           // 10 virtual users
  duration: '1m',    // for 1 minute
  thresholds: {
    http_req_duration: ['p95<1000'],  // 95% requests < 1s
    http_req_failed: ['rate<0.1'],    // Error rate < 10%
  },
};

const base = __ENV.API_BASE || 'http://localhost:3000';

// Generate HMAC signature for webhook payload
function generateSignature(payload, secret) {
  const signature = crypto.hmac('sha256', secret, payload, 'hex');
  return `sha256=${signature}`;
}

export default function () {
  const merchantId = __ENV.MERCHANT_ID || '507f1f77bcf86cd799439011';
  const webhookSecret = __ENV.WEBHOOK_SECRET || 'test-secret';

  // Test webhook payload
  const payload = JSON.stringify({
    merchantId: merchantId,
    channel: 'webchat',
    sessionId: `k6-${Math.random().toString(36).slice(2)}`,
    text: 'Hello from k6 performance test',
    timestamp: Date.now(),
  });

  const signature = generateSignature(payload, webhookSecret);

  const res = http.post(`${base}/api/webhooks/test-bot-reply/${merchantId}`, payload, {
    headers: {
      'Content-Type': 'application/json',
      'X-Timestamp': Date.now().toString(),
      'X-Signature': signature,
      'User-Agent': 'k6-webhook-test',
    },
  });

  // Validate response
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 1000ms': (r) => r.timings.duration < 1000,
    'webhook processed': (r) => r.json('success') === true,
    'has response text': (r) => r.json('response') !== undefined,
  });

  // Simulate realistic user behavior
  sleep(Math.random() * 3 + 1); // 1-4 second delay
}
