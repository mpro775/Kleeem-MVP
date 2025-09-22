// src/modules/faq/faq.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { OutboxModule } from '../../common/outbox/outbox.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { VectorModule } from '../vector/vector.module';

import { FaqController } from './faq.controller';
import { FaqService } from './faq.service';
import { MongoFaqRepository } from './repositories/mongo-faq.repository';
import { Faq, FaqSchema } from './schemas/faq.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Faq.name, schema: FaqSchema }]),
    forwardRef(() => VectorModule),
    NotificationsModule,
    OutboxModule,
  ],
  providers: [
    FaqService,
    {
      provide: 'FaqRepository',
      useClass: MongoFaqRepository,
    },
  ],
  controllers: [FaqController],
  exports: [FaqService],
})
export class FaqModule {}
