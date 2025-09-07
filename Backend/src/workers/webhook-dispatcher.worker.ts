import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { WebhookDispatcherWorkerModule } from './webhook-dispatcher.worker.module';
import { startMetricsServer } from './shared/metrics';

async function bootstrap() {
  const port = Number(process.env.METRICS_PORT || 9102);
  startMetricsServer(port);
  await NestFactory.createApplicationContext(WebhookDispatcherWorkerModule, {
    logger: ['log', 'error', 'warn'],
  });
  console.log('📮 Webhook Dispatcher worker started');
}
bootstrap();
