import { Module } from '@nestjs/common';

import { StorageModule } from '../../common/storage/storage.module';

import { ChatMediaService } from './chat-media.service';

@Module({
  imports: [StorageModule],
  providers: [ChatMediaService],
  exports: [ChatMediaService], // ضروري للتصدير لباقي الموديولات
})
export class ChatMediaModule {}
