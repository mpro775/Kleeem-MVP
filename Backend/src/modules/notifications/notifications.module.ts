import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { UsersModule } from '../users/users.module';

import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationMongoRepository } from './repositories/notification.mongo.repository';
import {
  Notification,
  NotificationSchema,
} from './schemas/notification.schema';
import { NOTIFICATION_REPOSITORY } from './tokens';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
    ]),
    UsersModule, // نحتاج UsersService لقراءة تفضيلات الإشعارات
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    { provide: NOTIFICATION_REPOSITORY, useClass: NotificationMongoRepository },
  ],
  exports: [NotificationsService], // لتستخدمها باقي الموديولات (مثلاً merchants)
})
export class NotificationsModule {}
