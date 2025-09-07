import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { ChannelsController } from './channels.controller';
import { ChannelsService } from './channels.service';
import { Channel, ChannelSchema } from './schemas/channel.schema';
import { TelegramAdapter } from './adapters/telegram.adapter';
import { WhatsAppCloudAdapter } from './adapters/whatsapp-cloud.adapter';
import { WhatsAppQrAdapter } from './adapters/whatsapp-qr.adapter';
import { WebchatAdapter } from './adapters/webchat.adapter';
import { EvolutionService } from '../integrations/evolution.service';
import { ChannelsDispatcherService } from './channels-dispatcher.service';
import { WhatsappCloudService } from './whatsapp-cloud.service';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Channel.name, schema: ChannelSchema }]),
    HttpModule,
    forwardRef(() => ChatModule),
  ],
  controllers: [ChannelsController],
  providers: [
    ChannelsService,
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
