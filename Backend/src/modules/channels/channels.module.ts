import { HttpModule } from '@nestjs/axios';
import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { ChatModule } from '../chat/chat.module';
import { EvolutionService } from '../integrations/evolution.service';

import { TelegramAdapter } from './adapters/telegram.adapter';
import { WebchatAdapter } from './adapters/webchat.adapter';
import { WhatsAppCloudAdapter } from './adapters/whatsapp-cloud.adapter';
import { WhatsAppQrAdapter } from './adapters/whatsapp-qr.adapter';
import { ChannelsDispatcherService } from './channels-dispatcher.service';
import { ChannelsController } from './channels.controller';
import { ChannelsService } from './channels.service';
import { MongoChannelsRepository } from './repositories/mongo-channels.repository';
import { Channel, ChannelSchema } from './schemas/channel.schema';
import { WhatsappCloudService } from './whatsapp-cloud.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Channel.name, schema: ChannelSchema }]),
    HttpModule,
    forwardRef(() => ChatModule),
  ],
  controllers: [ChannelsController],
  providers: [
    ChannelsService,
    {
      provide: 'ChannelsRepository',
      useClass: MongoChannelsRepository,
    },
    TelegramAdapter,
    WhatsAppCloudAdapter,
    WhatsAppQrAdapter,
    ChannelsDispatcherService,
    WebchatAdapter,
    EvolutionService,
    WhatsappCloudService,
  ],
  exports: [ChannelsService, ChannelsDispatcherService],
})
export class ChannelsModule {}
