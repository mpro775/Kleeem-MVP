import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiIncomingConsumer } from './ai-incoming.consumer'; // عدّل المسار

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  providers: [AiIncomingConsumer], // OnModuleInit فيه يربط Rabbit ويبدأ consume
})
export class AiReplyWorkerModule {}
