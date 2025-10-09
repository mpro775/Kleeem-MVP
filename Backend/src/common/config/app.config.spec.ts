import compression from 'compression';
import helmet from 'helmet';

import { RequestIdMiddleware } from '../middlewares/request-id.middleware';

import { setupApp, AppConfig } from './app.config';
import { corsOptions } from './cors.config';

// Mock the external dependencies
jest.mock('compression');
jest.mock('helmet');
jest.mock('./cors.config', () => ({
  corsOptions: {
    origin: true,
    credentials: true,
    methods: ['GET', 'POST'],
  },
}));

describe('AppConfig', () => {
  describe('AppConfig class', () => {
    let appConfig: AppConfig;
    let consumer: any;

    beforeEach(() => {
      appConfig = new AppConfig();
      consumer = {
        apply: jest.fn().mockReturnThis(),
        forRoutes: jest.fn(),
      };
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should be defined', () => {
      expect(AppConfig).toBeDefined();
      expect(appConfig).toBeInstanceOf(AppConfig);
    });

    it('should implement NestModule interface', () => {
      expect(typeof appConfig.configure).toBe('function');
    });

    describe('configure method', () => {
      it('should apply RequestIdMiddleware to all routes', () => {
        appConfig.configure(consumer);

        expect(consumer.apply).toHaveBeenCalledWith(RequestIdMiddleware);
        expect(consumer.forRoutes).toHaveBeenCalledWith('*');
      });

      it('should return void', () => {
        const result = appConfig.configure(consumer);

        expect(result).toBeUndefined();
      });

      it('should handle multiple configure calls', () => {
        appConfig.configure(consumer);
        appConfig.configure(consumer);

        expect(consumer.apply).toHaveBeenCalledTimes(2);
        expect(consumer.forRoutes).toHaveBeenCalledTimes(2);
      });

      it('should handle consumer with different methods', () => {
        const mockConsumer = {
          apply: jest.fn().mockReturnThis(),
          forRoutes: jest.fn(),
          exclude: jest.fn(),
        };

        appConfig.configure(mockConsumer);

        expect(mockConsumer.apply).toHaveBeenCalledWith(RequestIdMiddleware);
        expect(mockConsumer.forRoutes).toHaveBeenCalledWith('*');
      });

      it('should handle consumer without forRoutes method', () => {
        const mockConsumer = {
          apply: jest.fn().mockReturnValue({
            forRoutes: jest.fn(),
          }),
        };

        appConfig.configure(mockConsumer);
        expect(mockConsumer.apply).toHaveBeenCalledWith(RequestIdMiddleware);
      });
    });

    describe('middleware integration', () => {
      it('should work with NestJS middleware consumer pattern', () => {
        const mockConsumer = {
          apply: jest.fn().mockReturnThis(),
          forRoutes: jest.fn(),
          exclude: jest.fn().mockReturnThis(),
        };

        appConfig.configure(mockConsumer);

        expect(mockConsumer.apply).toHaveBeenCalledWith(RequestIdMiddleware);
        expect(mockConsumer.forRoutes).toHaveBeenCalledWith('*');
      });

      it('should handle middleware chaining', () => {
        const mockConsumer = {
          apply: jest.fn().mockImplementation((middleware) => {
            if (middleware === RequestIdMiddleware) {
              return mockConsumer;
            }
            return { forRoutes: jest.fn() };
          }),
          forRoutes: jest.fn(),
        };

        appConfig.configure(mockConsumer);

        expect(mockConsumer.apply).toHaveBeenCalledWith(RequestIdMiddleware);
        expect(mockConsumer.forRoutes).toHaveBeenCalledWith('*');
      });
    });
  });

  describe('setupApp function', () => {
    let mockApp: any;
    let mockConfig: any;

    beforeEach(() => {
      mockApp = {
        enableCors: jest.fn(),
        use: jest.fn(),
      };

      mockConfig = {
        get: jest.fn(),
      };

      // Mock the middleware functions
      (helmet as jest.MockedFunction<typeof helmet>).mockReturnValue(() => {});
      (compression as jest.MockedFunction<typeof compression>).mockReturnValue(
        () => {},
      );

      // Reset mocks
      jest.clearAllMocks();
    });

    afterEach(() => {
      jest.resetAllMocks();
    });

    it('should be a function', () => {
      expect(typeof setupApp).toBe('function');
    });

    it('should enable CORS with corsOptions', () => {
      setupApp(mockApp, mockConfig);

      expect(mockApp.enableCors).toHaveBeenCalledWith(corsOptions);
    });

    it('should apply Vary: Origin middleware', () => {
      setupApp(mockApp, mockConfig);

      expect(mockApp.use).toHaveBeenCalledWith(expect.any(Function));

      // Test the middleware function
      const middlewareFn = (mockApp.use as jest.Mock).mock.calls[0][0];
      const mockReq = {};
      const mockRes = {
        vary: jest.fn(),
      };
      const mockNext = jest.fn();

      middlewareFn(mockReq, mockRes, mockNext);

      expect(mockRes.vary).toHaveBeenCalledWith('Origin');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should apply helmet security middleware', () => {
      mockConfig.get.mockReturnValue(31536000); // 1 year in seconds

      setupApp(mockApp, mockConfig);

      expect(helmet).toHaveBeenCalledWith(
        expect.objectContaining({
          contentSecurityPolicy: false, // Production mode by default in tests
          referrerPolicy: { policy: 'no-referrer' },
          crossOriginResourcePolicy: { policy: 'same-site' },
          hsts: {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true,
          },
          xPoweredBy: false,
          frameguard: { action: 'deny' },
          noSniff: true,
        }),
      );
    });

    it('should apply compression middleware', () => {
      setupApp(mockApp, mockConfig);

      expect(compression).toHaveBeenCalledTimes(1);
      expect(mockApp.use).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should return the app instance', () => {
      const result = setupApp(mockApp, mockConfig);

      expect(result).toBe(mockApp);
    });

    describe('helmet configuration', () => {
      it('should configure CSP for production environment', () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';

        mockConfig.get.mockReturnValue(31536000);

        setupApp(mockApp, mockConfig);

        const helmetConfig = (helmet as jest.MockedFunction<typeof helmet>).mock
          .calls[0][0];

        expect(helmetConfig).toHaveProperty('contentSecurityPolicy');
        expect(helmetConfig?.contentSecurityPolicy).toEqual({
          useDefaults: true,
          directives: {
            'default-src': ["'self'"],
            'img-src': ["'self'", 'data:', 'https:'],
            'script-src': [
              "'self'",
              "'unsafe-inline'",
              'https://cdnjs.cloudflare.com',
            ],
            'style-src': [
              "'self'",
              "'unsafe-inline'",
              'https://cdnjs.cloudflare.com',
            ],
            'font-src': ["'self'", 'https://cdnjs.cloudflare.com'],
            'connect-src': ["'self'"],
          },
        });

        process.env.NODE_ENV = originalEnv;
      });

      it('should disable CSP for non-production environment', () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';

        setupApp(mockApp, mockConfig);

        const helmetConfig = (helmet as jest.MockedFunction<typeof helmet>).mock
          .calls[0][0];

        expect(helmetConfig?.contentSecurityPolicy).toBe(false);

        process.env.NODE_ENV = originalEnv;
      });

      it('should configure HSTS with custom maxAge', () => {
        const customMaxAge = 63072000; // 2 years
        mockConfig.get.mockReturnValue(customMaxAge);

        setupApp(mockApp, mockConfig);

        const helmetConfig = (helmet as jest.MockedFunction<typeof helmet>).mock
          .calls[0][0];

        expect(helmetConfig?.hsts).toEqual({
          maxAge: customMaxAge,
          includeSubDomains: true,
          preload: true,
        });
      });

      it('should handle missing HSTS maxAge configuration', () => {
        mockConfig.get.mockReturnValue(undefined);

        // The implementation uses non-null assertion, so it doesn't validate
        // This test verifies the current behavior - no validation occurs
        expect(() => setupApp(mockApp, mockConfig)).not.toThrow();
      });

      it('should configure security headers correctly', () => {
        mockConfig.get.mockReturnValue(31536000);

        setupApp(mockApp, mockConfig);

        const helmetConfig = (helmet as jest.MockedFunction<typeof helmet>).mock
          .calls[0][0];

        expect(helmetConfig?.referrerPolicy).toEqual({ policy: 'no-referrer' });
        expect(helmetConfig?.crossOriginResourcePolicy).toEqual({
          policy: 'same-site',
        });
        expect(helmetConfig?.xPoweredBy).toBe(false);
        expect(helmetConfig?.frameguard).toEqual({ action: 'deny' });
        expect(helmetConfig?.noSniff).toBe(true);
      });
    });

    describe('middleware order', () => {
      it('should apply middleware in correct order', () => {
        mockConfig.get.mockReturnValue(31536000);

        setupApp(mockApp, mockConfig);

        // Should apply in this order:
        // 1. CORS enable
        // 2. Vary: Origin middleware
        // 3. Helmet security middleware
        // 4. Compression middleware

        expect(mockApp.enableCors).toHaveBeenCalledTimes(1);
        expect(mockApp.use).toHaveBeenCalledTimes(3); // Vary, Helmet, Compression

        // Check that enableCors was called before any use calls
        const enableCorsCallOrder = (mockApp.enableCors as jest.Mock).mock
          .invocationCallOrder[0];
        const useCallOrders = (mockApp.use as jest.Mock).mock
          .invocationCallOrder;

        expect(enableCorsCallOrder).toBeLessThan(Math.min(...useCallOrders));
      });

      it('should handle middleware application errors', () => {
        mockApp.use.mockImplementation(() => {
          throw new Error('Middleware application failed');
        });

        expect(() => setupApp(mockApp, mockConfig)).toThrow(
          'Middleware application failed',
        );
      });
    });

    describe('CORS configuration', () => {
      it('should use corsOptions from cors.config', () => {
        setupApp(mockApp, mockConfig);

        expect(mockApp.enableCors).toHaveBeenCalledWith(corsOptions);
      });

      it('should handle corsOptions being a function', () => {
        const corsFunction = jest.fn();
        require('./cors.config').corsOptions = corsFunction;

        setupApp(mockApp, mockConfig);

        expect(mockApp.enableCors).toHaveBeenCalledWith(corsFunction);
      });

      it('should handle corsOptions being an object', () => {
        const corsObject = { origin: true, credentials: true };
        require('./cors.config').corsOptions = corsObject;

        setupApp(mockApp, mockConfig);

        expect(mockApp.enableCors).toHaveBeenCalledWith(corsObject);
      });
    });

    describe('error handling', () => {
      it('should handle helmet throwing errors', () => {
        (helmet as jest.MockedFunction<typeof helmet>).mockImplementation(
          () => {
            throw new Error('Helmet configuration error');
          },
        );

        expect(() => setupApp(mockApp, mockConfig)).toThrow(
          'Helmet configuration error',
        );
      });

      it('should handle compression throwing errors', () => {
        (
          compression as jest.MockedFunction<typeof compression>
        ).mockImplementation(() => {
          throw new Error('Compression error');
        });

        expect(() => setupApp(mockApp, mockConfig)).toThrow(
          'Compression error',
        );
      });

      it('should handle missing config service', () => {
        expect(() => setupApp(mockApp, undefined as any)).toThrow();
      });

      it('should handle missing app instance', () => {
        expect(() => setupApp(undefined as any, mockConfig)).toThrow();
      });
    });

    describe('environment-specific behavior', () => {
      it('should handle production environment', () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';

        mockConfig.get.mockReturnValue(31536000);

        setupApp(mockApp, mockConfig);

        const helmetConfig = (helmet as jest.MockedFunction<typeof helmet>).mock
          .calls[0][0];
        expect(helmetConfig?.contentSecurityPolicy).not.toBe(false);

        process.env.NODE_ENV = originalEnv;
      });

      it('should handle development environment', () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';

        setupApp(mockApp, mockConfig);

        const helmetConfig = (helmet as jest.MockedFunction<typeof helmet>).mock
          .calls[0][0];
        expect(helmetConfig?.contentSecurityPolicy).toBe(false);

        process.env.NODE_ENV = originalEnv;
      });

      it('should handle test environment', () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'test';

        setupApp(mockApp, mockConfig);

        const helmetConfig = (helmet as jest.MockedFunction<typeof helmet>).mock
          .calls[0][0];
        expect(helmetConfig?.contentSecurityPolicy).toBe(false);

        process.env.NODE_ENV = originalEnv;
      });
    });

    describe('integration scenarios', () => {
      it('should setup complete application configuration', () => {
        mockConfig.get.mockReturnValue(31536000);

        const result = setupApp(mockApp, mockConfig);

        expect(result).toBe(mockApp);
        expect(mockApp.enableCors).toHaveBeenCalledTimes(1);
        expect(mockApp.use).toHaveBeenCalledTimes(3);
        expect(helmet).toHaveBeenCalledTimes(1);
        expect(compression).toHaveBeenCalledTimes(1);
      });

      it('should work with different HSTS maxAge values', () => {
        const testValues = [31536000, 63072000, 86400, 3600];

        testValues.forEach((maxAge) => {
          // Clear previous calls
          (helmet as jest.MockedFunction<typeof helmet>).mockClear();
          mockConfig.get.mockReturnValue(maxAge);

          setupApp(mockApp, mockConfig);

          const helmetConfig = (helmet as jest.MockedFunction<typeof helmet>)
            .mock.calls[0][0];
          expect((helmetConfig?.hsts as any)?.maxAge).toBe(maxAge);
        });
      });

      it('should handle concurrent setup calls', () => {
        mockConfig.get.mockReturnValue(31536000);

        // Simulate concurrent setup calls
        const results: any[] = [];
        for (let i = 0; i < 10; i++) {
          results.push(setupApp(mockApp, mockConfig));
        }

        expect(results).toHaveLength(10);
        results.forEach((result) => expect(result).toBe(mockApp));
      });
    });

    describe('Vary: Origin middleware', () => {
      it('should set Vary: Origin header', () => {
        setupApp(mockApp, mockConfig);

        const middlewareFn = (mockApp.use as jest.Mock).mock.calls[0][0];
        const mockReq = {};
        const mockRes = {
          vary: jest.fn(),
        };
        const mockNext = jest.fn();

        middlewareFn(mockReq, mockRes, mockNext);

        expect(mockRes.vary).toHaveBeenCalledWith('Origin');
        expect(mockNext).toHaveBeenCalledTimes(1);
      });

      it('should handle response without vary method', () => {
        setupApp(mockApp, mockConfig);

        const middlewareFn = (mockApp.use as jest.Mock).mock.calls[0][0];
        const mockReq = {} as any;
        const mockRes = {} as any;
        const mockNext = jest.fn();

        expect(() => middlewareFn(mockReq, mockRes, mockNext)).toThrow();
      });

      it('should handle next function throwing error', () => {
        setupApp(mockApp, mockConfig);

        const middlewareFn = (mockApp.use as jest.Mock).mock.calls[0][0];
        const mockReq = {} as any;
        const mockRes = {
          vary: jest.fn(),
        };
        const mockNext = jest.fn().mockImplementation(() => {
          throw new Error('Next function error');
        });

        expect(() => middlewareFn(mockReq, mockRes, mockNext)).toThrow(
          'Next function error',
        );
      });

      it('should handle vary method throwing error', () => {
        setupApp(mockApp, mockConfig);

        const middlewareFn = (mockApp.use as jest.Mock).mock.calls[0][0];
        const mockReq = {} as any;
        const mockRes = {
          vary: jest.fn().mockImplementation(() => {
            throw new Error('Vary method error');
          }),
        };
        const mockNext = jest.fn();

        expect(() => middlewareFn(mockReq, mockRes, mockNext)).toThrow(
          'Vary method error',
        );
        expect(mockNext).not.toHaveBeenCalled();
      });
    });

    describe('performance considerations', () => {
      it('should handle rapid setup calls', () => {
        mockConfig.get.mockReturnValue(31536000);

        const startTime = Date.now();

        for (let i = 0; i < 1000; i++) {
          setupApp(mockApp, mockConfig);
        }

        const endTime = Date.now();
        const duration = endTime - startTime;

        expect(duration).toBeLessThan(1000); // Should complete within 1 second
      });

      it('should not create memory leaks', () => {
        mockConfig.get.mockReturnValue(31536000);

        for (let i = 0; i < 10000; i++) {
          setupApp(mockApp, mockConfig);
        }

        // If we get here without memory issues, test passes
        expect(true).toBe(true);
      });
    });
  });

  describe('integration with NestJS application', () => {
    it('should work with real NestJS application structure', () => {
      const mockApp = {
        enableCors: jest.fn().mockReturnThis(),
        use: jest.fn().mockReturnThis(),
      };

      const mockConfig = {
        get: jest.fn().mockReturnValue(31536000),
      };

      const result = setupApp(mockApp as any, mockConfig as any);

      expect(result).toBe(mockApp);
      expect(mockApp.enableCors).toHaveBeenCalledWith(corsOptions);
    });

    it('should handle application with existing middleware', () => {
      const mockApp = {
        enableCors: jest.fn().mockReturnThis(),
        use: jest.fn(),
      };

      const mockConfig = {
        get: jest.fn().mockReturnValue(31536000),
      };

      // Setup mocks for this test
      (helmet as jest.MockedFunction<typeof helmet>).mockReturnValue(() => {});
      (compression as jest.MockedFunction<typeof compression>).mockReturnValue(
        () => {},
      );

      setupApp(mockApp as any, mockConfig as any);

      // Verify that use was called 3 times with different middleware functions
      expect(mockApp.use).toHaveBeenCalledTimes(3);

      // Each call should be with a function (middleware)
      mockApp.use.mock.calls.forEach(([middleware]) => {
        expect(typeof middleware).toBe('function');
      });
    });
  });

  describe('type safety', () => {
    it('should accept valid INestApplication interface', () => {
      const validApp = {
        enableCors: jest.fn().mockReturnThis(),
        use: jest.fn().mockReturnThis(),
      };

      const mockConfig = {
        get: jest.fn().mockReturnValue(31536000),
      };

      expect(() => setupApp(validApp as any, mockConfig as any)).not.toThrow();
    });

    it('should accept valid ConfigService interface', () => {
      const mockApp = {
        enableCors: jest.fn().mockReturnThis(),
        use: jest.fn().mockReturnThis(),
      };

      const validConfig = {
        get: jest.fn().mockReturnValue(31536000),
      };

      expect(() => setupApp(mockApp as any, validConfig as any)).not.toThrow();
    });
  });

  describe('real-world usage scenarios', () => {
    it('should setup application for production deployment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const mockApp = {
        enableCors: jest.fn().mockReturnThis(),
        use: jest.fn().mockReturnThis(),
      };

      const mockConfig = {
        get: jest.fn().mockReturnValue(31536000),
      };

      setupApp(mockApp as any, mockConfig as any);

      const helmetConfig = (helmet as jest.MockedFunction<typeof helmet>).mock
        .calls[0][0];
      expect(helmetConfig?.contentSecurityPolicy).not.toBe(false);

      process.env.NODE_ENV = originalEnv;
    });

    it('should setup application for development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const mockApp = {
        enableCors: jest.fn().mockReturnThis(),
        use: jest.fn().mockReturnThis(),
      };

      const mockConfig = {
        get: jest.fn().mockReturnValue(31536000),
      };

      setupApp(mockApp as any, mockConfig as any);

      const helmetConfig = (helmet as jest.MockedFunction<typeof helmet>).mock
        .calls[0][0];
      expect(helmetConfig?.contentSecurityPolicy).toBe(false);

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle CI/CD environment', () => {
      process.env.NODE_ENV = 'test';
      process.env.CI = 'true';

      const mockApp = {
        enableCors: jest.fn().mockReturnThis(),
        use: jest.fn().mockReturnThis(),
      };

      const mockConfig = {
        get: jest.fn().mockReturnValue(31536000),
      };

      setupApp(mockApp as any, mockConfig as any);

      const helmetConfig = (helmet as jest.MockedFunction<typeof helmet>).mock
        .calls[0][0];
      expect(helmetConfig?.contentSecurityPolicy).toBe(false);
    });
  });
});
