// src/modules/kleem/botChats/botChats.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  BotChatSession,
  BotChatSessionSchema,
} from './schemas/botChats.schema';
import { BotChatsService } from './botChats.service';
import { BotChatsController } from './botChats.controller';
import { BotChatsAdminController } from './botChats.admin.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BotChatSession.name, schema: BotChatSessionSchema },
    ]),
  ],
  providers: [BotChatsService],
  controllers: [BotChatsController, BotChatsAdminController],
  exports: [BotChatsService],
})
export class BotChatsModule {}
