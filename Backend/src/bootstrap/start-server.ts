// Server startup configuration
import type { INestApplication } from '@nestjs/common';

const DEFAULT_PORT = Number(process.env.APP_DEFAULT_PORT ?? '3000'); // named const avoids "magic number"

export async function startServer(app: INestApplication): Promise<void> {
  const port = Number(process.env.PORT ?? DEFAULT_PORT);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`🚀 Backend running on http://localhost:${port}/api`);
}
