// src/common/examples/app-module.example.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommonModule, AppConfig, setupApp } from '../index';

@Module({
  imports: [
    // إعداد متغيرات البيئة
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    
    // استيراد المكونات المشتركة
    CommonModule,
    
    // باقي الـ modules
    // ProductsModule,
    // OrdersModule,
    // UsersModule,
    // ...
  ],
})
export class AppModule extends AppConfig {
  // سيتم تطبيق RequestIdMiddleware تلقائياً على جميع الطلبات
}
