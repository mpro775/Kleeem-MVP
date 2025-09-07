import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AiReplyWorkerModule } from './ai-reply.worker.module';
import { startMetricsServer } from './shared/metrics';

async function bootstrap() {
  const port = Number(process.env.METRICS_PORT || 9101);
  startMetricsServer(port);
  await NestFactory.createApplicationContext(AiReplyWorkerModule, {
    logger: ['log', 'error', 'warn'],
  });
  console.log('🤖 AI Reply worker started');
}
bootstrap();
