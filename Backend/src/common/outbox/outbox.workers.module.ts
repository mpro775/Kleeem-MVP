// src/modules/outbox/outbox.workers.module.ts
import { Module } from '@nestjs/common';
import { OutboxModule } from './outbox.module';
import { OutboxDispatcher } from './outbox.dispatcher';

@Module({
  imports: [OutboxModule],
  providers: [OutboxDispatcher],
})
export class OutboxWorkersModule {}
