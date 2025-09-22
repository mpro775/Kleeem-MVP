// src/modules/kleem/botChats/botChats.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { BotChatsAdminController } from './botChats.admin.controller';
import { BotChatsController } from './botChats.controller';
import { BotChatsService } from './botChats.service';
import { BotChatsMongoRepository } from './repositories/bot-chats.mongo.repository';
import {
  BotChatSession,
  BotChatSessionSchema,
} from './schemas/botChats.schema';
import { BOT_CHAT_REPOSITORY } from './tokens';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BotChatSession.name, schema: BotChatSessionSchema },
    ]),
  ],
  providers: [
    BotChatsService,
    { provide: BOT_CHAT_REPOSITORY, useClass: BotChatsMongoRepository },
  ],
  controllers: [BotChatsController, BotChatsAdminController],
  exports: [BotChatsService],
})
export class BotChatsModule {}
