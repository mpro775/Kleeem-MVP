// src/config/database.config.ts
import { Module } from '@nestjs/common';
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Connection } from 'mongoose';
import { MongooseMetricsPlugin } from '../metrics/mongoose-metrics.plugin';
import { MetricsModule } from '../metrics/metrics.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MetricsModule,
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const mongoUri =
          configService.get<string>('MONGODB_URI') ||
          'mongodb://admin:strongpassword@31.97.155.167:27017/musaidbot?authSource=admin&retryWrites=false&directConnection=true';
        const nodeEnv = configService.get<string>('NODE_ENV') || 'development';

        // التحقق من ما إذا كان الاتصال محلياً أم عن بعد
        const isLocalConnection =
          mongoUri.includes('localhost') ||
          mongoUri.includes('127.0.0.1') ||
          mongoUri.includes('mongo:27017') || // Docker container
          mongoUri.includes('mongodb:27017'); // Docker container

        // قائمة الخوادم التي لا تدعم SSL
        const nonSSLServers = ['31.97.155.167'];
        const isNonSSLServer = nonSSLServers.some((server) =>
          mongoUri.includes(server),
        );

        const isProduction = nodeEnv === 'production';

        // التحقق من متغير البيئة للتحكم في SSL يدوياً
        const sslOverride = configService.get<string>('MONGODB_SSL');
        const enableSSL =
          sslOverride === 'true' ||
          (sslOverride !== 'false' &&
            isProduction &&
            !isLocalConnection &&
            !isNonSSLServer);

        return {
          uri: mongoUri,
          // ✅ تحسينات الأداء والاتصال
          autoIndex: !isProduction,
          maxPoolSize: 20, // حد أقصى للاتصالات المتزامنة
          minPoolSize: 5, // حد أدنى للاتصالات المحجوزة
          serverSelectionTimeoutMS: 5000, // مهلة اختيار الخادم
          socketTimeoutMS: 20000, // مهلة المقبس
          connectTimeoutMS: 10000, // مهلة الاتصال الأولي
          retryWrites: true, // إعادة محاولة الكتابة عند الفشل
          retryReads: true, // إعادة محاولة القراءة عند الفشل
          maxIdleTimeMS: 30000, // وقت الخمول الأقصى للاتصال
          heartbeatFrequencyMS: 10000, // تردد فحص حالة الخادم
          // تحسينات إضافية للإنتاج مع الاتصالات عن بعد فقط
          ...(enableSSL && {
            ssl: true,
            tlsInsecure: false, // تمكين التحقق من شهادة SSL
            readPreference: 'primaryPreferred', // تفضيل القراءة من الأساسي
            writeConcern: { w: 'majority', j: true, wtimeout: 10000 },
          }),
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [MongooseMetricsPlugin],

  exports: [MongooseModule],
})
export class DatabaseConfigModule {}
