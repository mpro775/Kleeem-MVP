// src/config/database.config.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { MetricsModule } from '../metrics/metrics.module';
import { MongooseMetricsPlugin } from '../metrics/mongoose-metrics.plugin';

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
        const isProd = nodeEnv === 'production';

        return {
          uri: mongoUri.replace('directConnection=true', ''), // إن وُجد
          autoIndex: !isProd,
          maxPoolSize: 50,
          minPoolSize: 10,
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 45000,
          connectTimeoutMS: 10000,
          maxIdleTimeMS: 30000,
          heartbeatFrequencyMS: 10000,
          retryWrites: true,
          retryReads: true,
          // مراقبة في التطوير فقط:
          monitorCommands: !isProd,
          ...(enableSSL && { ssl: true, tlsInsecure: false }),
          readPreference: 'primary',
          writeConcern: { w: 'majority', j: true, wtimeout: 10000 },
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [MongooseMetricsPlugin],

  exports: [MongooseModule],
})
export class DatabaseConfigModule {}
