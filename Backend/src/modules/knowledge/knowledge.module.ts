// src/modules/knowledge/knowledge.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SourceUrl, SourceUrlSchema } from './schemas/source-url.schema';
import { KnowledgeController } from './knowledge.controller';
import { KnowledgeService } from './knowledge.service';
import { VectorModule } from '../vector/vector.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OutboxModule } from 'src/common/outbox/outbox.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SourceUrl.name, schema: SourceUrlSchema },
    ]),
    VectorModule,
      NotificationsModule,
    OutboxModule,
  ],
  controllers: [KnowledgeController],
  providers: [KnowledgeService],
})
export class KnowledgeModule {}
