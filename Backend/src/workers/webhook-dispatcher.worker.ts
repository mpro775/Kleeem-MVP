import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { METRICS_PORT_WEBHOOK_DISPATCHER } from 'src/common/constants/common';

import { startMetricsServer } from './shared/metrics';
import { WebhookDispatcherWorkerModule } from './webhook-dispatcher.worker.module';

async function bootstrap() {
  const port = Number(
    process.env.METRICS_PORT || METRICS_PORT_WEBHOOK_DISPATCHER,
  );
  void startMetricsServer(port);
  await NestFactory.createApplicationContext(WebhookDispatcherWorkerModule, {
    logger: ['log', 'error', 'warn'],
  }).catch((err) => {
    console.error('Failed to start worker:', err);
    process.exit(1);
  });
}

void bootstrap();
