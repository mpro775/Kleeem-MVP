// src/common/examples/main.example.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app-module.example';
import { setupApp } from '../index';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // إعداد التطبيق مع المكونات المشتركة
  setupApp(app);

  // إعداد Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );

  // إعداد Swagger
  const config = new DocumentBuilder()
    .setTitle('Musad Bot API')
    .setDescription('API لتطبيق Musad Bot')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('المنتجات', 'عمليات المنتجات')
    .addTag('الطلبات', 'عمليات الطلبات')
    .addTag('المستخدمين', 'عمليات المستخدمين')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    customSiteTitle: 'Musad Bot API Documentation',
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info .title { font-size: 2.5em; }
    `,
  });

  // إعداد Global Prefix
  app.setGlobalPrefix('api/v1');

  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  console.log(`🚀 التطبيق يعمل على المنفذ ${port}`);
  console.log(`📚 Swagger متاح على: http://localhost:${port}/api`);
}

bootstrap();
