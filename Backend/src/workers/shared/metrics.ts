import http from 'http';

import * as client from 'prom-client';

const register = new client.Registry();

export async function startMetricsServer(port: number): Promise<void> {
  const server = http.createServer(async (req, res) => {
    if (req.url === '/metrics') {
      try {
        res.writeHead(200, { 'Content-Type': register.contentType });
        const metrics = await register.metrics();
        res.end(metrics);
      } catch (error) {
        console.error('Metrics error:', error);
        res.writeHead(500);
        res.end('Internal Server Error');
      }
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  return new Promise((resolve) => {
    server.listen(port, () => resolve());
  });
}
