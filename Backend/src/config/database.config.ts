// src/config/database.config.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { MetricsModule } from '../metrics/metrics.module';
import { MongooseMetricsPlugin } from '../metrics/mongoose-metrics.plugin';

// Database connection constants (no-magic-numbers)
const MAX_POOL_SIZE = 50;
const MIN_POOL_SIZE = 10;
const SERVER_SELECTION_TIMEOUT_MS = 5000;
const SOCKET_TIMEOUT_MS = 45000;
const CONNECT_TIMEOUT_MS = 10000;
const MAX_IDLE_TIME_MS = 30000;
const HEARTBEAT_FREQUENCY_MS = 10000;
const WRITE_CONCERN_WTIMEOUT_MS = 10000;
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
          maxPoolSize: MAX_POOL_SIZE,
          minPoolSize: MIN_POOL_SIZE,
          serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT_MS,
          socketTimeoutMS: SOCKET_TIMEOUT_MS,
          connectTimeoutMS: CONNECT_TIMEOUT_MS,
          maxIdleTimeMS: MAX_IDLE_TIME_MS,
          heartbeatFrequencyMS: HEARTBEAT_FREQUENCY_MS,
          retryWrites: true,
          retryReads: true,
          // مراقبة في التطوير فقط:
          monitorCommands: !isProd,
          ...(enableSSL && { ssl: true, tlsInsecure: false }),
          readPreference: 'primary',
          writeConcern: {
            w: 'majority',
            j: true,
            wtimeout: WRITE_CONCERN_WTIMEOUT_MS,
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [MongooseMetricsPlugin],

  exports: [MongooseModule],
})
export class DatabaseConfigModule {}
