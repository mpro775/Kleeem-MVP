// src/infra/dispatchers/reply-dispatchers.ts
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { RabbitService } from '../rabbit/rabbit.service';
import { ChannelsDispatcherService } from 'src/modules/channels/channels-dispatcher.service';

@Injectable()
export class ReplyDispatchers implements OnModuleInit {
  private log = new Logger(ReplyDispatchers.name);
  constructor(
    private rabbit: RabbitService,
    private dispatcher: ChannelsDispatcherService,
  ) {}

  async onModuleInit() {
    // نفس أسماء الصفوف الموجودة عندك
    await this.rabbit.subscribe(
      'chat.reply',
      'telegram',
      (p) => this.handle('telegram', p),
      { queue: 'telegram.out.q', prefetch: 20 },
    );

    await this.rabbit.subscribe(
      'chat.reply',
      'whatsapp',
      (p) => this.handle('whatsapp', p),
      { queue: 'whatsapp.out.q', prefetch: 20 },
    );

    await this.rabbit.subscribe(
      'chat.reply',
      'webchat', // ✅ انتبه للمفتاح
      (p) => this.handle('webchat', p),
      { queue: 'webchat.out.q', prefetch: 20 },
    );
  }

  private async handle(ch: 'telegram' | 'whatsapp' | 'webchat', p: any) {
    const { merchantId, sessionId, text, transport } = p || {};
    this.log.debug(`out -> ${ch} ${merchantId}/${sessionId} :: ${text}`);
    await this.dispatcher.send(merchantId, ch, sessionId, text, transport);
  }
}
