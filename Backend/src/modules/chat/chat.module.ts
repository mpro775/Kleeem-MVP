// src/chat/chat.module.ts
import { HttpModule } from '@nestjs/axios';
import { forwardRef, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';

import { CacheModule } from '../../common/cache/cache.module';
import { MetricsModule } from '../../metrics/metrics.module';
import { MerchantsModule } from '../merchants/merchants.module';

import { ChatWidgetController } from './chat-widget.controller';
import { ChatWidgetService } from './chat-widget.service';
import { ChatGateway } from './chat.gateway';
import { PublicChatWidgetController } from './public-chat-widget.controller';
import { MongoChatWidgetRepository } from './repositories/mongo-chat-widget.repository';
import {
  ChatWidgetSettings,
  ChatWidgetSettingsSchema,
} from './schema/chat-widget.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ChatWidgetSettings.name, schema: ChatWidgetSettingsSchema },
    ]),
    forwardRef(() => MerchantsModule),
    HttpModule,
    MetricsModule,
    JwtModule,
    CacheModule,
  ],
  providers: [
    ChatGateway,
    ChatWidgetService,
    {
      provide: 'ChatWidgetRepository',
      useClass: MongoChatWidgetRepository,
    },
  ],
  controllers: [ChatWidgetController, PublicChatWidgetController],
  exports: [ChatWidgetService, ChatGateway],
})
export class ChatModule {}
