import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { OutboxModule } from '../../common/outbox/outbox.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { VectorModule } from '../vector/vector.module';

import { KnowledgeService } from './knowledge.service';
import { SourceUrlMongoRepository } from './repositories/source-url.mongo.repository';
import { SourceUrl, SourceUrlSchema } from './schemas/source-url.schema';
import { SOURCE_URL_REPOSITORY } from './tokens';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SourceUrl.name, schema: SourceUrlSchema },
    ]),
    forwardRef(() => VectorModule),
    NotificationsModule, // ✅ Import NotificationsModule instead of providing NotificationsService directly
    OutboxModule, // ✅ Import OutboxModule instead of providing OutboxService directly
  ],
  providers: [
    KnowledgeService,
    // Removed OutboxService from here - it's provided by OutboxModule
    { provide: SOURCE_URL_REPOSITORY, useClass: SourceUrlMongoRepository },
  ],
  exports: [KnowledgeService],
})
export class KnowledgeModule {}
