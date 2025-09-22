import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AiBridgeConsumer } from './ai-bridge.consumer'; // عدّل المسار

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  providers: [AiBridgeConsumer],
})
export class WebhookDispatcherWorkerModule {}
