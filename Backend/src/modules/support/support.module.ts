// src/modules/support/support.module.ts
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';

import { StorageModule } from '../../common/storage/storage.module';
import { MailModule } from '../mail/mail.module';
import { NotificationsModule } from '../notifications/notifications.module';

import { SupportMongoRepository } from './repositories/support.mongo.repository';
import {
  SupportTicket,
  SupportTicketSchema,
} from './schemas/support-ticket.schema';
import { SupportAdminController } from './support.admin.controller';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';
import { SUPPORT_REPOSITORY } from './tokens';

@Module({
  imports: [
    HttpModule,
    MulterModule.register({}),
    MongooseModule.forFeature([
      { name: SupportTicket.name, schema: SupportTicketSchema },
    ]),
    StorageModule,
    MailModule,
    NotificationsModule,
  ],
  controllers: [SupportController, SupportAdminController],
  providers: [
    SupportService,
    { provide: SUPPORT_REPOSITORY, useClass: SupportMongoRepository },
  ],
  exports: [SupportService],
})
export class SupportModule {}
