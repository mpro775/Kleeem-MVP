import { Module } from '@nestjs/common';

import { ChatMediaService } from './chat-media.service';

@Module({
  providers: [ChatMediaService],
  exports: [ChatMediaService], // ضروري للتصدير لباقي الموديولات
})
export class ChatMediaModule {}
