// // src/infra/rabbit/reply-dispatchers.service.ts
// import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
// import amqp from 'amqplib';
// import { ConfigService } from '@nestjs/config';
// import { ChannelsDispatcherService } from 'src/modules/channels/channels-dispatcher.service';

// @Injectable()
// export class ReplyDispatchers implements OnModuleInit {
//   private readonly logger = new Logger(ReplyDispatchers.name);
//   private ch!: amqp.Channel;

//   constructor(
//     private readonly cfg: ConfigService,
//     private readonly dispatcher: ChannelsDispatcherService,
//   ) {}

//   async onModuleInit() {
//     const url = this.cfg.get<string>('RABBIT_URL')!;
//     const conn = await amqp.connect(url);
//     this.ch = await conn.createChannel();

//     // تأكيد الإكستشينج الخاص بالردود
//     await this.ch.assertExchange('chat.reply', 'topic', { durable: true });

//     // جهّز الطوابير + DLQ + الربط بالمفاتيح
//     await this.assertQueueWithDlq('telegram.out.q');
//     await this.assertQueueWithDlq('whatsapp.out.q');
//     await this.assertQueueWithDlq('webchat.out.q');

//     // ربط الطوابير بالمفاتيح
//     await this.bind('telegram.out.q', 'chat.reply', 'telegram');
//     await this.bind('whatsapp.out.q', 'chat.reply', 'whatsapp');

//     // للويب: اربط بالمفتاحين "webchat" و"web" لضمان التوافق
//     await this.bind('webchat.out.q', 'chat.reply', 'webchat');
//     await this.bind('webchat.out.q', 'chat.reply', 'web');

//     // الاستهلاك (لا تعيد إعلان الطابور هنا؛ استخدم checkQueue)
//     await this.consume('telegram.out.q', (p) => this.handle('telegram', p));
//     await this.consume('whatsapp.out.q', (p) => this.handle('whatsapp', p));
//     await this.consume('webchat.out.q', (p) => this.handle('webchat', p));

//     this.logger.log('ReplyDispatchers is up and consuming reply queues.');
//   }

//   /** إعلان الطابور + إنشاء DLQ بنفس الاتفاق دائمًا */
//   private async assertQueueWithDlq(queue: string) {
//     const dlq = `${queue}.dlq`;

//     // DLQ نفسه (بلا خصائص خاصة)
//     await this.ch.assertQueue(dlq, { durable: true });

//     // الطابور الرئيسي مع خصائص DLQ ثابتة
//     await this.ch.assertQueue(queue, {
//       durable: true,
//       arguments: {
//         'x-dead-letter-exchange': '', // أرسل للـ default exchange
//         'x-dead-letter-routing-key': dlq, // إلى الـ DLQ المذكور
//       },
//     });
//   }

//   /** الربط بالمفتاح */
//   private async bind(queue: string, exchange: string, key: string) {
//     await this.ch.bindQueue(queue, exchange, key);
//   }

//   /** الاستهلاك بدون إعادة إعلان الطابور (لتفادي PRECONDITION_FAILED) */
//   private async consume(queue: string, fn: (payload: any) => Promise<void>) {
//     await this.ch.checkQueue(queue); // تأكّد أنه موجود (لا تعلن من جديد)

//     await this.ch.consume(
//       queue,
//       async (m) => {
//         if (!m) return;
//         try {
//           const payload = JSON.parse(m.content.toString('utf8'));
//           await fn(payload);
//           this.ch.ack(m);
//         } catch (err) {
//           // عدم إعادة الإدراج → Dead-letter إلى DLQ الذي عرّفناه
//           this.ch.nack(m, false, false);
//           this.logger.error(
//             `Consumer error on ${queue}: ${
//               err instanceof Error ? err.message : String(err)
//             }`,
//           );
//         }
//       },
//       { noAck: false },
//     );
//   }

//   /** إرسال فعلي إلى القنوات عبر ChannelsDispatcherService */
//   private async handle(channel: 'whatsapp' | 'telegram' | 'webchat', p: any) {
//     const { merchantId, sessionId, text, transport } = p || {};
//     if (!merchantId || !sessionId || typeof text !== 'string') {
//       this.logger.warn(
//         `Invalid payload on ${channel}.out.q: ${JSON.stringify(p)}`,
//       );
//       return;
//     }
//     await this.dispatcher.send(merchantId, channel, sessionId, text, transport);
//   }
// }
