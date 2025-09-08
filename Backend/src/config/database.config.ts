// src/config/database.config.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
        // ✅ تحسينات الأداء والاتصال
        autoIndex: configService.get<string>('NODE_ENV') !== 'production',
        maxPoolSize: 20, // حد أقصى للاتصالات المتزامنة
        minPoolSize: 5, // حد أدنى للاتصالات المحجوزة
        serverSelectionTimeoutMS: 5000, // مهلة اختيار الخادم
        socketTimeoutMS: 20000, // مهلة المقبس
        connectTimeoutMS: 10000, // مهلة الاتصال الأولي
        retryWrites: true, // إعادة محاولة الكتابة عند الفشل
        retryReads: true, // إعادة محاولة القراءة عند الفشل
        maxIdleTimeMS: 30000, // وقت الخمول الأقصى للاتصال
        heartbeatFrequencyMS: 10000, // تردد فحص حالة الخادم
        // تحسينات إضافية للإنتاج
        ...(configService.get<string>('NODE_ENV') === 'production' && {
          ssl: true,
          sslValidate: true,
          readPreference: 'primaryPreferred', // تفضيل القراءة من الأساسي
          writeConcern: { w: 'majority', j: true, wtimeout: 10000 },
        }),
      }),
      inject: [ConfigService],
    }),
  ],
  exports: [MongooseModule],
})
export class DatabaseConfigModule {}
