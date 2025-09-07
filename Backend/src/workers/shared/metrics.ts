import http from 'http';
import * as client from 'prom-client';

const register = new client.Registry();
client.collectDefaultMetrics({ register });

export function startMetricsServer(port: number) {
  http
    .createServer((req, res) => {
      if (req.url === '/metrics') {
        res.writeHead(200, { 'Content-Type': register.contentType });
        register.metrics().then((metrics) => res.end(metrics));
      } else {
        res.writeHead(404);
        res.end();
      }
    })
    .listen(port, () => console.log(`📈 metrics on :${port}`));
}
