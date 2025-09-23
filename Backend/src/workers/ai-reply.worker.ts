import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';

import { AiReplyWorkerModule } from './ai-reply.worker.module';
import { startMetricsServer } from './shared/metrics';

const METRICS_PORT = 9101;

async function bootstrap() {
  const port = Number(process.env.METRICS_PORT || METRICS_PORT);
  void startMetricsServer(port);
  await NestFactory.createApplicationContext(AiReplyWorkerModule, {
    logger: ['log', 'error', 'warn'],
  }).catch((err) => {
    console.error('Failed to start worker:', err);
    process.exit(1);
  });
}

void bootstrap();
