import { check } from 'k6';
import http from 'k6/http';

// k6 global - safe access pattern for environments without __ENV
const env = (globalThis && globalThis.__ENV) || {};

export const options = { vus: 100, duration: '1m' };

export default function () {
  const url = env.API_BASE + '/vector/unified-search';
  const payload = JSON.stringify({
    merchantId: env.MERCHANT_ID || 'test-merchant',
    query: 'زيت محرك',
    topK: 3,
  });
  const params = { headers: { 'Content-Type': 'application/json' } };
  const res = http.post(url, payload, params);
  check(res, { 'status 200': (r) => r.status === 200 });
}
