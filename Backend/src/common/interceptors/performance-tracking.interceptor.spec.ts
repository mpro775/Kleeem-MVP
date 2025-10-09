import { Test } from '@nestjs/testing';
import { of, throwError } from 'rxjs';

import { SentryService } from '../services/sentry.service';

import { shouldBypass } from './bypass.util';
import { PerformanceTrackingInterceptor } from './performance-tracking.interceptor';

import type { TestingModule } from '@nestjs/testing';

// Mock the dependencies
jest.mock('./bypass.util');
jest.mock('../services/sentry.service');

describe('PerformanceTrackingInterceptor', () => {
  let interceptor: PerformanceTrackingInterceptor;
  let sentryService: jest.Mocked<SentryService>;
  let mockShouldBypass: jest.MockedFunction<typeof shouldBypass>;

  beforeEach(async () => {
    mockShouldBypass = shouldBypass as jest.MockedFunction<typeof shouldBypass>;

    const mockSentryService = {
      startTransaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PerformanceTrackingInterceptor,
        {
          provide: SentryService,
          useValue: mockSentryService,
        },
      ],
    }).compile();

    interceptor = module.get<PerformanceTrackingInterceptor>(
      PerformanceTrackingInterceptor,
    );
    sentryService = module.get(SentryService);
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
          getResponse: jest.fn(() => ({})),
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
          getResponse: jest.fn(() => ({})),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('metrics data')),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler);
      expect(result).toBeDefined();
      expect(mockShouldBypass).toHaveBeenCalledWith(mockRequest);
      expect(mockCallHandler.handle).toHaveBeenCalled();
      expect(sentryService.startTransaction).not.toHaveBeenCalled();
    });

    it('should bypass health endpoint', () => {
      mockShouldBypass.mockReturnValue(true);

      const mockRequest = { originalUrl: '/health' };
      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({})),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('health data')),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler);

      expect(result).toBeDefined();
      expect(mockShouldBypass).toHaveBeenCalledWith(mockRequest);
      expect(mockCallHandler.handle).toHaveBeenCalled();
      expect(sentryService.startTransaction).not.toHaveBeenCalled();
    });

    it('should bypass when request should be bypassed', () => {
      mockShouldBypass.mockReturnValue(true);

      const mockRequest = { originalUrl: '/api/test' };
      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({})),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('bypassed data')),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler);
      expect(result).toBeDefined();
      expect(mockShouldBypass).toHaveBeenCalledWith(mockRequest);
      expect(mockCallHandler.handle).toHaveBeenCalled();
      expect(sentryService.startTransaction).not.toHaveBeenCalled();
    });
  });

  describe('performance tracking', () => {
    it('should start Sentry transaction for non-bypass requests', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockTransaction = {
        setTag: jest.fn(),
        setStatus: jest.fn(),
        setData: jest.fn(),
        finish: jest.fn(),
      };

      sentryService.startTransaction.mockReturnValue(mockTransaction as any);

      const requestId = 'req-perf-track';
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
        originalUrl: url,
        ip,
        headers: {
          'user-agent': userAgent,
        },
        authUser: { _id: userId, merchantId },
      };

      const mockResponse = {
        statusCode: 200,
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => mockResponse),
        })),
      } as any;

      const testData = { users: [] };
      const mockCallHandler = {
        handle: jest.fn(() => of(testData)),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler);

      expect(sentryService.startTransaction).toHaveBeenCalledWith(
        `${method} ${url}`,
        'http.server',
        expect.objectContaining({
          userId,
          merchantId,
          requestId,
          url,
          method,
          ip,
          userAgent,
        }),
      );

      let actualResult: unknown;
      result.subscribe({
        next: (data) => {
          actualResult = data;
        },
      });

      expect(actualResult).toBe(testData);
      expect(mockTransaction.setStatus).toHaveBeenCalledWith('ok');
      expect(mockTransaction.finish).toHaveBeenCalled();
    });

    it('should handle missing transaction', () => {
      mockShouldBypass.mockReturnValue(false);

      sentryService.startTransaction.mockReturnValue(null);

      const mockRequest = {
        requestId: 'req-no-transaction',
        method: 'GET',
        url: '/api/test',
        originalUrl: '/api/test',
        headers: {},
      };

      const mockResponse = {
        statusCode: 200,
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => mockResponse),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('data')),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler);

      expect(sentryService.startTransaction).toHaveBeenCalled();
      expect(mockCallHandler.handle).toHaveBeenCalled();

      let actualResult: unknown;
      result.subscribe({
        next: (data) => {
          actualResult = data;
        },
      });

      expect(actualResult).toBe('data');
    });

    it('should handle transaction without required methods', () => {
      mockShouldBypass.mockReturnValue(false);

      const invalidTransaction = {};
      sentryService.startTransaction.mockReturnValue(invalidTransaction as any);

      const mockRequest = {
        requestId: 'req-invalid-transaction',
        method: 'GET',
        url: '/api/test',
        originalUrl: '/api/test',
        headers: {},
      };

      const mockResponse = {
        statusCode: 200,
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => mockResponse),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('data')),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler);

      expect(mockCallHandler.handle).toHaveBeenCalled();

      let actualResult: unknown;
      result.subscribe({
        next: (data) => {
          actualResult = data;
        },
      });

      expect(actualResult).toBe('data');
    });
  });

  describe('user ID extraction', () => {
    it('should extract user ID from authUser._id', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockTransaction = {
        setTag: jest.fn(),
        setStatus: jest.fn(),
        setData: jest.fn(),
        finish: jest.fn(),
      };

      sentryService.startTransaction.mockReturnValue(mockTransaction as any);

      const requestId = 'req-auth-user-perf';
      const method = 'GET';
      const url = '/api/profile';
      const userId = 'auth_user_123';

      const mockRequest = {
        requestId,
        method,
        url,
        originalUrl: url,
        headers: {},
        authUser: { _id: userId },
      };

      const mockResponse = {
        statusCode: 200,
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => mockResponse),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('profile data')),
      };

      interceptor.intercept(mockContext, mockCallHandler);

      expect(sentryService.startTransaction).toHaveBeenCalledWith(
        `${method} ${url}`,
        'http.server',
        expect.objectContaining({
          userId,
        }),
      );
    });

    it('should extract user ID from JWT user.userId', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockTransaction = {
        setTag: jest.fn(),
        setStatus: jest.fn(),
        setData: jest.fn(),
        finish: jest.fn(),
      };

      sentryService.startTransaction.mockReturnValue(mockTransaction as any);

      const requestId = 'req-jwt-user-perf';
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

      const mockResponse = {
        statusCode: 200,
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => mockResponse),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('jwt data')),
      };

      interceptor.intercept(mockContext, mockCallHandler);

      expect(sentryService.startTransaction).toHaveBeenCalledWith(
        `${method} ${url}`,
        'http.server',
        expect.objectContaining({
          userId,
        }),
      );
    });

    it('should prefer authUser._id over JWT user.userId', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockTransaction = {
        setTag: jest.fn(),
        setStatus: jest.fn(),
        setData: jest.fn(),
        finish: jest.fn(),
      };

      sentryService.startTransaction.mockReturnValue(mockTransaction as any);

      const requestId = 'req-both-users-perf';
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

      const mockResponse = {
        statusCode: 200,
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => mockResponse),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('both users data')),
      };

      interceptor.intercept(mockContext, mockCallHandler);

      expect(sentryService.startTransaction).toHaveBeenCalledWith(
        `${method} ${url}`,
        'http.server',
        expect.objectContaining({
          userId: authUserId, // Should prefer authUser
        }),
      );
    });

    it('should handle invalid authUser._id', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockTransaction = {
        setTag: jest.fn(),
        setStatus: jest.fn(),
        setData: jest.fn(),
        finish: jest.fn(),
      };

      sentryService.startTransaction.mockReturnValue(mockTransaction as any);

      const requestId = 'req-invalid-user-perf';
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

      const mockResponse = {
        statusCode: 200,
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => mockResponse),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('data')),
      };

      interceptor.intercept(mockContext, mockCallHandler);

      expect(sentryService.startTransaction).toHaveBeenCalledWith(
        `${method} ${url}`,
        'http.server',
        expect.not.objectContaining({
          userId: expect.any(String),
        }),
      );
    });
  });

  describe('merchant ID extraction', () => {
    it('should extract merchant ID from authUser.merchantId', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockTransaction = {
        setTag: jest.fn(),
        setStatus: jest.fn(),
        setData: jest.fn(),
        finish: jest.fn(),
      };

      sentryService.startTransaction.mockReturnValue(mockTransaction as any);

      const requestId = 'req-auth-merchant-perf';
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

      const mockResponse = {
        statusCode: 200,
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => mockResponse),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('merchant data')),
      };

      interceptor.intercept(mockContext, mockCallHandler);

      expect(sentryService.startTransaction).toHaveBeenCalledWith(
        `${method} ${url}`,
        'http.server',
        expect.objectContaining({
          merchantId,
        }),
      );
    });

    it('should extract merchant ID from JWT user.merchantId', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockTransaction = {
        setTag: jest.fn(),
        setStatus: jest.fn(),
        setData: jest.fn(),
        finish: jest.fn(),
      };

      sentryService.startTransaction.mockReturnValue(mockTransaction as any);

      const requestId = 'req-jwt-merchant-perf';
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

      const mockResponse = {
        statusCode: 200,
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => mockResponse),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('jwt merchant data')),
      };

      interceptor.intercept(mockContext, mockCallHandler);

      expect(sentryService.startTransaction).toHaveBeenCalledWith(
        `${method} ${url}`,
        'http.server',
        expect.objectContaining({
          merchantId,
        }),
      );
    });

    it('should prefer authUser.merchantId over JWT user.merchantId', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockTransaction = {
        setTag: jest.fn(),
        setStatus: jest.fn(),
        setData: jest.fn(),
        finish: jest.fn(),
      };

      sentryService.startTransaction.mockReturnValue(mockTransaction as any);

      const requestId = 'req-both-merchants-perf';
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

      const mockResponse = {
        statusCode: 200,
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => mockResponse),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('both merchants data')),
      };

      interceptor.intercept(mockContext, mockCallHandler);

      expect(sentryService.startTransaction).toHaveBeenCalledWith(
        `${method} ${url}`,
        'http.server',
        expect.objectContaining({
          merchantId: authMerchantId, // Should prefer authUser
        }),
      );
    });
  });

  describe('request metadata extraction', () => {
    it('should extract all available metadata', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockTransaction = {
        setTag: jest.fn(),
        setStatus: jest.fn(),
        setData: jest.fn(),
        finish: jest.fn(),
      };

      sentryService.startTransaction.mockReturnValue(mockTransaction as any);

      const requestId = 'req-full-meta-perf';
      const method = 'POST';
      const url = '/api/complete';
      const ip = '192.168.1.100';
      const userAgent = 'CompleteClient/1.0';
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
        },
        authUser: { _id: userId, merchantId },
      };

      const mockResponse = {
        statusCode: 201,
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => mockResponse),
        })),
      } as any;

      const testData = { created: true };
      const mockCallHandler = {
        handle: jest.fn(() => of(testData)),
      };

      interceptor.intercept(mockContext, mockCallHandler);

      expect(sentryService.startTransaction).toHaveBeenCalledWith(
        `${method} ${url}`,
        'http.server',
        expect.objectContaining({
          userId,
          merchantId,
          requestId,
          url,
          method,
          ip,
          userAgent,
        }),
      );

      expect(mockTransaction.setStatus).toHaveBeenCalledWith('ok');
      expect(mockTransaction.finish).toHaveBeenCalled();
    });

    it('should handle missing optional metadata', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockTransaction = {
        setTag: jest.fn(),
        setStatus: jest.fn(),
        setData: jest.fn(),
        finish: jest.fn(),
      };

      sentryService.startTransaction.mockReturnValue(mockTransaction as any);

      const requestId = 'req-minimal-meta-perf';
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
        // No user data
      };

      const mockResponse = {
        statusCode: 200,
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => mockResponse),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('minimal data')),
      };

      interceptor.intercept(mockContext, mockCallHandler);

      expect(sentryService.startTransaction).toHaveBeenCalledWith(
        `${method} ${url}`,
        'http.server',
        expect.objectContaining({
          requestId,
          url,
          method,
          ip,
        }),
      );
      expect(
        sentryService.startTransaction.mock.calls[0][2],
      ).not.toHaveProperty('userId');
      expect(
        sentryService.startTransaction.mock.calls[0][2],
      ).not.toHaveProperty('merchantId');
      expect(
        sentryService.startTransaction.mock.calls[0][2],
      ).not.toHaveProperty('userAgent');
    });

    it('should extract request ID from x-request-id header when requestId is missing', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockTransaction = {
        setTag: jest.fn(),
        setStatus: jest.fn(),
        setData: jest.fn(),
        finish: jest.fn(),
      };

      sentryService.startTransaction.mockReturnValue(mockTransaction as any);

      const headerRequestId = 'header-req-id';
      const method = 'GET';
      const url = '/api/header-id';

      const mockRequest = {
        method,
        url,
        originalUrl: url,
        headers: {
          'x-request-id': headerRequestId,
        },
      };

      const mockResponse = {
        statusCode: 200,
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => mockResponse),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('data')),
      };

      interceptor.intercept(mockContext, mockCallHandler);

      expect(sentryService.startTransaction).toHaveBeenCalledWith(
        `${method} ${url}`,
        'http.server',
        expect.objectContaining({
          requestId: headerRequestId,
        }),
      );
    });
  });

  describe('transaction management', () => {
    it('should set correct transaction tags', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockTransaction = {
        setTag: jest.fn(),
        setStatus: jest.fn(),
        setData: jest.fn(),
        finish: jest.fn(),
      };

      sentryService.startTransaction.mockReturnValue(mockTransaction as any);

      const requestId = 'req-transaction-tags';
      const method = 'GET';
      const url = '/api/users';
      const userId = 'user_123';
      const merchantId = 'merchant_456';

      const mockRequest = {
        requestId,
        method,
        url,
        originalUrl: url,
        headers: {},
        authUser: { _id: userId, merchantId },
      };

      const mockResponse = {
        statusCode: 200,
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => mockResponse),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('data')),
      };

      interceptor.intercept(mockContext, mockCallHandler);

      expect(mockTransaction.setTag).toHaveBeenCalledWith(
        'http.method',
        method,
      );
      expect(mockTransaction.setTag).toHaveBeenCalledWith('http.route', url);
      expect(mockTransaction.setTag).toHaveBeenCalledWith(
        'request.id',
        requestId,
      );
      expect(mockTransaction.setTag).toHaveBeenCalledWith('user.id', userId);
      expect(mockTransaction.setTag).toHaveBeenCalledWith(
        'merchant.id',
        merchantId,
      );
    });

    it('should set transaction status to ok for successful requests', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockTransaction = {
        setTag: jest.fn(),
        setStatus: jest.fn(),
        setData: jest.fn(),
        finish: jest.fn(),
      };

      sentryService.startTransaction.mockReturnValue(mockTransaction as any);

      const mockRequest = {
        requestId: 'req-status-ok',
        method: 'GET',
        url: '/api/test',
        originalUrl: '/api/test',
        headers: {},
      };

      const mockResponse = {
        statusCode: 200,
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => mockResponse),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('success data')),
      };

      interceptor.intercept(mockContext, mockCallHandler);

      expect(mockTransaction.setStatus).toHaveBeenCalledWith('ok');
    });

    it('should set transaction status to internal_error for failed requests', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockTransaction = {
        setTag: jest.fn(),
        setStatus: jest.fn(),
        setData: jest.fn(),
        finish: jest.fn(),
      };

      sentryService.startTransaction.mockReturnValue(mockTransaction as any);

      const mockRequest = {
        requestId: 'req-status-error',
        method: 'POST',
        url: '/api/test',
        originalUrl: '/api/test',
        headers: {},
      };

      const mockResponse = {
        statusCode: 500,
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => mockResponse),
        })),
      } as any;

      const error = new Error('Internal server error');
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => error)),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe({
        error: () => {
          // Error handler
        },
      });

      expect(mockTransaction.setStatus).toHaveBeenCalledWith('internal_error');
    });

    it('should set response data for successful requests', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockTransaction = {
        setTag: jest.fn(),
        setStatus: jest.fn(),
        setData: jest.fn(),
        finish: jest.fn(),
      };

      sentryService.startTransaction.mockReturnValue(mockTransaction as any);

      const mockRequest = {
        requestId: 'req-response-data',
        method: 'GET',
        url: '/api/test',
        originalUrl: '/api/test',
        headers: {},
      };

      const mockResponse = {
        statusCode: 200,
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => mockResponse),
        })),
      } as any;

      const responseData = { message: 'success', count: 10 };
      const mockCallHandler = {
        handle: jest.fn(() => of(responseData)),
      };

      interceptor.intercept(mockContext, mockCallHandler);

      expect(mockTransaction.setData).toHaveBeenCalledWith(
        'response_size',
        JSON.stringify(responseData).length,
      );
    });

    it('should set error data for failed requests', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockTransaction = {
        setTag: jest.fn(),
        setStatus: jest.fn(),
        setData: jest.fn(),
        finish: jest.fn(),
      };

      sentryService.startTransaction.mockReturnValue(mockTransaction as any);

      const mockRequest = {
        requestId: 'req-error-data',
        method: 'POST',
        url: '/api/test',
        originalUrl: '/api/test',
        headers: {},
      };

      const mockResponse = {
        statusCode: 400,
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => mockResponse),
        })),
      } as any;

      const error = new Error('Validation failed');
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => error)),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe({
        error: () => {
          // Error handler
        },
      });

      expect(mockTransaction.setData).toHaveBeenCalledWith(
        'error_message',
        error.message,
      );
      expect(mockTransaction.setData).toHaveBeenCalledWith('error_code', 400);
    });

    it('should finalize transaction with timing data', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockTransaction = {
        setTag: jest.fn(),
        setStatus: jest.fn(),
        setData: jest.fn(),
        finish: jest.fn(),
      };

      sentryService.startTransaction.mockReturnValue(mockTransaction as any);

      const mockRequest = {
        requestId: 'req-finalize',
        method: 'GET',
        url: '/api/test',
        originalUrl: '/api/test',
        headers: {},
      };

      const mockResponse = {
        statusCode: 200,
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => mockResponse),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('data')),
      };

      interceptor.intercept(mockContext, mockCallHandler);

      expect(mockTransaction.setData).toHaveBeenCalledWith(
        'duration_ms',
        expect.any(Number),
      );
      expect(mockTransaction.setData).toHaveBeenCalledWith('status_code', 200);
      expect(mockTransaction.setData).toHaveBeenCalledWith(
        'request_id',
        'req-finalize',
      );
      expect(mockTransaction.setTag).toHaveBeenCalledWith(
        'performance',
        'fast',
      );
      expect(mockTransaction.finish).toHaveBeenCalled();
    });
  });

  describe('performance categorization', () => {
    it('should categorize fast requests correctly', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockTransaction = {
        setTag: jest.fn(),
        setStatus: jest.fn(),
        setData: jest.fn(),
        finish: jest.fn(),
      };

      sentryService.startTransaction.mockReturnValue(mockTransaction as any);

      const mockRequest = {
        requestId: 'req-fast',
        method: 'GET',
        url: '/api/fast',
        originalUrl: '/api/fast',
        headers: {},
      };

      const mockResponse = {
        statusCode: 200,
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => mockResponse),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('fast data')),
      };

      interceptor.intercept(mockContext, mockCallHandler);

      expect(mockTransaction.setTag).toHaveBeenCalledWith(
        'performance',
        'fast',
      );
    });

    it('should categorize medium requests correctly', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockTransaction = {
        setTag: jest.fn(),
        setStatus: jest.fn(),
        setData: jest.fn(),
        finish: jest.fn(),
      };

      sentryService.startTransaction.mockReturnValue(mockTransaction as any);

      const mockRequest = {
        requestId: 'req-medium',
        method: 'GET',
        url: '/api/medium',
        originalUrl: '/api/medium',
        headers: {},
      };

      const mockResponse = {
        statusCode: 200,
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => mockResponse),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => {
          // Simulate medium duration request
          return new Promise((resolve) => {
            setTimeout(() => resolve('medium data'), 2000);
          });
        }),
      };

      interceptor.intercept(mockContext, mockCallHandler as any);

      // Wait for async operation to complete
      setTimeout(() => {
        expect(mockTransaction.setTag).toHaveBeenCalledWith(
          'performance',
          'medium',
        );
      }, 2500);
    });

    it('should categorize slow requests correctly', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockTransaction = {
        setTag: jest.fn(),
        setStatus: jest.fn(),
        setData: jest.fn(),
        finish: jest.fn(),
      };

      sentryService.startTransaction.mockReturnValue(mockTransaction as any);

      const mockRequest = {
        requestId: 'req-slow',
        method: 'POST',
        url: '/api/slow',
        originalUrl: '/api/slow',
        headers: {},
      };

      const mockResponse = {
        statusCode: 200,
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => mockResponse),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => {
          // Simulate slow duration request
          return new Promise((resolve) => {
            setTimeout(() => resolve('slow data'), 6000);
          });
        }),
      };

      interceptor.intercept(mockContext, mockCallHandler as any);

      // Wait for async operation to complete
      setTimeout(() => {
        expect(mockTransaction.setTag).toHaveBeenCalledWith(
          'performance',
          'slow',
        );
      }, 6500);
    });
  });

  describe('slow request logging', () => {
    it('should log slow requests', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockTransaction = {
        setTag: jest.fn(),
        setStatus: jest.fn(),
        setData: jest.fn(),
        finish: jest.fn(),
      };

      sentryService.startTransaction.mockReturnValue(mockTransaction as any);

      const requestId = 'req-slow-log';
      const method = 'POST';
      const url = '/api/slow-operation';
      const userId = 'user_123';
      const merchantId = 'merchant_456';

      const mockRequest = {
        requestId,
        method,
        url,
        originalUrl: url,
        headers: {},
        authUser: { _id: userId, merchantId },
      };

      const mockResponse = {
        statusCode: 200,
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => mockResponse),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => {
          // Simulate slow operation
          return new Promise((resolve) => {
            setTimeout(() => resolve('slow data'), 4000);
          });
        }),
      };

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      interceptor.intercept(mockContext, mockCallHandler as any);

      // Wait for async operation to complete
      setTimeout(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Slow request:'),
        );
        consoleSpy.mockRestore();
      }, 4500);
    });

    it('should not log fast requests', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockTransaction = {
        setTag: jest.fn(),
        setStatus: jest.fn(),
        setData: jest.fn(),
        finish: jest.fn(),
      };

      sentryService.startTransaction.mockReturnValue(mockTransaction as any);

      const mockRequest = {
        requestId: 'req-fast-log',
        method: 'GET',
        url: '/api/fast',
        originalUrl: '/api/fast',
        headers: {},
      };

      const mockResponse = {
        statusCode: 200,
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => mockResponse),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('fast data')),
      };

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      interceptor.intercept(mockContext, mockCallHandler);

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should not log medium requests', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockTransaction = {
        setTag: jest.fn(),
        setStatus: jest.fn(),
        setData: jest.fn(),
        finish: jest.fn(),
      };

      sentryService.startTransaction.mockReturnValue(mockTransaction as any);

      const mockRequest = {
        requestId: 'req-medium-log',
        method: 'GET',
        url: '/api/medium',
        originalUrl: '/api/medium',
        headers: {},
      };

      const mockResponse = {
        statusCode: 200,
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => mockResponse),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => {
          // Simulate medium duration request
          return new Promise((resolve) => {
            setTimeout(() => resolve('medium data'), 2000);
          });
        }),
      };

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      interceptor.intercept(mockContext, mockCallHandler as any);

      // Wait for async operation to complete
      setTimeout(() => {
        expect(consoleSpy).not.toHaveBeenCalled();
        consoleSpy.mockRestore();
      }, 2500);
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
      expect(sentryService.startTransaction).not.toHaveBeenCalled();
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
          getResponse: jest.fn(() => ({})),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('test')),
      };

      expect(() => interceptor.intercept(mockContext, mockCallHandler)).toThrow(
        'getRequest not available',
      );
    });

    it('should handle missing getResponse method', () => {
      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => ({})),
          getResponse: jest.fn(() => {
            throw new Error('getResponse not available');
          }),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('test')),
      };

      expect(() => interceptor.intercept(mockContext, mockCallHandler)).toThrow(
        'getResponse not available',
      );
    });

    it('should handle request object throwing errors', () => {
      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => {
            throw new Error('Request access error');
          }),
          getResponse: jest.fn(() => ({})),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('test')),
      };

      expect(() => interceptor.intercept(mockContext, mockCallHandler)).toThrow(
        'Request access error',
      );
    });

    it('should handle response object throwing errors', () => {
      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => ({})),
          getResponse: jest.fn(() => {
            throw new Error('Response access error');
          }),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('test')),
      };

      expect(() => interceptor.intercept(mockContext, mockCallHandler)).toThrow(
        'Response access error',
      );
    });
  });

  describe('call handler integration', () => {
    it('should call next.handle() for non-bypass requests', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockRequest = { requestId: 'req-handler-perf' };
      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({ statusCode: 200 })),
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
          getResponse: jest.fn(() => ({})),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('bypass data')),
      };

      interceptor.intercept(mockContext, mockCallHandler);

      expect(mockCallHandler.handle).toHaveBeenCalled();
      expect(sentryService.startTransaction).not.toHaveBeenCalled();
    });

    it('should handle call handler throwing errors', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockTransaction = {
        setTag: jest.fn(),
        setStatus: jest.fn(),
        setData: jest.fn(),
        finish: jest.fn(),
      };

      sentryService.startTransaction.mockReturnValue(mockTransaction as any);

      const mockRequest = { requestId: 'req-error-handler-perf' };
      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({ statusCode: 500 })),
        })),
      } as any;

      const error = new Error('Handler error');
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => error)),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe({
        error: () => {
          // Error handler
        },
      });

      expect(mockTransaction.setStatus).toHaveBeenCalledWith('internal_error');
      expect(mockTransaction.finish).toHaveBeenCalled();
    });

    it('should handle call handler returning different observable types', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockTransaction = {
        setTag: jest.fn(),
        setStatus: jest.fn(),
        setData: jest.fn(),
        finish: jest.fn(),
      };

      sentryService.startTransaction.mockReturnValue(mockTransaction as any);

      const mockRequest = { requestId: 'req-observable-types-perf' };
      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({ statusCode: 200 })),
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

      testCases.forEach((testData) => {
        const mockCallHandler = {
          handle: jest.fn(() => testData),
        };

        const result = interceptor.intercept(mockContext, mockCallHandler);

        expect(mockCallHandler.handle).toHaveBeenCalled();

        let actualResult: unknown;
        result.subscribe({
          next: (data) => {
            actualResult = data;
          },
        });

        expect(actualResult).toBe(testData);
        expect(mockTransaction.setStatus).toHaveBeenCalledWith('ok');
        expect(mockTransaction.finish).toHaveBeenCalled();
      });
    });
  });

  describe('performance considerations', () => {
    it('should handle rapid successive requests', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockTransaction = {
        setTag: jest.fn(),
        setStatus: jest.fn(),
        setData: jest.fn(),
        finish: jest.fn(),
      };

      sentryService.startTransaction.mockReturnValue(mockTransaction as any);

      const mockRequest = {
        requestId: 'req-perf',
        method: 'GET',
        url: '/api/test',
      };
      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({ statusCode: 200 })),
        })),
      } as any;

      const testData = 'test';
      const mockCallHandler = {
        handle: jest.fn(() => of(testData)),
      };

      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        const result = interceptor.intercept(mockContext, mockCallHandler);

        result.subscribe();
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should not create memory leaks', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockTransaction = {
        setTag: jest.fn(),
        setStatus: jest.fn(),
        setData: jest.fn(),
        finish: jest.fn(),
      };

      sentryService.startTransaction.mockReturnValue(mockTransaction as any);

      const mockRequest = {
        requestId: 'req-memory-perf',
        method: 'GET',
        url: '/api/test',
      };
      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({ statusCode: 200 })),
        })),
      } as any;

      const testData = 'test';
      const mockCallHandler = {
        handle: jest.fn(() => of(testData)),
      };

      for (let i = 0; i < 10000; i++) {
        const result = interceptor.intercept(mockContext, mockCallHandler);

        result.subscribe();
      }

      // If we get here without memory issues, test passes
      expect(true).toBe(true);
    });

    it('should handle concurrent requests', async () => {
      mockShouldBypass.mockReturnValue(false);

      const mockTransaction = {
        setTag: jest.fn(),
        setStatus: jest.fn(),
        setData: jest.fn(),
        finish: jest.fn(),
      };

      sentryService.startTransaction.mockReturnValue(mockTransaction as any);

      const mockRequest = {
        requestId: 'req-concurrent-perf',
        method: 'GET',
        url: '/api/test',
      };
      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({ statusCode: 200 })),
        })),
      } as any;

      const testData = 'test';
      const mockCallHandler = {
        handle: jest.fn(() => of(testData)),
      };

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
                next: () => {
                  resolve();
                },
              });
            });
          }),
        );
      }

      await Promise.all(promises);

      expect(sentryService.startTransaction).toHaveBeenCalledTimes(100);
      expect(promises).toHaveLength(100);
    });
  });

  describe('real-world usage scenarios', () => {
    it('should handle API request performance tracking', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockTransaction = {
        setTag: jest.fn(),
        setStatus: jest.fn(),
        setData: jest.fn(),
        finish: jest.fn(),
      };

      sentryService.startTransaction.mockReturnValue(mockTransaction as any);

      const requestId = 'api-perf-123';
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
        },
        authUser: { _id: userId, merchantId },
      };

      const mockResponse = {
        statusCode: 201,
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => mockResponse),
        })),
      } as any;

      const apiData = {
        users: [
          { id: 1, name: 'John Doe', email: 'john@example.com' },
          { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
        ],
        total: 2,
        page: 1,
        limit: 10,
      };

      const mockCallHandler = {
        handle: jest.fn(() => of(apiData)),
      };

      interceptor.intercept(mockContext, mockCallHandler);

      expect(sentryService.startTransaction).toHaveBeenCalledWith(
        `${method} ${url}`,
        'http.server',
        expect.objectContaining({
          userId,
          merchantId,
          requestId,
          url,
          method,
          ip,
          userAgent,
        }),
      );

      expect(mockTransaction.setStatus).toHaveBeenCalledWith('ok');
      expect(mockTransaction.setData).toHaveBeenCalledWith(
        'response_size',
        JSON.stringify(apiData).length,
      );
      expect(mockTransaction.finish).toHaveBeenCalled();
    });

    it('should handle error scenario with performance tracking', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockTransaction = {
        setTag: jest.fn(),
        setStatus: jest.fn(),
        setData: jest.fn(),
        finish: jest.fn(),
      };

      sentryService.startTransaction.mockReturnValue(mockTransaction as any);

      const requestId = 'error-perf-456';
      const method = 'PUT';
      const url = '/api/users/123';

      const mockRequest = {
        requestId,
        method,
        url,
        originalUrl: url,
        headers: {},
      };

      const mockResponse = {
        statusCode: 400,
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => mockResponse),
        })),
      } as any;

      const error = new Error('Validation failed');
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => error)),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe({
        error: () => {
          // Error handler
        },
      });

      expect(mockTransaction.setStatus).toHaveBeenCalledWith('internal_error');
      expect(mockTransaction.setData).toHaveBeenCalledWith(
        'error_message',
        error.message,
      );
      expect(mockTransaction.setData).toHaveBeenCalledWith('error_code', 400);
      expect(mockTransaction.finish).toHaveBeenCalled();
    });

    it('should handle metrics endpoint bypass', () => {
      mockShouldBypass.mockReturnValue(true);

      const mockRequest = { originalUrl: '/metrics' };
      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({})),
        })),
      } as any;

      const metricsData = 'prometheus_metrics_data';
      const mockCallHandler = {
        handle: jest.fn(() => of(metricsData)),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler);

      expect(mockShouldBypass).toHaveBeenCalledWith(mockRequest);
      expect(mockCallHandler.handle).toHaveBeenCalled();
      expect(sentryService.startTransaction).not.toHaveBeenCalled();

      let actualResult: unknown;
      result.subscribe({
        next: (data) => {
          actualResult = data;
        },
      });

      expect(actualResult).toBe(metricsData);
    });

    it('should handle health check endpoint bypass', () => {
      mockShouldBypass.mockReturnValue(true);

      const mockRequest = { originalUrl: '/health' };
      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({})),
        })),
      } as any;

      const healthData = { status: 'ok', uptime: '1h' };
      const mockCallHandler = {
        handle: jest.fn(() => of(healthData)),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler);

      let actualResult: unknown;
      result.subscribe({
        next: (data) => {
          actualResult = data;
        },
      });

      expect(actualResult).toBe(healthData);
    });

    it('should handle swagger documentation access', () => {
      mockShouldBypass.mockReturnValue(true);

      const mockRequest = { originalUrl: '/swagger' };
      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({})),
        })),
      } as any;

      const swaggerData = { swagger: '2.0', info: { title: 'API' } };
      const mockCallHandler = {
        handle: jest.fn(() => of(swaggerData)),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler);

      let actualResult: unknown;
      result.subscribe({
        next: (data) => {
          actualResult = data;
        },
      });

      expect(actualResult).toBe(swaggerData);
    });
  });

  describe('service dependencies', () => {
    it('should inject SentryService correctly', () => {
      expect(interceptor).toBeDefined();
      expect(sentryService).toBeDefined();
    });

    it('should handle SentryService method calls', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockTransaction = {
        setTag: jest.fn(),
        setStatus: jest.fn(),
        setData: jest.fn(),
        finish: jest.fn(),
      };

      const mockStartTransaction = jest.spyOn(
        sentryService,
        'startTransaction',
      );

      sentryService.startTransaction.mockReturnValue(mockTransaction as any);

      const mockRequest = {
        requestId: 'req-service-call-perf',
        method: 'GET',
        url: '/api/test',
        originalUrl: '/api/test',
        headers: {},
      };

      const mockResponse = {
        statusCode: 200,
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => mockResponse),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('data')),
      };

      interceptor.intercept(mockContext, mockCallHandler);

      expect(mockStartTransaction).toHaveBeenCalledWith(
        'GET /api/test',
        'http.server',
        expect.any(Object),
      );

      mockStartTransaction.mockRestore();
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
          getResponse: jest.fn(() => ({})),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('data')),
      };

      expect(() => interceptor.intercept(mockContext, mockCallHandler)).toThrow(
        'getRequest error',
      );
    });

    it('should handle getResponse errors', () => {
      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => ({})),
          getResponse: jest.fn(() => {
            throw new Error('getResponse error');
          }),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('data')),
      };

      expect(() => interceptor.intercept(mockContext, mockCallHandler)).toThrow(
        'getResponse error',
      );
    });
  });

  describe('metadata extraction helpers', () => {
    it('should handle URL normalization correctly', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockTransaction = {
        setTag: jest.fn(),
        setStatus: jest.fn(),
        setData: jest.fn(),
        finish: jest.fn(),
      };

      sentryService.startTransaction.mockReturnValue(mockTransaction as any);

      const requestId = 'req-url-norm-perf';
      const method = 'GET';
      const originalUrl = '/api/users?page=1&limit=10';
      const normalizedUrl = '/api/users';

      const mockRequest = {
        requestId,
        method,
        url: normalizedUrl,
        originalUrl,
        headers: {},
      };

      const mockResponse = {
        statusCode: 200,
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => mockResponse),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('data')),
      };

      interceptor.intercept(mockContext, mockCallHandler);

      expect(sentryService.startTransaction).toHaveBeenCalledWith(
        `${method} ${normalizedUrl}`,
        'http.server',
        expect.objectContaining({
          url: normalizedUrl,
        }),
      );
    });

    it('should handle missing originalUrl fallback', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockTransaction = {
        setTag: jest.fn(),
        setStatus: jest.fn(),
        setData: jest.fn(),
        finish: jest.fn(),
      };

      sentryService.startTransaction.mockReturnValue(mockTransaction as any);

      const requestId = 'req-no-original-perf';
      const method = 'GET';
      const url = '/api/users';

      const mockRequest = {
        requestId,
        method,
        url,
        // No originalUrl
        headers: {},
      };

      const mockResponse = {
        statusCode: 200,
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => mockResponse),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('data')),
      };

      interceptor.intercept(mockContext, mockCallHandler);

      expect(sentryService.startTransaction).toHaveBeenCalledWith(
        `${method} ${url}`,
        'http.server',
        expect.objectContaining({
          url,
        }),
      );
    });

    it('should handle empty URL fallback', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockTransaction = {
        setTag: jest.fn(),
        setStatus: jest.fn(),
        setData: jest.fn(),
        finish: jest.fn(),
      };

      sentryService.startTransaction.mockReturnValue(mockTransaction as any);

      const requestId = 'req-empty-url-perf';
      const method = 'GET';

      const mockRequest = {
        requestId,
        method,
        url: '',
        originalUrl: '',
        headers: {},
      };

      const mockResponse = {
        statusCode: 200,
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => mockResponse),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('data')),
      };

      interceptor.intercept(mockContext, mockCallHandler);

      expect(sentryService.startTransaction).toHaveBeenCalledWith(
        `${method} /`,
        'http.server',
        expect.objectContaining({
          url: '/',
        }),
      );
    });
  });

  describe('request ID extraction', () => {
    it('should use request.requestId when available', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockTransaction = {
        setTag: jest.fn(),
        setStatus: jest.fn(),
        setData: jest.fn(),
        finish: jest.fn(),
      };

      sentryService.startTransaction.mockReturnValue(mockTransaction as any);

      const requestId = 'existing-req-id-perf';
      const method = 'GET';
      const url = '/api/test';

      const mockRequest = {
        requestId,
        method,
        url,
        originalUrl: url,
        headers: {},
      };

      const mockResponse = {
        statusCode: 200,
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => mockResponse),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('data')),
      };

      interceptor.intercept(mockContext, mockCallHandler);

      expect(sentryService.startTransaction).toHaveBeenCalledWith(
        `${method} ${url}`,
        'http.server',
        expect.objectContaining({
          requestId,
        }),
      );
    });

    it('should fallback to x-request-id header', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockTransaction = {
        setTag: jest.fn(),
        setStatus: jest.fn(),
        setData: jest.fn(),
        finish: jest.fn(),
      };

      sentryService.startTransaction.mockReturnValue(mockTransaction as any);

      const headerRequestId = 'header-req-id-perf';
      const method = 'GET';
      const url = '/api/header-id';

      const mockRequest = {
        method,
        url,
        originalUrl: url,
        headers: {
          'x-request-id': headerRequestId,
        },
      };

      const mockResponse = {
        statusCode: 200,
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => mockResponse),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('data')),
      };

      interceptor.intercept(mockContext, mockCallHandler);

      expect(sentryService.startTransaction).toHaveBeenCalledWith(
        `${method} ${url}`,
        'http.server',
        expect.objectContaining({
          requestId: headerRequestId,
        }),
      );
    });

    it('should handle array x-request-id header', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockTransaction = {
        setTag: jest.fn(),
        setStatus: jest.fn(),
        setData: jest.fn(),
        finish: jest.fn(),
      };

      sentryService.startTransaction.mockReturnValue(mockTransaction as any);

      const headerRequestId = 'array-req-id-perf';
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

      const mockResponse = {
        statusCode: 200,
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => mockResponse),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('data')),
      };

      interceptor.intercept(mockContext, mockCallHandler);

      expect(sentryService.startTransaction).toHaveBeenCalledWith(
        `${method} ${url}`,
        'http.server',
        expect.objectContaining({
          requestId: headerRequestId, // Should take first element
        }),
      );
    });

    it('should handle missing request ID completely', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockTransaction = {
        setTag: jest.fn(),
        setStatus: jest.fn(),
        setData: jest.fn(),
        finish: jest.fn(),
      };

      sentryService.startTransaction.mockReturnValue(mockTransaction as any);

      const method = 'GET';
      const url = '/api/test';

      const mockRequest = {
        method,
        url,
        originalUrl: url,
        headers: {},
      };

      const mockResponse = {
        statusCode: 200,
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => mockResponse),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('data')),
      };

      interceptor.intercept(mockContext, mockCallHandler);

      expect(sentryService.startTransaction).toHaveBeenCalledWith(
        `${method} ${url}`,
        'http.server',
        expect.not.objectContaining({
          requestId: expect.any(String),
        }),
      );
    });
  });

  describe('user agent extraction', () => {
    it('should extract user agent from headers', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockTransaction = {
        setTag: jest.fn(),
        setStatus: jest.fn(),
        setData: jest.fn(),
        finish: jest.fn(),
      };

      sentryService.startTransaction.mockReturnValue(mockTransaction as any);

      const requestId = 'req-user-agent-perf';
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

      const mockResponse = {
        statusCode: 200,
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => mockResponse),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('data')),
      };

      interceptor.intercept(mockContext, mockCallHandler);

      expect(sentryService.startTransaction).toHaveBeenCalledWith(
        `${method} ${url}`,
        'http.server',
        expect.objectContaining({
          userAgent,
        }),
      );
    });

    it('should handle missing user agent', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockTransaction = {
        setTag: jest.fn(),
        setStatus: jest.fn(),
        setData: jest.fn(),
        finish: jest.fn(),
      };

      sentryService.startTransaction.mockReturnValue(mockTransaction as any);

      const requestId = 'req-no-user-agent-perf';
      const method = 'GET';
      const url = '/api/test';

      const mockRequest = {
        requestId,
        method,
        url,
        originalUrl: url,
        headers: {},
      };

      const mockResponse = {
        statusCode: 200,
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => mockResponse),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('data')),
      };

      interceptor.intercept(mockContext, mockCallHandler);

      expect(sentryService.startTransaction).toHaveBeenCalledWith(
        `${method} ${url}`,
        'http.server',
        expect.not.objectContaining({
          userAgent: expect.any(String),
        }),
      );
    });

    it('should handle empty user agent', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockTransaction = {
        setTag: jest.fn(),
        setStatus: jest.fn(),
        setData: jest.fn(),
        finish: jest.fn(),
      };

      sentryService.startTransaction.mockReturnValue(mockTransaction as any);

      const requestId = 'req-empty-user-agent-perf';
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

      const mockResponse = {
        statusCode: 200,
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => mockResponse),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('data')),
      };

      interceptor.intercept(mockContext, mockCallHandler);

      expect(sentryService.startTransaction).toHaveBeenCalledWith(
        `${method} ${url}`,
        'http.server',
        expect.objectContaining({
          userAgent: '',
        }),
      );
    });
  });

  describe('IP address extraction', () => {
    it('should extract IP address from request', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockTransaction = {
        setTag: jest.fn(),
        setStatus: jest.fn(),
        setData: jest.fn(),
        finish: jest.fn(),
      };

      sentryService.startTransaction.mockReturnValue(mockTransaction as any);

      const requestId = 'req-ip-extraction-perf';
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

      const mockResponse = {
        statusCode: 200,
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => mockResponse),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('data')),
      };

      interceptor.intercept(mockContext, mockCallHandler);

      expect(sentryService.startTransaction).toHaveBeenCalledWith(
        `${method} ${url}`,
        'http.server',
        expect.objectContaining({
          ip,
        }),
      );
    });

    it('should handle missing IP address', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockTransaction = {
        setTag: jest.fn(),
        setStatus: jest.fn(),
        setData: jest.fn(),
        finish: jest.fn(),
      };

      sentryService.startTransaction.mockReturnValue(mockTransaction as any);

      const requestId = 'req-no-ip-perf';
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

      const mockResponse = {
        statusCode: 200,
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => mockResponse),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('data')),
      };

      interceptor.intercept(mockContext, mockCallHandler);

      expect(sentryService.startTransaction).toHaveBeenCalledWith(
        `${method} ${url}`,
        'http.server',
        expect.objectContaining({
          ip: 'unknown',
        }),
      );
    });

    it('should handle null IP address', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockTransaction = {
        setTag: jest.fn(),
        setStatus: jest.fn(),
        setData: jest.fn(),
        finish: jest.fn(),
      };

      sentryService.startTransaction.mockReturnValue(mockTransaction as any);

      const requestId = 'req-null-ip-perf';
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

      const mockResponse = {
        statusCode: 200,
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => mockResponse),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('data')),
      };

      interceptor.intercept(mockContext, mockCallHandler);

      expect(sentryService.startTransaction).toHaveBeenCalledWith(
        `${method} ${url}`,
        'http.server',
        expect.objectContaining({
          ip: 'unknown',
        }),
      );
    });

    it('should handle IPv6 addresses', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockTransaction = {
        setTag: jest.fn(),
        setStatus: jest.fn(),
        setData: jest.fn(),
        finish: jest.fn(),
      };

      sentryService.startTransaction.mockReturnValue(mockTransaction as any);

      const requestId = 'req-ipv6-perf';
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

      const mockResponse = {
        statusCode: 200,
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => mockResponse),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('data')),
      };

      interceptor.intercept(mockContext, mockCallHandler);

      expect(sentryService.startTransaction).toHaveBeenCalledWith(
        `${method} ${url}`,
        'http.server',
        expect.objectContaining({
          ip: ipv6,
        }),
      );
    });
  });

  describe('service instantiation', () => {
    it('should inject SentryService correctly', () => {
      expect(interceptor).toBeDefined();
      expect(sentryService).toBeDefined();
    });

    it('should handle SentryService being unavailable', () => {
      const mockModule = {
        get: jest.fn().mockImplementation((token) => {
          if (token === SentryService) {
            throw new Error('SentryService not available');
          }
          return {};
        }),
      };

      expect(() => {
        const testInterceptor = new PerformanceTrackingInterceptor(
          mockModule.get(SentryService),
        );
        testInterceptor.intercept(null as any, null as any);
      }).toThrow('SentryService not available');
    });
  });

  describe('integration with NestJS', () => {
    it('should work with NestJS HTTP context', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockTransaction = {
        setTag: jest.fn(),
        setStatus: jest.fn(),
        setData: jest.fn(),
        finish: jest.fn(),
      };

      sentryService.startTransaction.mockReturnValue(mockTransaction as any);

      const mockRequest = {
        requestId: 'nestjs-perf-req',
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
          getResponse: jest.fn(() => ({ statusCode: 200 })),
        })),
        getType: jest.fn(() => 'http'),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('nestjs data')),
      };

      interceptor.intercept(mockContext, mockCallHandler);

      expect(sentryService.startTransaction).toHaveBeenCalledWith(
        'GET /api/test',
        'http.server',
        expect.objectContaining({
          url: '/api/test',
          method: 'GET',
          ip: '10.0.0.1',
          userId: 'user_123',
          requestId: 'nestjs-perf-req',
          userAgent: 'NestJS-Test/1.0',
        }),
      );

      expect(mockTransaction.setStatus).toHaveBeenCalledWith('ok');
      expect(mockTransaction.finish).toHaveBeenCalled();
    });

    it('should handle NestJS execution context correctly', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockTransaction = {
        setTag: jest.fn(),
        setStatus: jest.fn(),
        setData: jest.fn(),
        finish: jest.fn(),
      };

      sentryService.startTransaction.mockReturnValue(mockTransaction as any);

      const mockRequest = {
        requestId: 'context-perf-req',
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
          getResponse: jest.fn(() => ({ statusCode: 201 })),
        })),
        getType: jest.fn(() => 'http'),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('created')),
      };

      interceptor.intercept(mockContext, mockCallHandler);

      expect(sentryService.startTransaction).toHaveBeenCalledWith(
        'POST /api/test',
        'http.server',
        expect.objectContaining({
          url: '/api/test',
          method: 'POST',
          ip: '10.0.0.2',
          userId: 'jwt_user_456',
          requestId: 'context-perf-req',
        }),
      );

      expect(mockTransaction.setStatus).toHaveBeenCalledWith('ok');
      expect(mockTransaction.finish).toHaveBeenCalled();
    });
  });

  describe('error handling in transaction', () => {
    it('should handle transaction.setTag throwing errors', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockTransaction = {
        setTag: jest.fn().mockImplementation(() => {
          throw new Error('setTag error');
        }),
        setStatus: jest.fn(),
        setData: jest.fn(),
        finish: jest.fn(),
      };

      sentryService.startTransaction.mockReturnValue(mockTransaction as any);

      const mockRequest = {
        requestId: 'req-tag-error',
        method: 'GET',
        url: '/api/test',
        originalUrl: '/api/test',
        headers: {},
      };

      const mockResponse = {
        statusCode: 200,
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => mockResponse),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('data')),
      };

      interceptor.intercept(mockContext, mockCallHandler);

      expect(mockTransaction.setStatus).toHaveBeenCalledWith('ok');
      expect(mockTransaction.finish).toHaveBeenCalled();
    });

    it('should handle transaction.setStatus throwing errors', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockTransaction = {
        setTag: jest.fn(),
        setStatus: jest.fn().mockImplementation(() => {
          throw new Error('setStatus error');
        }),
        setData: jest.fn(),
        finish: jest.fn(),
      };

      sentryService.startTransaction.mockReturnValue(mockTransaction as any);

      const mockRequest = {
        requestId: 'req-status-error',
        method: 'GET',
        url: '/api/test',
        originalUrl: '/api/test',
        headers: {},
      };

      const mockResponse = {
        statusCode: 200,
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => mockResponse),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('data')),
      };

      interceptor.intercept(mockContext, mockCallHandler);

      expect(mockTransaction.setTag).toHaveBeenCalled();
      expect(mockTransaction.finish).toHaveBeenCalled();
    });

    it('should handle transaction.setData throwing errors', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockTransaction = {
        setTag: jest.fn(),
        setStatus: jest.fn(),
        setData: jest.fn().mockImplementation(() => {
          throw new Error('setData error');
        }),
        finish: jest.fn(),
      };

      sentryService.startTransaction.mockReturnValue(mockTransaction as any);

      const mockRequest = {
        requestId: 'req-data-error',
        method: 'GET',
        url: '/api/test',
        originalUrl: '/api/test',
        headers: {},
      };

      const mockResponse = {
        statusCode: 200,
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => mockResponse),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('data')),
      };

      interceptor.intercept(mockContext, mockCallHandler);

      expect(mockTransaction.setTag).toHaveBeenCalled();
      expect(mockTransaction.setStatus).toHaveBeenCalledWith('ok');
      expect(mockTransaction.finish).toHaveBeenCalled();
    });

    it('should handle transaction.finish throwing errors', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockTransaction = {
        setTag: jest.fn(),
        setStatus: jest.fn(),
        setData: jest.fn(),
        finish: jest.fn().mockImplementation(() => {
          throw new Error('finish error');
        }),
      };

      sentryService.startTransaction.mockReturnValue(mockTransaction as any);

      const mockRequest = {
        requestId: 'req-finish-error',
        method: 'GET',
        url: '/api/test',
        originalUrl: '/api/test',
        headers: {},
      };

      const mockResponse = {
        statusCode: 200,
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => mockResponse),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('data')),
      };

      interceptor.intercept(mockContext, mockCallHandler);

      expect(mockTransaction.setTag).toHaveBeenCalled();
      expect(mockTransaction.setStatus).toHaveBeenCalledWith('ok');
      expect(mockTransaction.setData).toHaveBeenCalled();
      expect(mockTransaction.finish).toHaveBeenCalled();
    });
  });

  describe('metadata completeness', () => {
    it('should include all available metadata fields', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockTransaction = {
        setTag: jest.fn(),
        setStatus: jest.fn(),
        setData: jest.fn(),
        finish: jest.fn(),
      };

      sentryService.startTransaction.mockReturnValue(mockTransaction as any);

      const requestId = 'req-complete-meta-perf';
      const method = 'PUT';
      const url = '/api/users/123';
      const ip = '192.168.1.20';
      const userAgent = 'CompleteClient/1.0';
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
        },
        authUser: { _id: userId, merchantId },
      };

      const mockResponse = {
        statusCode: 201,
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => mockResponse),
        })),
      } as any;

      const testData = { updated: true };
      const mockCallHandler = {
        handle: jest.fn(() => of(testData)),
      };

      interceptor.intercept(mockContext, mockCallHandler);

      const transactionCall = sentryService.startTransaction.mock.calls[0];

      expect(transactionCall[0]).toBe(`${method} ${url}`);
      expect(transactionCall[1]).toBe('http.server');
      expect(transactionCall[2]).toEqual(
        expect.objectContaining({
          userId,
          merchantId,
          requestId,
          url,
          method,
          ip,
          userAgent,
        }),
      );
    });

    it('should handle missing optional fields gracefully', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockTransaction = {
        setTag: jest.fn(),
        setStatus: jest.fn(),
        setData: jest.fn(),
        finish: jest.fn(),
      };

      sentryService.startTransaction.mockReturnValue(mockTransaction as any);

      const requestId = 'req-minimal-meta-perf';
      const method = 'GET';
      const url = '/api/public';
      const ip = '10.0.0.3';

      const mockRequest = {
        requestId,
        method,
        url,
        originalUrl: url,
        ip,
        headers: {
          // No user-agent
        },
        // No user data
      };

      const mockResponse = {
        statusCode: 200,
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => mockResponse),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('minimal data')),
      };

      interceptor.intercept(mockContext, mockCallHandler);

      const transactionCall = sentryService.startTransaction.mock.calls[0];

      expect(transactionCall[2]).toEqual(
        expect.objectContaining({
          requestId,
          url,
          method,
          ip,
        }),
      );

      expect(transactionCall[2]).not.toHaveProperty('userId');
      expect(transactionCall[2]).not.toHaveProperty('merchantId');
      expect(transactionCall[2]).not.toHaveProperty('userAgent');
    });
  });
});
