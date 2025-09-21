// src/chat/chat.module.ts
import { forwardRef, Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ChatWidgetService } from './chat-widget.service';
import { ChatWidgetController } from './chat-widget.controller';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ChatWidgetSettings,
  ChatWidgetSettingsSchema,
} from './schema/chat-widget.schema';
import { MerchantsModule } from '../merchants/merchants.module';
import { HttpModule } from '@nestjs/axios';
import { PublicChatWidgetController } from './public-chat-widget.controller';
import { MongoChatWidgetRepository } from './repositories/mongo-chat-widget.repository';
import { MetricsModule } from '../../metrics/metrics.module';
import { JwtModule } from '@nestjs/jwt';
import { CacheModule } from '../../common/cache/cache.module';

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
