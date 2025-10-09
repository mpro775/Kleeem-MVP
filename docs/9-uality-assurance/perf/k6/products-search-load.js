/* global __ENV */
import http from 'k6/http';
import { check, sleep } from 'k6';

// k6 Products Search Load Test
// Tests product search endpoint under moderate load with caching

export const options = {
  stages: [
    { duration: '30s', target: 50 },   // Ramp up to 50 users
    { duration: '1m', target: 100 },   // Ramp up to 100 users
    { duration: '30s', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p95<500'],    // 95% requests < 500ms
    http_req_failed: ['rate<0.05'],    // Error rate < 5%
  },
};

const base = __ENV.API_BASE || 'http://localhost:3000';

export default function () {
  const merchantId = __ENV.MERCHANT_ID || '507f1f77bcf86cd799439011';

  // Test product search with various parameters
  const searchQueries = [
    'phone',
    'laptop',
    'headphones',
    'charger',
    'case'
  ];

  const query = searchQueries[Math.floor(Math.random() * searchQueries.length)];

  const res = http.get(`${base}/api/products?merchantId=${merchantId}&search=${query}&limit=20`, {
    headers: {
      'User-Agent': 'k6-products-test',
      'Accept': 'application/json',
    },
  });

  // Validate response
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
    'has products array': (r) => Array.isArray(r.json('products')),
    'products not empty': (r) => r.json('products').length > 0,
    'has pagination': (r) => r.json('pagination') !== undefined,
  });

  // Simulate realistic user behavior
  sleep(Math.random() * 2 + 0.5); // 0.5-2.5 second delay
}

// Setup function - runs before the test
export function setup() {
  console.log('🚀 Starting products search load test');
  console.log(`Target: ${base}`);
  console.log(`Merchant ID: ${__ENV.MERCHANT_ID || 'default'}`);
}

// Teardown function - runs after the test
export function teardown(data) {
  console.log('✅ Products search load test completed');
  console.log(`Total requests: ${data.metrics.http_reqs.values.count}`);
  console.log(`Average response time: ${Math.round(data.metrics.http_req_duration.values.avg)}ms`);
}
