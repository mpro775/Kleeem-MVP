/* global __ENV */
import http from 'k6/http';
import { sleep, check } from 'k6';

// k6 Authentication Smoke Test
// Tests authentication endpoint under light load

export const options = {
  vus: 20,           // 20 virtual users
  duration: '1m',    // for 1 minute
  thresholds: {
    http_req_duration: ['p95<400'],  // 95% requests < 400ms
    http_req_failed: ['rate<0.1'],   // Error rate < 10%
  },
};

const base = __ENV.API_BASE || 'http://localhost:3000';

export default function () {
  // Test login endpoint
  const loginPayload = JSON.stringify({
    email: __ENV.TEST_EMAIL || 'test@example.com',
    password: __ENV.TEST_PASSWORD || 'testpassword123',
  });

  const res = http.post(`${base}/api/auth/login`, loginPayload, {
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'k6-smoke-test',
    },
  });

  // Validate response
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 400ms': (r) => r.timings.duration < 400,
    'has access token': (r) => r.json('accessToken') !== undefined,
    'has refresh token': (r) => r.json('refreshToken') !== undefined,
  });

  // Simulate user behavior
  sleep(Math.random() * 2 + 1); // 1-3 second delay
}
