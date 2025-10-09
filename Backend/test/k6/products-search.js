import { sleep, check } from 'k6';
import http from 'k6/http';

// k6 global - safe access pattern for environments without __ENV
const env = (globalThis && globalThis.__ENV) || {};
const ti = 50;
const hi = 0.5;
export const options = {
  stages: [
    { duration: '10s', target: 20 },
    { duration: '20s', target: ti },
    { duration: '10s', target: 0 },
  ],
};

export function productsSearch() {
  const url = `${env.API_BASE}/products/search?q=brake`;
  const res = http.get(url);
  check(res, { 'status 200': (r) => r.status === 200 });
  sleep(hi);
}
