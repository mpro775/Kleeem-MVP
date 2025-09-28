// src/infra/dispatchers/dispatchers.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { ChannelsModule } from '../../modules/channels/channels.module';

import { ReplyDispatchers } from './reply-dispatchers';

@Module({
  imports: [ConfigModule, ChannelsModule], // RabbitModule Global بالفعل
  providers: [ReplyDispatchers],
})
export class DispatchersModule {}
