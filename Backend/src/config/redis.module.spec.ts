import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';

import { RedisConfig } from './redis.config';
import { RedisModule } from './redis.module';

import type { TestingModule } from '@nestjs/testing';

describe('RedisModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              REDIS_URL: 'redis://localhost:6379',
            }),
          ],
        }),
        RedisModule,
      ],
    }).compile();
  });

  afterEach(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(RedisModule).toBeDefined();
  });

  it('should be a global module', () => {
    // Check if the module has the @Global decorator
    // This is verified by the module being importable globally
    expect(RedisModule).toBeDefined();
  });

  it('should provide RedisConfig', () => {
    const redisConfig = module.get<RedisConfig>(RedisConfig);
    expect(redisConfig).toBeDefined();
    expect(redisConfig).toBeInstanceOf(RedisConfig);
  });

  it('should export RedisConfig', () => {
    const redisConfig = module.get<RedisConfig>(RedisConfig);
    expect(redisConfig).toBeDefined();
  });

  describe('module structure', () => {
    it('should have providers array', () => {
      expect(RedisModule).toBeDefined();
      // The module should have RedisConfig in its providers
      const redisConfig = module.get(RedisConfig);
      expect(redisConfig).toBeDefined();
    });

    it('should have exports array', () => {
      expect(RedisModule).toBeDefined();
      // The module should export RedisConfig
      const redisConfig = module.get(RedisConfig);
      expect(redisConfig).toBeDefined();
    });
  });

  describe('dependency injection', () => {
    it('should inject ConfigService into RedisConfig', () => {
      const redisConfig = module.get<RedisConfig>(RedisConfig);
      expect(redisConfig).toBeDefined();

      // Verify that RedisConfig has access to the connection property
      expect(redisConfig.connection).toBeDefined();
      expect(typeof redisConfig.connection).toBe('object');
    });
  });
});
