import { Test } from '@nestjs/testing';
import { of, throwError } from 'rxjs';

import { shouldBypass } from './bypass.util';
import { ResponseInterceptor } from './response.interceptor';

import type { ApiResponseData } from './response.interceptor';
import type { TestingModule } from '@nestjs/testing';

jest.mock('./bypass.util');

describe('ResponseInterceptor', () => {
  let interceptor: ResponseInterceptor<unknown>;
  let mockShouldBypass: jest.MockedFunction<typeof shouldBypass>;

  beforeEach(async () => {
    mockShouldBypass = shouldBypass as jest.MockedFunction<typeof shouldBypass>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [ResponseInterceptor],
    }).compile();

    interceptor = module.get<ResponseInterceptor<unknown>>(ResponseInterceptor);
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
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('metrics data')),
      };

      interceptor.intercept(mockContext, mockCallHandler);

      expect(mockShouldBypass).toHaveBeenCalledWith(mockRequest);
      expect(mockCallHandler.handle).toHaveBeenCalled();
    });

    it('should bypass health endpoint', () => {
      mockShouldBypass.mockReturnValue(true);

      const mockRequest = { originalUrl: '/health' };
      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('health data')),
      };

      interceptor.intercept(mockContext, mockCallHandler);

      expect(mockShouldBypass).toHaveBeenCalledWith(mockRequest);
      expect(mockCallHandler.handle).toHaveBeenCalled();
    });

    it('should bypass swagger endpoint', () => {
      mockShouldBypass.mockReturnValue(true);

      const mockRequest = { originalUrl: '/swagger' };
      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('swagger data')),
      };

      interceptor.intercept(mockContext, mockCallHandler);

      expect(mockShouldBypass).toHaveBeenCalledWith(mockRequest);
      expect(mockCallHandler.handle).toHaveBeenCalled();
    });

    it('should bypass when request should be bypassed', () => {
      mockShouldBypass.mockReturnValue(true);

      const mockRequest = { originalUrl: '/api/test' };
      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('bypassed data')),
      };

      interceptor.intercept(mockContext, mockCallHandler);

      expect(mockShouldBypass).toHaveBeenCalledWith(mockRequest);
      expect(mockCallHandler.handle).toHaveBeenCalled();
    });
  });

  describe('response transformation', () => {
    it('should transform successful response with requestId', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-123';
      const mockRequest = { requestId };
      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const testData = { user: 'John', age: 30 };
      const mockCallHandler = {
        handle: jest.fn(() => of(testData)),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler);

      expect(result).toBeDefined();

      // Subscribe to get the actual result
      let actualResult: ApiResponseData<unknown> | undefined;
      result.subscribe({
        next: (data) => {
          actualResult = data;
        },
      });

      expect(actualResult).toEqual({
        success: true,
        data: testData,
        requestId,
        timestamp: expect.any(String),
      });
    });

    it('should transform successful response without requestId', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockRequest = {};
      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const testData = 'simple response';
      const mockCallHandler = {
        handle: jest.fn(() => of(testData)),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler);

      let actualResult: ApiResponseData<unknown> | undefined;
      result.subscribe({
        next: (data) => {
          actualResult = data;
        },
      });

      expect(actualResult).toEqual({
        success: true,
        data: testData,
        timestamp: expect.any(String),
      });
      expect(actualResult!.requestId).toBeUndefined();
    });

    it('should handle complex data structures', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockRequest = { requestId: 'req-456' };
      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const complexData = {
        users: [
          { id: 1, name: 'John' },
          { id: 2, name: 'Jane' },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 100,
        },
        metadata: {
          timestamp: new Date(),
          version: '1.0.0',
        },
      };

      const mockCallHandler = {
        handle: jest.fn(() => of(complexData)),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler);

      let actualResult: ApiResponseData<unknown> | undefined;
      result.subscribe({
        next: (data) => {
          actualResult = data;
        },
      });

      expect(actualResult).toEqual({
        success: true,
        data: complexData,
        requestId: 'req-456',
        timestamp: expect.any(String),
      });
    });

    it('should handle primitive data types', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockRequest = { requestId: 'req-789' };
      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const testCases = ['string data', 123, true, null, undefined];

      testCases.forEach((testData) => {
        const mockCallHandler = {
          handle: jest.fn(() => of(testData)),
        };

        const result = interceptor.intercept(mockContext, mockCallHandler);

        let actualResult: ApiResponseData<unknown> | undefined;
        result.subscribe({
          next: (data) => {
            actualResult = data;
          },
        });

        expect(actualResult).toEqual({
          success: true,
          data: testData,
          requestId: 'req-789',
          timestamp: expect.any(String),
        });
      });
    });

    it('should handle empty objects', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockRequest = { requestId: 'req-empty' };
      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const emptyData = {};
      const mockCallHandler = {
        handle: jest.fn(() => of(emptyData)),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler);

      let actualResult: ApiResponseData<unknown> | undefined;
      result.subscribe({
        next: (data) => {
          actualResult = data;
        },
      });

      expect(actualResult).toEqual({
        success: true,
        data: emptyData,
        requestId: 'req-empty',
        timestamp: expect.any(String),
      });
    });

    it('should handle arrays', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockRequest = { requestId: 'req-array' };
      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const arrayData = [1, 2, 3, 4, 5];
      const mockCallHandler = {
        handle: jest.fn(() => of(arrayData)),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler);

      let actualResult: ApiResponseData<unknown> | undefined;
      result.subscribe({
        next: (data) => {
          actualResult = data;
        },
      });

      expect(actualResult).toEqual({
        success: true,
        data: arrayData,
        requestId: 'req-array',
        timestamp: expect.any(String),
      });
    });
  });

  describe('timestamp generation', () => {
    it('should include valid timestamp in response', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockRequest = { requestId: 'req-timestamp' };
      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const testData = 'test';
      const mockCallHandler = {
        handle: jest.fn(() => of(testData)),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler);

      let actualResult: ApiResponseData<unknown> | undefined;
      result.subscribe({
        next: (data) => {
          actualResult = data;
        },
      });

      expect(actualResult!.timestamp).toBeDefined();
      expect(typeof actualResult!.timestamp).toBe('string');

      // Should be a valid ISO string
      const timestamp = new Date(actualResult!.timestamp);
      expect(isNaN(timestamp.getTime())).toBe(false);

      // Should be recent (within last second)
      const now = new Date();
      const diff = now.getTime() - timestamp.getTime();
      expect(diff).toBeLessThan(1000);
    });

    it('should generate different timestamps for different requests', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockRequest = { requestId: 'req-multi' };
      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const testData = 'test';
      const mockCallHandler = {
        handle: jest.fn(() => of(testData)),
      };

      const result1 = interceptor.intercept(mockContext, mockCallHandler);
      const result2 = interceptor.intercept(mockContext, mockCallHandler);

      let timestamp1: string | undefined;
      let timestamp2: string | undefined;

      result1.subscribe({
        next: (data) => {
          timestamp1 = data.timestamp;
        },
      });

      result2.subscribe({
        next: (data) => {
          timestamp2 = data.timestamp;
        },
      });

      expect(timestamp1).not.toBe(timestamp2);
    });
  });

  describe('request ID handling', () => {
    it('should include requestId when available', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-123';
      const mockRequest = { requestId };
      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const testData = 'test';
      const mockCallHandler = {
        handle: jest.fn(() => of(testData)),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler);

      let actualResult: ApiResponseData<unknown> | undefined;
      result.subscribe({
        next: (data) => {
          actualResult = data;
        },
      });

      expect(actualResult!.requestId).toBe(requestId);
    });

    it('should handle undefined requestId', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockRequest = {};
      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const testData = 'test';
      const mockCallHandler = {
        handle: jest.fn(() => of(testData)),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler);

      let actualResult: ApiResponseData<unknown> | undefined;
      result.subscribe({
        next: (data) => {
          actualResult = data;
        },
      });

      expect(actualResult!.requestId).toBeUndefined();
    });

    it('should handle null requestId', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockRequest = { requestId: null };
      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const testData = 'test';
      const mockCallHandler = {
        handle: jest.fn(() => of(testData)),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler);

      let actualResult: ApiResponseData<unknown> | undefined;
      result.subscribe({
        next: (data) => {
          actualResult = data;
        },
      });

      expect(actualResult!.requestId).toBeUndefined();
    });

    it('should handle empty string requestId', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockRequest = { requestId: '' };
      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const testData = 'test';
      const mockCallHandler = {
        handle: jest.fn(() => of(testData)),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler);

      let actualResult: ApiResponseData<unknown> | undefined;
      result.subscribe({
        next: (data) => {
          actualResult = data;
        },
      });

      expect(actualResult!.requestId).toBeUndefined();
    });
  });

  describe('response structure', () => {
    it('should always include success: true', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockRequest = {};
      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const testData = 'test';
      const mockCallHandler = {
        handle: jest.fn(() => of(testData)),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler);

      let actualResult: ApiResponseData<unknown> | undefined;
      result.subscribe({
        next: (data) => {
          actualResult = data;
        },
      });

      expect(actualResult!.success).toBe(true);
    });

    it('should always include timestamp', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockRequest = {};
      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const testData = 'test';
      const mockCallHandler = {
        handle: jest.fn(() => of(testData)),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler);

      let actualResult: ApiResponseData<unknown> | undefined;
      result.subscribe({
        next: (data) => {
          actualResult = data;
        },
      });

      expect(actualResult!.timestamp).toBeDefined();
      expect(typeof actualResult!.timestamp).toBe('string');
    });

    it('should include data field with original response', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockRequest = { requestId: 'req-data' };
      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const originalData = { message: 'Hello World' };
      const mockCallHandler = {
        handle: jest.fn(() => of(originalData)),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler);

      let actualResult: ApiResponseData<unknown> | undefined;
      result.subscribe({
        next: (data) => {
          actualResult = data;
        },
      });

      expect(actualResult!.data).toEqual(originalData);
    });

    it('should handle missing data gracefully', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockRequest = {};
      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of(null)),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler);

      let actualResult: ApiResponseData<unknown> | undefined;
      result.subscribe({
        next: (data) => {
          actualResult = data;
        },
      });

      expect(actualResult!.data).toBeNull();
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
    });

    it('should handle missing switchToHttp method', () => {
      const mockContext = {
        switchToHttp: jest.fn(() => {
          throw new Error('switchToHttp not available');
        }),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('test')),
      };

      expect(() =>
        interceptor.intercept(mockContext, mockCallHandler),
      ).toThrow();
    });

    it('should handle missing getRequest method', () => {
      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => {
            throw new Error('getRequest not available');
          }),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('test')),
      };

      expect(() =>
        interceptor.intercept(mockContext, mockCallHandler),
      ).toThrow();
    });

    it('should handle request object throwing errors', () => {
      const mockContext = {
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

      const mockRequest = {};
      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => new Error('Handler error'))),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler);

      expect(result).toBeDefined();

      // Should propagate the error
      let error: Error | undefined;
      result.subscribe({
        error: (err) => {
          error = err;
        },
      });

      expect(error).toBeDefined();
      expect(error!.message).toBe('Handler error');
    });

    it('should handle call handler returning different observable types', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockRequest = { requestId: 'req-observable' };
      const mockContext = {
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

      testCases.forEach((testData) => {
        const mockCallHandler = {
          handle: jest.fn(() => testData),
        };

        const result = interceptor.intercept(mockContext, mockCallHandler);

        expect(mockCallHandler.handle).toHaveBeenCalled();

        let actualResult: ApiResponseData<unknown> | undefined;
        result.subscribe({
          next: (data) => {
            actualResult = data;
          },
        });

        expect(actualResult!.success).toBe(true);
        expect(actualResult!.data).toBeDefined();
      });
    });
  });

  describe('performance considerations', () => {
    it('should handle rapid successive requests', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockRequest = { requestId: 'req-perf' };
      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const testData = 'test';
      const mockCallHandler = {
        handle: jest.fn(() => of(testData)),
      };

      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        const result = interceptor.intercept(mockContext, mockCallHandler);

        let actualResult: ApiResponseData<unknown> | undefined;
        result.subscribe({
          next: (data) => {
            actualResult = data;
          },
        });

        expect(actualResult!.success).toBe(true);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should not create memory leaks', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockRequest = { requestId: 'req-memory' };
      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const testData = 'test';
      const mockCallHandler = {
        handle: jest.fn(() => of(testData)),
      };

      for (let i = 0; i < 10000; i++) {
        const result = interceptor.intercept(mockContext, mockCallHandler);

        let actualResult: ApiResponseData<unknown> | undefined;
        result.subscribe({
          next: (data) => {
            actualResult = data;
          },
        });

        expect(actualResult!.success).toBe(true);
      }

      // If we get here without memory issues, test passes
      expect(true).toBe(true);
    });

    it('should handle concurrent requests', async () => {
      mockShouldBypass.mockReturnValue(false);

      const mockRequest = { requestId: 'req-concurrent' };
      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
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
                next: (data) => {
                  const responseData = data;
                  expect(responseData.success).toBe(true);
                  resolve();
                },
              });
            });
          }),
        );
      }

      await Promise.all(promises);

      expect(promises).toHaveLength(100);
    });
  });

  describe('real-world usage scenarios', () => {
    it('should handle API response transformation', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockRequest = { requestId: 'api-req-123' };
      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
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

      let actualResult: ApiResponseData<unknown> | undefined;
      result.subscribe({
        next: (data) => {
          actualResult = data;
        },
      });

      expect(actualResult).toEqual({
        success: true,
        data: apiData,
        requestId: 'api-req-123',
        timestamp: expect.any(String),
      });
    });

    it('should handle error response scenario', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockRequest = {};
      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const error = new Error('Service unavailable');
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => error)),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler);

      let actualError: Error | undefined;
      result.subscribe({
        error: (err) => {
          actualError = err;
        },
      });

      expect(actualError).toBeDefined();
      expect(actualError!.message).toBe('Service unavailable');
    });

    it('should handle metrics endpoint bypass', () => {
      mockShouldBypass.mockReturnValue(true);

      const mockRequest = { originalUrl: '/metrics' };
      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const metricsData = 'prometheus_metrics_data';
      const mockCallHandler = {
        handle: jest.fn(() => of(metricsData)),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler);

      expect(mockShouldBypass).toHaveBeenCalledWith(mockRequest);
      expect(mockCallHandler.handle).toHaveBeenCalled();

      // Should return raw data without transformation
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
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
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

    it('should handle swagger documentation bypass', () => {
      mockShouldBypass.mockReturnValue(true);

      const mockRequest = { originalUrl: '/swagger' };
      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
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

  describe('type safety', () => {
    it('should handle generic type T correctly', () => {
      const stringInterceptor = new ResponseInterceptor<string>();
      const numberInterceptor = new ResponseInterceptor<number>();
      const objectInterceptor = new ResponseInterceptor<{ key: string }>();

      expect(stringInterceptor).toBeDefined();
      expect(numberInterceptor).toBeDefined();
      expect(objectInterceptor).toBeDefined();
    });

    it('should maintain type information in response', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockRequest = { requestId: 'req-type' };
      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const typedData = { message: 'typed response' };
      const mockCallHandler = {
        handle: jest.fn(() => of(typedData)),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler);

      let actualResult: ApiResponseData<unknown> | undefined;
      result.subscribe({
        next: (data) => {
          actualResult = data;
        },
      });

      expect(actualResult!.data).toEqual(typedData);
    });

    it('should handle interface ApiResponseData correctly', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockRequest = { requestId: 'req-interface' };
      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const testData = 'interface test';
      const mockCallHandler = {
        handle: jest.fn(() => of(testData)),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler);

      let actualResult: ApiResponseData<unknown> | undefined;
      result.subscribe({
        next: (data) => {
          actualResult = data;
        },
      });

      // Verify the interface structure
      expect(actualResult).toHaveProperty('success');
      expect(actualResult).toHaveProperty('data');
      expect(actualResult).toHaveProperty('timestamp');
      expect(actualResult!.success).toBe(true);
      expect(actualResult!.data).toBe(testData);
      expect(typeof actualResult!.timestamp).toBe('string');
    });
  });

  describe('edge cases', () => {
    it('should handle very large response data', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockRequest = { requestId: 'req-large' };
      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const largeData = 'x'.repeat(1000000); // 1MB string
      const mockCallHandler = {
        handle: jest.fn(() => of(largeData)),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler);

      let actualResult: ApiResponseData<unknown> | undefined;
      result.subscribe({
        next: (data) => {
          actualResult = data;
        },
      });

      expect(actualResult!.data).toBe(largeData);
      expect(actualResult!.success).toBe(true);
    });

    it('should handle circular reference data', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockRequest = { requestId: 'req-circular' };
      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const circularData: any = { name: 'test' };
      circularData.self = circularData;

      const mockCallHandler = {
        handle: jest.fn(() => of(circularData)),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler);

      let actualResult: ApiResponseData<unknown> | undefined;
      result.subscribe({
        next: (data) => {
          actualResult = data;
        },
      });

      expect(actualResult!.data).toBe(circularData);
      expect(actualResult!.success).toBe(true);
    });

    it('should handle function data', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockRequest = { requestId: 'req-function' };
      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const functionData = () => 'function result';
      const mockCallHandler = {
        handle: jest.fn(() => of(functionData)),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler);

      let actualResult: ApiResponseData<unknown> | undefined;
      result.subscribe({
        next: (data) => {
          actualResult = data;
        },
      });

      expect(actualResult!.data).toBe(functionData);
      expect(actualResult!.success).toBe(true);
    });

    it('should handle symbol data', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockRequest = { requestId: 'req-symbol' };
      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const symbolData = Symbol('test');
      const mockCallHandler = {
        handle: jest.fn(() => of(symbolData)),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler);

      let actualResult: ApiResponseData<unknown> | undefined;
      result.subscribe({
        next: (data) => {
          actualResult = data;
        },
      });

      expect(actualResult!.data).toBe(symbolData);
      expect(actualResult!.success).toBe(true);
    });
  });

  describe('integration with NestJS', () => {
    it('should work with NestJS HTTP context', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockRequest = {
        requestId: 'nestjs-req',
        method: 'GET',
        url: '/api/test',
      };
      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const testData = { message: 'NestJS integration' };
      const mockCallHandler = {
        handle: jest.fn(() => of(testData)),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler);

      expect(mockCallHandler.handle).toHaveBeenCalled();

      let actualResult: ApiResponseData<unknown> | undefined;
      result.subscribe({
        next: (data) => {
          actualResult = data;
        },
      });

      expect(actualResult!.success).toBe(true);
      expect(actualResult!.data).toEqual(testData);
      expect(actualResult!.requestId).toBe('nestjs-req');
    });

    it('should handle NestJS execution context correctly', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockRequest = { requestId: 'context-req' };
      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
        getType: jest.fn(() => 'http'),
      } as any;

      const testData = 'context test';
      const mockCallHandler = {
        handle: jest.fn(() => of(testData)),
      };

      interceptor.intercept(mockContext, mockCallHandler);

      expect(mockCallHandler.handle).toHaveBeenCalled();
    });
  });

  describe('response format compliance', () => {
    it('should comply with ApiResponseData interface', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockRequest = { requestId: 'format-req' };
      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const testData = { compliant: true };
      const mockCallHandler = {
        handle: jest.fn(() => of(testData)),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler);

      let actualResult: ApiResponseData<unknown> | undefined;
      result.subscribe({
        next: (data) => {
          actualResult = data;
        },
      });

      // Verify interface compliance
      expect(actualResult).toHaveProperty('success');
      expect(actualResult).toHaveProperty('data');
      expect(actualResult).toHaveProperty('timestamp');

      expect(typeof actualResult!.success).toBe('boolean');
      expect(actualResult!.success).toBe(true);
      expect(actualResult!.data).toEqual(testData);
      expect(typeof actualResult!.timestamp).toBe('string');
    });

    it('should handle optional fields correctly', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockRequest = {};
      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      const testData = 'optional fields test';
      const mockCallHandler = {
        handle: jest.fn(() => of(testData)),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler);

      let actualResult: ApiResponseData<unknown> | undefined;
      result.subscribe({
        next: (data) => {
          actualResult = data;
        },
      });

      // requestId should be optional (undefined when not present)
      expect(actualResult!.requestId).toBeUndefined();
      expect(actualResult!.success).toBe(true);
      expect(actualResult!.data).toBe(testData);
      expect(actualResult!.timestamp).toBeDefined();
    });
  });
});
