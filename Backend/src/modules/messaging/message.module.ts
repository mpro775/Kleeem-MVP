// src/modules/messaging/message.module.ts
import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AiModule } from '../ai/ai.module';
import { ChatModule } from '../chat/chat.module';
import { InstructionsModule } from '../instructions/instructions.module';

import { ChatLinksController } from './chat-links.controller';
import { MessageController } from './message.controller';
import { MessageService } from './message.service';
import { MessageMongoRepository } from './repositories/message.mongo.repository';
import { MessageSession, MessageSessionSchema } from './schemas/message.schema';
import { MESSAGE_SESSION_REPOSITORY } from './tokens';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MessageSession.name, schema: MessageSessionSchema },
    ]),
    forwardRef(() => ChatModule), // أهم نقطة
    forwardRef(() => InstructionsModule), // أهم نقطة
    forwardRef(() => AiModule),
  ],
  providers: [
    MessageService,
    { provide: MESSAGE_SESSION_REPOSITORY, useClass: MessageMongoRepository },
  ],
  controllers: [MessageController, ChatLinksController],
  exports: [MessageService],
})
export class MessagingModule {}
