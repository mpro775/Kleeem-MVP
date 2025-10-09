import { JwtService } from '@nestjs/jwt';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { I18nService } from 'nestjs-i18n';

import { configureSwagger } from './configure-swagger';
import { i18nizeSwagger } from './i18nize-swagger';

import type { Request } from 'express';

const mockedI18nizeSwagger = i18nizeSwagger as unknown as jest.Mock;

const mockedSwaggerModule = SwaggerModule as jest.Mocked<typeof SwaggerModule>;
const mockedDocumentBuilder = DocumentBuilder as jest.MockedClass<
  typeof DocumentBuilder
>;
// Mock the external dependencies
jest.mock('@nestjs/swagger');

// ضع هذا محل السطرين السابقين
jest.mock('./i18nize-swagger', () => ({
  i18nizeSwagger: jest.fn(),
}));
describe('configureSwagger', () => {
  let mockApp: any;

  beforeEach(() => {
    mockApp = {
      use: jest.fn(),
      get: jest.fn(),
    };

    // Reset all mocks
    jest.clearAllMocks();

    // Setup default mocks
    mockedSwaggerModule.createDocument.mockReturnValue({} as any);
    mockedSwaggerModule.setup.mockImplementation();
    mockedI18nizeSwagger.mockReturnValue({} as any);

    // Mock DocumentBuilder methods
    const mockDocumentBuilderInstance = {
      setTitle: jest.fn().mockReturnThis(),
      setDescription: jest.fn().mockReturnThis(),
      setVersion: jest.fn().mockReturnThis(),
      addBearerAuth: jest.fn().mockReturnThis(),
      setContact: jest.fn().mockReturnThis(),
      setLicense: jest.fn().mockReturnThis(),
      addServer: jest.fn().mockReturnThis(),
      build: jest.fn().mockReturnValue({}),
    } as any;

    mockedDocumentBuilder.mockImplementation(
      () => mockDocumentBuilderInstance as InstanceType<typeof DocumentBuilder>,
    );
  });

  it('should be defined', () => {
    expect(configureSwagger).toBeDefined();
  });

  describe('Swagger document creation', () => {
    it('should create DocumentBuilder instance', () => {
      configureSwagger(mockApp);

      expect(mockedDocumentBuilder).toHaveBeenCalled();
    });

    it('should configure Swagger document with correct title and description', () => {
      configureSwagger(mockApp);

      const mockInstance = mockedDocumentBuilder.mock.results[0].value;

      expect(mockInstance.setTitle).toHaveBeenCalledWith('Kaleem API');
      expect(mockInstance.setVersion).toHaveBeenCalledWith('1.0');
    });

    it('should configure different descriptions for production and development', () => {
      const originalEnv = process.env.NODE_ENV;

      // Test production
      process.env.NODE_ENV = 'production';
      configureSwagger(mockApp);

      const prodInstance = mockedDocumentBuilder.mock.results[0].value;
      expect(prodInstance.setDescription).toHaveBeenCalledWith(
        'API documentation for Kaleem - Production Environment',
      );

      // Test development
      process.env.NODE_ENV = 'development';
      configureSwagger(mockApp);

      const devInstance = mockedDocumentBuilder.mock.results[1].value;
      expect(devInstance.setDescription).toHaveBeenCalledWith(
        'API documentation for Kaleem',
      );

      // Restore original env
      process.env.NODE_ENV = originalEnv;
    });

    it('should configure Bearer auth with correct options', () => {
      configureSwagger(mockApp);

      const mockInstance = mockedDocumentBuilder.mock.results[0].value;

      expect(mockInstance.addBearerAuth).toHaveBeenCalledWith(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          in: 'header',
          name: 'Authorization',
        },
        'access-token',
      );
    });

    it('should configure contact information', () => {
      configureSwagger(mockApp);

      const mockInstance = mockedDocumentBuilder.mock.results[0].value;

      expect(mockInstance.setContact).toHaveBeenCalledWith(
        'Kaleem Team',
        'https://kaleem-ai.com',
        'support@kaleem-ai.com',
      );
    });

    it('should configure license information', () => {
      configureSwagger(mockApp);

      const mockInstance = mockedDocumentBuilder.mock.results[0].value;

      expect(mockInstance.setLicense).toHaveBeenCalledWith(
        'MIT',
        'https://opensource.org/licenses/MIT',
      );
    });

    it('should configure servers for different environments', () => {
      configureSwagger(mockApp);

      const mockInstance = mockedDocumentBuilder.mock.results[0].value;

      expect(mockInstance.addServer).toHaveBeenCalledWith(
        'http://localhost:3000',
        'Local environment',
      );
      expect(mockInstance.addServer).toHaveBeenCalledWith(
        'https://api.kaleem-ai.com',
        'Production',
      );
    });
  });

  describe('Swagger document creation and internationalization', () => {
    it('should create Swagger document with deep scan routes', () => {
      const mockConfig = {};
      mockedDocumentBuilder.mockImplementation(
        () =>
          ({
            setTitle: jest.fn().mockReturnThis() as any,
            setDescription: jest.fn().mockReturnThis() as any,
            setVersion: jest.fn().mockReturnThis() as any,
            addBearerAuth: jest.fn().mockReturnThis() as any,
            setContact: jest.fn().mockReturnThis() as any,
            setLicense: jest.fn().mockReturnThis() as any,
            addServer: jest.fn().mockReturnThis() as any,
            build: jest.fn().mockReturnValue(mockConfig) as any,
          }) as InstanceType<typeof DocumentBuilder>,
      );

      configureSwagger(mockApp);

      expect(mockedSwaggerModule.createDocument).toHaveBeenCalledWith(
        mockApp,
        mockConfig,
        { deepScanRoutes: true },
      );
    });

    it('should get I18nService from app', () => {
      const mockI18nService = {};
      mockApp.get.mockReturnValue(mockI18nService);

      configureSwagger(mockApp);

      expect(mockApp.get).toHaveBeenCalledWith(I18nService);
    });

    it('should use correct language for internationalization', () => {
      const mockI18nService = {};
      mockApp.get.mockReturnValue(mockI18nService);

      const originalLang = process.env.SWAGGER_LANG;
      process.env.SWAGGER_LANG = 'ar';

      configureSwagger(mockApp);

      expect(mockedI18nizeSwagger).toHaveBeenCalledWith(
        expect.any(Object),
        mockI18nService,
        'ar',
      );

      // Restore original lang
      process.env.SWAGGER_LANG = originalLang;
    });

    it('should use default language when SWAGGER_LANG is not set', () => {
      const mockI18nService = {};
      mockApp.get.mockReturnValue(mockI18nService);

      const originalLang = process.env.SWAGGER_LANG;
      delete process.env.SWAGGER_LANG;

      configureSwagger(mockApp);

      expect(mockedI18nizeSwagger).toHaveBeenCalledWith(
        expect.any(Object),
        mockI18nService,
        'ar', // Default language
      );

      // Restore original lang
      process.env.SWAGGER_LANG = originalLang;
    });
  });

  describe('Production JWT protection', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';

      // Mock JWT service
      const mockJwtService = {
        verify: jest.fn(),
      };
      mockApp.get.mockImplementation((token: any) => {
        if (token === JwtService) return mockJwtService;
        return {};
      });
    });

    afterEach(() => {
      delete process.env.NODE_ENV;
    });

    it('should add JWT protection middleware in production', () => {
      configureSwagger(mockApp);

      expect(mockApp.use).toHaveBeenCalledWith(
        '/api/docs*',
        expect.any(Function),
      );
    });

    it('should validate JWT token in authorization header', () => {
      const mockJwtService = {
        verify: jest.fn(),
      };
      mockApp.get.mockImplementation((token: any) => {
        if (token === JwtService) return mockJwtService;
        return {};
      });

      configureSwagger(mockApp);

      const protectionCall = mockApp.use.mock.calls.find(
        (call) => call[0] === '/api/docs*',
      );

      expect(protectionCall).toBeTruthy();

      const mockReq = {
        headers: { authorization: 'Bearer valid.jwt.token' },
      } as Request;
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;
      const mockNext = jest.fn();

      protectionCall![1](mockReq, mockRes, mockNext);

      expect(mockJwtService.verify).toHaveBeenCalledWith('valid.jwt.token', {
        secret: process.env.JWT_SECRET,
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject requests without authorization header', () => {
      const mockJwtService = {
        verify: jest.fn(),
      };
      mockApp.get.mockImplementation((token: any) => {
        if (token === JwtService) return mockJwtService;
        return {};
      });

      configureSwagger(mockApp);

      const protectionCall = mockApp.use.mock.calls.find(
        (call) => call[0] === '/api/docs*',
      );

      expect(protectionCall).toBeTruthy();

      const mockReq = {
        headers: {},
      } as Request;
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;
      const mockNext = jest.fn();

      protectionCall![1](mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        code: 'UNAUTHORIZED_DOCS_ACCESS',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject requests with invalid authorization format', () => {
      const mockJwtService = {
        verify: jest.fn(),
      };
      mockApp.get.mockImplementation((token: any) => {
        if (token === JwtService) return mockJwtService;
        return {};
      });

      configureSwagger(mockApp);

      const protectionCall = mockApp.use.mock.calls.find(
        (call) => call[0] === '/api/docs*',
      );

      expect(protectionCall).toBeTruthy();

      const mockReq = {
        headers: { authorization: 'InvalidFormat' },
      } as Request;
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;
      const mockNext = jest.fn();

      protectionCall![1](mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        code: 'UNAUTHORIZED_DOCS_ACCESS',
      });
    });

    it('should reject requests with invalid JWT token', () => {
      const mockJwtService = {
        verify: jest.fn().mockImplementation(() => {
          throw new Error('Invalid token');
        }),
      };
      mockApp.get.mockImplementation((token: any) => {
        if (token === JwtService) return mockJwtService;
        return {};
      });

      configureSwagger(mockApp);

      const protectionCall = mockApp.use.mock.calls.find(
        (call) => call[0] === '/api/docs*',
      );

      expect(protectionCall).toBeTruthy();

      const mockReq = {
        headers: { authorization: 'Bearer invalid.jwt.token' },
      } as Request;
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;
      const mockNext = jest.fn();

      protectionCall![1](mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        code: 'INVALID_JWT_DOCS_ACCESS',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should accept valid JWT token', () => {
      const mockJwtService = {
        verify: jest.fn(),
      };
      mockApp.get.mockImplementation((token: any) => {
        if (token === JwtService) return mockJwtService;
        return {};
      });

      configureSwagger(mockApp);

      const protectionCall = mockApp.use.mock.calls.find(
        (call) => call[0] === '/api/docs*',
      );

      expect(protectionCall).toBeTruthy();

      const mockReq = {
        headers: { authorization: 'Bearer valid.jwt.token' },
      } as Request;
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;
      const mockNext = jest.fn();

      protectionCall![1](mockReq, mockRes, mockNext);

      expect(mockJwtService.verify).toHaveBeenCalledWith('valid.jwt.token', {
        secret: process.env.JWT_SECRET,
      });
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('Development environment (no JWT protection)', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';

      mockApp.get.mockReturnValue({});
    });

    afterEach(() => {
      delete process.env.NODE_ENV;
    });

    it('should not add JWT protection middleware in development', () => {
      configureSwagger(mockApp);

      const protectionCall = mockApp.use.mock.calls.find(
        (call) => call[0] === '/api/docs*',
      );

      expect(protectionCall).toBeUndefined();
    });

    it('should proceed directly to Swagger setup in development', () => {
      configureSwagger(mockApp);

      expect(mockedSwaggerModule.setup).toHaveBeenCalledWith(
        'api/docs',
        mockApp,
        expect.any(Object),
        expect.any(Object),
      );
    });
  });

  describe('Swagger UI setup', () => {
    it('should configure Swagger UI with correct options', () => {
      mockApp.get.mockReturnValue({});

      configureSwagger(mockApp);

      expect(mockedSwaggerModule.setup).toHaveBeenCalledWith(
        'api/docs',
        mockApp,
        expect.any(Object),
        expect.objectContaining({
          swaggerOptions: {
            persistAuthorization: true,
            docExpansion: 'list',
            displayRequestDuration: true,
          },
        }),
      );
    });

    it('should configure different options for production and development', () => {
      mockApp.get.mockReturnValue({});

      const originalEnv = process.env.NODE_ENV;

      // Test production
      process.env.NODE_ENV = 'production';
      configureSwagger(mockApp);

      expect(mockedSwaggerModule.setup).toHaveBeenCalledWith(
        'api/docs',
        mockApp,
        expect.any(Object),
        expect.objectContaining({
          customSiteTitle: 'Kaleem API Docs - Production',
        }),
      );
      // Production should not have customfavIcon or customCssUrl
      const prodCall = mockedSwaggerModule.setup.mock.calls.find(
        (call) => call[3] && call[3].customSiteTitle?.includes('Production'),
      );
      expect(prodCall?.[3]).not.toHaveProperty('customfavIcon');
      expect(prodCall?.[3]).not.toHaveProperty('customCssUrl');

      jest.clearAllMocks();

      // Test development
      process.env.NODE_ENV = 'development';
      configureSwagger(mockApp);

      expect(mockedSwaggerModule.setup).toHaveBeenCalledWith(
        'api/docs',
        mockApp,
        expect.any(Object),
        expect.objectContaining({
          customSiteTitle: 'Kaleem API Docs',
          customfavIcon: 'https://kaleem-ai.com/favicon.ico',
          customCssUrl:
            'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css',
        }),
      );

      // Restore original env
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Environment detection', () => {
    it('should detect production environment correctly', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      configureSwagger(mockApp);

      // Should add JWT protection
      expect(mockApp.use).toHaveBeenCalledWith(
        '/api/docs*',
        expect.any(Function),
      );

      // Restore original env
      process.env.NODE_ENV = originalEnv;
    });

    it('should detect development environment correctly', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      configureSwagger(mockApp);

      // Should not add JWT protection
      const protectionCall = mockApp.use.mock.calls.find(
        (call) => call[0] === '/api/docs*',
      );
      expect(protectionCall).toBeUndefined();

      // Restore original env
      process.env.NODE_ENV = originalEnv;
    });

    it('should handle undefined NODE_ENV', () => {
      const originalEnv = process.env.NODE_ENV;
      delete process.env.NODE_ENV;

      configureSwagger(mockApp);

      // Should not add JWT protection (treat as development)
      const protectionCall = mockApp.use.mock.calls.find(
        (call) => call[0] === '/api/docs*',
      );
      expect(protectionCall).toBeUndefined();

      // Restore original env
      process.env.NODE_ENV = originalEnv;
    });

    it('should handle other NODE_ENV values as non-production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'staging';

      configureSwagger(mockApp);

      // Should not add JWT protection
      const protectionCall = mockApp.use.mock.calls.find(
        (call) => call[0] === '/api/docs*',
      );
      expect(protectionCall).toBeUndefined();

      // Restore original env
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Error handling', () => {
    it('should handle app without required methods gracefully', () => {
      const invalidApp = {};

      expect(() => configureSwagger(invalidApp as any)).not.toThrow();
    });

    it('should handle DocumentBuilder errors', () => {
      mockedDocumentBuilder.mockImplementation(() => {
        throw new Error('DocumentBuilder error');
      });

      expect(() => configureSwagger(mockApp)).toThrow('DocumentBuilder error');
    });

    it('should handle SwaggerModule errors', () => {
      mockedSwaggerModule.createDocument.mockImplementation(() => {
        throw new Error('Swagger creation error');
      });

      expect(() => configureSwagger(mockApp)).toThrow('Swagger creation error');
    });

    it('should handle I18nService errors', () => {
      mockApp.get.mockImplementation(() => {
        throw new Error('I18n service not available');
      });

      expect(() => configureSwagger(mockApp)).toThrow(
        'I18n service not available',
      );
    });

    it('should handle JWT verification errors in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const mockJwtService = {
        verify: jest.fn().mockImplementation(() => {
          throw new Error('JWT verification failed');
        }),
      };
      mockApp.get.mockImplementation((token: any) => {
        if (token === JwtService) return mockJwtService;
        if (token === I18nService) return {};
        return {};
      });

      configureSwagger(mockApp);

      const protectionCall = mockApp.use.mock.calls.find(
        (call) => call[0] === '/api/docs*',
      );

      expect(protectionCall).toBeTruthy();

      const mockReq = {
        headers: { authorization: 'Bearer invalid.token' },
      } as Request;
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;

      expect(() => {
        protectionCall![1](mockReq, mockRes, jest.fn());
      }).not.toThrow();

      // Restore original env
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Integration scenarios', () => {
    it('should work correctly in production environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const mockJwtService = { verify: jest.fn() };
      const mockI18nService = {};

      mockApp.get.mockImplementation((token: any) => {
        if (token === JwtService) return mockJwtService;
        if (token === I18nService) return mockI18nService;
        return {};
      });

      configureSwagger(mockApp);

      // Should add JWT protection
      expect(mockApp.use).toHaveBeenCalledWith(
        '/api/docs*',
        expect.any(Function),
      );

      // Should setup Swagger
      expect(mockedSwaggerModule.setup).toHaveBeenCalled();

      // Restore original env
      process.env.NODE_ENV = originalEnv;
    });

    it('should work correctly in development environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const mockI18nService = {};
      mockApp.get.mockReturnValue(mockI18nService);

      configureSwagger(mockApp);

      // Should not add JWT protection
      const protectionCall = mockApp.use.mock.calls.find(
        (call) => call[0] === '/api/docs*',
      );
      expect(protectionCall).toBeUndefined();

      // Should setup Swagger
      expect(mockedSwaggerModule.setup).toHaveBeenCalled();

      // Restore original env
      process.env.NODE_ENV = originalEnv;
    });

    it('should handle complete Swagger configuration flow', () => {
      const mockJwtService = { verify: jest.fn() };
      const mockI18nService = {};

      mockApp.get.mockImplementation((token: any) => {
        if (token === JwtService) return mockJwtService;
        if (token === I18nService) return mockI18nService;
        return {};
      });

      configureSwagger(mockApp);

      // Should create document builder
      expect(mockedDocumentBuilder).toHaveBeenCalled();

      // Should create document
      expect(mockedSwaggerModule.createDocument).toHaveBeenCalled();

      // Should internationalize document
      expect(mockedI18nizeSwagger).toHaveBeenCalled();

      // Should setup Swagger UI
      expect(mockedSwaggerModule.setup).toHaveBeenCalled();
    });
  });

  describe('Performance considerations', () => {
    it('should handle rapid successive configurations', () => {
      const mockI18nService = {};
      mockApp.get.mockReturnValue(mockI18nService);

      // Configure multiple times
      for (let i = 0; i < 100; i++) {
        configureSwagger(mockApp);
      }

      expect(mockedSwaggerModule.setup).toHaveBeenCalledTimes(100);
    });

    it('should be memory efficient', () => {
      const mockI18nService = {};
      mockApp.get.mockReturnValue(mockI18nService);

      const initialMemory = process.memoryUsage().heapUsed;

      // Configure many times
      for (let i = 0; i < 100; i++) {
        configureSwagger(mockApp);
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (allowing up to 20MB for test environment variability)
      expect(memoryIncrease).toBeLessThan(20 * 1024 * 1024);
    });
  });

  describe('Configuration validation', () => {
    it('should always configure DocumentBuilder with correct settings', () => {
      configureSwagger(mockApp);

      const mockInstance = mockedDocumentBuilder.mock.results[0].value;

      expect(mockInstance.setTitle).toHaveBeenCalledWith('Kaleem API');
      expect(mockInstance.setVersion).toHaveBeenCalledWith('1.0');
      expect(mockInstance.addBearerAuth).toHaveBeenCalled();
      expect(mockInstance.setContact).toHaveBeenCalled();
      expect(mockInstance.setLicense).toHaveBeenCalled();
      expect(mockInstance.addServer).toHaveBeenCalledTimes(2);
      expect(mockInstance.build).toHaveBeenCalled();
    });

    it('should always call SwaggerModule.createDocument with deepScanRoutes', () => {
      configureSwagger(mockApp);

      expect(mockedSwaggerModule.createDocument).toHaveBeenCalledWith(
        mockApp,
        expect.any(Object),
        { deepScanRoutes: true },
      );
    });

    it('should always call i18nizeSwagger with correct parameters', () => {
      const mockI18nService = {};
      mockApp.get.mockReturnValue(mockI18nService);

      const originalLang = process.env.SWAGGER_LANG;
      delete process.env.SWAGGER_LANG;

      configureSwagger(mockApp);

      expect(mockedI18nizeSwagger).toHaveBeenCalledWith(
        expect.any(Object),
        mockI18nService,
        'ar',
      );

      // Restore original lang
      process.env.SWAGGER_LANG = originalLang;
    });

    it('should always setup Swagger UI with correct path and options', () => {
      const mockI18nService = {};
      mockApp.get.mockReturnValue(mockI18nService);

      configureSwagger(mockApp);

      expect(mockedSwaggerModule.setup).toHaveBeenCalledWith(
        'api/docs',
        mockApp,
        expect.any(Object),
        expect.objectContaining({
          swaggerOptions: {
            persistAuthorization: true,
            docExpansion: 'list',
            displayRequestDuration: true,
          },
        }),
      );
    });
  });

  describe('JWT protection middleware details', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';

      const mockJwtService = {
        verify: jest.fn(),
      };
      mockApp.get.mockImplementation((token: any) => {
        if (token === JwtService) return mockJwtService;
        return {};
      });
    });

    afterEach(() => {
      delete process.env.NODE_ENV;
    });

    it('should extract token from Bearer authorization header', () => {
      const mockJwtService = {
        verify: jest.fn(),
      };
      mockApp.get.mockImplementation((token: any) => {
        if (token === JwtService) return mockJwtService;
        return {};
      });

      configureSwagger(mockApp);

      const protectionCall = mockApp.use.mock.calls.find(
        (call) => call[0] === '/api/docs*',
      );

      expect(protectionCall).toBeTruthy();

      const mockReq = {
        headers: { authorization: 'Bearer extracted.token.here' },
      } as Request;
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;
      const mockNext = jest.fn();

      protectionCall![1](mockReq, mockRes, mockNext);

      expect(mockJwtService.verify).toHaveBeenCalledWith(
        'extracted.token.here',
        { secret: process.env.JWT_SECRET },
      );
    });

    it('should handle missing JWT_SECRET environment variable', () => {
      const originalSecret = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;

      const mockJwtService = {
        verify: jest.fn(),
      };
      mockApp.get.mockImplementation((token: any) => {
        if (token === JwtService) return mockJwtService;
        return {};
      });

      configureSwagger(mockApp);

      const protectionCall = mockApp.use.mock.calls.find(
        (call) => call[0] === '/api/docs*',
      );

      expect(protectionCall).toBeTruthy();

      const mockReq = {
        headers: { authorization: 'Bearer token' },
      } as Request;
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;
      const mockNext = jest.fn();

      protectionCall![1](mockReq, mockRes, mockNext);

      expect(mockJwtService.verify).toHaveBeenCalledWith('token', {
        secret: undefined,
      });

      // Restore original secret
      process.env.JWT_SECRET = originalSecret;
    });

    it('should protect all /api/docs* paths', () => {
      const mockJwtService = {
        verify: jest.fn(),
      };
      mockApp.get.mockImplementation((token: any) => {
        if (token === JwtService) return mockJwtService;
        return {};
      });

      configureSwagger(mockApp);

      const protectionCall = mockApp.use.mock.calls.find(
        (call) => call[0] === '/api/docs*',
      );

      expect(protectionCall).toBeTruthy();

      const testPaths = [
        '/api/docs',
        '/api/docs/',
        '/api/docs/index.html',
        '/api/docs/swagger-ui.css',
        '/api/docs/swagger-ui-bundle.js',
      ];

      testPaths.forEach(() => {
        const mockReq = {
          headers: { authorization: 'Bearer token' },
        } as Request;
        const mockRes = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
        } as any;
        const mockNext = jest.fn();

        protectionCall![1](mockReq, mockRes, mockNext);

        expect(mockJwtService.verify).toHaveBeenCalled();
      });
    });
  });

  describe('Swagger UI options', () => {
    it('should configure Swagger UI options correctly for production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      configureSwagger(mockApp);

      expect(mockedSwaggerModule.setup).toHaveBeenCalledWith(
        'api/docs',
        mockApp,
        expect.any(Object),
        expect.objectContaining({
          customSiteTitle: 'Kaleem API Docs - Production',
        }),
      );
      // Production should not have customfavIcon or customCssUrl
      const prodCall = mockedSwaggerModule.setup.mock.calls[0];
      expect(prodCall[3]).not.toHaveProperty('customfavIcon');
      expect(prodCall[3]).not.toHaveProperty('customCssUrl');

      // Restore original env
      process.env.NODE_ENV = originalEnv;
    });

    it('should configure Swagger UI options correctly for development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      configureSwagger(mockApp);

      expect(mockedSwaggerModule.setup).toHaveBeenCalledWith(
        'api/docs',
        mockApp,
        expect.any(Object),
        expect.objectContaining({
          customSiteTitle: 'Kaleem API Docs',
          customfavIcon: 'https://kaleem-ai.com/favicon.ico',
          customCssUrl:
            'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css',
        }),
      );

      // Restore original env
      process.env.NODE_ENV = originalEnv;
    });

    it('should always include base swagger options', () => {
      configureSwagger(mockApp);

      expect(mockedSwaggerModule.setup).toHaveBeenCalledWith(
        'api/docs',
        mockApp,
        expect.any(Object),
        expect.objectContaining({
          swaggerOptions: {
            persistAuthorization: true,
            docExpansion: 'list',
            displayRequestDuration: true,
          },
        }),
      );
    });
  });

  describe('Edge cases', () => {
    it('should handle malformed app object', () => {
      const invalidApp = {};

      expect(() => configureSwagger(invalidApp as any)).not.toThrow();
    });

    it('should handle JWT service throwing errors', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const mockJwtService = {
        verify: jest.fn().mockImplementation(() => {
          throw new Error('JWT service error');
        }),
      };
      mockApp.get.mockImplementation((token: any) => {
        if (token === JwtService) return mockJwtService;
        return {};
      });

      configureSwagger(mockApp);

      const protectionCall = mockApp.use.mock.calls.find(
        (call) => call[0] === '/api/docs*',
      );

      expect(protectionCall).toBeTruthy();

      const mockReq = {
        headers: { authorization: 'Bearer token' },
      } as Request;
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;

      expect(() => {
        protectionCall![1](mockReq, mockRes, jest.fn());
      }).not.toThrow();

      // Restore original env
      process.env.NODE_ENV = originalEnv;
    });

    it('should handle I18nService throwing errors', () => {
      mockApp.get.mockImplementation((token: any) => {
        if (token === I18nService) {
          throw new Error('I18n service error');
        }
        return {};
      });

      expect(() => configureSwagger(mockApp)).toThrow('I18n service error');
    });

    it('should handle i18nizeSwagger throwing errors', () => {
      const mockI18nService = {};
      mockApp.get.mockReturnValue(mockI18nService);
      mockedI18nizeSwagger.mockImplementation(() => {
        throw new Error('i18nize error');
      });

      expect(() => configureSwagger(mockApp)).toThrow('i18nize error');
    });
  });
});
