import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  await NestFactory.createApplicationContext(AppModule);
  console.log('REDIS_URL:', process.env.REDIS_URL);

  // لا حاجة لتشغيل HTTP server هنا، فقط السياق التطبيقي!
}
bootstrap();
