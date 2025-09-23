// src/infra/dispatchers/reply-dispatchers.ts
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';

import { ChannelsDispatcherService } from '../../modules/channels/channels-dispatcher.service';
import { RabbitService } from '../rabbit/rabbit.service';

@Injectable()
export class ReplyDispatchers implements OnModuleInit {
  private log = new Logger(ReplyDispatchers.name);
  constructor(
    private rabbit: RabbitService,
    private dispatcher: ChannelsDispatcherService,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.rabbit.subscribe(
        'chat.reply',
        'telegram',
        (p: unknown) => this.handle('telegram', p),
        { queue: 'telegram.out.q', prefetch: 20, assert: false },
      );

      await this.rabbit.subscribe(
        'chat.reply',
        'whatsapp',
        (p: unknown) => this.handle('whatsapp', p),
        { queue: 'whatsapp.out.q', prefetch: 20, assert: false }, // ⬅️ مهم
      );

      await this.rabbit.subscribe(
        'chat.reply',
        'webchat',
        (p: unknown) => this.handle('webchat', p),
        { queue: 'webchat.out.q', prefetch: 20, assert: false }, // ⬅️ مهم
      );
    } catch (e: unknown) {
      this.log.error('ReplyDispatchers subscriptions failed', e);
    }
  }

  private async handle(
    ch: 'telegram' | 'whatsapp' | 'webchat',
    p: unknown,
  ): Promise<void> {
    const payload = p as {
      merchantId: string;
      sessionId: string;
      text: string;
      transport: string;
    };
    const { merchantId, sessionId, text } = payload;
    this.log.debug(`out -> ${ch} ${merchantId}/${sessionId} :: ${text}`);
    await this.dispatcher.send(merchantId, ch, sessionId, text, undefined);
  }
}
