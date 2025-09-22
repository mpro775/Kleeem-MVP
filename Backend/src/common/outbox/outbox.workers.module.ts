// src/modules/outbox/outbox.workers.module.ts
import { Module } from '@nestjs/common';

import { OutboxDispatcher } from './outbox.dispatcher';
import { OutboxModule } from './outbox.module';

@Module({
  imports: [OutboxModule],
  providers: [OutboxDispatcher],
})
export class OutboxWorkersModule {}
