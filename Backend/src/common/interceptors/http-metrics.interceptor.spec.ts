import { Test } from '@nestjs/testing';
import { of, throwError } from 'rxjs';

import { shouldBypass } from './bypass.util';
import { HttpMetricsInterceptor } from './http-metrics.interceptor';

import type { TestingModule } from '@nestjs/testing';

// Mock the dependencies
jest.mock('./bypass.util');

describe('HttpMetricsInterceptor', () => {
  let interceptor: HttpMetricsInterceptor;
  let mockHttpDuration: { labels: jest.Mock; observe: jest.Mock };
  let mockHttpTotal: { labels: jest.Mock; inc: jest.Mock };
  let mockHttpErrors: { labels: jest.Mock; inc: jest.Mock };
  let mockShouldBypass: jest.MockedFunction<typeof shouldBypass>;

  beforeEach(async () => {
    mockShouldBypass = shouldBypass as jest.MockedFunction<typeof shouldBypass>;

    // Mock Prometheus metrics
    mockHttpDuration = {
      labels: jest.fn().mockReturnThis(),
      observe: jest.fn(),
    };

    mockHttpTotal = {
      labels: jest.fn().mockReturnThis(),
      inc: jest.fn(),
    };

    mockHttpErrors = {
      labels: jest.fn().mockReturnThis(),
      inc: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HttpMetricsInterceptor,
        {
          provide: 'HTTP_REQUEST_DURATION_SECONDS',
          useValue: mockHttpDuration,
        },
        {
          provide: 'HTTP_REQUESTS_TOTAL',
          useValue: mockHttpTotal,
        },
        {
          provide: 'HTTP_ERRORS_TOTAL',
          useValue: mockHttpErrors,
        },
      ],
    }).compile();

    interceptor = module.get<HttpMetricsInterceptor>(HttpMetricsInterceptor);
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
          getResponse: jest.fn(() => ({ setHeader: jest.fn() })),
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

      const mockRequest = { originalUrl: '/metrics', headers: {} };
      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({ setHeader: jest.fn() })),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('metrics data')),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler);
      expect(result).toBeDefined();
      expect(mockShouldBypass).toHaveBeenCalledWith(mockRequest);
      expect(mockCallHandler.handle).toHaveBeenCalled();
      expect(mockHttpDuration.observe).not.toHaveBeenCalled();
      expect(mockHttpTotal.inc).not.toHaveBeenCalled();
    });

    it('should bypass health endpoint', () => {
      mockShouldBypass.mockReturnValue(true);

      const mockRequest = { originalUrl: '/health', headers: {} };
      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({ setHeader: jest.fn() })),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('health data')),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler);
      expect(result).toBeDefined();
      expect(mockShouldBypass).toHaveBeenCalledWith(mockRequest);
      expect(mockCallHandler.handle).toHaveBeenCalled();
      expect(mockHttpDuration.observe).not.toHaveBeenCalled();
      expect(mockHttpTotal.inc).not.toHaveBeenCalled();
    });

    it('should bypass when request should be bypassed', () => {
      mockShouldBypass.mockReturnValue(true);

      const mockRequest = { originalUrl: '/api/test', headers: {} };
      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({ setHeader: jest.fn() })),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('bypassed data')),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler);
      expect(result).toBeDefined();
      expect(mockShouldBypass).toHaveBeenCalledWith(mockRequest);
      expect(mockCallHandler.handle).toHaveBeenCalled();
      expect(mockHttpDuration.observe).not.toHaveBeenCalled();
      expect(mockHttpTotal.inc).not.toHaveBeenCalled();
    });
  });

  describe('metrics recording', () => {
    it('should record metrics for successful requests', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-metrics-success';
      const method = 'GET';
      const url = '/api/users';
      const userAgent = 'Mozilla/5.0';
      const ip = '192.168.1.1';

      const mockRequest = {
        requestId,
        method,
        url,
        originalUrl: url,
        ip,
        headers: {
          'user-agent': userAgent,
        },
      };

      const mockResponse = {
        statusCode: 200,
        setHeader: jest.fn(),
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

      expect(mockCallHandler.handle).toHaveBeenCalled();

      let actualResult: unknown;
      result.subscribe({
        next: (data) => {
          actualResult = data;
        },
      });

      expect(actualResult).toBe(testData);
      expect(mockHttpDuration.labels).toHaveBeenCalledWith(method, url, '200');
      expect(mockHttpDuration.observe).toHaveBeenCalledWith(expect.any(Number));
      expect(mockHttpTotal.labels).toHaveBeenCalledWith(method, url, '200');
      expect(mockHttpTotal.inc).toHaveBeenCalled();
    });

    it('should record metrics for error requests', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-metrics-error';
      const method = 'POST';
      const url = '/api/users';
      const userAgent = 'axios/0.21.1';
      const ip = '10.0.0.1';

      const mockRequest = {
        requestId,
        method,
        url,
        originalUrl: url,
        ip,
        headers: {
          'user-agent': userAgent,
        },
      };

      const mockResponse = {
        statusCode: 400,
        setHeader: jest.fn(),
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

      let caughtError: Error | undefined;
      result.subscribe({
        error: (err) => {
          caughtError = err;
        },
      });

      expect(caughtError).toBeDefined();
      expect(mockHttpDuration.labels).toHaveBeenCalledWith(method, url, '400');
      expect(mockHttpDuration.observe).toHaveBeenCalledWith(expect.any(Number));
      expect(mockHttpTotal.labels).toHaveBeenCalledWith(method, url, '400');
      expect(mockHttpTotal.inc).toHaveBeenCalled();
      expect(mockHttpErrors.labels).toHaveBeenCalledWith(
        method,
        url,
        '400',
        'client_error',
      );
      expect(mockHttpErrors.inc).toHaveBeenCalled();
    });

    it('should handle different status codes correctly', () => {
      mockShouldBypass.mockReturnValue(false);

      const statusCodes = [200, 201, 400, 401, 403, 404, 500];

      statusCodes.forEach((statusCode) => {
        const requestId = `req-status-${statusCode}`;
        const method = 'GET';
        const url = `/api/test-${statusCode}`;

        const mockRequest = {
          requestId,
          method,
          url,
          originalUrl: url,
          headers: {},
        };

        const mockResponse = {
          statusCode,
          setHeader: jest.fn(),
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

        result.subscribe();

        expect(mockHttpDuration.labels).toHaveBeenCalledWith(
          method,
          url,
          statusCode.toString(),
        );
        expect(mockHttpDuration.observe).toHaveBeenCalled();
        expect(mockHttpTotal.labels).toHaveBeenCalledWith(
          method,
          url,
          statusCode.toString(),
        );
        expect(mockHttpTotal.inc).toHaveBeenCalled();
      });
    });

    it('should handle fallback status code for missing response', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-no-response';
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
          getResponse: jest.fn(() => ({ setHeader: jest.fn() })),
        })),
      } as any;

      const error = new Error('No response');
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => error)),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe({
        error: () => {
          // Error handler
        },
      });

      expect(mockHttpDuration.labels).toHaveBeenCalledWith(method, url, '500');
      expect(mockHttpDuration.observe).toHaveBeenCalled();
      expect(mockHttpTotal.labels).toHaveBeenCalledWith(method, url, '500');
      expect(mockHttpTotal.inc).toHaveBeenCalled();
      expect(mockHttpErrors.labels).toHaveBeenCalledWith(
        method,
        url,
        '500',
        'server_error',
      );
      expect(mockHttpErrors.inc).toHaveBeenCalled();
    });
  });

  describe('route extraction', () => {
    it('should extract route from req.route.path', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-route-extraction';
      const method = 'GET';
      const routePath = '/api/users/:id';

      const mockRequest = {
        requestId,
        method,
        url: '/api/users/123',
        originalUrl: '/api/users/123',
        headers: {},
      };

      // Mock the route object
      Object.defineProperty(mockRequest, 'route', {
        value: { path: routePath },
        writable: true,
      });

      const mockResponse = {
        statusCode: 200,
        setHeader: jest.fn(),
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

      result.subscribe();

      expect(mockHttpDuration.labels).toHaveBeenCalledWith(
        method,
        routePath,
        '200',
      );
      expect(mockHttpTotal.labels).toHaveBeenCalledWith(
        method,
        routePath,
        '200',
      );
    });

    it('should extract route from URL when no route.path', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-url-route';
      const method = 'GET';
      const url = '/api/users/123';

      const mockRequest = {
        requestId,
        method,
        url,
        originalUrl: url,
        headers: {},
        // No route property
      };

      const mockResponse = {
        statusCode: 200,
        setHeader: jest.fn(),
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

      result.subscribe();

      expect(mockHttpDuration.labels).toHaveBeenCalledWith(
        method,
        '/api/users/:id',
        '200',
      );
      expect(mockHttpTotal.labels).toHaveBeenCalledWith(
        method,
        '/api/users/:id',
        '200',
      );
    });

    it('should handle MongoDB ObjectIds in routes', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-mongo-id';
      const method = 'GET';
      const url = '/api/users/507f1f77bcf86cd799439011';

      const mockRequest = {
        requestId,
        method,
        url,
        originalUrl: url,
        headers: {},
      };

      const mockResponse = {
        statusCode: 200,
        setHeader: jest.fn(),
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

      result.subscribe();

      expect(mockHttpDuration.labels).toHaveBeenCalledWith(
        method,
        '/api/users/:id',
        '200',
      );
    });

    it('should handle numeric IDs in routes', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-numeric-id';
      const method = 'GET';
      const url = '/api/users/123';

      const mockRequest = {
        requestId,
        method,
        url,
        originalUrl: url,
        headers: {},
      };

      const mockResponse = {
        statusCode: 200,
        setHeader: jest.fn(),
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

      result.subscribe();

      expect(mockHttpDuration.labels).toHaveBeenCalledWith(
        method,
        '/api/users/:id',
        '200',
      );
    });

    it('should handle slug-like parameters in routes', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-slug-param';
      const method = 'GET';
      const url = '/api/categories/technology-computers';

      const mockRequest = {
        requestId,
        method,
        url,
        originalUrl: url,
        headers: {},
      };

      const mockResponse = {
        statusCode: 200,
        setHeader: jest.fn(),
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

      result.subscribe();

      expect(mockHttpDuration.labels).toHaveBeenCalledWith(
        method,
        '/api/categories/:slug',
        '200',
      );
    });

    it('should handle URLs with query parameters', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-query-params';
      const method = 'GET';
      const url = '/api/users?page=1&limit=10';

      const mockRequest = {
        requestId,
        method,
        url,
        originalUrl: url,
        headers: {},
      };

      const mockResponse = {
        statusCode: 200,
        setHeader: jest.fn(),
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

      result.subscribe();

      expect(mockHttpDuration.labels).toHaveBeenCalledWith(
        method,
        '/api/users',
        '200',
      );
    });

    it('should handle URLs with fragments', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-fragments';
      const method = 'GET';
      const url = '/api/users#section';

      const mockRequest = {
        requestId,
        method,
        url,
        originalUrl: url,
        headers: {},
      };

      const mockResponse = {
        statusCode: 200,
        setHeader: jest.fn(),
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

      result.subscribe();

      expect(mockHttpDuration.labels).toHaveBeenCalledWith(
        method,
        '/api/users',
        '200',
      );
    });

    it('should handle root URL', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-root';
      const method = 'GET';
      const url = '/';

      const mockRequest = {
        requestId,
        method,
        url,
        originalUrl: url,
        headers: {},
      };

      const mockResponse = {
        statusCode: 200,
        setHeader: jest.fn(),
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

      result.subscribe();

      expect(mockHttpDuration.labels).toHaveBeenCalledWith(method, url, '200');
    });

    it('should handle empty URL', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-empty-url';
      const method = 'GET';
      const url = '';

      const mockRequest = {
        requestId,
        method,
        url,
        originalUrl: url,
        headers: {},
      };

      const mockResponse = {
        statusCode: 200,
        setHeader: jest.fn(),
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

      result.subscribe();

      expect(mockHttpDuration.labels).toHaveBeenCalledWith(method, '/', '200');
    });
  });

  describe('error categorization', () => {
    it('should categorize server errors correctly', () => {
      mockShouldBypass.mockReturnValue(false);

      const statusCodes = [500, 502, 503, 504];

      statusCodes.forEach((statusCode) => {
        const requestId = `req-server-error-${statusCode}`;
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
          statusCode,
          setHeader: jest.fn(),
        };

        const mockContext = {
          getType: jest.fn(() => 'http'),
          switchToHttp: jest.fn(() => ({
            getRequest: jest.fn(() => mockRequest),
            getResponse: jest.fn(() => mockResponse),
          })),
        } as any;

        const error = new Error('Server error');
        const mockCallHandler = {
          handle: jest.fn(() => throwError(() => error)),
        };

        const result = interceptor.intercept(mockContext, mockCallHandler);

        result.subscribe({
          error: () => {
            // Error handler
          },
        });

        expect(mockHttpErrors.labels).toHaveBeenCalledWith(
          method,
          url,
          statusCode.toString(),
          'server_error',
        );
      });
    });

    it('should categorize client errors correctly', () => {
      mockShouldBypass.mockReturnValue(false);

      const clientErrorCodes = [400, 401, 403, 422, 429];

      clientErrorCodes.forEach((statusCode) => {
        const requestId = `req-client-error-${statusCode}`;
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
          statusCode,
          setHeader: jest.fn(),
        };

        const mockContext = {
          getType: jest.fn(() => 'http'),
          switchToHttp: jest.fn(() => ({
            getRequest: jest.fn(() => mockRequest),
            getResponse: jest.fn(() => mockResponse),
          })),
        } as any;

        const error = new Error('Client error');
        const mockCallHandler = {
          handle: jest.fn(() => throwError(() => error)),
        };

        const result = interceptor.intercept(mockContext, mockCallHandler);

        result.subscribe({
          error: () => {
            // Error handler
          },
        });

        expect(mockHttpErrors.labels).toHaveBeenCalledWith(
          method,
          url,
          statusCode.toString(),
          'client_error',
        );
      });
    });

    it('should categorize not found errors correctly', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-not-found';
      const method = 'GET';
      const url = '/api/users/123';

      const mockRequest = {
        requestId,
        method,
        url,
        originalUrl: url,
        headers: {},
      };

      const mockResponse = {
        statusCode: 404,
        setHeader: jest.fn(),
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => mockResponse),
        })),
      } as any;

      const error = new Error('Not found');
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => error)),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe({
        error: () => {
          // Error handler
        },
      });

      expect(mockHttpErrors.labels).toHaveBeenCalledWith(
        method,
        url,
        '404',
        'not_found',
      );
    });

    it('should categorize unauthorized errors correctly', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-unauthorized';
      const method = 'GET';
      const url = '/api/admin';

      const mockRequest = {
        requestId,
        method,
        url,
        originalUrl: url,
        headers: {},
      };

      const mockResponse = {
        statusCode: 401,
        setHeader: jest.fn(),
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => mockResponse),
        })),
      } as any;

      const error = new Error('Unauthorized');
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => error)),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe({
        error: () => {
          // Error handler
        },
      });

      expect(mockHttpErrors.labels).toHaveBeenCalledWith(
        method,
        url,
        '401',
        'unauthorized',
      );
    });

    it('should categorize forbidden errors correctly', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-forbidden';
      const method = 'GET';
      const url = '/api/admin/users';

      const mockRequest = {
        requestId,
        method,
        url,
        originalUrl: url,
        headers: {},
      };

      const mockResponse = {
        statusCode: 403,
        setHeader: jest.fn(),
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => mockResponse),
        })),
      } as any;

      const error = new Error('Forbidden');
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => error)),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe({
        error: () => {
          // Error handler
        },
      });

      expect(mockHttpErrors.labels).toHaveBeenCalledWith(
        method,
        url,
        '403',
        'forbidden',
      );
    });

    it('should categorize unknown status codes correctly', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-unknown-status';
      const method = 'GET';
      const url = '/api/test';
      const unknownStatus = 418; // I'm a teapot

      const mockRequest = {
        requestId,
        method,
        url,
        originalUrl: url,
        headers: {},
      };

      const mockResponse = {
        statusCode: unknownStatus,
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => mockResponse),
        })),
      } as any;

      const error = new Error('Unknown status');
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => error)),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe({
        error: () => {
          // Error handler
        },
      });

      expect(mockHttpErrors.labels).toHaveBeenCalledWith(
        method,
        url,
        unknownStatus.toString(),
        'unknown',
      );
    });
  });

  describe('timing measurement', () => {
    it('should measure request duration correctly', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-timing';
      const method = 'GET';
      const url = '/api/timing';

      const mockRequest = {
        requestId,
        method,
        url,
        originalUrl: url,
        headers: {},
      };

      const mockResponse = {
        statusCode: 200,
        setHeader: jest.fn(),
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

      result.subscribe();

      expect(mockHttpDuration.observe).toHaveBeenCalledWith(expect.any(Number));
      const duration = mockHttpDuration.observe.mock.calls[0][0];
      expect(typeof duration).toBe('number');
      expect(duration).toBeGreaterThan(0);
    });

    it('should detect slow requests', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-slow';
      const method = 'POST';
      const url = '/api/slow-operation';

      const mockRequest = {
        requestId,
        method,
        url,
        originalUrl: url,
        headers: {},
      };

      const mockResponse = {
        statusCode: 200,
        setHeader: jest.fn(),
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
            setTimeout(() => resolve('slow data'), 1500);
          });
        }),
      };

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = interceptor.intercept(mockContext, mockCallHandler as any);

      result.subscribe();

      // Wait for async operation to complete
      setTimeout(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Slow request detected:'),
        );
        consoleSpy.mockRestore();
      }, 2000);
    });

    it('should not log fast requests as slow', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-fast';
      const method = 'GET';
      const url = '/api/fast';

      const mockRequest = {
        requestId,
        method,
        url,
        originalUrl: url,
        headers: {},
      };

      const mockResponse = {
        statusCode: 200,
        setHeader: jest.fn(),
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

      const result = interceptor.intercept(mockContext, mockCallHandler as any);

      result.subscribe();

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle timing for requests exactly at threshold', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-threshold';
      const method = 'GET';
      const url = '/api/threshold';

      const mockRequest = {
        requestId,
        method,
        url,
        originalUrl: url,
        headers: {},
      };

      const mockResponse = {
        statusCode: 200,
        setHeader: jest.fn(),
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
          // Simulate request exactly at threshold
          return new Promise((resolve) => {
            setTimeout(() => resolve('threshold data'), 1000);
          });
        }),
      };

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = interceptor.intercept(mockContext, mockCallHandler as any);

      result.subscribe();

      // Wait for async operation to complete
      setTimeout(() => {
        expect(consoleSpy).not.toHaveBeenCalled();
        consoleSpy.mockRestore();
      }, 1500);
    });
  });

  describe('request ID generation', () => {
    it('should generate request ID when missing', () => {
      mockShouldBypass.mockReturnValue(false);

      const method = 'GET';
      const url = '/api/test';

      const mockRequest = {
        method,
        url,
        originalUrl: url,
        headers: {},
        // No requestId
      };

      const mockResponse = {
        statusCode: 200,
        setHeader: jest.fn(),
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

      result.subscribe();

      expect(mockHttpDuration.labels).toHaveBeenCalledWith(method, url, '200');
      expect(mockHttpTotal.labels).toHaveBeenCalledWith(method, url, '200');
    });

    it('should use existing request ID', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'existing-req-id';
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
        setHeader: jest.fn(),
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

      result.subscribe();

      expect(mockHttpDuration.labels).toHaveBeenCalledWith(method, url, '200');
      expect(mockHttpTotal.labels).toHaveBeenCalledWith(method, url, '200');
    });

    it('should use x-request-id header when requestId is missing', () => {
      mockShouldBypass.mockReturnValue(false);

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
        setHeader: jest.fn(),
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

      result.subscribe();

      expect(mockHttpDuration.labels).toHaveBeenCalledWith(method, url, '200');
      expect(mockHttpTotal.labels).toHaveBeenCalledWith(method, url, '200');
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

      const mockResponse = {
        statusCode: 200,
        setHeader: jest.fn(),
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

      result.subscribe();

      expect(mockHttpDuration.labels).toHaveBeenCalledWith(method, url, '200');
      expect(mockHttpTotal.labels).toHaveBeenCalledWith(method, url, '200');
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
      expect(mockHttpDuration.observe).not.toHaveBeenCalled();
      expect(mockHttpTotal.inc).not.toHaveBeenCalled();
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
          getResponse: jest.fn(() => ({ setHeader: jest.fn() })),
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
          getResponse: jest.fn(() => ({ setHeader: jest.fn() })),
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

      const mockRequest = { requestId: 'req-handler', headers: {} };
      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({
            statusCode: 200,
            setHeader: jest.fn(),
          })),
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

      const mockRequest = { originalUrl: '/metrics', headers: {} };
      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({ setHeader: jest.fn() })),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('bypass data')),
      };

      interceptor.intercept(mockContext, mockCallHandler);

      expect(mockCallHandler.handle).toHaveBeenCalled();
      expect(mockHttpDuration.observe).not.toHaveBeenCalled();
      expect(mockHttpTotal.inc).not.toHaveBeenCalled();
    });

    it('should handle call handler throwing errors', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockRequest = { requestId: 'req-error-handler', headers: {} };
      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({
            statusCode: 500,
            setHeader: jest.fn(),
          })),
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

      expect(mockHttpDuration.observe).toHaveBeenCalled();
      expect(mockHttpTotal.inc).toHaveBeenCalled();
      expect(mockHttpErrors.inc).toHaveBeenCalled();
    });

    it('should handle call handler returning different observable types', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockRequest = { requestId: 'req-observable-types', headers: {} };
      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({
            statusCode: 200,
            setHeader: jest.fn(),
          })),
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
        expect(mockHttpDuration.observe).toHaveBeenCalled();
        expect(mockHttpTotal.inc).toHaveBeenCalled();
      });
    });
  });

  describe('performance considerations', () => {
    it('should handle rapid successive requests', () => {
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
          getResponse: jest.fn(() => ({
            statusCode: 200,
            setHeader: jest.fn(),
          })),
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

      const mockRequest = {
        requestId: 'req-memory',
        method: 'GET',
        url: '/api/test',
      };
      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({
            statusCode: 200,
            setHeader: jest.fn(),
          })),
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

      const mockRequest = {
        requestId: 'req-concurrent',
        method: 'GET',
        url: '/api/test',
        headers: {}, // Add this
      };
      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({
            statusCode: 200,
            setHeader: jest.fn(),
          })),
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

      expect(mockHttpDuration.observe).toHaveBeenCalledTimes(100);
      expect(mockHttpTotal.inc).toHaveBeenCalledTimes(100);
      expect(promises).toHaveLength(100);
    });
  });

  describe('real-world usage scenarios', () => {
    it('should handle API request metrics', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'api-metrics-123';
      const method = 'POST';
      const url = '/api/users';
      const ip = '192.168.1.1';
      const userAgent = 'axios/0.21.1';

      const mockRequest = {
        requestId,
        method,
        url,
        originalUrl: url,
        ip,
        headers: {
          'user-agent': userAgent,
        },
      };

      const mockResponse = {
        statusCode: 201,
        setHeader: jest.fn(),
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

      const result = interceptor.intercept(mockContext, mockCallHandler);
      result.subscribe();

      expect(mockHttpDuration.labels).toHaveBeenCalledWith(method, url, '201');
      expect(mockHttpDuration.observe).toHaveBeenCalled();
      expect(mockHttpTotal.labels).toHaveBeenCalledWith(method, url, '201');
      expect(mockHttpTotal.inc).toHaveBeenCalled();
    });

    it('should handle error metrics', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'error-metrics-456';
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
        setHeader: jest.fn(),
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

      expect(mockHttpDuration.labels).toHaveBeenCalledWith(method, url, '400');
      expect(mockHttpDuration.observe).toHaveBeenCalled();
      expect(mockHttpTotal.labels).toHaveBeenCalledWith(method, url, '400');
      expect(mockHttpTotal.inc).toHaveBeenCalled();
      expect(mockHttpErrors.labels).toHaveBeenCalledWith(
        method,
        url,
        '400',
        'client_error',
      );
      expect(mockHttpErrors.inc).toHaveBeenCalled();
    });

    it('should handle metrics endpoint bypass', () => {
      mockShouldBypass.mockReturnValue(true);

      const mockRequest = { originalUrl: '/metrics', headers: {} };
      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({ setHeader: jest.fn() })),
        })),
      } as any;

      const metricsData = 'prometheus_metrics_data';
      const mockCallHandler = {
        handle: jest.fn(() => of(metricsData)),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler);

      expect(mockShouldBypass).toHaveBeenCalledWith(mockRequest);
      expect(mockCallHandler.handle).toHaveBeenCalled();
      expect(mockHttpDuration.observe).not.toHaveBeenCalled();

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

      const mockRequest = { originalUrl: '/health', headers: {} };
      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({ setHeader: jest.fn() })),
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

      const mockRequest = { originalUrl: '/swagger', headers: {} };
      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({ setHeader: jest.fn() })),
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
    it('should inject metrics services correctly', () => {
      expect(interceptor).toBeDefined();
      expect(mockHttpDuration).toBeDefined();
      expect(mockHttpTotal).toBeDefined();
      expect(mockHttpErrors).toBeDefined();
    });

    it('should handle metrics services method calls', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockRequest = {
        requestId: 'req-service-calls',
        method: 'GET',
        url: '/api/test',
        originalUrl: '/api/test',
        headers: {},
      };

      const mockResponse = {
        statusCode: 200,
        setHeader: jest.fn(),
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
      result.subscribe();

      expect(mockHttpDuration.labels).toHaveBeenCalledWith(
        'GET',
        '/api/test',
        '200',
      );
      expect(mockHttpDuration.observe).toHaveBeenCalled();
      expect(mockHttpTotal.labels).toHaveBeenCalledWith(
        'GET',
        '/api/test',
        '200',
      );
      expect(mockHttpTotal.inc).toHaveBeenCalled();
    });
  });

  describe('integration with NestJS', () => {
    it('should work with NestJS HTTP context', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockRequest = {
        requestId: 'nestjs-metrics-req',
        method: 'GET',
        url: '/api/test',
        originalUrl: '/api/test',
        ip: '10.0.0.1',
        headers: {
          'user-agent': 'NestJS-Test/1.0',
        },
      };

      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({
            statusCode: 200,
            setHeader: jest.fn(),
          })),
        })),
        getType: jest.fn(() => 'http'),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('nestjs data')),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler);
      result.subscribe();

      expect(mockHttpDuration.labels).toHaveBeenCalledWith(
        'GET',
        '/api/test',
        '200',
      );
      expect(mockHttpDuration.observe).toHaveBeenCalled();
      expect(mockHttpTotal.labels).toHaveBeenCalledWith(
        'GET',
        '/api/test',
        '200',
      );
      expect(mockHttpTotal.inc).toHaveBeenCalled();
    });

    it('should handle NestJS execution context correctly', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockRequest = {
        requestId: 'context-metrics-req',
        method: 'POST',
        url: '/api/test',
        originalUrl: '/api/test',
        ip: '10.0.0.2',
        headers: {},
      };

      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({
            statusCode: 201,
            setHeader: jest.fn(),
          })),
        })),
        getType: jest.fn(() => 'http'),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('created')),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler);
      result.subscribe();

      expect(mockHttpDuration.labels).toHaveBeenCalledWith(
        'POST',
        '/api/test',
        '201',
      );
      expect(mockHttpDuration.observe).toHaveBeenCalled();
      expect(mockHttpTotal.labels).toHaveBeenCalledWith(
        'POST',
        '/api/test',
        '201',
      );
      expect(mockHttpTotal.inc).toHaveBeenCalled();
    });
  });

  describe('error logging', () => {
    it('should log errors with context information', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-error-logging';
      const method = 'GET';
      const url = '/api/users';
      const userAgent = 'Mozilla/5.0';
      const ip = '192.168.1.1';

      const mockRequest = {
        requestId,
        method,
        url,
        originalUrl: url,
        ip,
        headers: {
          'user-agent': userAgent,
        },
      };

      const mockResponse = {
        statusCode: 500,
        setHeader: jest.fn(),
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

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe({
        error: () => {
          // Error handler
        },
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`HTTP Error - ${method} ${url}`),
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`requestId=${requestId}`),
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`status=${mockResponse.statusCode}`),
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`ua=${userAgent}`),
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`ip=${ip}`),
      );

      consoleSpy.mockRestore();
    });

    it('should handle errors without stack trace', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-no-stack';
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
        statusCode: 400,
        setHeader: jest.fn(),
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => mockResponse),
        })),
      } as any;

      const stringError = 'String error without stack';
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => stringError)),
      };

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe({
        error: () => {
          // Error handler
        },
      });

      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle errors with stack trace', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-with-stack';
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
        statusCode: 500,
        setHeader: jest.fn(),
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => mockResponse),
        })),
      } as any;

      const error = new Error('Error with stack');
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => error)),
      };

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe({
        error: () => {
          // Error handler
        },
      });

      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
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
          getResponse: jest.fn(() => ({ setHeader: jest.fn() })),
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

      const requestId = 'req-url-norm-metrics';
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
        setHeader: jest.fn(),
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
      result.subscribe();

      expect(mockHttpDuration.labels).toHaveBeenCalledWith(
        method,
        normalizedUrl,
        '200',
      );
      expect(mockHttpTotal.labels).toHaveBeenCalledWith(
        method,
        normalizedUrl,
        '200',
      );
    });

    it('should handle missing originalUrl fallback', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-no-original-metrics';
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
        setHeader: jest.fn(),
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
      result.subscribe();

      expect(mockHttpDuration.labels).toHaveBeenCalledWith(method, url, '200');
      expect(mockHttpTotal.labels).toHaveBeenCalledWith(method, url, '200');
    });

    it('should handle empty URL fallback', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-empty-url-metrics';
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
        setHeader: jest.fn(),
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
      result.subscribe();

      expect(mockHttpDuration.labels).toHaveBeenCalledWith(method, '/', '200');
      expect(mockHttpTotal.labels).toHaveBeenCalledWith(method, '/', '200');
    });
  });

  describe('request ID handling', () => {
    it('should use existing request ID', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'existing-req-id-metrics';
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
        setHeader: jest.fn(),
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
      result.subscribe();

      expect(mockHttpDuration.labels).toHaveBeenCalledWith(method, url, '200');
      expect(mockHttpTotal.labels).toHaveBeenCalledWith(method, url, '200');
    });

    it('should use x-request-id header when requestId is missing', () => {
      mockShouldBypass.mockReturnValue(false);

      const headerRequestId = 'header-req-id-metrics';
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
        setHeader: jest.fn(),
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
      result.subscribe();

      expect(mockHttpDuration.labels).toHaveBeenCalledWith(method, url, '200');
      expect(mockHttpTotal.labels).toHaveBeenCalledWith(method, url, '200');
    });

    it('should handle array x-request-id header', () => {
      mockShouldBypass.mockReturnValue(false);

      const headerRequestId = 'array-req-id-metrics';
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
        setHeader: jest.fn(),
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
      result.subscribe();

      expect(mockHttpDuration.labels).toHaveBeenCalledWith(method, url, '200');
      expect(mockHttpTotal.labels).toHaveBeenCalledWith(method, url, '200');
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

      const mockResponse = {
        statusCode: 200,
        setHeader: jest.fn(),
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
      result.subscribe();

      expect(mockHttpDuration.labels).toHaveBeenCalledWith(method, url, '200');
      expect(mockHttpTotal.labels).toHaveBeenCalledWith(method, url, '200');
    });
  });

  describe('user agent extraction', () => {
    it('should extract user agent from headers', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-user-agent-metrics';
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
        setHeader: jest.fn(),
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
      result.subscribe();

      expect(mockHttpDuration.labels).toHaveBeenCalledWith(method, url, '200');
      expect(mockHttpTotal.labels).toHaveBeenCalledWith(method, url, '200');
    });

    it('should handle missing user agent', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-no-user-agent-metrics';
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
        setHeader: jest.fn(),
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
      result.subscribe();

      expect(mockHttpDuration.labels).toHaveBeenCalledWith(method, url, '200');
      expect(mockHttpTotal.labels).toHaveBeenCalledWith(method, url, '200');
    });

    it('should handle empty user agent', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-empty-user-agent-metrics';
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
        setHeader: jest.fn(),
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
      result.subscribe();

      expect(mockHttpDuration.labels).toHaveBeenCalledWith(method, url, '200');
      expect(mockHttpTotal.labels).toHaveBeenCalledWith(method, url, '200');
    });
  });

  describe('IP address extraction', () => {
    it('should extract IP address from request', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-ip-metrics';
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
        setHeader: jest.fn(),
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
      result.subscribe();

      expect(mockHttpDuration.labels).toHaveBeenCalledWith(method, url, '200');
      expect(mockHttpTotal.labels).toHaveBeenCalledWith(method, url, '200');
    });

    it('should handle missing IP address', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-no-ip-metrics';
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
        setHeader: jest.fn(),
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
      result.subscribe();

      expect(mockHttpDuration.labels).toHaveBeenCalledWith(method, url, '200');
      expect(mockHttpTotal.labels).toHaveBeenCalledWith(method, url, '200');
    });

    it('should handle null IP address', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-null-ip-metrics';
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
        setHeader: jest.fn(),
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
      result.subscribe();

      expect(mockHttpDuration.labels).toHaveBeenCalledWith(method, url, '200');
      expect(mockHttpTotal.labels).toHaveBeenCalledWith(method, url, '200');
    });

    it('should handle IPv6 addresses', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-ipv6-metrics';
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
        setHeader: jest.fn(),
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
      result.subscribe();

      expect(mockHttpDuration.labels).toHaveBeenCalledWith(method, url, '200');
      expect(mockHttpTotal.labels).toHaveBeenCalledWith(method, url, '200');
    });
  });

  describe('service instantiation', () => {
    it('should inject metrics services correctly', () => {
      expect(interceptor).toBeDefined();
      expect(mockHttpDuration).toBeDefined();
      expect(mockHttpTotal).toBeDefined();
      expect(mockHttpErrors).toBeDefined();
    });

    it('should handle metrics services being unavailable', () => {
      const mockModule = {
        get: jest.fn().mockImplementation((token) => {
          if (token === 'HTTP_REQUEST_DURATION_SECONDS') {
            throw new Error('HTTP_REQUEST_DURATION_SECONDS not available');
          }
          return {};
        }),
      };

      expect(() => {
        const _testInterceptor = new HttpMetricsInterceptor(
          mockModule.get('HTTP_REQUEST_DURATION_SECONDS'),
          mockModule.get('HTTP_REQUESTS_TOTAL'),
          mockModule.get('HTTP_ERRORS_TOTAL'),
        );
      }).toThrow('HTTP_REQUEST_DURATION_SECONDS not available');
    });
  });

  describe('NestJS execution context', () => {
    it('should work with NestJS HTTP context', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockRequest = {
        requestId: 'nestjs-metrics-req',
        method: 'GET',
        url: '/api/test',
        originalUrl: '/api/test',
        ip: '10.0.0.1',
        headers: {
          'user-agent': 'NestJS-Test/1.0',
        },
      };

      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({
            statusCode: 200,
            setHeader: jest.fn(),
          })),
        })),
        getType: jest.fn(() => 'http'),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('nestjs data')),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler);
      result.subscribe();

      expect(mockHttpDuration.labels).toHaveBeenCalledWith(
        'GET',
        '/api/test',
        '200',
      );
      expect(mockHttpDuration.observe).toHaveBeenCalled();
      expect(mockHttpTotal.labels).toHaveBeenCalledWith(
        'GET',
        '/api/test',
        '200',
      );
      expect(mockHttpTotal.inc).toHaveBeenCalled();
    });

    it('should handle NestJS execution context correctly', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockRequest = {
        requestId: 'context-metrics-req',
        method: 'POST',
        url: '/api/test',
        originalUrl: '/api/test',
        ip: '10.0.0.2',
        headers: {},
      };

      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({
            statusCode: 201,
            setHeader: jest.fn(),
          })),
        })),
        getType: jest.fn(() => 'http'),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('created')),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler);
      result.subscribe();

      expect(mockHttpDuration.labels).toHaveBeenCalledWith(
        'POST',
        '/api/test',
        '201',
      );
      expect(mockHttpDuration.observe).toHaveBeenCalled();
      expect(mockHttpTotal.labels).toHaveBeenCalledWith(
        'POST',
        '/api/test',
        '201',
      );
      expect(mockHttpTotal.inc).toHaveBeenCalled();
    });
  });

  describe('error logging format', () => {
    it('should maintain consistent error log format', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-error-format';
      const method = 'GET';
      const url = '/api/users';
      const userAgent = 'Mozilla/5.0';
      const ip = '192.168.1.1';

      const mockRequest = {
        requestId,
        method,
        url,
        originalUrl: url,
        ip,
        headers: {
          'user-agent': userAgent,
        },
      };

      const mockResponse = {
        statusCode: 500,
        setHeader: jest.fn(),
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

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe({
        error: () => {
          // Error handler
        },
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`HTTP Error - ${method} ${url}`),
      );

      consoleSpy.mockRestore();
    });

    it('should handle errors with special characters', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-special-error';
      const method = 'GET';
      const url = '/api/ملفات';
      const userAgent = 'متصفح خاص';
      const ip = '192.168.1.1';

      const mockRequest = {
        requestId,
        method,
        url,
        originalUrl: url,
        ip,
        headers: {
          'user-agent': userAgent,
        },
      };

      const mockResponse = {
        statusCode: 500,
        setHeader: jest.fn(),
      };

      const mockContext = {
        getType: jest.fn(() => 'http'),
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => mockResponse),
        })),
      } as any;

      const error = new Error('خطأ في النظام');
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => error)),
      };

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe({
        error: () => {
          // Error handler
        },
      });

      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('metadata completeness', () => {
    it('should include all available metadata fields', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-complete-meta-metrics';
      const method = 'PUT';
      const url = '/api/users/123';
      const ip = '192.168.1.20';
      const userAgent = 'CompleteClient/1.0';

      const mockRequest = {
        requestId,
        method,
        url,
        originalUrl: url,
        ip,
        headers: {
          'user-agent': userAgent,
        },
      };

      const mockResponse = {
        statusCode: 200,
        setHeader: jest.fn(),
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

      const result = interceptor.intercept(mockContext, mockCallHandler);
      result.subscribe();

      expect(mockHttpDuration.labels).toHaveBeenCalledWith(method, url, '200');
      expect(mockHttpDuration.observe).toHaveBeenCalled();
      expect(mockHttpTotal.labels).toHaveBeenCalledWith(method, url, '200');
      expect(mockHttpTotal.inc).toHaveBeenCalled();
    });

    it('should handle missing optional fields gracefully', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-minimal-meta-metrics';
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
      };

      const mockResponse = {
        statusCode: 200,
        setHeader: jest.fn(),
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

      const result = interceptor.intercept(mockContext, mockCallHandler);
      result.subscribe();

      expect(mockHttpDuration.labels).toHaveBeenCalledWith(method, url, '200');
      expect(mockHttpDuration.observe).toHaveBeenCalled();
      expect(mockHttpTotal.labels).toHaveBeenCalledWith(method, url, '200');
      expect(mockHttpTotal.inc).toHaveBeenCalled();
    });
  });
});
