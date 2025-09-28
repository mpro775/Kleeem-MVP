// src/config/database.config.ts
import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { makeHistogramProvider } from '@willsoto/nestjs-prometheus';

import { HISTOGRAM_BUCKETS } from '../common/cache/constant';
import { MetricsModule } from '../metrics/metrics.module';
import { MongooseMetricsPlugin } from '../metrics/mongoose-metrics.plugin';

import type { Histogram } from 'prom-client';

const MAX_POOL_SIZE = 50;
const MIN_POOL_SIZE = 10;
const SERVER_SELECTION_TIMEOUT_MS = 5000;
const SOCKET_TIMEOUT_MS = 45000;
const CONNECT_TIMEOUT_MS = 10000;
const MAX_IDLE_TIME_MS = 30000;
const HEARTBEAT_FREQUENCY_MS = 10000;
const WRITE_CONCERN_WTIMEOUT_MS = 10000;

// Database metrics provider - defined here to avoid circular dependency
export const DatabaseMetricsProvider = makeHistogramProvider({
  name: 'database_query_duration_seconds',
  help: 'Database query duration in seconds',
  labelNames: ['operation', 'collection', 'status'],
  buckets: HISTOGRAM_BUCKETS,
});

export const DATABASE_QUERY_DURATION_SECONDS =
  'DATABASE_QUERY_DURATION_SECONDS';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    forwardRef(() => MetricsModule),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const mongoUri =
          configService.get<string>('MONGODB_URI') ||
          'mongodb://admin:strongpassword@31.97.155.167:27017/musaidbot?authSource=admin&retryWrites=false&directConnection=true';
        const nodeEnv = configService.get<string>('NODE_ENV') || 'development';
        const isLocalConnection =
          mongoUri.includes('localhost') ||
          mongoUri.includes('127.0.0.1') ||
          mongoUri.includes('mongo:27017') ||
          mongoUri.includes('mongodb:27017');

        const nonSSLServers = ['31.97.155.167'];
        const isNonSSLServer = nonSSLServers.some((server) =>
          mongoUri.includes(server),
        );

        const isProd = nodeEnv === 'production';
        const sslOverride = configService.get<string>('MONGODB_SSL');
        const enableSSL =
          sslOverride === 'true' ||
          (sslOverride !== 'false' &&
            isProd &&
            !isLocalConnection &&
            !isNonSSLServer);

        return {
          uri: mongoUri.replace('directConnection=true', ''),
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
  providers: [
    DatabaseMetricsProvider,
    {
      provide: DATABASE_QUERY_DURATION_SECONDS,
      useFactory: (histogram: Histogram<string>) => histogram,
      inject: ['PROM_METRIC_DATABASE_QUERY_DURATION_SECONDS'],
    },
    MongooseMetricsPlugin,
  ],
  exports: [MongooseModule, MongooseMetricsPlugin],
})
export class DatabaseConfigModule {}
