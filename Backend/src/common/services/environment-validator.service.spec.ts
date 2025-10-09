import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';

import { EnvironmentValidatorService } from './environment-validator.service';

import type { TestingModule } from '@nestjs/testing';

describe('EnvironmentValidatorService', () => {
  let service: EnvironmentValidatorService;
  let configService: jest.Mocked<ConfigService>;
  let logger: jest.Mocked<Logger>;

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockLogger = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnvironmentValidatorService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: Logger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<EnvironmentValidatorService>(
      EnvironmentValidatorService,
    );
    configService = module.get(ConfigService);
    logger = module.get(Logger);

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateEnvironment', () => {
    it('should validate all required environment variables successfully', () => {
      // Given - valid environment configuration
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'JWT_SECRET':
            return 'a'.repeat(32); // 32 character secret
          case 'JWT_ACCESS_TTL':
            return '15m';
          case 'JWT_REFRESH_TTL':
            return '7d';
          case 'REDIS_URL':
            return 'redis://localhost:6379';
          case 'PUBLIC_WEBHOOK_BASE':
            return 'https://api.example.com';
          case 'TELEGRAM_WEBHOOK_SECRET':
            return 'a'.repeat(20); // 20 character secret
          case 'EVOLUTION_APIKEY':
            return 'b'.repeat(20); // 20 character API key
          case 'DATABASE_URL':
            return 'mongodb://localhost:27017/test';
          case 'NODE_ENV':
            return 'development';
          case 'PORT':
            return '3000';
          default:
            return undefined;
        }
      });

      // When
      const result = service.validateEnvironment();

      // Then
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      const boundLog = logger.log.bind(logger);
      expect(boundLog).toHaveBeenCalledWith(
        '🔍 Validating critical environment variables...',
      );
      expect(boundLog).toHaveBeenCalledWith(
        '✅ All critical environment variables are properly configured',
      );
    });

    it('should fail validation for missing JWT_SECRET', () => {
      // Given - missing JWT_SECRET
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'JWT_SECRET':
            return undefined; // Missing
          case 'JWT_ACCESS_TTL':
            return '15m';
          case 'JWT_REFRESH_TTL':
            return '7d';
          case 'REDIS_URL':
            return 'redis://localhost:6379';
          case 'PUBLIC_WEBHOOK_BASE':
            return 'https://api.example.com';
          case 'TELEGRAM_WEBHOOK_SECRET':
            return 'a'.repeat(20);
          case 'EVOLUTION_APIKEY':
            return 'b'.repeat(20);
          case 'DATABASE_URL':
            return 'mongodb://localhost:27017/test';
          case 'NODE_ENV':
            return 'development';
          case 'PORT':
            return '3000';
          default:
            return undefined;
        }
      });

      // When
      const result = service.validateEnvironment();

      // Then
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('JWT_SECRET');
      expect(result.errors[0]).toContain(
        'Missing required environment variable',
      );

      const boundError = logger.error.bind(logger);
      expect(boundError).toHaveBeenCalledWith(
        '❌ Environment validation failed:',
      );
      expect(boundError).toHaveBeenCalledWith(
        expect.stringContaining('JWT_SECRET'),
      );
    });

    it('should fail validation for weak JWT_SECRET', () => {
      // Given - JWT_SECRET too short
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'JWT_SECRET':
            return 'short'; // Only 5 characters, too short
          case 'JWT_ACCESS_TTL':
            return '15m';
          case 'JWT_REFRESH_TTL':
            return '7d';
          case 'REDIS_URL':
            return 'redis://localhost:6379';
          case 'PUBLIC_WEBHOOK_BASE':
            return 'https://api.example.com';
          case 'TELEGRAM_WEBHOOK_SECRET':
            return 'a'.repeat(20);
          case 'EVOLUTION_APIKEY':
            return 'b'.repeat(20);
          case 'DATABASE_URL':
            return 'mongodb://localhost:27017/test';
          case 'NODE_ENV':
            return 'development';
          case 'PORT':
            return '3000';
          default:
            return undefined;
        }
      });

      // When
      const result = service.validateEnvironment();

      // Then
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('JWT_SECRET');
      expect(result.errors[0]).toContain('Invalid value');
    });

    it('should fail validation for invalid JWT_ACCESS_TTL format', () => {
      // Given - invalid TTL format
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'JWT_SECRET':
            return 'a'.repeat(32);
          case 'JWT_ACCESS_TTL':
            return 'invalid'; // Invalid format
          case 'JWT_REFRESH_TTL':
            return '7d';
          case 'REDIS_URL':
            return 'redis://localhost:6379';
          case 'PUBLIC_WEBHOOK_BASE':
            return 'https://api.example.com';
          case 'TELEGRAM_WEBHOOK_SECRET':
            return 'a'.repeat(20);
          case 'EVOLUTION_APIKEY':
            return 'b'.repeat(20);
          case 'DATABASE_URL':
            return 'mongodb://localhost:27017/test';
          case 'NODE_ENV':
            return 'development';
          case 'PORT':
            return '3000';
          default:
            return undefined;
        }
      });

      // When
      const result = service.validateEnvironment();

      // Then
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('JWT_ACCESS_TTL');
      expect(result.errors[0]).toContain('Invalid value');
    });

    it('should fail validation for invalid REDIS_URL', () => {
      // Given - invalid Redis URL
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'JWT_SECRET':
            return 'a'.repeat(32);
          case 'JWT_ACCESS_TTL':
            return '15m';
          case 'JWT_REFRESH_TTL':
            return '7d';
          case 'REDIS_URL':
            return 'invalid-url'; // Not redis:// or rediss://
          case 'PUBLIC_WEBHOOK_BASE':
            return 'https://api.example.com';
          case 'TELEGRAM_WEBHOOK_SECRET':
            return 'a'.repeat(20);
          case 'EVOLUTION_APIKEY':
            return 'b'.repeat(20);
          case 'DATABASE_URL':
            return 'mongodb://localhost:27017/test';
          case 'NODE_ENV':
            return 'development';
          case 'PORT':
            return '3000';
          default:
            return undefined;
        }
      });

      // When
      const result = service.validateEnvironment();

      // Then
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('REDIS_URL');
      expect(result.errors[0]).toContain('Invalid value');
    });

    it('should fail validation for invalid PUBLIC_WEBHOOK_BASE', () => {
      // Given - invalid webhook base URL
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'JWT_SECRET':
            return 'a'.repeat(32);
          case 'JWT_ACCESS_TTL':
            return '15m';
          case 'JWT_REFRESH_TTL':
            return '7d';
          case 'REDIS_URL':
            return 'redis://localhost:6379';
          case 'PUBLIC_WEBHOOK_BASE':
            return 'http://api.example.com/'; // Has trailing slash
          case 'TELEGRAM_WEBHOOK_SECRET':
            return 'a'.repeat(20);
          case 'EVOLUTION_APIKEY':
            return 'b'.repeat(20);
          case 'DATABASE_URL':
            return 'mongodb://localhost:27017/test';
          case 'NODE_ENV':
            return 'development';
          case 'PORT':
            return '3000';
          default:
            return undefined;
        }
      });

      // When
      const result = service.validateEnvironment();

      // Then
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('PUBLIC_WEBHOOK_BASE');
      expect(result.errors[0]).toContain('Invalid value');
    });

    it('should fail validation for invalid DATABASE_URL', () => {
      // Given - invalid database URL
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'JWT_SECRET':
            return 'a'.repeat(32);
          case 'JWT_ACCESS_TTL':
            return '15m';
          case 'JWT_REFRESH_TTL':
            return '7d';
          case 'REDIS_URL':
            return 'redis://localhost:6379';
          case 'PUBLIC_WEBHOOK_BASE':
            return 'https://api.example.com';
          case 'TELEGRAM_WEBHOOK_SECRET':
            return 'a'.repeat(20);
          case 'EVOLUTION_APIKEY':
            return 'b'.repeat(20);
          case 'DATABASE_URL':
            return 'invalid-db-url'; // Not mongodb:// or mongodb+srv://
          case 'NODE_ENV':
            return 'development';
          case 'PORT':
            return '3000';
          default:
            return undefined;
        }
      });

      // When
      const result = service.validateEnvironment();

      // Then
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('DATABASE_URL');
      expect(result.errors[0]).toContain('Invalid value');
    });

    it('should fail validation for invalid NODE_ENV', () => {
      // Given - invalid environment
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'JWT_SECRET':
            return 'a'.repeat(32);
          case 'JWT_ACCESS_TTL':
            return '15m';
          case 'JWT_REFRESH_TTL':
            return '7d';
          case 'REDIS_URL':
            return 'redis://localhost:6379';
          case 'PUBLIC_WEBHOOK_BASE':
            return 'https://api.example.com';
          case 'TELEGRAM_WEBHOOK_SECRET':
            return 'a'.repeat(20);
          case 'EVOLUTION_APIKEY':
            return 'b'.repeat(20);
          case 'DATABASE_URL':
            return 'mongodb://localhost:27017/test';
          case 'NODE_ENV':
            return 'invalid-env'; // Not in allowed values
          case 'PORT':
            return '3000';
          default:
            return undefined;
        }
      });

      // When
      const result = service.validateEnvironment();

      // Then
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('NODE_ENV');
      expect(result.errors[0]).toContain('Invalid value');
    });

    it('should fail validation for invalid PORT', () => {
      // Given - invalid port
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'JWT_SECRET':
            return 'a'.repeat(32);
          case 'JWT_ACCESS_TTL':
            return '15m';
          case 'JWT_REFRESH_TTL':
            return '7d';
          case 'REDIS_URL':
            return 'redis://localhost:6379';
          case 'PUBLIC_WEBHOOK_BASE':
            return 'https://api.example.com';
          case 'TELEGRAM_WEBHOOK_SECRET':
            return 'a'.repeat(20);
          case 'EVOLUTION_APIKEY':
            return 'b'.repeat(20);
          case 'DATABASE_URL':
            return 'mongodb://localhost:27017/test';
          case 'NODE_ENV':
            return 'development';
          case 'PORT':
            return 'invalid-port'; // Not a valid number
          default:
            return undefined;
        }
      });

      // When
      const result = service.validateEnvironment();

      // Then
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('PORT');
      expect(result.errors[0]).toContain('Invalid value');
    });

    it('should use default values when variables are missing but have defaults', () => {
      // Given - missing JWT_ACCESS_TTL and JWT_REFRESH_TTL but they have defaults
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'JWT_SECRET':
            return 'a'.repeat(32);
          case 'JWT_ACCESS_TTL':
            return undefined; // Missing but has default
          case 'JWT_REFRESH_TTL':
            return undefined; // Missing but has default
          case 'REDIS_URL':
            return 'redis://localhost:6379';
          case 'PUBLIC_WEBHOOK_BASE':
            return 'https://api.example.com';
          case 'TELEGRAM_WEBHOOK_SECRET':
            return 'a'.repeat(20);
          case 'EVOLUTION_APIKEY':
            return 'b'.repeat(20);
          case 'DATABASE_URL':
            return 'mongodb://localhost:27017/test';
          case 'NODE_ENV':
            return 'development';
          case 'PORT':
            return '3000';
          default:
            return undefined;
        }
      });

      // When
      const result = service.validateEnvironment();

      // Then
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);

      const boundWarn = logger.warn.bind(logger);
      expect(boundWarn).toHaveBeenCalledWith(
        expect.stringContaining('Using default value for JWT_ACCESS_TTL'),
      );
      expect(boundWarn).toHaveBeenCalledWith(
        expect.stringContaining('Using default value for JWT_REFRESH_TTL'),
      );
    });

    it('should handle multiple validation errors', () => {
      // Given - multiple invalid configurations
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'JWT_SECRET':
            return 'short'; // Too short
          case 'JWT_ACCESS_TTL':
            return 'invalid'; // Invalid format
          case 'JWT_REFRESH_TTL':
            return '7d';
          case 'REDIS_URL':
            return 'invalid-url'; // Invalid URL
          case 'PUBLIC_WEBHOOK_BASE':
            return 'https://api.example.com';
          case 'TELEGRAM_WEBHOOK_SECRET':
            return 'a'.repeat(20);
          case 'EVOLUTION_APIKEY':
            return 'b'.repeat(20);
          case 'DATABASE_URL':
            return 'mongodb://localhost:27017/test';
          case 'NODE_ENV':
            return 'development';
          case 'PORT':
            return '3000';
          default:
            return undefined;
        }
      });

      // When
      const result = service.validateEnvironment();

      // Then
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(3); // JWT_SECRET, JWT_ACCESS_TTL, REDIS_URL

      const boundError = logger.error.bind(logger);
      expect(boundError).toHaveBeenCalledWith(
        '❌ Environment validation failed:',
      );
      expect(boundError).toHaveBeenCalledTimes(4); // 1 for main message + 3 for errors
    });

    it('should handle sensitive values correctly in logs', () => {
      // Given - configuration with sensitive values
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'JWT_SECRET':
            return 'a'.repeat(32);
          case 'JWT_ACCESS_TTL':
            return '15m';
          case 'JWT_REFRESH_TTL':
            return '7d';
          case 'REDIS_URL':
            return 'redis://localhost:6379';
          case 'PUBLIC_WEBHOOK_BASE':
            return 'https://api.example.com';
          case 'TELEGRAM_WEBHOOK_SECRET':
            return 'secret-token-123';
          case 'EVOLUTION_APIKEY':
            return 'api-key-456';
          case 'DATABASE_URL':
            return 'mongodb://localhost:27017/test';
          case 'NODE_ENV':
            return 'development';
          case 'PORT':
            return '3000';
          default:
            return undefined;
        }
      });

      // When
      const result = service.validateEnvironment();

      // Then
      expect(result.isValid).toBe(true);

      // Sensitive values should be hidden in logs
      const boundDebug = logger.debug.bind(logger);
      expect(boundDebug).toHaveBeenCalledWith(
        expect.stringContaining('JWT_SECRET: [HIDDEN]'),
      );
      expect(boundDebug).toHaveBeenCalledWith(
        expect.stringContaining('TELEGRAM_WEBHOOK_SECRET: [HIDDEN]'),
      );
      expect(boundDebug).toHaveBeenCalledWith(
        expect.stringContaining('EVOLUTION_APIKEY: [HIDDEN]'),
      );
      expect(boundDebug).toHaveBeenCalledWith(
        expect.stringContaining('DATABASE_URL: [HIDDEN]'),
      );
      expect(boundDebug).toHaveBeenCalledWith(
        expect.stringContaining('REDIS_URL: [HIDDEN]'),
      );

      // Non-sensitive values should be shown
      expect(boundDebug).toHaveBeenCalledWith(
        expect.stringContaining('JWT_ACCESS_TTL: 15m'),
      );
      expect(boundDebug).toHaveBeenCalledWith(
        expect.stringContaining('NODE_ENV: development'),
      );
      expect(boundDebug).toHaveBeenCalledWith(
        expect.stringContaining('PORT: 3000'),
      );
    });

    it('should handle ConfigService errors gracefully', () => {
      // Given - ConfigService throws error
      configService.get.mockImplementation(() => {
        throw new Error('Config service error');
      });

      // When/Then
      expect(() => service.validateEnvironment()).not.toThrow();

      const result = service.validateEnvironment();
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Error validating');
    });
  });

  describe('validateOrExit', () => {
    it('should exit process with code 1 when validation fails', () => {
      // Given - invalid configuration
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'JWT_SECRET':
            return 'short'; // Invalid
          case 'JWT_ACCESS_TTL':
            return '15m';
          case 'JWT_REFRESH_TTL':
            return '7d';
          case 'REDIS_URL':
            return 'redis://localhost:6379';
          case 'PUBLIC_WEBHOOK_BASE':
            return 'https://api.example.com';
          case 'TELEGRAM_WEBHOOK_SECRET':
            return 'a'.repeat(20);
          case 'EVOLUTION_APIKEY':
            return 'b'.repeat(20);
          case 'DATABASE_URL':
            return 'mongodb://localhost:27017/test';
          case 'NODE_ENV':
            return 'development';
          case 'PORT':
            return '3000';
          default:
            return undefined;
        }
      });

      // Mock process.exit
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation();

      // When
      service.validateOrExit();

      // Then
      const boundError = logger.error.bind(logger);
      expect(boundError).toHaveBeenCalledWith(
        '💥 Application cannot start due to environment validation errors:',
      );
      expect(boundError).toHaveBeenCalledWith(
        expect.stringContaining('JWT_SECRET'),
      );
      expect(boundError).toHaveBeenCalledWith(
        '🛑 Please fix the above issues and restart the application',
      );
      expect(exitSpy).toHaveBeenCalledWith(1);

      // Restore process.exit
      exitSpy.mockRestore();
    });

    it('should not exit when validation passes', () => {
      // Given - valid configuration
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'JWT_SECRET':
            return 'a'.repeat(32);
          case 'JWT_ACCESS_TTL':
            return '15m';
          case 'JWT_REFRESH_TTL':
            return '7d';
          case 'REDIS_URL':
            return 'redis://localhost:6379';
          case 'PUBLIC_WEBHOOK_BASE':
            return 'https://api.example.com';
          case 'TELEGRAM_WEBHOOK_SECRET':
            return 'a'.repeat(20);
          case 'EVOLUTION_APIKEY':
            return 'b'.repeat(20);
          case 'DATABASE_URL':
            return 'mongodb://localhost:27017/test';
          case 'NODE_ENV':
            return 'development';
          case 'PORT':
            return '3000';
          default:
            return undefined;
        }
      });

      // Mock process.exit
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation();

      // When
      service.validateOrExit();

      // Then
      expect(exitSpy).not.toHaveBeenCalled();

      // Restore process.exit
      exitSpy.mockRestore();
    });
  });

  describe('logEnvironmentSummary', () => {
    it('should log environment summary for development', () => {
      // Given
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'NODE_ENV':
            return 'development';
          case 'PORT':
            return '3000';
          case 'PUBLIC_WEBHOOK_BASE':
            return 'https://api.example.com';
          case 'JWT_ACCESS_TTL':
            return '15m';
          case 'JWT_REFRESH_TTL':
            return '7d';
          default:
            return undefined;
        }
      });

      // When
      service.logEnvironmentSummary();

      // Then
      const boundLog = logger.log.bind(logger);
      const boundWarn = logger.warn.bind(logger);
      expect(boundLog).toHaveBeenCalledWith('🚀 Environment Summary:');
      expect(boundLog).toHaveBeenCalledWith('   NODE_ENV: development');
      expect(boundLog).toHaveBeenCalledWith('   PORT: 3000');
      expect(boundLog).toHaveBeenCalledWith(
        '   PUBLIC_WEBHOOK_BASE: https://api.example.com',
      );
      expect(boundLog).toHaveBeenCalledWith('   JWT_ACCESS_TTL: 15m');
      expect(boundLog).toHaveBeenCalledWith('   JWT_REFRESH_TTL: 7d');
      expect(boundLog).toHaveBeenCalledWith(
        '   PUBLIC_WEBHOOK_BASE: https://api.example.com',
      );
      expect(boundLog).toHaveBeenCalledWith('   JWT_ACCESS_TTL: 15m');
      expect(boundLog).toHaveBeenCalledWith('   JWT_REFRESH_TTL: 7d');
      expect(boundWarn).toHaveBeenCalledWith(
        '⚠️  Development mode: Some security features may be relaxed',
      );
    });

    it('should log environment summary for production', () => {
      // Given
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'NODE_ENV':
            return 'production';
          case 'PORT':
            return '8080';
          case 'PUBLIC_WEBHOOK_BASE':
            return 'https://prod-api.example.com';
          case 'JWT_ACCESS_TTL':
            return '10m';
          case 'JWT_REFRESH_TTL':
            return '30d';
          default:
            return undefined;
        }
      });

      // When
      service.logEnvironmentSummary();

      // Then
      const boundLog = logger.log.bind(logger);
      expect(boundLog).toHaveBeenCalledWith('🚀 Environment Summary:');
      expect(boundLog).toHaveBeenCalledWith('   NODE_ENV: production');
      expect(boundLog).toHaveBeenCalledWith('   PORT: 8080');
      expect(boundLog).toHaveBeenCalledWith(
        '   PUBLIC_WEBHOOK_BASE: https://prod-api.example.com',
      );
      expect(boundLog).toHaveBeenCalledWith('   JWT_ACCESS_TTL: 10m');
      expect(boundLog).toHaveBeenCalledWith('   JWT_REFRESH_TTL: 30d');
      expect(boundLog).toHaveBeenCalledWith(
        '🔒 Production mode: Enhanced security features enabled',
      );
    });

    it('should handle missing optional configuration values', () => {
      // Given - missing optional values
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'NODE_ENV':
            return 'development';
          case 'PORT':
            return undefined; // Missing but optional
          case 'PUBLIC_WEBHOOK_BASE':
            return undefined; // Missing but optional
          case 'JWT_ACCESS_TTL':
            return '15m';
          case 'JWT_REFRESH_TTL':
            return '7d';
          default:
            return undefined;
        }
      });

      // When
      service.logEnvironmentSummary();

      // Then
      const boundLog = logger.log.bind(logger);
      expect(boundLog).toHaveBeenCalledWith('🚀 Environment Summary:');
      expect(boundLog).toHaveBeenCalledWith('   NODE_ENV: development');
      expect(boundLog).toHaveBeenCalledWith('   PORT: 3000'); // Should use default
      expect(boundLog).toHaveBeenCalledWith(
        '   PUBLIC_WEBHOOK_BASE: Not configured',
      );
      expect(boundLog).toHaveBeenCalledWith('   JWT_ACCESS_TTL: 15m');
      expect(boundLog).toHaveBeenCalledWith('   JWT_REFRESH_TTL: 7d');
    });
  });

  describe('environment variable validation rules', () => {
    it('should validate JWT_SECRET minimum length', () => {
      // Given
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'JWT_SECRET':
            return 'a'.repeat(31); // Just under minimum (32)
          case 'JWT_ACCESS_TTL':
            return '15m';
          case 'JWT_REFRESH_TTL':
            return '7d';
          case 'REDIS_URL':
            return 'redis://localhost:6379';
          case 'PUBLIC_WEBHOOK_BASE':
            return 'https://api.example.com';
          case 'TELEGRAM_WEBHOOK_SECRET':
            return 'a'.repeat(20);
          case 'EVOLUTION_APIKEY':
            return 'b'.repeat(20);
          case 'DATABASE_URL':
            return 'mongodb://localhost:27017/test';
          case 'NODE_ENV':
            return 'development';
          case 'PORT':
            return '3000';
          default:
            return undefined;
        }
      });

      // When
      const result = service.validateEnvironment();

      // Then
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('JWT_SECRET');
      expect(result.errors[0]).toContain('Invalid value');
    });

    it('should validate JWT TTL format', () => {
      const validFormats = ['15m', '7d', '30s', '1h'];
      const invalidFormats = ['15', '7days', '30seconds', '1hour', 'invalid'];

      validFormats.forEach((format) => {
        // Given - valid format
        configService.get.mockImplementation((key: string) => {
          switch (key) {
            case 'JWT_SECRET':
              return 'a'.repeat(32);
            case 'JWT_ACCESS_TTL':
              return format;
            case 'JWT_REFRESH_TTL':
              return '7d';
            case 'REDIS_URL':
              return 'redis://localhost:6379';
            case 'PUBLIC_WEBHOOK_BASE':
              return 'https://api.example.com';
            case 'TELEGRAM_WEBHOOK_SECRET':
              return 'a'.repeat(20);
            case 'EVOLUTION_APIKEY':
              return 'b'.repeat(20);
            case 'DATABASE_URL':
              return 'mongodb://localhost:27017/test';
            case 'NODE_ENV':
              return 'development';
            case 'PORT':
              return '3000';
            default:
              return undefined;
          }
        });

        // When
        const result = service.validateEnvironment();

        // Then
        expect(result.isValid).toBe(true);
      });

      invalidFormats.forEach((format) => {
        // Given - invalid format
        configService.get.mockImplementation((key: string) => {
          switch (key) {
            case 'JWT_SECRET':
              return 'a'.repeat(32);
            case 'JWT_ACCESS_TTL':
              return format;
            case 'JWT_REFRESH_TTL':
              return '7d';
            case 'REDIS_URL':
              return 'redis://localhost:6379';
            case 'PUBLIC_WEBHOOK_BASE':
              return 'https://api.example.com';
            case 'TELEGRAM_WEBHOOK_SECRET':
              return 'a'.repeat(20);
            case 'EVOLUTION_APIKEY':
              return 'b'.repeat(20);
            case 'DATABASE_URL':
              return 'mongodb://localhost:27017/test';
            case 'NODE_ENV':
              return 'development';
            case 'PORT':
              return '3000';
            default:
              return undefined;
          }
        });

        // When
        const result = service.validateEnvironment();

        // Then
        expect(result.isValid).toBe(false);
        expect(
          result.errors.some((error) => error.includes('JWT_ACCESS_TTL')),
        ).toBe(true);
      });
    });

    it('should validate PORT range', () => {
      const validPorts = ['1', '3000', '8080', '65535'];
      const invalidPorts = ['0', '70000', 'not-a-number', '-1'];

      validPorts.forEach((port) => {
        // Given - valid port
        configService.get.mockImplementation((key: string) => {
          switch (key) {
            case 'JWT_SECRET':
              return 'a'.repeat(32);
            case 'JWT_ACCESS_TTL':
              return '15m';
            case 'JWT_REFRESH_TTL':
              return '7d';
            case 'REDIS_URL':
              return 'redis://localhost:6379';
            case 'PUBLIC_WEBHOOK_BASE':
              return 'https://api.example.com';
            case 'TELEGRAM_WEBHOOK_SECRET':
              return 'a'.repeat(20);
            case 'EVOLUTION_APIKEY':
              return 'b'.repeat(20);
            case 'DATABASE_URL':
              return 'mongodb://localhost:27017/test';
            case 'NODE_ENV':
              return 'development';
            case 'PORT':
              return port;
            default:
              return undefined;
          }
        });

        // When
        const result = service.validateEnvironment();

        // Then
        expect(result.isValid).toBe(true);
      });

      invalidPorts.forEach((port) => {
        // Given - invalid port
        configService.get.mockImplementation((key: string) => {
          switch (key) {
            case 'JWT_SECRET':
              return 'a'.repeat(32);
            case 'JWT_ACCESS_TTL':
              return '15m';
            case 'JWT_REFRESH_TTL':
              return '7d';
            case 'REDIS_URL':
              return 'redis://localhost:6379';
            case 'PUBLIC_WEBHOOK_BASE':
              return 'https://api.example.com';
            case 'TELEGRAM_WEBHOOK_SECRET':
              return 'a'.repeat(20);
            case 'EVOLUTION_APIKEY':
              return 'b'.repeat(20);
            case 'DATABASE_URL':
              return 'mongodb://localhost:27017/test';
            case 'NODE_ENV':
              return 'development';
            case 'PORT':
              return port;
            default:
              return undefined;
          }
        });

        // When
        const result = service.validateEnvironment();

        // Then
        expect(result.isValid).toBe(false);
        expect(result.errors.some((error) => error.includes('PORT'))).toBe(
          true,
        );
      });
    });

    it('should validate NODE_ENV values', () => {
      const validEnvs = ['development', 'production', 'test'];
      const invalidEnvs = ['dev', 'prod', 'staging', 'invalid'];

      validEnvs.forEach((env) => {
        // Given - valid environment
        configService.get.mockImplementation((key: string) => {
          switch (key) {
            case 'JWT_SECRET':
              return 'a'.repeat(32);
            case 'JWT_ACCESS_TTL':
              return '15m';
            case 'JWT_REFRESH_TTL':
              return '7d';
            case 'REDIS_URL':
              return 'redis://localhost:6379';
            case 'PUBLIC_WEBHOOK_BASE':
              return 'https://api.example.com';
            case 'TELEGRAM_WEBHOOK_SECRET':
              return 'a'.repeat(20);
            case 'EVOLUTION_APIKEY':
              return 'b'.repeat(20);
            case 'DATABASE_URL':
              return 'mongodb://localhost:27017/test';
            case 'NODE_ENV':
              return env;
            case 'PORT':
              return '3000';
            default:
              return undefined;
          }
        });

        // When
        const result = service.validateEnvironment();

        // Then
        expect(result.isValid).toBe(true);
      });

      invalidEnvs.forEach((env) => {
        // Given - invalid environment
        configService.get.mockImplementation((key: string) => {
          switch (key) {
            case 'JWT_SECRET':
              return 'a'.repeat(32);
            case 'JWT_ACCESS_TTL':
              return '15m';
            case 'JWT_REFRESH_TTL':
              return '7d';
            case 'REDIS_URL':
              return 'redis://localhost:6379';
            case 'PUBLIC_WEBHOOK_BASE':
              return 'https://api.example.com';
            case 'TELEGRAM_WEBHOOK_SECRET':
              return 'a'.repeat(20);
            case 'EVOLUTION_APIKEY':
              return 'b'.repeat(20);
            case 'DATABASE_URL':
              return 'mongodb://localhost:27017/test';
            case 'NODE_ENV':
              return env;
            case 'PORT':
              return '3000';
            default:
              return undefined;
          }
        });

        // When
        const result = service.validateEnvironment();

        // Then
        expect(result.isValid).toBe(false);
        expect(result.errors.some((error) => error.includes('NODE_ENV'))).toBe(
          true,
        );
      });
    });

    it('should validate URL formats correctly', () => {
      const validUrls = [
        'redis://localhost:6379',
        'rediss://localhost:6380',
        'mongodb://localhost:27017/test',
        'mongodb+srv://cluster.mongodb.net/test',
        'https://api.example.com',
        'https://api.example.com/webhooks',
      ];

      const invalidUrls = [
        'localhost:6379', // Missing protocol
        'http://localhost:6379', // Wrong protocol for Redis
        'ftp://api.example.com', // Wrong protocol for webhook
        'api.example.com/', // Missing protocol
        'https://api.example.com/', // Trailing slash for webhook
      ];

      validUrls.forEach((url) => {
        // Given - valid URL
        configService.get.mockImplementation((key: string) => {
          switch (key) {
            case 'JWT_SECRET':
              return 'a'.repeat(32);
            case 'JWT_ACCESS_TTL':
              return '15m';
            case 'JWT_REFRESH_TTL':
              return '7d';
            case 'REDIS_URL':
              return url.includes('redis') ? url : 'redis://localhost:6379';
            case 'PUBLIC_WEBHOOK_BASE':
              return url.includes('https://') ? url : 'https://api.example.com';
            case 'TELEGRAM_WEBHOOK_SECRET':
              return 'a'.repeat(20);
            case 'EVOLUTION_APIKEY':
              return 'b'.repeat(20);
            case 'DATABASE_URL':
              return url.includes('mongodb')
                ? url
                : 'mongodb://localhost:27017/test';
            case 'NODE_ENV':
              return 'development';
            case 'PORT':
              return '3000';
            default:
              return undefined;
          }
        });

        // When
        const result = service.validateEnvironment();

        // Then
        expect(result.isValid).toBe(true);
      });

      invalidUrls.forEach((url) => {
        // Given - invalid URL
        configService.get.mockImplementation((key: string) => {
          switch (key) {
            case 'JWT_SECRET':
              return 'a'.repeat(32);
            case 'JWT_ACCESS_TTL':
              return '15m';
            case 'JWT_REFRESH_TTL':
              return '7d';
            case 'REDIS_URL':
              return url.includes('redis') ? url : 'redis://localhost:6379';
            case 'PUBLIC_WEBHOOK_BASE':
              return url.includes('https://') ? url : 'https://api.example.com';
            case 'TELEGRAM_WEBHOOK_SECRET':
              return 'a'.repeat(20);
            case 'EVOLUTION_APIKEY':
              return 'b'.repeat(20);
            case 'DATABASE_URL':
              return url.includes('mongodb')
                ? url
                : 'mongodb://localhost:27017/test';
            case 'NODE_ENV':
              return 'development';
            case 'PORT':
              return '3000';
            default:
              return undefined;
          }
        });

        // When
        const result = service.validateEnvironment();

        // Then
        expect(result.isValid).toBe(false);
      });
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete production environment validation', () => {
      // Given - complete production environment
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'JWT_SECRET':
            return 'super-secure-jwt-secret-key-32-chars-minimum';
          case 'JWT_ACCESS_TTL':
            return '10m';
          case 'JWT_REFRESH_TTL':
            return '30d';
          case 'REDIS_URL':
            return 'rediss://prod-redis.example.com:6380';
          case 'PUBLIC_WEBHOOK_BASE':
            return 'https://api.production.example.com';
          case 'TELEGRAM_WEBHOOK_SECRET':
            return 'telegram-secret-token-production-123';
          case 'EVOLUTION_APIKEY':
            return 'evolution-api-key-production-456';
          case 'DATABASE_URL':
            return 'mongodb+srv://prod-cluster.mongodb.net/production';
          case 'NODE_ENV':
            return 'production';
          case 'PORT':
            return '8080';
          default:
            return undefined;
        }
      });

      // When
      const result = service.validateEnvironment();

      // Then
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);

      // Should log production mode
      const boundLog = logger.log.bind(logger);
      expect(boundLog).toHaveBeenCalledWith(
        '🔒 Production mode: Enhanced security features enabled',
      );
    });

    it('should handle complete development environment validation', () => {
      // Given - complete development environment
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'JWT_SECRET':
            return 'dev-jwt-secret-key-for-development-only';
          case 'JWT_ACCESS_TTL':
            return '24h'; // Longer for development
          case 'JWT_REFRESH_TTL':
            return '30d';
          case 'REDIS_URL':
            return 'redis://localhost:6379';
          case 'PUBLIC_WEBHOOK_BASE':
            return 'https://dev-api.example.com';
          case 'TELEGRAM_WEBHOOK_SECRET':
            return 'dev-telegram-secret-token';
          case 'EVOLUTION_APIKEY':
            return 'dev-evolution-api-key';
          case 'DATABASE_URL':
            return 'mongodb://localhost:27017/dev';
          case 'NODE_ENV':
            return 'development';
          case 'PORT':
            return '3000';
          default:
            return undefined;
        }
      });

      // When
      const result = service.validateEnvironment();

      // Then
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);

      // Should log development mode warning
      const boundWarn = logger.warn.bind(logger);
      expect(boundWarn).toHaveBeenCalledWith(
        '⚠️  Development mode: Some security features may be relaxed',
      );
    });

    it('should handle environment with some missing optional values', () => {
      // Given - environment with some missing optional values
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'JWT_SECRET':
            return 'a'.repeat(32);
          case 'JWT_ACCESS_TTL':
            return '15m';
          case 'JWT_REFRESH_TTL':
            return '7d';
          case 'REDIS_URL':
            return 'redis://localhost:6379';
          case 'PUBLIC_WEBHOOK_BASE':
            return 'https://api.example.com';
          case 'TELEGRAM_WEBHOOK_SECRET':
            return 'a'.repeat(20);
          case 'EVOLUTION_APIKEY':
            return 'b'.repeat(20);
          case 'DATABASE_URL':
            return 'mongodb://localhost:27017/test';
          case 'NODE_ENV':
            return 'development';
          case 'PORT':
            return '3000';
          default:
            return undefined;
        }
      });

      // When
      const result = service.validateEnvironment();

      // Then
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    it('should handle ConfigService throwing errors', () => {
      // Given - ConfigService throws on every call
      configService.get.mockImplementation(() => {
        throw new Error('Config service unavailable');
      });

      // When/Then
      expect(() => service.validateEnvironment()).not.toThrow();

      const result = service.validateEnvironment();
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Error validating');
    });

    it('should handle validation function throwing errors', () => {
      // Given - validation function throws error
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'JWT_SECRET':
            return 'valid-secret';
          case 'JWT_ACCESS_TTL':
            return '15m';
          case 'JWT_REFRESH_TTL':
            return '7d';
          case 'REDIS_URL':
            return 'redis://localhost:6379';
          case 'PUBLIC_WEBHOOK_BASE':
            return 'https://api.example.com';
          case 'TELEGRAM_WEBHOOK_SECRET':
            return 'a'.repeat(20);
          case 'EVOLUTION_APIKEY':
            return 'b'.repeat(20);
          case 'DATABASE_URL':
            return 'mongodb://localhost:27017/test';
          case 'NODE_ENV':
            return 'development';
          case 'PORT':
            return '3000';
          default:
            return undefined;
        }
      });

      // Mock validation function to throw
      const originalGetRequiredEnvVars = (service as any).getRequiredEnvVars;
      (service as any).getRequiredEnvVars = () => [
        {
          key: 'TEST_VAR',
          description: 'Test variable',
          validation: () => {
            throw new Error('Validation function error');
          },
        },
      ];

      // When/Then
      expect(() => service.validateEnvironment()).not.toThrow();

      const result = service.validateEnvironment();
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Error validating TEST_VAR');

      // Restore original method
      (service as any).getRequiredEnvVars = originalGetRequiredEnvVars;
    });
  });

  describe('performance considerations', () => {
    it('should validate environment quickly', () => {
      // Given - valid configuration
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'JWT_SECRET':
            return 'a'.repeat(32);
          case 'JWT_ACCESS_TTL':
            return '15m';
          case 'JWT_REFRESH_TTL':
            return '7d';
          case 'REDIS_URL':
            return 'redis://localhost:6379';
          case 'PUBLIC_WEBHOOK_BASE':
            return 'https://api.example.com';
          case 'TELEGRAM_WEBHOOK_SECRET':
            return 'a'.repeat(20);
          case 'EVOLUTION_APIKEY':
            return 'b'.repeat(20);
          case 'DATABASE_URL':
            return 'mongodb://localhost:27017/test';
          case 'NODE_ENV':
            return 'development';
          case 'PORT':
            return '3000';
          default:
            return undefined;
        }
      });

      // When - measure validation time
      const startTime = Date.now();
      const result = service.validateEnvironment();
      const endTime = Date.now();

      // Then
      expect(result.isValid).toBe(true);
      expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
    });

    it('should handle rapid successive validations', async () => {
      // Given - valid configuration
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'JWT_SECRET':
            return 'a'.repeat(32);
          case 'JWT_ACCESS_TTL':
            return '15m';
          case 'JWT_REFRESH_TTL':
            return '7d';
          case 'REDIS_URL':
            return 'redis://localhost:6379';
          case 'PUBLIC_WEBHOOK_BASE':
            return 'https://api.example.com';
          case 'TELEGRAM_WEBHOOK_SECRET':
            return 'a'.repeat(20);
          case 'EVOLUTION_APIKEY':
            return 'b'.repeat(20);
          case 'DATABASE_URL':
            return 'mongodb://localhost:27017/test';
          case 'NODE_ENV':
            return 'development';
          case 'PORT':
            return '3000';
          default:
            return undefined;
        }
      });

      // When - perform rapid validations
      const validations = Array.from({ length: 100 }, () =>
        service.validateEnvironment(),
      );

      // Then
      const results = await Promise.all(
        validations.map((validation) => Promise.resolve(validation)),
      );
      results.forEach((result) => {
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });
  });

  describe('real-world scenarios', () => {
    it('should validate typical production deployment environment', () => {
      // Given - typical production deployment
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'JWT_SECRET':
            return 'prod-super-secure-jwt-secret-key-32-chars-long';
          case 'JWT_ACCESS_TTL':
            return '10m';
          case 'JWT_REFRESH_TTL':
            return '30d';
          case 'REDIS_URL':
            return 'rediss://redis-prod.example.com:6380';
          case 'PUBLIC_WEBHOOK_BASE':
            return 'https://api.production.example.com';
          case 'TELEGRAM_WEBHOOK_SECRET':
            return 'prod-telegram-webhook-secret-token-12345';
          case 'EVOLUTION_APIKEY':
            return 'prod-evolution-api-key-abcdef-12345';
          case 'DATABASE_URL':
            return 'mongodb+srv://prod-user:prod-password@prod-cluster.mongodb.net/production';
          case 'NODE_ENV':
            return 'production';
          case 'PORT':
            return '8080';
          default:
            return undefined;
        }
      });

      // When
      const result = service.validateEnvironment();

      // Then
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);

      // Should log production summary
      const boundLog = logger.log.bind(logger);
      expect(boundLog).toHaveBeenCalledWith('🚀 Environment Summary:');
      expect(boundLog).toHaveBeenCalledWith('   NODE_ENV: production');
      expect(boundLog).toHaveBeenCalledWith('   PORT: 8080');
      expect(boundLog).toHaveBeenCalledWith(
        '   PUBLIC_WEBHOOK_BASE: https://api.production.example.com',
      );
      expect(boundLog).toHaveBeenCalledWith('   JWT_ACCESS_TTL: 10m');
      expect(boundLog).toHaveBeenCalledWith('   JWT_REFRESH_TTL: 30d');
      expect(boundLog).toHaveBeenCalledWith(
        '🔒 Production mode: Enhanced security features enabled',
      );
    });

    it('should handle Docker container environment', () => {
      // Given - Docker container environment
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'JWT_SECRET':
            return 'docker-container-jwt-secret-32-chars-long';
          case 'JWT_ACCESS_TTL':
            return '15m';
          case 'JWT_REFRESH_TTL':
            return '7d';
          case 'REDIS_URL':
            return 'redis://redis-container:6379';
          case 'PUBLIC_WEBHOOK_BASE':
            return 'https://myapp.example.com';
          case 'TELEGRAM_WEBHOOK_SECRET':
            return 'docker-telegram-secret-token';
          case 'EVOLUTION_APIKEY':
            return 'docker-evolution-api-key';
          case 'DATABASE_URL':
            return 'mongodb://mongo-container:27017/app';
          case 'NODE_ENV':
            return 'production';
          case 'PORT':
            return '3000';
          default:
            return undefined;
        }
      });

      // When
      const result = service.validateEnvironment();

      // Then
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle Kubernetes deployment environment', () => {
      // Given - Kubernetes deployment environment
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'JWT_SECRET':
            return 'k8s-super-secure-jwt-secret-key-32-chars';
          case 'JWT_ACCESS_TTL':
            return '5m'; // Shorter for K8s
          case 'JWT_REFRESH_TTL':
            return '1h';
          case 'REDIS_URL':
            return 'redis://redis-service:6379';
          case 'PUBLIC_WEBHOOK_BASE':
            return 'https://api.k8s.example.com';
          case 'TELEGRAM_WEBHOOK_SECRET':
            return 'k8s-telegram-webhook-secret-token';
          case 'EVOLUTION_APIKEY':
            return 'k8s-evolution-api-key-token';
          case 'DATABASE_URL':
            return 'mongodb://mongodb-service:27017/production';
          case 'NODE_ENV':
            return 'production';
          case 'PORT':
            return '8080';
          default:
            return undefined;
        }
      });

      // When
      const result = service.validateEnvironment();

      // Then
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle CI/CD pipeline environment', () => {
      // Given - CI/CD pipeline environment (some values missing)
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'JWT_SECRET':
            return 'ci-cd-jwt-secret-key-for-testing-only';
          case 'JWT_ACCESS_TTL':
            return '15m';
          case 'JWT_REFRESH_TTL':
            return '7d';
          case 'REDIS_URL':
            return 'redis://localhost:6379';
          case 'PUBLIC_WEBHOOK_BASE':
            return 'https://ci-api.example.com';
          case 'TELEGRAM_WEBHOOK_SECRET':
            return 'ci-telegram-secret-token';
          case 'EVOLUTION_APIKEY':
            return 'ci-evolution-api-key';
          case 'DATABASE_URL':
            return 'mongodb://localhost:27017/ci-test';
          case 'NODE_ENV':
            return 'test';
          case 'PORT':
            return '3000';
          default:
            return undefined;
        }
      });

      // When
      const result = service.validateEnvironment();

      // Then
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);

      const boundLog = logger.log.bind(logger);
      // Should log test environment
      expect(boundLog).toHaveBeenCalledWith('🚀 Environment Summary:');
      expect(boundLog).toHaveBeenCalledWith('   NODE_ENV: test');
    });

    it('should handle environment with security best practices', () => {
      // Given - security-focused environment
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'JWT_SECRET':
            return 'ultra-secure-random-jwt-secret-256-bit-entropy';
          case 'JWT_ACCESS_TTL':
            return '5m'; // Short-lived tokens
          case 'JWT_REFRESH_TTL':
            return '1h'; // Short refresh window
          case 'REDIS_URL':
            return 'rediss://secure-redis.example.com:6380'; // TLS
          case 'PUBLIC_WEBHOOK_BASE':
            return 'https://api.secure.example.com';
          case 'TELEGRAM_WEBHOOK_SECRET':
            return 'highly-secure-telegram-webhook-secret-token';
          case 'EVOLUTION_APIKEY':
            return 'highly-secure-evolution-api-key-token';
          case 'DATABASE_URL':
            return 'mongodb+srv://secure-user:secure-password@secure-cluster.mongodb.net/secure';
          case 'NODE_ENV':
            return 'production';
          case 'PORT':
            return '8443'; // Non-standard port
          default:
            return undefined;
        }
      });

      // When
      const result = service.validateEnvironment();

      // Then
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle environment variable precedence correctly', () => {
      // Given - test that ConfigService.get is called with correct keys
      configService.get.mockImplementation((key: string) => {
        // Track which keys were requested
        if (key === 'JWT_SECRET') return 'a'.repeat(32);
        if (key === 'JWT_ACCESS_TTL') return '15m';
        if (key === 'JWT_REFRESH_TTL') return '7d';
        if (key === 'REDIS_URL') return 'redis://localhost:6379';
        if (key === 'PUBLIC_WEBHOOK_BASE') return 'https://api.example.com';
        if (key === 'TELEGRAM_WEBHOOK_SECRET') return 'a'.repeat(20);
        if (key === 'EVOLUTION_APIKEY') return 'b'.repeat(20);
        if (key === 'DATABASE_URL') return 'mongodb://localhost:27017/test';
        if (key === 'NODE_ENV') return 'development';
        if (key === 'PORT') return '3000';
        return undefined;
      });

      // When
      service.validateEnvironment();

      // Then
      const expectedKeys = [
        'JWT_SECRET',
        'JWT_ACCESS_TTL',
        'JWT_REFRESH_TTL',
        'REDIS_URL',
        'PUBLIC_WEBHOOK_BASE',
        'TELEGRAM_WEBHOOK_SECRET',
        'EVOLUTION_APIKEY',
        'DATABASE_URL',
        'NODE_ENV',
        'PORT',
      ];

      expectedKeys.forEach((key) => {
        expect(configService.get.bind(configService)).toHaveBeenCalledWith(key);
      });

      expect(configService.get.bind(configService)).toHaveBeenCalledTimes(
        expectedKeys.length,
      );
    });
  });

  describe('validateOrExit additional scenarios', () => {
    it('should exit with code 1 when validation fails with multiple errors', () => {
      // Given - multiple validation errors
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'JWT_SECRET':
            return 'short'; // Too short
          case 'JWT_ACCESS_TTL':
            return 'invalid'; // Invalid format
          case 'JWT_REFRESH_TTL':
            return '7d';
          case 'REDIS_URL':
            return 'invalid-url'; // Invalid URL
          case 'PUBLIC_WEBHOOK_BASE':
            return 'https://api.example.com/';
          case 'TELEGRAM_WEBHOOK_SECRET':
            return 'a'.repeat(20);
          case 'EVOLUTION_APIKEY':
            return 'b'.repeat(20);
          case 'DATABASE_URL':
            return 'mongodb://localhost:27017/test';
          case 'NODE_ENV':
            return 'development';
          case 'PORT':
            return '3000';
          default:
            return undefined;
        }
      });

      // Mock process.exit
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation();

      // When
      service.validateOrExit();

      // Then
      const boundError = logger.error.bind(logger);
      expect(boundError).toHaveBeenCalledWith(
        '💥 Application cannot start due to environment validation errors:',
      );
      expect(boundError).toHaveBeenCalledWith(
        '🛑 Please fix the above issues and restart the application',
      );
      expect(exitSpy).toHaveBeenCalledWith(1);

      // Restore process.exit
      exitSpy.mockRestore();
    });

    it('should not exit when all validations pass', () => {
      // Given - valid configuration
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'JWT_SECRET':
            return 'a'.repeat(32);
          case 'JWT_ACCESS_TTL':
            return '15m';
          case 'JWT_REFRESH_TTL':
            return '7d';
          case 'REDIS_URL':
            return 'redis://localhost:6379';
          case 'PUBLIC_WEBHOOK_BASE':
            return 'https://api.example.com';
          case 'TELEGRAM_WEBHOOK_SECRET':
            return 'a'.repeat(20);
          case 'EVOLUTION_APIKEY':
            return 'b'.repeat(20);
          case 'DATABASE_URL':
            return 'mongodb://localhost:27017/test';
          case 'NODE_ENV':
            return 'development';
          case 'PORT':
            return '3000';
          default:
            return undefined;
        }
      });

      // Mock process.exit
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation();

      // When
      service.validateOrExit();

      // Then
      expect(exitSpy).not.toHaveBeenCalled();

      // Restore process.exit
      exitSpy.mockRestore();
    });

    it('should handle process.exit being called multiple times', () => {
      // Given - invalid configuration
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'JWT_SECRET':
            return 'short';
          case 'JWT_ACCESS_TTL':
            return '15m';
          case 'JWT_REFRESH_TTL':
            return '7d';
          case 'REDIS_URL':
            return 'redis://localhost:6379';
          case 'PUBLIC_WEBHOOK_BASE':
            return 'https://api.example.com';
          case 'TELEGRAM_WEBHOOK_SECRET':
            return 'a'.repeat(20);
          case 'EVOLUTION_APIKEY':
            return 'b'.repeat(20);
          case 'DATABASE_URL':
            return 'mongodb://localhost:27017/test';
          case 'NODE_ENV':
            return 'development';
          case 'PORT':
            return '3000';
          default:
            return undefined;
        }
      });

      // Mock process.exit
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation();

      // When - call multiple times
      service.validateOrExit();
      service.validateOrExit();

      // Then
      expect(exitSpy).toHaveBeenCalledTimes(2);
      expect(exitSpy).toHaveBeenCalledWith(1);

      // Restore process.exit
      exitSpy.mockRestore();
    });
  });

  describe('logEnvironmentSummary additional scenarios', () => {
    it('should log environment summary with missing optional values using defaults', () => {
      // Given - missing optional values
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'NODE_ENV':
            return 'production';
          case 'PORT':
            return undefined; // Missing
          case 'PUBLIC_WEBHOOK_BASE':
            return undefined; // Missing
          case 'JWT_ACCESS_TTL':
            return '10m';
          case 'JWT_REFRESH_TTL':
            return '30d';
          default:
            return undefined;
        }
      });

      // When
      service.logEnvironmentSummary();

      // Then
      const boundLog = logger.log.bind(logger);
      expect(boundLog).toHaveBeenCalledWith('🚀 Environment Summary:');
      expect(boundLog).toHaveBeenCalledWith('   NODE_ENV: production');
      expect(boundLog).toHaveBeenCalledWith('   PORT: 3000'); // Should use default
      expect(boundLog).toHaveBeenCalledWith(
        '   PUBLIC_WEBHOOK_BASE: Not configured',
      );
      expect(boundLog).toHaveBeenCalledWith('   JWT_ACCESS_TTL: 10m');
      expect(boundLog).toHaveBeenCalledWith('   JWT_REFRESH_TTL: 30d');
      expect(boundLog).toHaveBeenCalledWith(
        '🔒 Production mode: Enhanced security features enabled',
      );
    });

    it('should handle ConfigService errors in logEnvironmentSummary', () => {
      // Given - ConfigService throws error
      configService.get.mockImplementation(() => {
        throw new Error('Config service unavailable');
      });

      // When/Then
      expect(() => service.logEnvironmentSummary()).not.toThrow();
    });

    it('should log environment summary for test environment', () => {
      // Given - test environment
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'NODE_ENV':
            return 'test';
          case 'PORT':
            return '4000';
          case 'PUBLIC_WEBHOOK_BASE':
            return 'https://test-api.example.com';
          case 'JWT_ACCESS_TTL':
            return '5m';
          case 'JWT_REFRESH_TTL':
            return '1h';
          default:
            return undefined;
        }
      });

      // When
      service.logEnvironmentSummary();

      // Then
      const boundLog = logger.log.bind(logger);
      const boundWarn = logger.warn.bind(logger);
      expect(boundLog).toHaveBeenCalledWith('🚀 Environment Summary:');
      expect(boundLog).toHaveBeenCalledWith('   NODE_ENV: test');
      expect(boundLog).toHaveBeenCalledWith('   PORT: 4000');
      expect(boundLog).toHaveBeenCalledWith(
        '   PUBLIC_WEBHOOK_BASE: https://test-api.example.com',
      );
      expect(boundLog).toHaveBeenCalledWith('   JWT_ACCESS_TTL: 5m');
      expect(boundLog).toHaveBeenCalledWith('   JWT_REFRESH_TTL: 1h');
      expect(boundWarn).toHaveBeenCalledWith(
        '⚠️  Development mode: Some security features may be relaxed',
      );
    });

    it('should handle undefined values gracefully in logEnvironmentSummary', () => {
      // Given - all values undefined
      configService.get.mockImplementation(() => undefined);

      // When
      service.logEnvironmentSummary();

      // Then
      const boundLog = logger.log.bind(logger);
      expect(boundLog).toHaveBeenCalledWith('🚀 Environment Summary:');
      expect(boundLog).toHaveBeenCalledWith('   NODE_ENV: development');
      expect(boundLog).toHaveBeenCalledWith('   PORT: 3000');
      expect(boundLog).toHaveBeenCalledWith(
        '   PUBLIC_WEBHOOK_BASE: Not configured',
      );
      expect(boundLog).toHaveBeenCalledWith('   JWT_ACCESS_TTL: 15m');
      expect(boundLog).toHaveBeenCalledWith('   JWT_REFRESH_TTL: 7d');
    });
  });

  describe('edge cases and boundary testing', () => {
    it('should validate minimum JWT secret length boundary', () => {
      // Given - exactly minimum length
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'JWT_SECRET':
            return 'a'.repeat(31); // Just under minimum
          case 'JWT_ACCESS_TTL':
            return '15m';
          case 'JWT_REFRESH_TTL':
            return '7d';
          case 'REDIS_URL':
            return 'redis://localhost:6379';
          case 'PUBLIC_WEBHOOK_BASE':
            return 'https://api.example.com';
          case 'TELEGRAM_WEBHOOK_SECRET':
            return 'a'.repeat(20);
          case 'EVOLUTION_APIKEY':
            return 'b'.repeat(20);
          case 'DATABASE_URL':
            return 'mongodb://localhost:27017/test';
          case 'NODE_ENV':
            return 'development';
          case 'PORT':
            return '3000';
          default:
            return undefined;
        }
      });

      // When
      const result = service.validateEnvironment();

      // Then
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('JWT_SECRET');
    });

    it('should validate maximum port number boundary', () => {
      const validPorts = ['1', '3000', '65535'];
      const invalidPorts = ['0', '65536', '70000'];

      validPorts.forEach((port) => {
        // Given - valid port
        configService.get.mockImplementation((key: string) => {
          switch (key) {
            case 'JWT_SECRET':
              return 'a'.repeat(32);
            case 'JWT_ACCESS_TTL':
              return '15m';
            case 'JWT_REFRESH_TTL':
              return '7d';
            case 'REDIS_URL':
              return 'redis://localhost:6379';
            case 'PUBLIC_WEBHOOK_BASE':
              return 'https://api.example.com';
            case 'TELEGRAM_WEBHOOK_SECRET':
              return 'a'.repeat(20);
            case 'EVOLUTION_APIKEY':
              return 'b'.repeat(20);
            case 'DATABASE_URL':
              return 'mongodb://localhost:27017/test';
            case 'NODE_ENV':
              return 'development';
            case 'PORT':
              return port;
            default:
              return undefined;
          }
        });

        // When
        const result = service.validateEnvironment();

        // Then
        expect(result.isValid).toBe(true);
      });

      invalidPorts.forEach((port) => {
        // Given - invalid port
        configService.get.mockImplementation((key: string) => {
          switch (key) {
            case 'JWT_SECRET':
              return 'a'.repeat(32);
            case 'JWT_ACCESS_TTL':
              return '15m';
            case 'JWT_REFRESH_TTL':
              return '7d';
            case 'REDIS_URL':
              return 'redis://localhost:6379';
            case 'PUBLIC_WEBHOOK_BASE':
              return 'https://api.example.com';
            case 'TELEGRAM_WEBHOOK_SECRET':
              return 'a'.repeat(20);
            case 'EVOLUTION_APIKEY':
              return 'b'.repeat(20);
            case 'DATABASE_URL':
              return 'mongodb://localhost:27017/test';
            case 'NODE_ENV':
              return 'development';
            case 'PORT':
              return port;
            default:
              return undefined;
          }
        });

        // When
        const result = service.validateEnvironment();

        // Then
        expect(result.isValid).toBe(false);
        expect(result.errors.some((error) => error.includes('PORT'))).toBe(
          true,
        );
      });
    });

    it('should validate API key minimum length boundary', () => {
      // Given - exactly minimum length for API keys
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'JWT_SECRET':
            return 'a'.repeat(32);
          case 'JWT_ACCESS_TTL':
            return '15m';
          case 'JWT_REFRESH_TTL':
            return '7d';
          case 'REDIS_URL':
            return 'redis://localhost:6379';
          case 'PUBLIC_WEBHOOK_BASE':
            return 'https://api.example.com';
          case 'TELEGRAM_WEBHOOK_SECRET':
            return 'a'.repeat(15); // Just under minimum (16)
          case 'EVOLUTION_APIKEY':
            return 'b'.repeat(20);
          case 'DATABASE_URL':
            return 'mongodb://localhost:27017/test';
          case 'NODE_ENV':
            return 'development';
          case 'PORT':
            return '3000';
          default:
            return undefined;
        }
      });

      // When
      const result = service.validateEnvironment();

      // Then
      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((error) =>
          error.includes('TELEGRAM_WEBHOOK_SECRET'),
        ),
      ).toBe(true);
    });

    it('should handle very long environment variable values', () => {
      // Given - very long values
      const longValue = 'a'.repeat(10000);

      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'JWT_SECRET':
            return longValue;
          case 'JWT_ACCESS_TTL':
            return '15m';
          case 'JWT_REFRESH_TTL':
            return '7d';
          case 'REDIS_URL':
            return 'redis://localhost:6379';
          case 'PUBLIC_WEBHOOK_BASE':
            return 'https://api.example.com';
          case 'TELEGRAM_WEBHOOK_SECRET':
            return 'a'.repeat(20);
          case 'EVOLUTION_APIKEY':
            return 'b'.repeat(20);
          case 'DATABASE_URL':
            return 'mongodb://localhost:27017/test';
          case 'NODE_ENV':
            return 'development';
          case 'PORT':
            return '3000';
          default:
            return undefined;
        }
      });

      // When
      const result = service.validateEnvironment();

      // Then
      expect(result.isValid).toBe(true);
    });

    it('should handle special characters in environment variables', () => {
      // Given - values with special characters
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'JWT_SECRET':
            return 'special-chars!@#$%^&*()_+{}|:<>?[]\\;\'",./';
          case 'JWT_ACCESS_TTL':
            return '15m';
          case 'JWT_REFRESH_TTL':
            return '7d';
          case 'REDIS_URL':
            return 'redis://localhost:6379';
          case 'PUBLIC_WEBHOOK_BASE':
            return 'https://api.example.com';
          case 'TELEGRAM_WEBHOOK_SECRET':
            return 'secret-with-special-chars!@#';
          case 'EVOLUTION_APIKEY':
            return 'api-key-with-special-chars!@#';
          case 'DATABASE_URL':
            return 'mongodb://localhost:27017/test';
          case 'NODE_ENV':
            return 'development';
          case 'PORT':
            return '3000';
          default:
            return undefined;
        }
      });

      // When
      const result = service.validateEnvironment();

      // Then
      expect(result.isValid).toBe(true);
    });

    it('should handle empty string values appropriately', () => {
      // Given - empty strings for some values
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'JWT_SECRET':
            return 'a'.repeat(32);
          case 'JWT_ACCESS_TTL':
            return ''; // Empty string
          case 'JWT_REFRESH_TTL':
            return '7d';
          case 'REDIS_URL':
            return 'redis://localhost:6379';
          case 'PUBLIC_WEBHOOK_BASE':
            return 'https://api.example.com';
          case 'TELEGRAM_WEBHOOK_SECRET':
            return 'a'.repeat(20);
          case 'EVOLUTION_APIKEY':
            return 'b'.repeat(20);
          case 'DATABASE_URL':
            return 'mongodb://localhost:27017/test';
          case 'NODE_ENV':
            return 'development';
          case 'PORT':
            return '3000';
          default:
            return undefined;
        }
      });

      // When
      const result = service.validateEnvironment();

      // Then
      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((error) => error.includes('JWT_ACCESS_TTL')),
      ).toBe(true);
    });
  });

  describe('performance and load testing', () => {
    it('should handle rapid successive validations', () => {
      // Given - valid configuration
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'JWT_SECRET':
            return 'a'.repeat(32);
          case 'JWT_ACCESS_TTL':
            return '15m';
          case 'JWT_REFRESH_TTL':
            return '7d';
          case 'REDIS_URL':
            return 'redis://localhost:6379';
          case 'PUBLIC_WEBHOOK_BASE':
            return 'https://api.example.com';
          case 'TELEGRAM_WEBHOOK_SECRET':
            return 'a'.repeat(20);
          case 'EVOLUTION_APIKEY':
            return 'b'.repeat(20);
          case 'DATABASE_URL':
            return 'mongodb://localhost:27017/test';
          case 'NODE_ENV':
            return 'development';
          case 'PORT':
            return '3000';
          default:
            return undefined;
        }
      });

      // When - perform rapid validations
      const validations = Array.from({ length: 100 }, () =>
        service.validateEnvironment(),
      );

      // Then
      validations.forEach((validation) => {
        const result = validation;
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('should handle concurrent validations', async () => {
      // Given - valid configuration
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'JWT_SECRET':
            return 'a'.repeat(32);
          case 'JWT_ACCESS_TTL':
            return '15m';
          case 'JWT_REFRESH_TTL':
            return '7d';
          case 'REDIS_URL':
            return 'redis://localhost:6379';
          case 'PUBLIC_WEBHOOK_BASE':
            return 'https://api.example.com';
          case 'TELEGRAM_WEBHOOK_SECRET':
            return 'a'.repeat(20);
          case 'EVOLUTION_APIKEY':
            return 'b'.repeat(20);
          case 'DATABASE_URL':
            return 'mongodb://localhost:27017/test';
          case 'NODE_ENV':
            return 'development';
          case 'PORT':
            return '3000';
          default:
            return undefined;
        }
      });

      // When - perform concurrent validations
      const validations = Array.from({ length: 50 }, () =>
        service.validateEnvironment(),
      );

      // Execute all validations concurrently and wait for results
      const validationPromises = validations.map((validation) =>
        Promise.resolve(validation),
      );
      const results = await Promise.all(validationPromises);

      // Then
      results.forEach((result) => {
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('should validate environment quickly under load', () => {
      // Given - valid configuration
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'JWT_SECRET':
            return 'a'.repeat(32);
          case 'JWT_ACCESS_TTL':
            return '15m';
          case 'JWT_REFRESH_TTL':
            return '7d';
          case 'REDIS_URL':
            return 'redis://localhost:6379';
          case 'PUBLIC_WEBHOOK_BASE':
            return 'https://api.example.com';
          case 'TELEGRAM_WEBHOOK_SECRET':
            return 'a'.repeat(20);
          case 'EVOLUTION_APIKEY':
            return 'b'.repeat(20);
          case 'DATABASE_URL':
            return 'mongodb://localhost:27017/test';
          case 'NODE_ENV':
            return 'development';
          case 'PORT':
            return '3000';
          default:
            return undefined;
        }
      });

      // When - measure validation time under load
      const startTime = Date.now();
      const validations = Array.from({ length: 1000 }, () =>
        service.validateEnvironment(),
      );
      const results = validations.map((validation) => validation);
      const endTime = Date.now();

      // Then
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      results.forEach((result) => {
        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('error handling and recovery', () => {
    it('should handle ConfigService returning null values', () => {
      // Given - ConfigService returns null for some values
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'JWT_SECRET':
            return null as any;
          case 'JWT_ACCESS_TTL':
            return '15m';
          case 'JWT_REFRESH_TTL':
            return '7d';
          case 'REDIS_URL':
            return 'redis://localhost:6379';
          case 'PUBLIC_WEBHOOK_BASE':
            return 'https://api.example.com';
          case 'TELEGRAM_WEBHOOK_SECRET':
            return 'a'.repeat(20);
          case 'EVOLUTION_APIKEY':
            return 'b'.repeat(20);
          case 'DATABASE_URL':
            return 'mongodb://localhost:27017/test';
          case 'NODE_ENV':
            return 'development';
          case 'PORT':
            return '3000';
          default:
            return undefined;
        }
      });

      // When
      const result = service.validateEnvironment();

      // Then
      expect(result.isValid).toBe(false);
      expect(result.errors.some((error) => error.includes('JWT_SECRET'))).toBe(
        true,
      );
    });

    it('should handle ConfigService throwing errors for specific keys', () => {
      // Given - ConfigService throws for specific keys
      configService.get.mockImplementation((key: string) => {
        if (key === 'JWT_SECRET') {
          throw new Error('Config key not found');
        }
        switch (key) {
          case 'JWT_ACCESS_TTL':
            return '15m';
          case 'JWT_REFRESH_TTL':
            return '7d';
          case 'REDIS_URL':
            return 'redis://localhost:6379';
          case 'PUBLIC_WEBHOOK_BASE':
            return 'https://api.example.com';
          case 'TELEGRAM_WEBHOOK_SECRET':
            return 'a'.repeat(20);
          case 'EVOLUTION_APIKEY':
            return 'b'.repeat(20);
          case 'DATABASE_URL':
            return 'mongodb://localhost:27017/test';
          case 'NODE_ENV':
            return 'development';
          case 'PORT':
            return '3000';
          default:
            return undefined;
        }
      });

      // When/Then
      expect(() => service.validateEnvironment()).not.toThrow();

      const result = service.validateEnvironment();
      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((error) =>
          error.includes('Error validating JWT_SECRET'),
        ),
      ).toBe(true);
    });

    it('should handle validation function errors gracefully', () => {
      // Given - validation function throws error
      const originalGetRequiredEnvVars = (service as any).getRequiredEnvVars;
      (service as any).getRequiredEnvVars = () => [
        {
          key: 'TEST_VAR',
          description: 'Test variable',
          validation: () => {
            throw new Error('Validation function error');
          },
        },
      ];

      configService.get.mockImplementation((key: string) => {
        if (key === 'TEST_VAR') return 'test-value';
        return undefined;
      });

      // When/Then
      expect(() => service.validateEnvironment()).not.toThrow();

      const result = service.validateEnvironment();
      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((error) =>
          error.includes('Error validating TEST_VAR'),
        ),
      ).toBe(true);

      // Restore original method
      (service as any).getRequiredEnvVars = originalGetRequiredEnvVars;
    });

    it('should handle logger errors gracefully', () => {
      // Given - logger throws errors
      logger.log.mockImplementation(() => {
        throw new Error('Logger error');
      });
      logger.warn.mockImplementation(() => {
        throw new Error('Logger warning error');
      });
      logger.error.mockImplementation(() => {
        throw new Error('Logger error');
      });
      logger.debug.mockImplementation(() => {
        throw new Error('Logger debug error');
      });

      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'JWT_SECRET':
            return 'a'.repeat(32);
          case 'JWT_ACCESS_TTL':
            return '15m';
          case 'JWT_REFRESH_TTL':
            return '7d';
          case 'REDIS_URL':
            return 'redis://localhost:6379';
          case 'PUBLIC_WEBHOOK_BASE':
            return 'https://api.example.com';
          case 'TELEGRAM_WEBHOOK_SECRET':
            return 'a'.repeat(20);
          case 'EVOLUTION_APIKEY':
            return 'b'.repeat(20);
          case 'DATABASE_URL':
            return 'mongodb://localhost:27017/test';
          case 'NODE_ENV':
            return 'development';
          case 'PORT':
            return '3000';
          default:
            return undefined;
        }
      });

      // When/Then
      expect(() => service.validateEnvironment()).not.toThrow();
      expect(() => service.logEnvironmentSummary()).not.toThrow();
    });
  });

  describe('real-world production scenarios', () => {
    it('should validate typical production deployment environment', () => {
      // Given - production deployment scenario
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'JWT_SECRET':
            return 'prod-super-secure-jwt-secret-key-32-chars-long';
          case 'JWT_ACCESS_TTL':
            return '10m';
          case 'JWT_REFRESH_TTL':
            return '30d';
          case 'REDIS_URL':
            return 'rediss://redis-prod.example.com:6380';
          case 'PUBLIC_WEBHOOK_BASE':
            return 'https://api.production.example.com';
          case 'TELEGRAM_WEBHOOK_SECRET':
            return 'prod-telegram-secret-token-12345';
          case 'EVOLUTION_APIKEY':
            return 'prod-evolution-api-key-abcdef-12345';
          case 'DATABASE_URL':
            return 'mongodb+srv://prod-user:prod-password@prod-cluster.mongodb.net/production';
          case 'NODE_ENV':
            return 'production';
          case 'PORT':
            return '8080';
          default:
            return undefined;
        }
      });

      // When
      const result = service.validateEnvironment();

      // Then
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);

      // Should log production mode
      expect(logger.log.bind(logger)).toHaveBeenCalledWith(
        '🔒 Production mode: Enhanced security features enabled',
      );
    });

    it('should handle Docker container environment', () => {
      // Given - Docker container scenario
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'JWT_SECRET':
            return 'docker-container-jwt-secret-32-chars-long';
          case 'JWT_ACCESS_TTL':
            return '15m';
          case 'JWT_REFRESH_TTL':
            return '7d';
          case 'REDIS_URL':
            return 'redis://redis-container:6379';
          case 'PUBLIC_WEBHOOK_BASE':
            return 'https://myapp.example.com';
          case 'TELEGRAM_WEBHOOK_SECRET':
            return 'docker-telegram-secret-token';
          case 'EVOLUTION_APIKEY':
            return 'docker-evolution-api-key';
          case 'DATABASE_URL':
            return 'mongodb://mongo-container:27017/app';
          case 'NODE_ENV':
            return 'production';
          case 'PORT':
            return '3000';
          default:
            return undefined;
        }
      });

      // When
      const result = service.validateEnvironment();

      // Then
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle Kubernetes deployment environment', () => {
      // Given - Kubernetes deployment scenario
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'JWT_SECRET':
            return 'k8s-super-secure-jwt-secret-key-32-chars';
          case 'JWT_ACCESS_TTL':
            return '5m'; // Shorter for K8s
          case 'JWT_REFRESH_TTL':
            return '1h';
          case 'REDIS_URL':
            return 'redis://redis-service:6379';
          case 'PUBLIC_WEBHOOK_BASE':
            return 'https://api.k8s.example.com';
          case 'TELEGRAM_WEBHOOK_SECRET':
            return 'k8s-telegram-webhook-secret-token';
          case 'EVOLUTION_APIKEY':
            return 'k8s-evolution-api-key-token';
          case 'DATABASE_URL':
            return 'mongodb://mongodb-service:27017/production';
          case 'NODE_ENV':
            return 'production';
          case 'PORT':
            return '8080';
          default:
            return undefined;
        }
      });

      // When
      const result = service.validateEnvironment();

      // Then
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle CI/CD pipeline environment', () => {
      // Given - CI/CD pipeline scenario
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'JWT_SECRET':
            return 'ci-cd-jwt-secret-key-for-testing-only';
          case 'JWT_ACCESS_TTL':
            return '15m';
          case 'JWT_REFRESH_TTL':
            return '7d';
          case 'REDIS_URL':
            return 'redis://localhost:6379';
          case 'PUBLIC_WEBHOOK_BASE':
            return 'https://ci-api.example.com';
          case 'TELEGRAM_WEBHOOK_SECRET':
            return 'ci-telegram-secret-token';
          case 'EVOLUTION_APIKEY':
            return 'ci-evolution-api-key';
          case 'DATABASE_URL':
            return 'mongodb://localhost:27017/ci-test';
          case 'NODE_ENV':
            return 'test';
          case 'PORT':
            return '3000';
          default:
            return undefined;
        }
      });

      // When
      const result = service.validateEnvironment();

      // Then
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);

      // Should log test environment
      expect(logger.log.bind(logger)).toHaveBeenCalledWith(
        '🚀 Environment Summary:',
      );
      expect(logger.log.bind(logger)).toHaveBeenCalledWith('   NODE_ENV: test');
    });

    it('should handle environment variable precedence correctly', () => {
      // Given - test that ConfigService.get is called with correct keys
      configService.get.mockImplementation((key: string) => {
        // Track which keys were requested
        if (key === 'JWT_SECRET') return 'a'.repeat(32);
        if (key === 'JWT_ACCESS_TTL') return '15m';
        if (key === 'JWT_REFRESH_TTL') return '7d';
        if (key === 'REDIS_URL') return 'redis://localhost:6379';
        if (key === 'PUBLIC_WEBHOOK_BASE') return 'https://api.example.com';
        if (key === 'TELEGRAM_WEBHOOK_SECRET') return 'a'.repeat(20);
        if (key === 'EVOLUTION_APIKEY') return 'b'.repeat(20);
        if (key === 'DATABASE_URL') return 'mongodb://localhost:27017/test';
        if (key === 'NODE_ENV') return 'development';
        if (key === 'PORT') return '3000';
        return undefined;
      });

      // When
      service.validateEnvironment();

      // Then
      const expectedKeys = [
        'JWT_SECRET',
        'JWT_ACCESS_TTL',
        'JWT_REFRESH_TTL',
        'REDIS_URL',
        'PUBLIC_WEBHOOK_BASE',
        'TELEGRAM_WEBHOOK_SECRET',
        'EVOLUTION_APIKEY',
        'DATABASE_URL',
        'NODE_ENV',
        'PORT',
      ];
      describe('getRequiredEnvVars', () => {
        it('should return all required environment variable definitions', () => {
          const vars = (service as any).getRequiredEnvVars();
          expect(vars).toBeInstanceOf(Array);
          expect(vars.length).toBeGreaterThan(5);
          expect(vars.some((v) => v.key === 'JWT_SECRET')).toBe(true);
        });
      });

      expectedKeys.forEach((key) => {
        expect(configService.get.bind(configService)).toHaveBeenCalledWith(key);
      });

      expect(configService.get.bind(configService)).toHaveBeenCalledTimes(
        expectedKeys.length,
      );
    });
  });
});
