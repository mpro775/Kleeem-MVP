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
import { BOT_CHAT_REPOSITORY } from './tokens';
import { BotChatsMongoRepository } from './repositories/bot-chats.mongo.repository';

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
