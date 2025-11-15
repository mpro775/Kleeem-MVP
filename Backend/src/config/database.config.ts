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

function getMongoUri(configService: ConfigService): string {
  const nodeEnv = configService.get<string>('NODE_ENV') || 'development';
  return nodeEnv === 'test'
    ? 'mongodb://localhost:27018/kaleem_test'
    : configService.get<string>('MONGODB_URI') || '';
}

function isLocalConnection(mongoUri: string): boolean {
  return (
    mongoUri?.includes('localhost') ||
    mongoUri?.includes('127.0.0.1') ||
    mongoUri?.includes('mongo:27018') ||
    mongoUri?.includes('mongodb:27018')
  );
}

function shouldEnableSSL(
  configService: ConfigService,
  mongoUri: string,
): boolean {
  const nodeEnv = configService.get<string>('NODE_ENV') || 'development';
  const isProd = nodeEnv === 'production';
  const sslOverride = configService.get<string>('MONGODB_SSL');
  const nonSSLServers = ['31.97.155.167'];
  const isNonSSLServer = nonSSLServers.some((server) =>
    mongoUri?.includes(server),
  );

  return (
    sslOverride === 'true' ||
    (sslOverride !== 'false' &&
      isProd &&
      !isLocalConnection(mongoUri) &&
      !isNonSSLServer)
  );
}

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
        const mongoUri = getMongoUri(configService);
        const nodeEnv = configService.get<string>('NODE_ENV') || 'development';
        const isProd = nodeEnv === 'production';
        const enableSSL = shouldEnableSSL(configService, mongoUri);

        return {
          uri: mongoUri?.replace('directConnection=true', ''),
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
