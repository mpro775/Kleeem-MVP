// Server startup configuration
import type { INestApplication } from '@nestjs/common';

export async function startServer(app: INestApplication): Promise<void> {
  // احسب الافتراضي لحظة الاستدعاء (يدعم تغييرات الاختبار على process.env)
  const defaultPort = Number(process.env.APP_DEFAULT_PORT ?? '3000');
  const port = Number(process.env.PORT ?? defaultPort);

  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`🚀 Backend running on http://localhost:${port}/api`);
}
