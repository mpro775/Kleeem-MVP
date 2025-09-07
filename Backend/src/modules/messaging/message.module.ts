// src/modules/messaging/message.module.ts
import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MessageSession, MessageSessionSchema } from './schemas/message.schema';
import { MessageService } from './message.service';
import { MessageController } from './message.controller';
import { ChatLinksController } from './chat-links.controller';
import { ChatModule } from '../chat/chat.module';
import { InstructionsModule } from 'src/modules/instructions/instructions.module';
import { AiModule } from '../ai/ai.module';
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MessageSession.name, schema: MessageSessionSchema },
    ]),
    forwardRef(() => ChatModule), // أهم نقطة
    forwardRef(() => InstructionsModule), // أهم نقطة
    forwardRef(() => AiModule),
  ],
  providers: [MessageService],
  controllers: [MessageController, ChatLinksController],
  exports: [MessageService],
})
export class MessagingModule {}
