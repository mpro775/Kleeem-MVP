// src/modules/faq/faq.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Faq, FaqSchema } from './schemas/faq.schema';
import { FaqService } from './faq.service';
import { FaqController } from './faq.controller';
import { VectorModule } from '../vector/vector.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OutboxModule } from '../../common/outbox/outbox.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Faq.name, schema: FaqSchema }]),
    forwardRef(() => VectorModule),
    NotificationsModule,
    OutboxModule,
  ],
  providers: [FaqService],
  controllers: [FaqController],
  exports: [FaqService],
})
export class FaqModule {}
