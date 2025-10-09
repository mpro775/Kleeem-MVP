import { sleep, check } from 'k6';
import http from 'k6/http';

// k6 global - safe access pattern without triggering no-undef
const env = (globalThis && globalThis.__ENV) || {};
const ti = 50;
const CONSTANTS = {
  VUS: ti,
};
export const options = { vus: CONSTANTS.VUS, duration: '30s' };

export function authLogin() {
  const url = env.API_BASE + '/auth/login';
  const payload = JSON.stringify({
    email: env.TEST_EMAIL,
    password: env.TEST_PASSWORD,
  });
  const params = { headers: { 'Content-Type': 'application/json' } };
  const res = http.post(url, payload, params);
  check(res, { 'status 200': (r) => r.status === 200 });
  sleep(1);
}
