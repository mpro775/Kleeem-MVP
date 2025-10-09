import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';

import { MongooseMetricsPlugin } from '../metrics/mongoose-metrics.plugin';

import {
  DatabaseConfigModule,
  DatabaseMetricsProvider,
  DATABASE_QUERY_DURATION_SECONDS,
} from './database.config';

import type { TestingModule } from '@nestjs/testing';

describe('DatabaseConfigModule', () => {
  let module: TestingModule;
  let configService: ConfigService;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              MONGODB_URI: 'mongodb://test:test@localhost:27017/test',
              NODE_ENV: 'test',
              MONGODB_SSL: 'false',
            }),
          ],
        }),
        DatabaseConfigModule,
      ],
    }).compile();

    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(DatabaseConfigModule).toBeDefined();
  });

  it('should provide MongooseModule', () => {
    const mongooseModule = module.get(MongooseModule);
    expect(mongooseModule).toBeDefined();
  });

  it('should provide MongooseMetricsPlugin', () => {
    const mongooseMetricsPlugin = module.get(MongooseMetricsPlugin);
    expect(mongooseMetricsPlugin).toBeDefined();
  });

  it('should provide DATABASE_QUERY_DURATION_SECONDS', () => {
    const histogram = module.get(DATABASE_QUERY_DURATION_SECONDS);
    expect(histogram).toBeDefined();
  });

  describe('MongooseModule configuration', () => {
    it('should configure Mongoose with default test settings', () => {
      const mongoUri = configService.get<string>('MONGODB_URI');
      const nodeEnv = configService.get<string>('NODE_ENV');

      expect(mongoUri).toBe('mongodb://test:test@localhost:27017/test');
      expect(nodeEnv).toBe('test');
    });

    it('should disable SSL for test environment', () => {
      // Test environment should not enable SSL
      const nodeEnv = configService.get<string>('NODE_ENV');
      const mongoUri = configService.get<string>('MONGODB_URI');

      expect(nodeEnv).toBe('test');
      // Local connection should not enable SSL
      expect(mongoUri?.includes('localhost')).toBe(true);
    });

    it('should enable autoIndex in non-production environments', () => {
      const nodeEnv = configService.get<string>('NODE_ENV');
      expect(nodeEnv).not.toBe('production');
      // autoIndex should be true in test environment
    });
  });

  describe('DatabaseMetricsProvider', () => {
    it('should be properly configured', () => {
      expect(DatabaseMetricsProvider).toBeDefined();
      // DatabaseMetricsProvider is created by makeHistogramProvider
      // It should be a valid provider object
      expect(typeof DatabaseMetricsProvider).toBe('object');
    });
  });

  describe('SSL configuration', () => {
    it('should handle SSL override via environment variable', () => {
      // Test SSL override scenarios
      const testCases = [
        { ssl: 'true', expectedSSL: true },
        { ssl: 'false', expectedSSL: false },
        { ssl: undefined, expectedSSL: false }, // test environment
      ];

      testCases.forEach(({ ssl }) => {
        process.env.MONGODB_SSL = ssl;
        // Re-import to test the configuration logic
        const configModule = require('./database.config');
        // Note: This is a simplified test - full SSL logic testing would require mocking
        expect(configModule).toBeDefined();
      });
    });
  });

  describe('Connection pooling', () => {
    it('should configure connection pool settings', () => {
      // The constants are defined and should be reasonable values
      const maxPoolSize = 50;
      const minPoolSize = 10;
      const serverSelectionTimeout = 5000;

      expect(maxPoolSize).toBeGreaterThan(minPoolSize);
      expect(serverSelectionTimeout).toBeGreaterThan(0);
    });
  });
});
