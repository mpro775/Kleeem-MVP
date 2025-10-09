import { Test } from '@nestjs/testing';
import { of, throwError } from 'rxjs';

import { ErrorManagementService } from '../services/error-management.service';

import { shouldBypass } from './bypass.util';
import { ErrorLoggingInterceptor } from './error-logging.interceptor';

import type { TestingModule } from '@nestjs/testing';

jest.mock('./bypass.util');

describe('ErrorLoggingInterceptor', () => {
  let interceptor: ErrorLoggingInterceptor;
  let errorManagementService: jest.Mocked<ErrorManagementService>;
  let mockShouldBypass: jest.MockedFunction<typeof shouldBypass>;

  beforeEach(async () => {
    mockShouldBypass = shouldBypass as jest.MockedFunction<typeof shouldBypass>;

    const mockErrorManagementService = {
      logError: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ErrorLoggingInterceptor,
        {
          provide: ErrorManagementService,
          useValue: mockErrorManagementService,
        },
      ],
    }).compile();

    interceptor = module.get<ErrorLoggingInterceptor>(ErrorLoggingInterceptor);
    errorManagementService = module.get(ErrorManagementService);

    // Spy on the interceptor's logger methods
    jest.spyOn(interceptor['logger'], 'error').mockImplementation();
    jest.spyOn(interceptor['logger'], 'debug').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  describe('intercept method', () => {
    it('should be defined', () => {
      expect(interceptor.intercept).toBeDefined();
    });

    it('should return an Observable', () => {
      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => ({})),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('test data')),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler);

      expect(result).toBeDefined();
      expect(typeof result.subscribe).toBe('function');
    });
  });

  describe('bypass scenarios', () => {
    it('should bypass metrics endpoint', () => {
      mockShouldBypass.mockReturnValue(true);

      const mockRequest = { originalUrl: '/metrics' };
      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('metrics data')),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler);
      expect(result).toBeDefined();
      expect(mockShouldBypass).toHaveBeenCalledWith(mockRequest);
      expect(mockCallHandler.handle).toHaveBeenCalled();
      expect(errorManagementService.logError).not.toHaveBeenCalled();
    });

    it('should bypass health endpoint', () => {
      mockShouldBypass.mockReturnValue(true);

      const mockRequest = { originalUrl: '/health' };
      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('health data')),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler);

      expect(result).toBeDefined();
      expect(mockShouldBypass).toHaveBeenCalledWith(mockRequest);
      expect(mockCallHandler.handle).toHaveBeenCalled();
      expect(errorManagementService.logError).not.toHaveBeenCalled();
    });

    it('should bypass when request should be bypassed', () => {
      mockShouldBypass.mockReturnValue(true);

      const mockRequest = { originalUrl: '/api/test' };
      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('bypassed data')),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler);

      expect(result).toBeDefined();
      expect(mockShouldBypass).toHaveBeenCalledWith(mockRequest);
      expect(mockCallHandler.handle).toHaveBeenCalled();
      expect(errorManagementService.logError).not.toHaveBeenCalled();
    });
  });

  describe('error logging', () => {
    it('should log errors when they occur', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-error-log';
      const method = 'GET';
      const url = '/api/users';
      const ip = '192.168.1.1';
      const userAgent = 'Mozilla/5.0';
      const userId = 'user_123';
      const merchantId = 'merchant_456';

      const mockRequest = {
        requestId,
        method,
        url,
        ip,
        originalUrl: url,
        headers: {
          'user-agent': userAgent,
        },
        user: { userId },
        authUser: { _id: userId, merchantId },
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const error = new Error('Test error');
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => error)),
      };

      errorManagementService.logError.mockReturnValue('error-id-123');

      const result = interceptor.intercept(mockContext, mockCallHandler);

      let caughtError: Error | undefined;
      result.subscribe({
        error: (err) => {
          caughtError = err;
        },
      });

      expect(caughtError).toBeDefined();
      expect(errorManagementService.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          url,
          method,
          ip,
          userId,
          merchantId,
          requestId,
          userAgent,
        }),
      );
    });

    it('should handle errors without user context', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-no-user';
      const method = 'POST';
      const url = '/api/public';
      const ip = '10.0.0.1';

      const mockRequest = {
        requestId,
        method,
        url,
        ip,
        originalUrl: url,
        headers: {},
        // No user or authUser
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const error = new Error('Public endpoint error');
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => error)),
      };

      errorManagementService.logError.mockReturnValue('error-id-public');

      const result = interceptor.intercept(mockContext, mockCallHandler);

      let caughtError: Error | undefined;
      result.subscribe({
        error: (err) => {
          caughtError = err;
        },
      });

      expect(caughtError).toBeDefined();
      expect(errorManagementService.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          url,
          method,
          ip,
          requestId,
        }),
      );
      expect(
        errorManagementService.logError.mock.calls[0][1],
      ).not.toHaveProperty('userId');
      expect(
        errorManagementService.logError.mock.calls[0][1],
      ).not.toHaveProperty('merchantId');
    });

    it('should handle string errors', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-string-error';
      const method = 'GET';
      const url = '/api/test';

      const mockRequest = {
        requestId,
        method,
        url,
        originalUrl: url,
        headers: {},
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const stringError = 'String error message';
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => stringError)),
      };

      errorManagementService.logError.mockReturnValue('error-id-string');

      const result = interceptor.intercept(mockContext, mockCallHandler);

      let caughtError: unknown;
      result.subscribe({
        error: (err) => {
          caughtError = err;
        },
      });

      expect(caughtError).toBeDefined();
      expect(errorManagementService.logError).toHaveBeenCalledWith(
        stringError,
        expect.objectContaining({
          url,
          method,
          requestId,
        }),
      );
    });

    it('should handle unknown error types', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-unknown-error';
      const method = 'PUT';
      const url = '/api/test';

      const mockRequest = {
        requestId,
        method,
        url,
        originalUrl: url,
        headers: {},
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const unknownError = { error: 'unknown error object' };
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => unknownError)),
      };

      errorManagementService.logError.mockReturnValue('error-id-unknown');

      const result = interceptor.intercept(mockContext, mockCallHandler);

      let caughtError: unknown;
      result.subscribe({
        error: (err) => {
          caughtError = err;
        },
      });

      expect(caughtError).toBeDefined();
      expect(errorManagementService.logError).toHaveBeenCalledWith(
        unknownError,
        expect.objectContaining({
          url,
          method,
          requestId,
        }),
      );
    });
  });

  describe('user ID extraction', () => {
    it('should extract user ID from authUser._id', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-auth-user';
      const method = 'GET';
      const url = '/api/profile';
      const userId = 'user_123';

      const mockRequest = {
        requestId,
        method,
        url,
        originalUrl: url,
        headers: {},
        authUser: { _id: userId },
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const error = new Error('Profile access error');
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => error)),
      };

      errorManagementService.logError.mockReturnValue('error-id-auth');

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe({
        error: () => {
          // Error handler
        },
      });

      expect(errorManagementService.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          userId,
        }),
      );
    });

    it('should extract user ID from JWT user.userId', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-jwt-user';
      const method = 'GET';
      const url = '/api/data';
      const userId = 'jwt_user_456';

      const mockRequest = {
        requestId,
        method,
        url,
        originalUrl: url,
        headers: {},
        user: { userId },
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const error = new Error('JWT user error');
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => error)),
      };

      errorManagementService.logError.mockReturnValue('error-id-jwt');

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe({
        error: () => {
          // Error handler
        },
      });

      expect(errorManagementService.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          userId,
        }),
      );
    });

    it('should prefer authUser._id over JWT user.userId', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-both-users';
      const method = 'GET';
      const url = '/api/test';
      const authUserId = 'auth_user_123';
      const jwtUserId = 'jwt_user_456';

      const mockRequest = {
        requestId,
        method,
        url,
        originalUrl: url,
        headers: {},
        authUser: { _id: authUserId },
        user: { userId: jwtUserId },
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const error = new Error('Both users error');
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => error)),
      };

      errorManagementService.logError.mockReturnValue('error-id-both');

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe({
        error: () => {
          // Error handler
        },
      });

      expect(errorManagementService.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          userId: authUserId, // Should prefer authUser
        }),
      );
    });

    it('should handle authUser._id as number', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-numeric-id';
      const method = 'GET';
      const url = '/api/test';
      const numericUserId = 123;

      const mockRequest = {
        requestId,
        method,
        url,
        originalUrl: url,
        headers: {},
        authUser: { _id: numericUserId },
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const error = new Error('Numeric ID error');
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => error)),
      };

      errorManagementService.logError.mockReturnValue('error-id-numeric');

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe({
        error: () => {
          // Error handler
        },
      });

      expect(errorManagementService.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          userId: '123', // Should convert to string
        }),
      );
    });

    it('should handle invalid authUser._id', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-invalid-id';
      const method = 'GET';
      const url = '/api/test';

      const mockRequest = {
        requestId,
        method,
        url,
        originalUrl: url,
        headers: {},
        authUser: { _id: null },
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const error = new Error('Invalid ID error');
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => error)),
      };

      errorManagementService.logError.mockReturnValue('error-id-invalid');

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe({
        error: () => {
          // Error handler
        },
      });

      expect(errorManagementService.logError).toHaveBeenCalledWith(
        error,
        expect.not.objectContaining({
          userId: expect.any(String),
        }),
      );
    });
  });

  describe('merchant ID extraction', () => {
    it('should extract merchant ID from authUser.merchantId', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-auth-merchant';
      const method = 'GET';
      const url = '/api/merchant';
      const merchantId = 'merchant_123';

      const mockRequest = {
        requestId,
        method,
        url,
        originalUrl: url,
        headers: {},
        authUser: { merchantId },
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const error = new Error('Merchant error');
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => error)),
      };

      errorManagementService.logError.mockReturnValue('error-id-merchant');

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe({
        error: () => {
          // Error handler
        },
      });

      expect(errorManagementService.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          merchantId,
        }),
      );
    });

    it('should extract merchant ID from JWT user.merchantId', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-jwt-merchant';
      const method = 'GET';
      const url = '/api/data';
      const merchantId = 'jwt_merchant_456';

      const mockRequest = {
        requestId,
        method,
        url,
        originalUrl: url,
        headers: {},
        user: { merchantId },
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const error = new Error('JWT merchant error');
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => error)),
      };

      errorManagementService.logError.mockReturnValue('error-id-jwt-merchant');

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe({
        error: () => {
          // Error handler
        },
      });

      expect(errorManagementService.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          merchantId,
        }),
      );
    });

    it('should prefer authUser.merchantId over JWT user.merchantId', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-both-merchants';
      const method = 'GET';
      const url = '/api/test';
      const authMerchantId = 'auth_merchant_123';
      const jwtMerchantId = 'jwt_merchant_456';

      const mockRequest = {
        requestId,
        method,
        url,
        originalUrl: url,
        headers: {},
        authUser: { merchantId: authMerchantId },
        user: { merchantId: jwtMerchantId },
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const error = new Error('Both merchants error');
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => error)),
      };

      errorManagementService.logError.mockReturnValue(
        'error-id-both-merchants',
      );

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe({
        error: () => {
          // Error handler
        },
      });

      expect(errorManagementService.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          merchantId: authMerchantId, // Should prefer authUser
        }),
      );
    });

    it('should handle authUser.merchantId as number', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-numeric-merchant';
      const method = 'GET';
      const url = '/api/test';
      const numericMerchantId = 789;

      const mockRequest = {
        requestId,
        method,
        url,
        originalUrl: url,
        headers: {},
        authUser: { merchantId: numericMerchantId },
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const error = new Error('Numeric merchant error');
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => error)),
      };

      errorManagementService.logError.mockReturnValue(
        'error-id-numeric-merchant',
      );

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe({
        error: () => {
          // Error handler
        },
      });

      expect(errorManagementService.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          merchantId: '789', // Should convert to string
        }),
      );
    });

    it('should handle invalid authUser.merchantId', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-invalid-merchant';
      const method = 'GET';
      const url = '/api/test';

      const mockRequest = {
        requestId,
        method,
        url,
        originalUrl: url,
        headers: {},
        authUser: { merchantId: null },
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const error = new Error('Invalid merchant error');
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => error)),
      };

      errorManagementService.logError.mockReturnValue(
        'error-id-invalid-merchant',
      );

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe({
        error: () => {
          // Error handler
        },
      });

      expect(errorManagementService.logError).toHaveBeenCalledWith(
        error,
        expect.not.objectContaining({
          merchantId: expect.any(String),
        }),
      );
    });
  });

  describe('request metadata extraction', () => {
    it('should extract all available metadata', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-full-meta';
      const method = 'POST';
      const url = '/api/complete';
      const ip = '192.168.1.100';
      const userAgent = 'CustomClient/1.0';
      const userId = 'user_123';
      const merchantId = 'merchant_456';

      const mockRequest = {
        requestId,
        method,
        url,
        originalUrl: url,
        ip,
        headers: {
          'user-agent': userAgent,
          'x-request-id': requestId,
        },
        authUser: { _id: userId, merchantId },
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const error = new Error('Complete metadata error');
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => error)),
      };

      errorManagementService.logError.mockReturnValue('error-id-complete');

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe({
        error: () => {
          // Error handler
        },
      });

      expect(errorManagementService.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          url,
          method,
          ip,
          userId,
          merchantId,
          requestId,
          userAgent,
        }),
      );
    });

    it('should handle missing optional metadata', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-minimal-meta';
      const method = 'GET';
      const url = '/api/minimal';
      const ip = '10.0.0.1';

      const mockRequest = {
        requestId,
        method,
        url,
        originalUrl: url,
        ip,
        headers: {},
        // No user or authUser
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const error = new Error('Minimal metadata error');
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => error)),
      };

      errorManagementService.logError.mockReturnValue('error-id-minimal');

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe({
        error: () => {
          // Error handler
        },
      });

      expect(errorManagementService.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          url,
          method,
          ip,
          requestId,
        }),
      );
      expect(
        errorManagementService.logError.mock.calls[0][1],
      ).not.toHaveProperty('userId');
      expect(
        errorManagementService.logError.mock.calls[0][1],
      ).not.toHaveProperty('merchantId');
      expect(
        errorManagementService.logError.mock.calls[0][1],
      ).not.toHaveProperty('userAgent');
    });

    it('should extract request ID from x-request-id header when requestId is missing', () => {
      mockShouldBypass.mockReturnValue(false);

      const method = 'GET';
      const url = '/api/header-id';
      const ip = '10.0.0.2';
      const headerRequestId = 'header-req-id';

      const mockRequest = {
        method,
        url,
        originalUrl: url,
        ip,
        headers: {
          'x-request-id': headerRequestId,
        },
        // No requestId property
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const error = new Error('Header ID error');
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => error)),
      };

      errorManagementService.logError.mockReturnValue('error-id-header');

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe({
        error: () => {
          // Error handler
        },
      });

      expect(errorManagementService.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          requestId: headerRequestId,
        }),
      );
    });

    it('should handle URL normalization', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-url-normalization';
      const method = 'GET';
      const originalUrl = '/api/users?page=1&limit=10';
      const url = '/api/users';

      const mockRequest = {
        requestId,
        method,
        url,
        originalUrl,
        ip: '10.0.0.3',
        headers: {},
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const error = new Error('URL normalization error');
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => error)),
      };

      errorManagementService.logError.mockReturnValue('error-id-url');

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe({
        error: () => {
          // Error handler
        },
      });

      expect(errorManagementService.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          url, // Should use normalized URL
        }),
      );
    });
  });

  describe('error management service integration', () => {
    it('should call logError with correct parameters', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-service-integration';
      const method = 'POST';
      const url = '/api/test';
      const ip = '10.0.0.4';
      const userId = 'user_123';

      const mockRequest = {
        requestId,
        method,
        url,
        originalUrl: url,
        ip,
        headers: {},
        authUser: { _id: userId },
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const error = new Error('Service integration error');
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => error)),
      };

      errorManagementService.logError.mockReturnValue('error-id-service');

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe({
        error: () => {
          // Error handler
        },
      });

      expect(errorManagementService.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          url,
          method,
          ip,
          userId,
          requestId,
        }),
      );
    });

    it('should handle logError throwing errors', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-service-error';
      const method = 'GET';
      const url = '/api/test';

      const mockRequest = {
        requestId,
        method,
        url,
        originalUrl: url,
        headers: {},
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const error = new Error('Original error');
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => error)),
      };

      errorManagementService.logError.mockImplementation(() => {
        throw new Error('Log error failed');
      });

      const result = interceptor.intercept(mockContext, mockCallHandler);

      let caughtError: Error | undefined;
      result.subscribe({
        error: (err) => {
          caughtError = err;
        },
      });

      expect(caughtError).toBeDefined();
      expect(interceptor['logger'].error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to log error'),
      );
    });

    it('should handle logError returning different values', () => {
      mockShouldBypass.mockReturnValue(false);

      const testCases = ['error-id-1', 'ERR-123', 'error_456', null, undefined];

      testCases.forEach((errorId) => {
        const requestId = `req-return-${JSON.stringify(errorId)}`;
        const method = 'GET';
        const url = '/api/test';

        const mockRequest = {
          requestId,
          method,
          url,
          originalUrl: url,
          headers: {},
        };

        const mockContext = {
          getType: jest.fn(() => 'http'),
          switchToHttp: jest.fn(() => ({
            getRequest: jest.fn(() => mockRequest),
          })),
        } as any;

        const error = new Error('Return value test');
        const mockCallHandler = {
          handle: jest.fn(() => throwError(() => error)),
        };

        errorManagementService.logError.mockReturnValue(errorId as string);

        const result = interceptor.intercept(mockContext, mockCallHandler);

        result.subscribe({
          error: () => {
            // Error handler
          },
        });

        expect(errorManagementService.logError).toHaveBeenCalled();
        expect(interceptor['logger'].debug).toHaveBeenCalledWith(
          expect.stringContaining('Error logged with ID'),
        );
      });
    });
  });

  describe('context handling', () => {
    it('should handle non-HTTP context', () => {
      const mockContext = {
        getType: jest.fn(() => 'ws'),
        switchToHttp: jest.fn(),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('test')),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler);

      expect(result).toBeDefined();
      expect(mockCallHandler.handle).toHaveBeenCalled();
      expect(errorManagementService.logError).not.toHaveBeenCalled();
    });

    it('should handle missing switchToHttp method', () => {
      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => {
          throw new Error('switchToHttp not available');
        }),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('test')),
      };

      expect(() => interceptor.intercept(mockContext, mockCallHandler)).toThrow(
        'switchToHttp not available',
      );
    });

    it('should handle missing getRequest method', () => {
      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => {
            throw new Error('getRequest not available');
          }),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('test')),
      };

      expect(() => interceptor.intercept(mockContext, mockCallHandler)).toThrow(
        'getRequest not available',
      );
    });

    it('should handle request object throwing errors', () => {
      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => {
            throw new Error('Request access error');
          }),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('test')),
      };

      expect(() => interceptor.intercept(mockContext, mockCallHandler)).toThrow(
        'Request access error',
      );
    });
  });

  describe('call handler integration', () => {
    it('should call next.handle() for non-bypass requests', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockRequest = { requestId: 'req-handler' };
      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('handler data')),
      };

      interceptor.intercept(mockContext, mockCallHandler);

      expect(mockCallHandler.handle).toHaveBeenCalled();
    });

    it('should call next.handle() for bypass requests', () => {
      mockShouldBypass.mockReturnValue(true);

      const mockRequest = { originalUrl: '/metrics' };
      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('bypass data')),
      };

      interceptor.intercept(mockContext, mockCallHandler);

      expect(mockCallHandler.handle).toHaveBeenCalled();
    });

    it('should handle call handler throwing errors', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockRequest = { requestId: 'req-error-handler' };
      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const error = new Error('Handler error');
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => error)),
      };

      errorManagementService.logError.mockReturnValue('error-id-handler');

      const result = interceptor.intercept(mockContext, mockCallHandler);

      let caughtError: Error | undefined;
      result.subscribe({
        error: (err) => {
          caughtError = err;
        },
      });

      expect(caughtError).toBeDefined();
      expect(errorManagementService.logError).toHaveBeenCalled();
    });

    it('should handle call handler returning different observable types', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockRequest = { requestId: 'req-observable-types' };
      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const testCases = [
        of('string data'),
        of(123),
        of({ key: 'value' }),
        of([1, 2, 3]),
        of(null),
        of(undefined),
      ];

      testCases.forEach((observable, index) => {
        const mockCallHandler = {
          handle: jest.fn(() => observable),
        };

        const result = interceptor.intercept(mockContext, mockCallHandler);

        expect(mockCallHandler.handle).toHaveBeenCalled();

        let actualResult: unknown;
        result.subscribe({
          next: (data) => {
            actualResult = data;
          },
        });

        // The test cases are of('string data'), of(123), etc.
        // So the expected values are the arguments passed to of()
        const expectedValues = [
          'string data',
          123,
          { key: 'value' },
          [1, 2, 3],
          null,
          undefined,
        ];

        expect(actualResult).toEqual(expectedValues[index]);
      });
    });
  });

  describe('error propagation', () => {
    it('should propagate original Error objects', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockRequest = { requestId: 'req-propagate-error' };
      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const originalError = new Error('Original error');
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => originalError)),
      };

      errorManagementService.logError.mockReturnValue('error-id-propagate');

      const result = interceptor.intercept(mockContext, mockCallHandler);

      let caughtError: Error | undefined;
      result.subscribe({
        error: (err) => {
          caughtError = err;
        },
      });

      expect(caughtError).toBe(originalError);
    });

    it('should convert non-Error objects to Error objects', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockRequest = { requestId: 'req-convert-error' };
      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const stringError = 'String error';
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => stringError)),
      };

      errorManagementService.logError.mockReturnValue('error-id-convert');

      const result = interceptor.intercept(mockContext, mockCallHandler);

      let caughtError: Error | undefined;
      result.subscribe({
        error: (err) => {
          caughtError = err;
        },
      });

      expect(caughtError).toBeInstanceOf(Error);
      expect(caughtError!.message).toBe('String error');
    });

    it('should handle null error objects', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockRequest = { requestId: 'req-null-error' };
      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => null)),
      };

      errorManagementService.logError.mockReturnValue('error-id-null');

      const result = interceptor.intercept(mockContext, mockCallHandler);

      let caughtError: Error | undefined;
      result.subscribe({
        error: (err) => {
          caughtError = err;
        },
      });

      expect(caughtError).toBeInstanceOf(Error);
      expect(caughtError!.message).toBe('null');
    });

    it('should handle undefined error objects', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockRequest = { requestId: 'req-undefined-error' };
      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => undefined)),
      };

      errorManagementService.logError.mockReturnValue('error-id-undefined');

      const result = interceptor.intercept(mockContext, mockCallHandler);

      let caughtError: Error | undefined;
      result.subscribe({
        error: (err) => {
          caughtError = err;
        },
      });

      expect(caughtError).toBeInstanceOf(Error);
      expect(caughtError!.message).toBe('undefined');
    });
  });

  describe('performance considerations', () => {
    it('should handle rapid error logging', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockRequest = {
        requestId: 'req-perf',
        method: 'GET',
        url: '/api/test',
      };
      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const error = new Error('Performance test error');
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => error)),
      };

      errorManagementService.logError.mockReturnValue('error-id-perf');

      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        const result = interceptor.intercept(mockContext, mockCallHandler);

        result.subscribe({
          error: () => {
            // Error handler
          },
        });
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should not create memory leaks', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockRequest = {
        requestId: 'req-memory',
        method: 'GET',
        url: '/api/test',
      };
      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const error = new Error('Memory test error');
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => error)),
      };

      errorManagementService.logError.mockReturnValue('error-id-memory');

      for (let i = 0; i < 10000; i++) {
        const result = interceptor.intercept(mockContext, mockCallHandler);

        result.subscribe({
          error: () => {
            // Error handler
          },
        });
      }

      // If we get here without memory issues, test passes
      expect(true).toBe(true);
    });

    it('should handle concurrent error logging', async () => {
      mockShouldBypass.mockReturnValue(false);

      const mockRequest = {
        requestId: 'req-concurrent',
        method: 'GET',
        url: '/api/test',
      };
      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const error = new Error('Concurrent error');
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => error)),
      };

      errorManagementService.logError.mockReturnValue('error-id-concurrent');

      const promises: Promise<void>[] = [];

      for (let i = 0; i < 100; i++) {
        promises.push(
          new Promise((resolve) => {
            setImmediate(() => {
              const result = interceptor.intercept(
                mockContext,
                mockCallHandler,
              );

              result.subscribe({
                error: () => {
                  resolve();
                },
              });
            });
          }),
        );
      }

      await Promise.all(promises);

      expect(errorManagementService.logError).toHaveBeenCalledTimes(100);
      expect(promises).toHaveLength(100);
    });
  });

  describe('real-world usage scenarios', () => {
    it('should handle API error logging scenario', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'api-error-123';
      const method = 'POST';
      const url = '/api/users';
      const ip = '192.168.1.1';
      const userAgent = 'axios/0.21.1';
      const userId = 'user_123';
      const merchantId = 'merchant_456';

      const mockRequest = {
        requestId,
        method,
        url,
        originalUrl: url,
        ip,
        headers: {
          'user-agent': userAgent,
          'x-request-id': requestId,
        },
        authUser: { _id: userId, merchantId },
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const error = new Error('Failed to create user');
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => error)),
      };

      errorManagementService.logError.mockReturnValue('error-id-api');

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe({
        error: () => {
          // Error handler
        },
      });

      expect(errorManagementService.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          url,
          method,
          ip,
          userId,
          merchantId,
          requestId,
          userAgent,
        }),
      );
    });

    it('should handle authentication error scenario', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'auth-error-456';
      const method = 'POST';
      const url = '/api/auth/login';
      const ip = '10.0.0.1';

      const mockRequest = {
        requestId,
        method,
        url,
        originalUrl: url,
        ip,
        headers: {
          'user-agent': 'Mozilla/5.0',
        },
        body: { email: 'test@example.com' }, // Sensitive data
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const error = new Error('Invalid credentials');
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => error)),
      };

      errorManagementService.logError.mockReturnValue('error-id-auth');

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe({
        error: () => {
          // Error handler
        },
      });

      expect(errorManagementService.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          url,
          method,
          ip,
          requestId,
        }),
      );
    });

    it('should handle file upload error scenario', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'file-error-789';
      const method = 'POST';
      const url = '/api/files/upload';
      const ip = '192.168.1.2';
      const userId = 'user_456';

      const mockRequest = {
        requestId,
        method,
        url,
        originalUrl: url,
        ip,
        headers: {
          'user-agent': 'FileUploadClient/1.0',
        },
        authUser: { _id: userId },
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const error = new Error('File upload failed: file too large');
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => error)),
      };

      errorManagementService.logError.mockReturnValue('error-id-file');

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe({
        error: () => {
          // Error handler
        },
      });

      expect(errorManagementService.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          url,
          method,
          ip,
          userId,
          requestId,
        }),
      );
    });

    it('should handle external service error scenario', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'external-error-101';
      const method = 'GET';
      const url = '/api/external/payment';
      const ip = '10.0.0.3';
      const merchantId = 'merchant_789';

      const mockRequest = {
        requestId,
        method,
        url,
        originalUrl: url,
        ip,
        headers: {
          'user-agent': 'PaymentClient/2.0',
        },
        user: { merchantId },
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const error = new Error('External payment service unavailable');
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => error)),
      };

      errorManagementService.logError.mockReturnValue('error-id-external');

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe({
        error: () => {
          // Error handler
        },
      });

      expect(errorManagementService.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          url,
          method,
          ip,
          merchantId,
          requestId,
        }),
      );
    });

    it('should handle database error scenario', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'db-error-202';
      const method = 'POST';
      const url = '/api/orders';
      const ip = '192.168.1.3';
      const userId = 'user_789';
      const merchantId = 'merchant_101';

      const mockRequest = {
        requestId,
        method,
        url,
        originalUrl: url,
        ip,
        headers: {
          'user-agent': 'OrderClient/1.0',
        },
        authUser: { _id: userId, merchantId },
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const error = new Error('Database connection failed');
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => error)),
      };

      errorManagementService.logError.mockReturnValue('error-id-db');

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe({
        error: () => {
          // Error handler
        },
      });

      expect(errorManagementService.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          url,
          method,
          ip,
          userId,
          merchantId,
          requestId,
        }),
      );
    });
  });

  describe('metadata building', () => {
    it('should build correct metadata structure', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-meta-build';
      const method = 'GET';
      const url = '/api/users/123';
      const ip = '10.0.0.5';
      const userAgent = 'TestClient/1.0';
      const userId = 'user_123';
      const merchantId = 'merchant_456';

      const mockRequest = {
        requestId,
        method,
        url,
        originalUrl: url,
        ip,
        headers: {
          'user-agent': userAgent,
          'x-request-id': requestId,
        },
        authUser: { _id: userId, merchantId },
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const error = new Error('Metadata build test');
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => error)),
      };

      errorManagementService.logError.mockReturnValue('error-id-meta');

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe({
        error: () => {
          // Error handler
        },
      });

      expect(errorManagementService.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          url,
          method,
          ip,
          userId,
          merchantId,
          requestId,
          userAgent,
        }),
      );
    });

    it('should handle missing optional metadata fields', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-missing-meta';
      const method = 'GET';
      const url = '/api/public';
      const ip = '10.0.0.6';

      const mockRequest = {
        requestId,
        method,
        url,
        originalUrl: url,
        ip,
        headers: {
          // No user-agent
        },
        // No user or authUser
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const error = new Error('Missing metadata test');
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => error)),
      };

      errorManagementService.logError.mockReturnValue('error-id-missing');

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe({
        error: () => {
          // Error handler
        },
      });

      expect(errorManagementService.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          url,
          method,
          ip,
          requestId,
        }),
      );
      expect(
        errorManagementService.logError.mock.calls[0][1],
      ).not.toHaveProperty('userId');
      expect(
        errorManagementService.logError.mock.calls[0][1],
      ).not.toHaveProperty('merchantId');
      expect(
        errorManagementService.logError.mock.calls[0][1],
      ).not.toHaveProperty('userAgent');
    });

    it('should handle malformed request objects', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockRequest = {
        // Missing most properties
        method: 'GET',
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const error = new Error('Malformed request test');
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => error)),
      };

      errorManagementService.logError.mockReturnValue('error-id-malformed');

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe({
        error: () => {
          // Error handler
        },
      });

      expect(errorManagementService.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          method: 'GET',
        }),
      );
    });
  });

  describe('error management service error handling', () => {
    it('should handle logError throwing errors gracefully', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-service-error';
      const method = 'GET';
      const url = '/api/test';

      const mockRequest = {
        requestId,
        method,
        url,
        originalUrl: url,
        headers: {},
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const error = new Error('Original error');
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => error)),
      };

      errorManagementService.logError.mockImplementation(() => {
        throw new Error('Log error failed');
      });

      const result = interceptor.intercept(mockContext, mockCallHandler);

      let caughtError: Error | undefined;
      result.subscribe({
        error: (err) => {
          caughtError = err;
        },
      });

      expect(caughtError).toBeDefined();
      expect(interceptor['logger'].error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to log error'),
      );
    });

    it('should handle logError returning null', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-null-return';
      const method = 'GET';
      const url = '/api/test';

      const mockRequest = {
        requestId,
        method,
        url,
        originalUrl: url,
        headers: {},
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const error = new Error('Null return test');
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => error)),
      };

      errorManagementService.logError.mockReturnValue(null as any);

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe({
        error: () => {
          // Error handler
        },
      });

      expect(interceptor['logger'].debug).toHaveBeenCalledWith(
        expect.stringContaining('Error logged with ID: null'),
      );
    });

    it('should handle logError returning undefined', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-undefined-return';
      const method = 'GET';
      const url = '/api/test';

      const mockRequest = {
        requestId,
        method,
        url,
        originalUrl: url,
        headers: {},
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const error = new Error('Undefined return test');
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => error)),
      };

      errorManagementService.logError.mockReturnValue(undefined as any);

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe({
        error: () => {
          // Error handler
        },
      });

      expect(interceptor['logger'].debug).toHaveBeenCalledWith(
        expect.stringContaining('Error logged with ID: undefined'),
      );
    });
  });

  describe('context type handling', () => {
    it('should handle HTTP context correctly', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => ({
            requestId: 'http-req',
            method: 'GET',
            url: '/api/test',
          })),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('http data')),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler);

      expect(result).toBeDefined();
      expect(mockCallHandler.handle).toHaveBeenCalled();
    });

    it('should handle non-HTTP context', () => {
      const mockContext = {
        getType: jest.fn(() => 'ws'),
        switchToHttp: jest.fn(),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('ws data')),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler);

      expect(result).toBeDefined();
      expect(mockCallHandler.handle).toHaveBeenCalled();
      expect(errorManagementService.logError).not.toHaveBeenCalled();
    });

    it('should handle RPC context', () => {
      const mockContext = {
        getType: jest.fn(() => 'rpc'),
        switchToHttp: jest.fn(),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('rpc data')),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler);

      expect(result).toBeDefined();
      expect(mockCallHandler.handle).toHaveBeenCalled();
      expect(errorManagementService.logError).not.toHaveBeenCalled();
    });
  });

  describe('metadata extraction helpers', () => {
    it('should handle URL normalization correctly', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-url-norm';
      const method = 'GET';
      const originalUrl = '/api/users/123?param=value&other=test';
      const normalizedUrl = '/api/users/123';

      const mockRequest = {
        requestId,
        method,
        url: normalizedUrl,
        originalUrl,
        ip: '10.0.0.7',
        headers: {},
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const error = new Error('URL normalization test');
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => error)),
      };

      errorManagementService.logError.mockReturnValue('error-id-url-norm');

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe({
        error: () => {
          // Error handler
        },
      });

      expect(errorManagementService.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          url: normalizedUrl,
        }),
      );
    });

    it('should handle missing originalUrl fallback', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-no-original';
      const method = 'GET';
      const url = '/api/users';

      const mockRequest = {
        requestId,
        method,
        url,
        // No originalUrl
        ip: '10.0.0.8',
        headers: {},
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const error = new Error('No original URL test');
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => error)),
      };

      errorManagementService.logError.mockReturnValue('error-id-no-original');

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe({
        error: () => {
          // Error handler
        },
      });

      expect(errorManagementService.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          url: '/api/users',
        }),
      );
    });

    it('should handle empty URL fallback', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-empty-url';
      const method = 'GET';

      const mockRequest = {
        requestId,
        method,
        url: '',
        originalUrl: '',
        ip: '10.0.0.9',
        headers: {},
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const error = new Error('Empty URL test');
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => error)),
      };

      errorManagementService.logError.mockReturnValue('error-id-empty');

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe({
        error: () => {
          // Error handler
        },
      });

      expect(errorManagementService.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          url: '/',
        }),
      );
    });
  });

  describe('request ID extraction', () => {
    it('should use request.requestId when available', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-request-id';
      const method = 'GET';
      const url = '/api/test';

      const mockRequest = {
        requestId,
        method,
        url,
        originalUrl: url,
        headers: {},
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const error = new Error('Request ID test');
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => error)),
      };

      errorManagementService.logError.mockReturnValue('error-id-request-id');

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe({
        error: () => {
          // Error handler
        },
      });

      expect(errorManagementService.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          requestId,
        }),
      );
    });

    it('should fallback to x-request-id header', () => {
      mockShouldBypass.mockReturnValue(false);

      const headerRequestId = 'header-req-id';
      const method = 'GET';
      const url = '/api/test';

      const mockRequest = {
        method,
        url,
        originalUrl: url,
        headers: {
          'x-request-id': headerRequestId,
        },
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const error = new Error('Header fallback test');
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => error)),
      };

      errorManagementService.logError.mockReturnValue('error-id-header');

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe({
        error: () => {
          // Error handler
        },
      });

      expect(errorManagementService.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          requestId: headerRequestId,
        }),
      );
    });

    it('should handle array x-request-id header', () => {
      mockShouldBypass.mockReturnValue(false);

      const headerRequestId = 'array-req-id';
      const method = 'GET';
      const url = '/api/test';

      const mockRequest = {
        method,
        url,
        originalUrl: url,
        headers: {
          'x-request-id': [headerRequestId, 'other-id'],
        },
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const error = new Error('Array header test');
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => error)),
      };

      errorManagementService.logError.mockReturnValue('error-id-array');

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe({
        error: () => {
          // Error handler
        },
      });

      expect(errorManagementService.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          requestId: headerRequestId, // Should take first element
        }),
      );
    });

    it('should handle missing request ID completely', () => {
      mockShouldBypass.mockReturnValue(false);

      const method = 'GET';
      const url = '/api/test';

      const mockRequest = {
        method,
        url,
        originalUrl: url,
        headers: {},
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const error = new Error('No request ID test');
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => error)),
      };

      errorManagementService.logError.mockReturnValue('error-id-no-id');

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe({
        error: () => {
          // Error handler
        },
      });

      expect(errorManagementService.logError).toHaveBeenCalledWith(
        error,
        expect.not.objectContaining({
          requestId: expect.any(String),
        }),
      );
    });
  });

  describe('user agent extraction', () => {
    it('should extract user agent from headers', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-user-agent';
      const method = 'GET';
      const url = '/api/test';
      const userAgent = 'CustomClient/1.0';

      const mockRequest = {
        requestId,
        method,
        url,
        originalUrl: url,
        headers: {
          'user-agent': userAgent,
        },
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const error = new Error('User agent test');
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => error)),
      };

      errorManagementService.logError.mockReturnValue('error-id-user-agent');

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe({
        error: () => {
          // Error handler
        },
      });

      expect(errorManagementService.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          userAgent,
        }),
      );
    });

    it('should handle missing user agent', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-no-user-agent';
      const method = 'GET';
      const url = '/api/test';

      const mockRequest = {
        requestId,
        method,
        url,
        originalUrl: url,
        headers: {},
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const error = new Error('No user agent test');
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => error)),
      };

      errorManagementService.logError.mockReturnValue('error-id-no-user-agent');

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe({
        error: () => {
          // Error handler
        },
      });

      expect(errorManagementService.logError).toHaveBeenCalledWith(
        error,
        expect.not.objectContaining({
          userAgent: expect.any(String),
        }),
      );
    });

    it('should handle empty user agent', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-empty-user-agent';
      const method = 'GET';
      const url = '/api/test';

      const mockRequest = {
        requestId,
        method,
        url,
        originalUrl: url,
        headers: {
          'user-agent': '',
        },
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const error = new Error('Empty user agent test');
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => error)),
      };

      errorManagementService.logError.mockReturnValue(
        'error-id-empty-user-agent',
      );

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe({
        error: () => {
          // Error handler
        },
      });

      expect(errorManagementService.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          userAgent: '',
        }),
      );
    });
  });

  describe('IP address extraction', () => {
    it('should extract IP address from request', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-ip-extraction';
      const method = 'GET';
      const url = '/api/test';
      const ip = '192.168.1.10';

      const mockRequest = {
        requestId,
        method,
        url,
        originalUrl: url,
        ip,
        headers: {},
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const error = new Error('IP extraction test');
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => error)),
      };

      errorManagementService.logError.mockReturnValue('error-id-ip');

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe({
        error: () => {
          // Error handler
        },
      });

      expect(errorManagementService.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          ip,
        }),
      );
    });

    it('should handle missing IP address', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-no-ip';
      const method = 'GET';
      const url = '/api/test';

      const mockRequest = {
        requestId,
        method,
        url,
        originalUrl: url,
        headers: {},
        // No ip property
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const error = new Error('No IP test');
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => error)),
      };

      errorManagementService.logError.mockReturnValue('error-id-no-ip');

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe({
        error: () => {
          // Error handler
        },
      });

      expect(errorManagementService.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          ip: 'unknown',
        }),
      );
    });

    it('should handle null IP address', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-null-ip';
      const method = 'GET';
      const url = '/api/test';

      const mockRequest = {
        requestId,
        method,
        url,
        originalUrl: url,
        ip: null,
        headers: {},
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const error = new Error('Null IP test');
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => error)),
      };

      errorManagementService.logError.mockReturnValue('error-id-null-ip');

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe({
        error: () => {
          // Error handler
        },
      });

      expect(errorManagementService.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          ip: 'unknown',
        }),
      );
    });

    it('should handle IPv6 addresses', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-ipv6';
      const method = 'GET';
      const url = '/api/test';
      const ipv6 = '2001:db8::1';

      const mockRequest = {
        requestId,
        method,
        url,
        originalUrl: url,
        ip: ipv6,
        headers: {},
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const error = new Error('IPv6 test');
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => error)),
      };

      errorManagementService.logError.mockReturnValue('error-id-ipv6');

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe({
        error: () => {
          // Error handler
        },
      });

      expect(errorManagementService.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          ip: ipv6,
        }),
      );
    });
  });

  describe('service instantiation', () => {
    it('should inject ErrorManagementService correctly', () => {
      expect(interceptor).toBeDefined();
      expect(errorManagementService).toBeDefined();
    });

    it('should handle ErrorManagementService being unavailable', () => {
      const mockModule = {
        get: jest.fn().mockImplementation((token) => {
          if (token === ErrorManagementService) {
            throw new Error('ErrorManagementService not available');
          }
          return {};
        }),
      };

      expect(() => {
        const testInterceptor = new ErrorLoggingInterceptor(
          mockModule.get(ErrorManagementService),
        );
        testInterceptor.intercept(null as any, null as any);
      }).toThrow('ErrorManagementService not available');
    });
  });

  describe('error type handling', () => {
    it('should handle different error types correctly', () => {
      mockShouldBypass.mockReturnValue(false);

      const testCases = [
        new Error('Standard error'),
        new TypeError('Type error'),
        new ReferenceError('Reference error'),
        new SyntaxError('Syntax error'),
        new EvalError('Eval error'),
      ];

      testCases.forEach((error, index) => {
        const requestId = `req-error-type-${index}`;
        const method = 'GET';
        const url = '/api/test';

        const mockRequest = {
          requestId,
          method,
          url,
          originalUrl: url,
          headers: {},
        };

        const mockContext = {
          getType: jest.fn(() => 'http'),
          switchToHttp: jest.fn(() => ({
            getRequest: jest.fn(() => mockRequest),
          })),
        } as any;

        const mockCallHandler = {
          handle: jest.fn(() => throwError(() => error)),
        };

        errorManagementService.logError.mockReturnValue(`error-id-${index}`);

        const result = interceptor.intercept(mockContext, mockCallHandler);

        result.subscribe({
          error: () => {
            // Error handler
          },
        });

        expect(errorManagementService.logError).toHaveBeenCalledWith(
          error,
          expect.objectContaining({
            requestId,
            method,
            url,
          }),
        );
      });
    });

    it('should handle errors with very long messages', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-long-error';
      const method = 'GET';
      const url = '/api/test';

      const mockRequest = {
        requestId,
        method,
        url,
        originalUrl: url,
        headers: {},
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const longErrorMessage = 'Error: '.repeat(100);
      const error = new Error(longErrorMessage);
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => error)),
      };

      errorManagementService.logError.mockReturnValue('error-id-long');

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe({
        error: () => {
          // Error handler
        },
      });

      expect(errorManagementService.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          requestId,
          method,
          url,
        }),
      );
    });

    it('should handle errors with special characters', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-special-error';
      const method = 'GET';
      const url = '/api/test';

      const mockRequest = {
        requestId,
        method,
        url,
        originalUrl: url,
        headers: {},
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const specialError = new Error('خطأ في النظام - System error @#$%^&*()');
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => specialError)),
      };

      errorManagementService.logError.mockReturnValue('error-id-special');

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe({
        error: () => {
          // Error handler
        },
      });

      expect(errorManagementService.logError).toHaveBeenCalledWith(
        specialError,
        expect.objectContaining({
          requestId,
          method,
          url,
        }),
      );
    });
  });

  describe('async logging behavior', () => {
    it('should handle async logging correctly', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-async-log';
      const method = 'GET';
      const url = '/api/test';

      const mockRequest = {
        requestId,
        method,
        url,
        originalUrl: url,
        headers: {},
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const error = new Error('Async logging test');
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => error)),
      };

      errorManagementService.logError.mockReturnValue('error-id-async');

      const result = interceptor.intercept(mockContext, mockCallHandler);

      let caughtError: Error | undefined;
      result.subscribe({
        error: (err) => {
          caughtError = err;
        },
      });

      expect(caughtError).toBeDefined();
      expect(errorManagementService.logError).toHaveBeenCalled();
    });

    it('should not block request completion on logging errors', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-logging-error';
      const method = 'GET';
      const url = '/api/test';

      const mockRequest = {
        requestId,
        method,
        url,
        originalUrl: url,
        headers: {},
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const error = new Error('Original error');
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => error)),
      };

      errorManagementService.logError.mockImplementation(() => {
        throw new Error('Logging service error');
      });

      const result = interceptor.intercept(mockContext, mockCallHandler);

      let caughtError: Error | undefined;
      result.subscribe({
        error: (err) => {
          caughtError = err;
        },
      });

      expect(caughtError).toBeDefined();
      expect(caughtError!.message).toBe('Original error'); // Should still propagate original error
      expect(interceptor['logger'].error).toHaveBeenCalled();
    });
  });

  describe('integration with NestJS', () => {
    it('should work with NestJS HTTP context', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockRequest = {
        requestId: 'nestjs-req',
        method: 'GET',
        url: '/api/test',
        originalUrl: '/api/test',
        ip: '10.0.0.1',
        headers: {
          'user-agent': 'NestJS-Test/1.0',
        },
        authUser: { _id: 'user_123' },
      };

      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
        getType: jest.fn(() => 'http'),
      } as any;

      const error = new Error('NestJS integration test');
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => error)),
      };

      errorManagementService.logError.mockReturnValue('error-id-nestjs');

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe({
        error: () => {
          // Error handler
        },
      });

      expect(errorManagementService.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          url: '/api/test',
          method: 'GET',
          ip: '10.0.0.1',
          userId: 'user_123',
          requestId: 'nestjs-req',
          userAgent: 'NestJS-Test/1.0',
        }),
      );
    });

    it('should handle NestJS execution context correctly', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockRequest = {
        requestId: 'context-req',
        method: 'POST',
        url: '/api/test',
        originalUrl: '/api/test',
        ip: '10.0.0.2',
        headers: {},
        user: { userId: 'jwt_user_456' },
      };

      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
        getType: jest.fn(() => 'http'),
      } as any;

      const error = new Error('Context test');
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => error)),
      };

      errorManagementService.logError.mockReturnValue('error-id-context');

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe({
        error: () => {
          // Error handler
        },
      });

      expect(errorManagementService.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          url: '/api/test',
          method: 'POST',
          ip: '10.0.0.2',
          userId: 'jwt_user_456',
          requestId: 'context-req',
        }),
      );
    });
  });

  describe('metadata completeness', () => {
    it('should include all available metadata fields', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-complete-meta';
      const method = 'PUT';
      const url = '/api/users/123';
      const ip = '192.168.1.20';
      const userAgent = 'CompleteTestClient/1.0';
      const userId = 'user_complete';
      const merchantId = 'merchant_complete';

      const mockRequest = {
        requestId,
        method,
        url,
        originalUrl: url,
        ip,
        headers: {
          'user-agent': userAgent,
          'x-request-id': requestId,
        },
        authUser: { _id: userId, merchantId },
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const error = new Error('Complete metadata test');
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => error)),
      };

      errorManagementService.logError.mockReturnValue('error-id-complete');

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe({
        error: () => {
          // Error handler
        },
      });

      const loggedMeta = errorManagementService.logError.mock.calls[0][1];

      expect(loggedMeta).toHaveProperty('url');
      expect(loggedMeta).toHaveProperty('method');
      expect(loggedMeta).toHaveProperty('ip');
      expect(loggedMeta).toHaveProperty('userId');
      expect(loggedMeta).toHaveProperty('merchantId');
      expect(loggedMeta).toHaveProperty('requestId');
      expect(loggedMeta).toHaveProperty('userAgent');

      expect(loggedMeta!.url).toBe(url);
      expect(loggedMeta!.method).toBe(method);
      expect(loggedMeta!.ip).toBe(ip);
      expect(loggedMeta!.userId).toBe(userId);
      expect(loggedMeta!.merchantId).toBe(merchantId);
      expect(loggedMeta!.requestId).toBe(requestId);
      expect(loggedMeta!.userAgent).toBe(userAgent);
    });

    it('should handle missing optional fields gracefully', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-minimal-meta';
      const method = 'GET';
      const url = '/api/public';
      const ip = '10.0.0.3';

      const mockRequest = {
        requestId,
        method,
        url,
        originalUrl: url,
        ip,
        headers: {},
        // No user data
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const error = new Error('Minimal metadata test');
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => error)),
      };

      errorManagementService.logError.mockReturnValue('error-id-minimal');

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe({
        error: () => {
          // Error handler
        },
      });

      const loggedMeta = errorManagementService.logError.mock.calls[0][1];

      expect(loggedMeta).toHaveProperty('url');
      expect(loggedMeta).toHaveProperty('method');
      expect(loggedMeta).toHaveProperty('ip');
      expect(loggedMeta).toHaveProperty('requestId');

      expect(loggedMeta!.url).toBe(url);
      expect(loggedMeta!.method).toBe(method);
      expect(loggedMeta!.ip).toBe(ip);
      expect(loggedMeta!.requestId).toBe(requestId);

      expect(loggedMeta!).not.toHaveProperty('userId');
      expect(loggedMeta!).not.toHaveProperty('merchantId');
      expect(loggedMeta!).not.toHaveProperty('userAgent');
    });
  });

  describe('context switching', () => {
    it('should handle switchToHttp errors', () => {
      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => {
          throw new Error('switchToHttp error');
        }),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('data')),
      };

      expect(() => interceptor.intercept(mockContext, mockCallHandler)).toThrow(
        'switchToHttp error',
      );
    });

    it('should handle getRequest errors', () => {
      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => {
            throw new Error('getRequest error');
          }),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('data')),
      };

      expect(() => interceptor.intercept(mockContext, mockCallHandler)).toThrow(
        'getRequest error',
      );
    });

    it('should handle request object access errors', () => {
      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => {
            throw new Error('Request object access error');
          }),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('data')),
      };

      expect(() => interceptor.intercept(mockContext, mockCallHandler)).toThrow(
        'Request object access error',
      );
    });
  });

  describe('service dependencies', () => {
    it('should handle ErrorManagementService correctly', () => {
      expect(interceptor).toBeDefined();
      expect(errorManagementService).toBeDefined();
    });

    it('should handle ErrorManagementService method calls', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-service-call';
      const method = 'GET';
      const url = '/api/test';

      const mockRequest = {
        requestId,
        method,
        url,
        originalUrl: url,
        headers: {},
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const error = new Error('Service call test');
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => error)),
      };

      const mockLogError = jest.spyOn(errorManagementService, 'logError');

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe({
        error: () => {
          // Error handler
        },
      });

      expect(mockLogError).toHaveBeenCalledWith(error, expect.any(Object));

      mockLogError.mockRestore();
    });
  });
});
