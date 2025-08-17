import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

export let options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '1m', target: 200 },
    { duration: '2m', target: 500 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    'webhook_ack_time{type:inbound}': ['p(95)<1000'],
  },
};

const ackTime = new Trend('webhook_ack_time', true);

const BASE = __ENV.API_BASE || 'http://localhost:3000';

export default function () {
  const payload = JSON.stringify({
    channel: 'telegram',
    message: { text: 'مرحبا كليم! أريد مساعدة في الطلب.' },
    meta: { test: true }
  });

  const headers = { 'Content-Type': 'application/json' };
  const start = Date.now();
  const res = http.post(`${BASE}/webhooks/telegram`, payload, { headers });
  const took = Date.now() - start;
  ackTime.add(took, { type: 'inbound' });

  check(res, {
    'status is 2xx/202': (r) => r.status === 200 || r.status === 202,
  });

  sleep(1);
}
