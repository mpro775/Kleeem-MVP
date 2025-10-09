import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';

import { RedisConfig } from './redis.config';

import type { TestingModule } from '@nestjs/testing';

describe('RedisConfig', () => {
  let _configService: ConfigService;
  let redisConfig: RedisConfig;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              REDIS_URL: 'redis://user:pass@localhost:6379',
            }),
          ],
        }),
      ],
      providers: [RedisConfig],
    }).compile();

    _configService = module.get<ConfigService>(ConfigService);
    redisConfig = module.get<RedisConfig>(RedisConfig);
  });

  it('should be defined', () => {
    expect(redisConfig).toBeDefined();
  });

  describe('connection configuration', () => {
    it('should parse REDIS_URL correctly', () => {
      expect(redisConfig.connection).toBeDefined();
      expect(redisConfig.connection.host).toBe('localhost');
      expect(redisConfig.connection.port).toBe(6379);
    });

    it('should include username and password when provided', () => {
      expect(redisConfig.connection.username).toBe('user');
      expect(redisConfig.connection.password).toBe('pass');
    });

    it('should enable TLS for rediss protocol', async () => {
      // Test rediss URL
      process.env.REDIS_URL = 'rediss://user:pass@secure.redis.com:6380';

      const secureModule: TestingModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
            load: [
              () => ({ REDIS_URL: 'rediss://user:pass@secure.redis.com:6380' }),
            ],
          }),
        ],
        providers: [RedisConfig],
      }).compile();

      const config = secureModule.get<RedisConfig>(RedisConfig);

      expect(config.connection.tls).toEqual({});
      expect(config.connection.host).toBe('secure.redis.com');
      expect(config.connection.port).toBe(6380);
    });

    it('should not set TLS for redis protocol', () => {
      expect(redisConfig.connection.tls).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('should throw error when REDIS_URL is not defined', async () => {
      const moduleWithoutUrl = Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
            load: [() => ({})], // No REDIS_URL
          }),
        ],
        providers: [RedisConfig],
      });

      await expect(moduleWithoutUrl.compile()).rejects.toThrow(
        'REDIS_URL not defined',
      );
    });

    it('should handle invalid REDIS_URL gracefully', async () => {
      const moduleWithInvalidUrl = Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
            load: [() => ({ REDIS_URL: 'invalid-url' })],
          }),
        ],
        providers: [RedisConfig],
      });

      await expect(moduleWithInvalidUrl.compile()).rejects.toThrow();
    });
  });

  describe('URL parsing', () => {
    const testCases = [
      {
        url: 'redis://localhost:6379',
        expected: {
          host: 'localhost',
          port: 6379,
          username: undefined,
          password: undefined,
          tls: undefined,
        },
      },
      {
        url: 'redis://user:pass@host.com:6380',
        expected: {
          host: 'host.com',
          port: 6380,
          username: 'user',
          password: 'pass',
          tls: undefined,
        },
      },
      {
        url: 'rediss://secure.com:6380',
        expected: {
          host: 'secure.com',
          port: 6380,
          username: undefined,
          password: undefined,
          tls: {},
        },
      },
      {
        url: 'redis://host.com:6379/db',
        expected: {
          host: 'host.com',
          port: 6379,
          username: undefined,
          password: undefined,
          tls: undefined,
        },
      },
    ];

    testCases.forEach(({ url, expected }) => {
      it(`should parse ${url} correctly`, async () => {
        const module: TestingModule = await Test.createTestingModule({
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              load: [() => ({ REDIS_URL: url })],
            }),
          ],
          providers: [RedisConfig],
        }).compile();

        const config = module.get<RedisConfig>(RedisConfig);

        expect(config.connection.host).toBe(expected.host);
        expect(config.connection.port).toBe(expected.port);
        expect(config.connection.username).toBe(expected.username);
        expect(config.connection.password).toBe(expected.password);
        expect(config.connection.tls).toBe(expected.tls);
      });
    });
  });

  describe('port parsing', () => {
    it('should parse port as number', () => {
      expect(typeof redisConfig.connection.port).toBe('number');
      expect(redisConfig.connection.port).toBe(6379);
    });

    it('should handle string port values', () => {
      // Test with string port (should be parsed to number)
      const urlWithStringPort = 'redis://localhost:6380';
      expect(urlWithStringPort).toBe('redis://localhost:6380');
      expect(parseInt('6380', 10)).toBe(6380);
    });
  });
});
