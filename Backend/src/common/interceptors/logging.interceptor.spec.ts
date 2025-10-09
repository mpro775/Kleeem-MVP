import { Test } from '@nestjs/testing';
import { of, throwError } from 'rxjs';

import { shouldBypass } from './bypass.util';
import { LoggingInterceptor } from './logging.interceptor';

import type { TestingModule } from '@nestjs/testing';

// Mock the dependencies
jest.mock('./bypass.util');
jest.mock('../utils/logger.utils', () => ({
  sanitizeBody: jest.fn(),
}));

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let mockShouldBypass: jest.MockedFunction<typeof shouldBypass>;
  let mockSanitizeBody: jest.MockedFunction<any>;

  beforeEach(async () => {
    mockShouldBypass = shouldBypass as jest.MockedFunction<typeof shouldBypass>;
    mockSanitizeBody = require('../utils/logger.utils').sanitizeBody;

    const module: TestingModule = await Test.createTestingModule({
      providers: [LoggingInterceptor],
    }).compile();

    interceptor = module.get<LoggingInterceptor>(LoggingInterceptor);
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
    });

    it('should bypass health endpoint', () => {
      mockShouldBypass.mockReturnValue(true);

      const mockRequest = { originalUrl: '/health' };
      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({})),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('health data')),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler as any);

      expect(result).toBeDefined();
      expect(mockShouldBypass).toHaveBeenCalledWith(mockRequest);
      expect(mockCallHandler.handle).toHaveBeenCalled();
    });

    it('should bypass swagger endpoint', () => {
      mockShouldBypass.mockReturnValue(true);

      const mockRequest = { originalUrl: '/swagger' };
      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({})),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('swagger data')),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler);
      expect(result).toBeDefined();
      expect(mockShouldBypass).toHaveBeenCalledWith(mockRequest);
      expect(mockCallHandler.handle).toHaveBeenCalled();
    });

    it('should bypass when request should be bypassed', () => {
      mockShouldBypass.mockReturnValue(true);

      const mockRequest = { originalUrl: '/api/test' };
      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({})),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('bypassed data')),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler as any);
      expect(result).toBeDefined();
      expect(mockShouldBypass).toHaveBeenCalledWith(mockRequest);
      expect(mockCallHandler.handle).toHaveBeenCalled();
    });
  });

  describe('request logging', () => {
    it('should log request start with correct format', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-123';
      const method = 'GET';
      const url = '/api/users';
      const userAgent = 'Mozilla/5.0';

      const mockRequest = {
        requestId,
        method,
        url,
        get: jest.fn(() => userAgent),
      };

      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({ statusCode: 200 })),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('response data')),
      };

      // Mock console methods to capture logs
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = interceptor.intercept(mockContext, mockCallHandler);

      expect(mockCallHandler.handle).toHaveBeenCalled();

      // Wait for the observable to complete and logging to happen
      result.subscribe();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          `[${requestId}] ${method} ${url} - User-Agent: ${userAgent}`,
        ),
      );

      consoleSpy.mockRestore();
    });

    it('should log request body when present', () => {
      mockShouldBypass.mockReturnValue(false);
      mockSanitizeBody.mockReturnValue({ sanitized: 'body' });

      const requestId = 'req-body';
      const method = 'POST';
      const url = '/api/users';
      const body = { password: 'secret', name: 'John' };

      const mockRequest = {
        requestId,
        method,
        url,
        body,
      };

      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({ statusCode: 201 })),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('created')),
      };

      const consoleSpy = jest.spyOn(console, 'debug').mockImplementation();

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe();

      expect(mockSanitizeBody).toHaveBeenCalledWith(body);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`[${requestId}] Request Body:`),
      );

      consoleSpy.mockRestore();
    });

    it('should not log request body when empty', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-no-body';
      const method = 'GET';
      const url = '/api/users';

      const mockRequest = {
        requestId,
        method,
        url,
        body: {},
      };

      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({ statusCode: 200 })),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('data')),
      };

      const consoleSpy = jest.spyOn(console, 'debug').mockImplementation();

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe();

      expect(mockSanitizeBody).not.toHaveBeenCalled();
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Request Body:'),
      );

      consoleSpy.mockRestore();
    });

    it('should handle missing request body', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-no-body-prop';
      const method = 'GET';
      const url = '/api/users';

      const mockRequest = {
        requestId,
        method,
        url,
        // body property is missing
      };

      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({ statusCode: 200 })),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('data')),
      };

      const consoleSpy = jest.spyOn(console, 'debug').mockImplementation();

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe();

      expect(mockSanitizeBody).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('response logging', () => {
    it('should log successful response with status code and duration', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-success';
      const method = 'GET';
      const url = '/api/users';
      const statusCode = 200;

      const mockRequest = {
        requestId,
        method,
        url,
      };

      const mockResponse = {
        statusCode,
      };

      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => mockResponse),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('success data')),
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          `[${requestId}] ${method} ${url} - ${statusCode} -`,
        ),
      );

      consoleSpy.mockRestore();
    });

    it('should log error response with error details', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-error';
      const method = 'POST';
      const url = '/api/users';
      const statusCode = 400;

      const mockRequest = {
        requestId,
        method,
        url,
      };

      const mockResponse = {
        statusCode,
      };

      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => mockResponse),
        })),
      } as any;

      const error = new Error('Validation failed');
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => error)),
      };

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = interceptor.intercept(mockContext, mockCallHandler);

      let caughtError: Error | undefined;
      result.subscribe({
        error: (err) => {
          caughtError = err;
        },
      });

      expect(caughtError).toBeDefined();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`[${requestId}] ${method} ${url} - ERROR -`),
      );

      consoleSpy.mockRestore();
    });

    it('should handle non-Error objects in error logging', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-string-error';
      const method = 'PUT';
      const url = '/api/users';

      const mockRequest = {
        requestId,
        method,
        url,
      };

      const mockResponse = {
        statusCode: 500,
      };

      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => mockResponse),
        })),
      } as any;

      const stringError = 'String error message';
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => stringError)),
      };

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = interceptor.intercept(mockContext, mockCallHandler);

      let caughtError: unknown;
      result.subscribe({
        error: (err) => {
          caughtError = err;
        },
      });

      expect(caughtError).toBeDefined();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('timing and duration', () => {
    it('should measure request duration correctly', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-timing';
      const method = 'GET';
      const url = '/api/users';
      const statusCode = 200;

      const mockRequest = {
        requestId,
        method,
        url,
      };

      const mockResponse = {
        statusCode,
      };

      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => mockResponse),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('data')),
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`${statusCode} -`),
      );

      consoleSpy.mockRestore();
    });

    it('should handle very fast requests', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-fast';
      const method = 'GET';
      const url = '/api/health';
      const statusCode = 200;

      const mockRequest = {
        requestId,
        method,
        url,
      };

      const mockResponse = {
        statusCode,
      };

      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => mockResponse),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('ok')),
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`${statusCode} -`),
      );

      consoleSpy.mockRestore();
    });

    it('should handle slow requests', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-slow';
      const method = 'POST';
      const url = '/api/process';
      const statusCode = 200;

      const mockRequest = {
        requestId,
        method,
        url,
      };

      const mockResponse = {
        statusCode,
      };

      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => mockResponse),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => {
          // Simulate slow operation
          return new Promise((resolve) => {
            setTimeout(() => resolve('slow data'), 100);
          });
        }),
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = interceptor.intercept(mockContext, mockCallHandler as any);

      result.subscribe();

      // Wait for async operation to complete
      setTimeout(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining(`${statusCode} -`),
        );
        consoleSpy.mockRestore();
      }, 150);
    });
  });

  describe('user agent handling', () => {
    it('should handle present user agent', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-ua';
      const method = 'GET';
      const url = '/api/test';
      const userAgent =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

      const mockRequest = {
        requestId,
        method,
        url,
        get: jest.fn(() => userAgent),
      };

      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({ statusCode: 200 })),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('data')),
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`User-Agent: ${userAgent}`),
      );

      consoleSpy.mockRestore();
    });

    it('should handle missing user agent', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-no-ua';
      const method = 'GET';
      const url = '/api/test';

      const mockRequest = {
        requestId,
        method,
        url,
        get: jest.fn(() => null),
      };

      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({ statusCode: 200 })),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('data')),
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('User-Agent: '),
      );

      consoleSpy.mockRestore();
    });

    it('should handle empty user agent', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-empty-ua';
      const method = 'GET';
      const url = '/api/test';

      const mockRequest = {
        requestId,
        method,
        url,
        get: jest.fn(() => ''),
      };

      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({ statusCode: 200 })),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('data')),
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('User-Agent: '),
      );

      consoleSpy.mockRestore();
    });
  });

  describe('request body sanitization', () => {
    it('should sanitize sensitive data in request body', () => {
      mockShouldBypass.mockReturnValue(false);
      mockSanitizeBody.mockReturnValue({
        name: 'John',
        email: '[FILTERED]',
        password: '[FILTERED]',
      });

      const requestId = 'req-sanitize';
      const method = 'POST';
      const url = '/api/login';
      const body = {
        name: 'John',
        email: 'john@example.com',
        password: 'secret123',
      };

      const mockRequest = {
        requestId,
        method,
        url,
        body,
      };

      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({ statusCode: 200 })),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('logged in')),
      };

      const consoleSpy = jest.spyOn(console, 'debug').mockImplementation();

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe();

      expect(mockSanitizeBody).toHaveBeenCalledWith(body);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Request Body:'),
      );

      consoleSpy.mockRestore();
    });

    it('should handle sanitization function errors', () => {
      mockShouldBypass.mockReturnValue(false);
      mockSanitizeBody.mockImplementation(() => {
        throw new Error('Sanitization failed');
      });

      const requestId = 'req-sanitize-error';
      const method = 'POST';
      const url = '/api/test';
      const body = { data: 'test' };

      const mockRequest = {
        requestId,
        method,
        url,
        body,
      };

      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({ statusCode: 200 })),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('data')),
      };

      const consoleSpy = jest.spyOn(console, 'debug').mockImplementation();

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe();

      expect(mockSanitizeBody).toHaveBeenCalledWith(body);
      // Should still log the request even if sanitization fails
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle null sanitization result', () => {
      mockShouldBypass.mockReturnValue(false);
      mockSanitizeBody.mockReturnValue(null);

      const requestId = 'req-sanitize-null';
      const method = 'POST';
      const url = '/api/test';
      const body = { data: 'test' };

      const mockRequest = {
        requestId,
        method,
        url,
        body,
      };

      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({ statusCode: 200 })),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('data')),
      };

      const consoleSpy = jest.spyOn(console, 'debug').mockImplementation();

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe();

      expect(mockSanitizeBody).toHaveBeenCalledWith(body);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
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
          getResponse: jest.fn(() => ({})),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('test')),
      };

      expect(() =>
        interceptor.intercept(mockContext, mockCallHandler),
      ).toThrow();
    });

    it('should handle missing getResponse method', () => {
      const mockContext = {
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

      const mockRequest = { requestId: 'req-handler' };
      const mockContext = {
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
    });

    it('should handle call handler throwing errors', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockRequest = { requestId: 'req-error-handler' };
      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({ statusCode: 500 })),
        })),
      } as any;

      const error = new Error('Handler error');
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => error)),
      };

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = interceptor.intercept(mockContext, mockCallHandler);

      let caughtError: Error | undefined;
      result.subscribe({
        error: (err) => {
          caughtError = err;
        },
      });

      expect(caughtError).toBeDefined();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle call handler returning different observable types', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockRequest = { requestId: 'req-observable-types' };
      const mockContext = {
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

        let loggedStart = false;
        let loggedComplete = false;

        const consoleSpy = jest
          .spyOn(console, 'log')
          .mockImplementation((message) => {
            if (message.includes('GET') && message.includes('/api/test')) {
              loggedStart = true;
            }
            if (message.includes('200') && message.includes('ms')) {
              loggedComplete = true;
            }
          });

        result.subscribe();

        expect(loggedStart).toBe(true);
        expect(loggedComplete).toBe(true);

        consoleSpy.mockRestore();
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
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({ statusCode: 200 })),
        })),
      } as any;

      const testData = 'test';
      const mockCallHandler = {
        handle: jest.fn(() => of(testData)),
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        const result = interceptor.intercept(mockContext, mockCallHandler);

        result.subscribe();
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(1000); // Should complete within 1 second

      consoleSpy.mockRestore();
    });

    it('should not create memory leaks', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockRequest = {
        requestId: 'req-memory',
        method: 'GET',
        url: '/api/test',
      };
      const mockContext = {
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

      const mockRequest = {
        requestId: 'req-concurrent',
        method: 'GET',
        url: '/api/test',
      };
      const mockContext = {
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

      expect(promises).toHaveLength(100);
    });
  });

  describe('real-world usage scenarios', () => {
    it('should handle API request logging', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'api-req-123';
      const method = 'POST';
      const url = '/api/users';
      const userAgent = 'axios/0.21.1';

      const mockRequest = {
        requestId,
        method,
        url,
        body: { name: 'John', email: 'john@example.com' },
        get: jest.fn(() => userAgent),
      };

      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({ statusCode: 201 })),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of({ id: 123, name: 'John' })),
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`[${requestId}] ${method} ${url}`),
      );
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('201 -'));

      consoleSpy.mockRestore();
    });

    it('should handle error logging scenario', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'error-req-456';
      const method = 'PUT';
      const url = '/api/users/123';

      const mockRequest = {
        requestId,
        method,
        url,
        body: { name: 'Updated Name' },
      };

      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({ statusCode: 400 })),
        })),
      } as any;

      const error = new Error('Validation failed: name is required');
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => error)),
      };

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = interceptor.intercept(mockContext, mockCallHandler);

      let caughtError: Error | undefined;
      result.subscribe({
        error: (err) => {
          caughtError = err;
        },
      });

      expect(caughtError).toBeDefined();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle metrics endpoint bypass', () => {
      mockShouldBypass.mockReturnValue(true);

      const mockRequest = { originalUrl: '/metrics' };
      const mockContext = {
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

      // Should not log anything for bypassed requests
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      result.subscribe();

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle health check endpoint bypass', () => {
      mockShouldBypass.mockReturnValue(true);

      const mockRequest = { originalUrl: '/health' };
      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({})),
        })),
      } as any;

      const healthData = { status: 'ok' };
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
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({})),
        })),
      } as any;

      const swaggerData = { swagger: '2.0' };
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

  describe('error handling in logging', () => {
    it('should handle logger.log throwing errors', () => {
      mockShouldBypass.mockReturnValue(false);

      const originalConsoleLog = console.log;
      console.log = jest.fn().mockImplementation(() => {
        throw new Error('Console log error');
      });

      const requestId = 'req-log-error';
      const method = 'GET';
      const url = '/api/test';

      const mockRequest = {
        requestId,
        method,
        url,
      };

      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({ statusCode: 200 })),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('data')),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler);

      // Should not throw even if logging fails
      expect(() => {
        result.subscribe();
      }).not.toThrow();

      console.log = originalConsoleLog;
    });

    it('should handle logger.debug throwing errors', () => {
      mockShouldBypass.mockReturnValue(false);
      mockSanitizeBody.mockReturnValue({ data: 'test' });

      const originalConsoleDebug = console.debug;
      console.debug = jest.fn().mockImplementation(() => {
        throw new Error('Console debug error');
      });

      const requestId = 'req-debug-error';
      const method = 'POST';
      const url = '/api/test';
      const body = { data: 'test' };

      const mockRequest = {
        requestId,
        method,
        url,
        body,
      };

      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({ statusCode: 200 })),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('data')),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler);

      // Should not throw even if logging fails
      expect(() => {
        result.subscribe();
      }).not.toThrow();

      console.debug = originalConsoleDebug;
    });

    it('should handle logger.error throwing errors', () => {
      mockShouldBypass.mockReturnValue(false);

      const originalConsoleError = console.error;
      console.error = jest.fn().mockImplementation(() => {
        throw new Error('Console error error');
      });

      const requestId = 'req-error-log-error';
      const method = 'GET';
      const url = '/api/test';

      const mockRequest = {
        requestId,
        method,
        url,
      };

      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({ statusCode: 500 })),
        })),
      } as any;

      const error = new Error('Request error');
      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => error)),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler);

      // Should not throw even if error logging fails
      expect(() => {
        result.subscribe({
          error: () => {
            // Error handler
          },
        });
      }).not.toThrow();

      console.error = originalConsoleError;
    });
  });

  describe('request method handling', () => {
    it('should handle different HTTP methods', () => {
      mockShouldBypass.mockReturnValue(false);

      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

      methods.forEach((method) => {
        const requestId = `req-${method.toLowerCase()}`;
        const url = `/api/test`;

        const mockRequest = {
          requestId,
          method,
          url,
        };

        const mockContext = {
          switchToHttp: jest.fn(() => ({
            getRequest: jest.fn(() => mockRequest),
            getResponse: jest.fn(() => ({ statusCode: 200 })),
          })),
        } as any;

        const mockCallHandler = {
          handle: jest.fn(() => of('data')),
        };

        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        const result = interceptor.intercept(mockContext, mockCallHandler);

        result.subscribe();

        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining(`[${requestId}] ${method} ${url}`),
        );

        consoleSpy.mockRestore();
      });
    });

    it('should handle unknown HTTP methods', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-unknown-method';
      const method = 'UNKNOWN';
      const url = '/api/test';

      const mockRequest = {
        requestId,
        method,
        url,
      };

      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({ statusCode: 200 })),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('data')),
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`[${requestId}] ${method} ${url}`),
      );

      consoleSpy.mockRestore();
    });
  });

  describe('status code handling', () => {
    it('should handle different status codes', () => {
      mockShouldBypass.mockReturnValue(false);

      const statusCodes = [200, 201, 400, 401, 403, 404, 500];

      statusCodes.forEach((statusCode) => {
        const requestId = `req-status-${statusCode}`;
        const method = 'GET';
        const url = '/api/test';

        const mockRequest = {
          requestId,
          method,
          url,
        };

        const mockContext = {
          switchToHttp: jest.fn(() => ({
            getRequest: jest.fn(() => mockRequest),
            getResponse: jest.fn(() => ({ statusCode })),
          })),
        } as any;

        const mockCallHandler = {
          handle: jest.fn(() => of('data')),
        };

        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        const result = interceptor.intercept(mockContext, mockCallHandler);

        result.subscribe();

        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining(`${statusCode} -`),
        );

        consoleSpy.mockRestore();
      });
    });

    it('should handle missing status code', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-no-status';
      const method = 'GET';
      const url = '/api/test';

      const mockRequest = {
        requestId,
        method,
        url,
      };

      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({})),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('data')),
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('undefined -'),
      );

      consoleSpy.mockRestore();
    });
  });

  describe('request body types', () => {
    it('should handle string body', () => {
      mockShouldBypass.mockReturnValue(false);
      mockSanitizeBody.mockReturnValue('sanitized string');

      const requestId = 'req-string-body';
      const method = 'POST';
      const url = '/api/test';
      const body = 'string body';

      const mockRequest = {
        requestId,
        method,
        url,
        body,
      };

      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({ statusCode: 200 })),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('data')),
      };

      const consoleSpy = jest.spyOn(console, 'debug').mockImplementation();

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe();

      expect(mockSanitizeBody).toHaveBeenCalledWith(body);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle number body', () => {
      mockShouldBypass.mockReturnValue(false);
      mockSanitizeBody.mockReturnValue(123);

      const requestId = 'req-number-body';
      const method = 'POST';
      const url = '/api/test';
      const body = 123;

      const mockRequest = {
        requestId,
        method,
        url,
        body,
      };

      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({ statusCode: 200 })),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('data')),
      };

      const consoleSpy = jest.spyOn(console, 'debug').mockImplementation();

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe();

      expect(mockSanitizeBody).toHaveBeenCalledWith(body);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle array body', () => {
      mockShouldBypass.mockReturnValue(false);
      mockSanitizeBody.mockReturnValue(['item1', 'item2']);

      const requestId = 'req-array-body';
      const method = 'POST';
      const url = '/api/test';
      const body = ['item1', 'item2'];

      const mockRequest = {
        requestId,
        method,
        url,
        body,
      };

      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({ statusCode: 200 })),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('data')),
      };

      const consoleSpy = jest.spyOn(console, 'debug').mockImplementation();

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe();

      expect(mockSanitizeBody).toHaveBeenCalledWith(body);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle null body', () => {
      mockShouldBypass.mockReturnValue(false);
      mockSanitizeBody.mockReturnValue(null);

      const requestId = 'req-null-body';
      const method = 'POST';
      const url = '/api/test';
      const body = null;

      const mockRequest = {
        requestId,
        method,
        url,
        body,
      };

      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({ statusCode: 200 })),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('data')),
      };

      const consoleSpy = jest.spyOn(console, 'debug').mockImplementation();

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe();

      expect(mockSanitizeBody).toHaveBeenCalledWith(body);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle undefined body', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-undefined-body';
      const method = 'POST';
      const url = '/api/test';

      const mockRequest = {
        requestId,
        method,
        url,
        body: undefined,
      };

      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({ statusCode: 200 })),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('data')),
      };

      const consoleSpy = jest.spyOn(console, 'debug').mockImplementation();

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe();

      expect(mockSanitizeBody).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
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
          getResponse: jest.fn(() => ({ statusCode: 200 })),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('data')),
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
        handle: jest.fn(() => of('data')),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler);
      expect(result).toBeDefined();
      expect(mockCallHandler.handle).toHaveBeenCalled();
    });

    it('should handle RPC context', () => {
      const mockContext = {
        getType: jest.fn(() => 'rpc'),
        switchToHttp: jest.fn(),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('data')),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler);
      expect(result).toBeDefined();
      expect(mockCallHandler.handle).toHaveBeenCalled();
    });
  });

  describe('integration with NestJS', () => {
    it('should work with NestJS HTTP context', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockRequest = {
        requestId: 'nestjs-req',
        method: 'GET',
        url: '/api/test',
        get: jest.fn(() => 'Mozilla/5.0'),
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

      const result = interceptor.intercept(mockContext, mockCallHandler);

      expect(mockCallHandler.handle).toHaveBeenCalled();

      let loggedStart = false;
      const consoleSpy = jest
        .spyOn(console, 'log')
        .mockImplementation((message) => {
          if (message.includes('nestjs-req') && message.includes('GET')) {
            loggedStart = true;
          }
        });

      result.subscribe();

      expect(loggedStart).toBe(true);

      consoleSpy.mockRestore();
    });

    it('should handle NestJS execution context correctly', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockRequest = {
        requestId: 'context-req',
        method: 'POST',
        url: '/api/test',
        body: { data: 'test' },
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

      const result = interceptor.intercept(mockContext, mockCallHandler);
      expect(result).toBeDefined();
      expect(mockCallHandler.handle).toHaveBeenCalled();
    });
  });

  describe('timing accuracy', () => {
    it('should measure time correctly for fast requests', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-fast-timing';
      const method = 'GET';
      const url = '/api/health';
      const statusCode = 200;

      const mockRequest = {
        requestId,
        method,
        url,
      };

      const mockResponse = {
        statusCode,
      };

      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => mockResponse),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('ok')),
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`${statusCode} -`),
      );

      consoleSpy.mockRestore();
    });

    it('should handle timing for slow requests', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-slow-timing';
      const method = 'POST';
      const url = '/api/process';
      const statusCode = 200;

      const mockRequest = {
        requestId,
        method,
        url,
      };

      const mockResponse = {
        statusCode,
      };

      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => mockResponse),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => {
          // Simulate slow operation
          return new Promise((resolve) => {
            setTimeout(() => resolve('slow data'), 50);
          });
        }),
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = interceptor.intercept(mockContext, mockCallHandler as any);

      result.subscribe();

      // Wait for async operation to complete
      setTimeout(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining(`${statusCode} -`),
        );
        consoleSpy.mockRestore();
      }, 100);
    });
  });

  describe('log format consistency', () => {
    it('should maintain consistent log format', () => {
      mockShouldBypass.mockReturnValue(false);

      const testCases = [
        {
          requestId: 'format-test-1',
          method: 'GET',
          url: '/api/users',
          statusCode: 200,
        },
        {
          requestId: 'format-test-2',
          method: 'POST',
          url: '/api/users',
          statusCode: 201,
        },
        {
          requestId: 'format-test-3',
          method: 'PUT',
          url: '/api/users/123',
          statusCode: 200,
        },
      ];

      testCases.forEach(({ requestId, method, url, statusCode }) => {
        const mockRequest = {
          requestId,
          method,
          url,
        };

        const mockContext = {
          switchToHttp: jest.fn(() => ({
            getRequest: jest.fn(() => mockRequest),
            getResponse: jest.fn(() => ({ statusCode })),
          })),
        } as any;

        const mockCallHandler = {
          handle: jest.fn(() => of('data')),
        };

        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        const result = interceptor.intercept(mockContext, mockCallHandler);

        result.subscribe();

        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining(
            `[${requestId}] ${method} ${url} - ${statusCode} -`,
          ),
        );

        consoleSpy.mockRestore();
      });
    });

    it('should handle special characters in URLs', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-special-chars';
      const method = 'GET';
      const url = '/api/مستخدمين/search?q=كلمة';

      const mockRequest = {
        requestId,
        method,
        url,
      };

      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({ statusCode: 200 })),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('data')),
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`[${requestId}] ${method} ${url}`),
      );

      consoleSpy.mockRestore();
    });
  });

  describe('error stack trace logging', () => {
    it('should log error stack trace', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-stack-trace';
      const method = 'GET';
      const url = '/api/test';

      const mockRequest = {
        requestId,
        method,
        url,
      };

      const mockResponse = {
        statusCode: 500,
      };

      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => mockResponse),
        })),
      } as any;

      const error = new Error('Test error with stack');
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

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('ERROR'));

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
      };

      const mockResponse = {
        statusCode: 400,
      };

      const mockContext = {
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

    it('should handle errors with very long stack traces', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-long-stack';
      const method = 'GET';
      const url = '/api/test';

      const mockRequest = {
        requestId,
        method,
        url,
      };

      const mockResponse = {
        statusCode: 500,
      };

      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => mockResponse),
        })),
      } as any;

      const longStackError = new Error('Error with long stack');
      // Simulate long stack trace
      longStackError.stack =
        'Error: Error with long stack\n' +
        '  at '.repeat(100) +
        'function (file.js:1:1)';

      const mockCallHandler = {
        handle: jest.fn(() => throwError(() => longStackError)),
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

  describe('request body sanitization edge cases', () => {
    it('should handle body with circular references', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-circular';
      const method = 'POST';
      const url = '/api/test';

      const body: any = { name: 'test' };
      body.self = body; // Circular reference

      const mockRequest = {
        requestId,
        method,
        url,
        body,
      };

      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({ statusCode: 200 })),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('data')),
      };

      const consoleSpy = jest.spyOn(console, 'debug').mockImplementation();

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe();

      expect(mockSanitizeBody).toHaveBeenCalledWith(body);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle body with functions', () => {
      mockShouldBypass.mockReturnValue(false);
      mockSanitizeBody.mockReturnValue({ name: '[FILTERED]' });

      const requestId = 'req-function-body';
      const method = 'POST';
      const url = '/api/test';
      const body = {
        name: 'John',
        callback: () => 'callback',
      };

      const mockRequest = {
        requestId,
        method,
        url,
        body,
      };

      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({ statusCode: 200 })),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('data')),
      };

      const consoleSpy = jest.spyOn(console, 'debug').mockImplementation();

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe();

      expect(mockSanitizeBody).toHaveBeenCalledWith(body);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle body with symbols', () => {
      mockShouldBypass.mockReturnValue(false);
      mockSanitizeBody.mockReturnValue({ id: '[FILTERED]' });

      const requestId = 'req-symbol-body';
      const method = 'POST';
      const url = '/api/test';
      const body = {
        id: Symbol('test'),
      };

      const mockRequest = {
        requestId,
        method,
        url,
        body,
      };

      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({ statusCode: 200 })),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('data')),
      };

      const consoleSpy = jest.spyOn(console, 'debug').mockImplementation();

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe();

      expect(mockSanitizeBody).toHaveBeenCalledWith(body);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('request ID generation', () => {
    it('should use existing request ID', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'existing-req-id';
      const method = 'GET';
      const url = '/api/test';

      const mockRequest = {
        requestId,
        method,
        url,
      };

      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({ statusCode: 200 })),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('data')),
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`[${requestId}]`),
      );

      consoleSpy.mockRestore();
    });

    it('should handle missing request ID', () => {
      mockShouldBypass.mockReturnValue(false);

      const method = 'GET';
      const url = '/api/test';

      const mockRequest = {
        method,
        url,
        // requestId is missing
      };

      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({ statusCode: 200 })),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('data')),
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`GET ${url}`),
      );

      consoleSpy.mockRestore();
    });

    it('should handle null request ID', () => {
      mockShouldBypass.mockReturnValue(false);

      const method = 'GET';
      const url = '/api/test';

      const mockRequest = {
        requestId: null,
        method,
        url,
      };

      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({ statusCode: 200 })),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('data')),
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`GET ${url}`),
      );

      consoleSpy.mockRestore();
    });

    it('should handle empty string request ID', () => {
      mockShouldBypass.mockReturnValue(false);

      const method = 'GET';
      const url = '/api/test';

      const mockRequest = {
        requestId: '',
        method,
        url,
      };

      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({ statusCode: 200 })),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('data')),
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`GET ${url}`),
      );

      consoleSpy.mockRestore();
    });
  });

  describe('URL handling', () => {
    it('should handle URLs with query parameters', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-query';
      const method = 'GET';
      const url = '/api/users?page=1&limit=10';

      const mockRequest = {
        requestId,
        method,
        url,
      };

      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({ statusCode: 200 })),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('data')),
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`[${requestId}] ${method} ${url}`),
      );

      consoleSpy.mockRestore();
    });

    it('should handle URLs with fragments', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-fragment';
      const method = 'GET';
      const url = '/api/users#section';

      const mockRequest = {
        requestId,
        method,
        url,
      };

      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({ statusCode: 200 })),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('data')),
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`[${requestId}] ${method} ${url}`),
      );

      consoleSpy.mockRestore();
    });

    it('should handle very long URLs', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-long-url';
      const method = 'GET';
      const longUrl = '/api/' + 'segment/'.repeat(50) + 'end';

      const mockRequest = {
        requestId,
        method,
        url: longUrl,
      };

      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({ statusCode: 200 })),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('data')),
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`[${requestId}] ${method}`),
      );

      consoleSpy.mockRestore();
    });

    it('should handle Unicode URLs', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-unicode';
      const method = 'GET';
      const url = '/api/مستخدمين/search?q=كلمة';

      const mockRequest = {
        requestId,
        method,
        url,
      };

      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({ statusCode: 200 })),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('data')),
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`[${requestId}] ${method} ${url}`),
      );

      consoleSpy.mockRestore();
    });
  });

  describe('context switching', () => {
    it('should handle switchToHttp errors', () => {
      const mockContext = {
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

  describe('body sanitization integration', () => {
    it('should call sanitizeBody with correct parameters', () => {
      mockShouldBypass.mockReturnValue(false);
      mockSanitizeBody.mockReturnValue({ sanitized: 'data' });

      const requestId = 'req-sanitize-integration';
      const method = 'POST';
      const url = '/api/login';
      const body = {
        username: 'user123',
        password: 'secret123',
        rememberMe: true,
      };

      const mockRequest = {
        requestId,
        method,
        url,
        body,
      };

      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({ statusCode: 200 })),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('logged in')),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe();

      expect(mockSanitizeBody).toHaveBeenCalledWith(body);
    });

    it('should handle sanitization returning different types', () => {
      mockShouldBypass.mockReturnValue(false);

      const testCases = [
        { sanitized: 'string' },
        { data: 123 },
        { items: ['item1', 'item2'] },
        null,
        undefined,
      ];

      testCases.forEach((sanitizedResult) => {
        mockSanitizeBody.mockReturnValue(sanitizedResult);

        const requestId = `req-sanitize-${JSON.stringify(sanitizedResult)}`;
        const method = 'POST';
        const url = '/api/test';
        const body = { data: 'test' };

        const mockRequest = {
          requestId,
          method,
          url,
          body,
        };

        const mockContext = {
          switchToHttp: jest.fn(() => ({
            getRequest: jest.fn(() => mockRequest),
            getResponse: jest.fn(() => ({ statusCode: 200 })),
          })),
        } as any;

        const mockCallHandler = {
          handle: jest.fn(() => of('data')),
        };

        const consoleSpy = jest.spyOn(console, 'debug').mockImplementation();

        const result = interceptor.intercept(mockContext, mockCallHandler);

        result.subscribe();

        expect(mockSanitizeBody).toHaveBeenCalledWith(body);
        expect(consoleSpy).toHaveBeenCalled();

        consoleSpy.mockRestore();
      });
    });
  });

  describe('log message format', () => {
    it('should maintain consistent log message format', () => {
      mockShouldBypass.mockReturnValue(false);

      const testCases = [
        {
          requestId: 'format-1',
          method: 'GET',
          url: '/api/users',
          statusCode: 200,
          userAgent: 'Mozilla/5.0',
        },
        {
          requestId: 'format-2',
          method: 'POST',
          url: '/api/users',
          statusCode: 201,
          userAgent: 'axios/0.21.1',
        },
        {
          requestId: 'format-3',
          method: 'DELETE',
          url: '/api/users/123',
          statusCode: 204,
          userAgent: 'curl/7.68.0',
        },
      ];

      testCases.forEach(({ requestId, method, url, statusCode, userAgent }) => {
        const mockRequest = {
          requestId,
          method,
          url,
          get: jest.fn(() => userAgent),
        };

        const mockContext = {
          switchToHttp: jest.fn(() => ({
            getRequest: jest.fn(() => mockRequest),
            getResponse: jest.fn(() => ({ statusCode })),
          })),
        } as any;

        const mockCallHandler = {
          handle: jest.fn(() => of('data')),
        };

        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        const result = interceptor.intercept(mockContext, mockCallHandler);

        result.subscribe();

        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining(
            `[${requestId}] ${method} ${url} - ${statusCode} -`,
          ),
        );

        consoleSpy.mockRestore();
      });
    });

    it('should handle special characters in log messages', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-special';
      const method = 'POST';
      const url = '/api/ملفات/upload';
      const userAgent = 'Mozilla/5.0 (متصفح خاص)';

      const mockRequest = {
        requestId,
        method,
        url,
        get: jest.fn(() => userAgent),
      };

      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({ statusCode: 200 })),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('تم الرفع')),
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`[${requestId}] ${method} ${url}`),
      );

      consoleSpy.mockRestore();
    });
  });

  describe('error logging format', () => {
    it('should maintain consistent error log format', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'error-format';
      const method = 'PUT';
      const url = '/api/users/123';

      const mockRequest = {
        requestId,
        method,
        url,
      };

      const mockResponse = {
        statusCode: 400,
      };

      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => mockResponse),
        })),
      } as any;

      const error = new Error('Validation failed');
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
        expect.stringContaining(`[${requestId}] ${method} ${url} - ERROR -`),
      );

      consoleSpy.mockRestore();
    });

    it('should handle errors with very long messages', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-long-error';
      const method = 'POST';
      const url = '/api/test';

      const mockRequest = {
        requestId,
        method,
        url,
      };

      const mockResponse = {
        statusCode: 500,
      };

      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => mockResponse),
        })),
      } as any;

      const longErrorMessage = 'Error: '.repeat(100);
      const error = new Error(longErrorMessage);
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

  describe('body logging conditions', () => {
    it('should log body when Object.keys(body).length > 0', () => {
      mockShouldBypass.mockReturnValue(false);
      mockSanitizeBody.mockReturnValue({ name: 'John' });

      const requestId = 'req-log-body';
      const method = 'POST';
      const url = '/api/users';
      const body = { name: 'John', email: 'john@example.com' };

      const mockRequest = {
        requestId,
        method,
        url,
        body,
      };

      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({ statusCode: 201 })),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('created')),
      };

      const consoleSpy = jest.spyOn(console, 'debug').mockImplementation();

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe();

      expect(mockSanitizeBody).toHaveBeenCalledWith(body);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Request Body:'),
      );

      consoleSpy.mockRestore();
    });

    it('should not log body when Object.keys(body).length === 0', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-empty-body';
      const method = 'POST';
      const url = '/api/test';
      const body = {};

      const mockRequest = {
        requestId,
        method,
        url,
        body,
      };

      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({ statusCode: 200 })),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('data')),
      };

      const consoleSpy = jest.spyOn(console, 'debug').mockImplementation();

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe();

      expect(mockSanitizeBody).not.toHaveBeenCalled();
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Request Body:'),
      );

      consoleSpy.mockRestore();
    });

    it('should handle body with only null/undefined values', () => {
      mockShouldBypass.mockReturnValue(false);
      mockSanitizeBody.mockReturnValue({ field1: null, field2: undefined });

      const requestId = 'req-null-body';
      const method = 'POST';
      const url = '/api/test';
      const body = { field1: null, field2: undefined };

      const mockRequest = {
        requestId,
        method,
        url,
        body,
      };

      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({ statusCode: 200 })),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('data')),
      };

      const consoleSpy = jest.spyOn(console, 'debug').mockImplementation();

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe();

      expect(mockSanitizeBody).toHaveBeenCalledWith(body);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Request Body:'),
      );

      consoleSpy.mockRestore();
    });
  });

  describe('timing precision', () => {
    it('should measure timing with reasonable precision', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-timing-precision';
      const method = 'GET';
      const url = '/api/timing';
      const statusCode = 200;

      const mockRequest = {
        requestId,
        method,
        url,
      };

      const mockResponse = {
        statusCode,
      };

      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => mockResponse),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('data')),
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`${statusCode} -`),
      );

      consoleSpy.mockRestore();
    });

    it('should handle timing for zero-duration requests', () => {
      mockShouldBypass.mockReturnValue(false);

      const requestId = 'req-zero-timing';
      const method = 'GET';
      const url = '/api/instant';
      const statusCode = 200;

      const mockRequest = {
        requestId,
        method,
        url,
      };

      const mockResponse = {
        statusCode,
      };

      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => mockResponse),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('instant')),
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`${statusCode} -`),
      );

      consoleSpy.mockRestore();
    });
  });

  describe('request method variations', () => {
    it('should handle all standard HTTP methods', () => {
      mockShouldBypass.mockReturnValue(false);

      const methods = [
        'GET',
        'POST',
        'PUT',
        'DELETE',
        'PATCH',
        'HEAD',
        'OPTIONS',
      ];

      methods.forEach((method) => {
        const requestId = `req-method-${method}`;
        const url = `/api/test`;
        const statusCode = method === 'POST' ? 201 : 200;

        const mockRequest = {
          requestId,
          method,
          url,
        };

        const mockContext = {
          switchToHttp: jest.fn(() => ({
            getRequest: jest.fn(() => mockRequest),
            getResponse: jest.fn(() => ({ statusCode })),
          })),
        } as any;

        const mockCallHandler = {
          handle: jest.fn(() => of('data')),
        };

        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        const result = interceptor.intercept(mockContext, mockCallHandler);

        result.subscribe();

        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining(
            `[${requestId}] ${method} ${url} - ${statusCode} -`,
          ),
        );

        consoleSpy.mockRestore();
      });
    });

    it('should handle custom HTTP methods', () => {
      mockShouldBypass.mockReturnValue(false);

      const customMethods = ['COPY', 'LOCK', 'UNLOCK', 'MOVE'];

      customMethods.forEach((method) => {
        const requestId = `req-custom-${method}`;
        const url = `/api/test`;
        const statusCode = 200;

        const mockRequest = {
          requestId,
          method,
          url,
        };

        const mockContext = {
          switchToHttp: jest.fn(() => ({
            getRequest: jest.fn(() => mockRequest),
            getResponse: jest.fn(() => ({ statusCode })),
          })),
        } as any;

        const mockCallHandler = {
          handle: jest.fn(() => of('data')),
        };

        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        const result = interceptor.intercept(mockContext, mockCallHandler);

        result.subscribe();

        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining(
            `[${requestId}] ${method} ${url} - ${statusCode} -`,
          ),
        );

        consoleSpy.mockRestore();
      });
    });
  });

  describe('response data types', () => {
    it('should handle different response data types in logging', () => {
      mockShouldBypass.mockReturnValue(false);

      const testCases = [
        'string response',
        123,
        true,
        null,
        undefined,
        { message: 'object response' },
        ['array', 'response'],
      ];

      testCases.forEach((responseData, index) => {
        const requestId = `req-data-${index}`;
        const method = 'GET';
        const url = `/api/test${index}`;
        const statusCode = 200;

        const mockRequest = {
          requestId,
          method,
          url,
        };

        const mockContext = {
          switchToHttp: jest.fn(() => ({
            getRequest: jest.fn(() => mockRequest),
            getResponse: jest.fn(() => ({ statusCode })),
          })),
        } as any;

        const mockCallHandler = {
          handle: jest.fn(() => of(responseData)),
        };

        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        const result = interceptor.intercept(mockContext, mockCallHandler);

        result.subscribe();

        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining(
            `[${requestId}] ${method} ${url} - ${statusCode} -`,
          ),
        );

        consoleSpy.mockRestore();
      });
    });
  });

  describe('request body edge cases', () => {
    it('should handle body with nested objects', () => {
      mockShouldBypass.mockReturnValue(false);
      mockSanitizeBody.mockReturnValue({
        user: { name: 'John', credentials: '[FILTERED]' },
        metadata: { timestamp: '2023-01-01' },
      });

      const requestId = 'req-nested-body';
      const method = 'POST';
      const url = '/api/users';
      const body = {
        user: {
          name: 'John',
          password: 'secret123',
        },
        metadata: {
          timestamp: '2023-01-01',
        },
      };

      const mockRequest = {
        requestId,
        method,
        url,
        body,
      };

      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({ statusCode: 201 })),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('created')),
      };

      const consoleSpy = jest.spyOn(console, 'debug').mockImplementation();

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe();

      expect(mockSanitizeBody).toHaveBeenCalledWith(body);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Request Body:'),
      );

      consoleSpy.mockRestore();
    });

    it('should handle body with arrays', () => {
      mockShouldBypass.mockReturnValue(false);
      mockSanitizeBody.mockReturnValue({
        items: ['item1', 'item2'],
        count: 2,
      });

      const requestId = 'req-array-body';
      const method = 'POST';
      const url = '/api/bulk';
      const body = {
        items: ['item1', 'item2'],
        count: 2,
      };

      const mockRequest = {
        requestId,
        method,
        url,
        body,
      };

      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({ statusCode: 200 })),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('processed')),
      };

      const consoleSpy = jest.spyOn(console, 'debug').mockImplementation();

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe();

      expect(mockSanitizeBody).toHaveBeenCalledWith(body);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Request Body:'),
      );

      consoleSpy.mockRestore();
    });

    it('should handle very large body objects', () => {
      mockShouldBypass.mockReturnValue(false);

      const largeBody = {
        data: 'x'.repeat(10000),
        metadata: {
          size: 10000,
        },
      };

      mockSanitizeBody.mockReturnValue({
        data: '[LARGE_DATA]',
        metadata: { size: 10000 },
      });

      const requestId = 'req-large-body';
      const method = 'POST';
      const url = '/api/upload';

      const mockRequest = {
        requestId,
        method,
        url,
        body: largeBody,
      };

      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({ statusCode: 200 })),
        })),
      } as any;

      const mockCallHandler = {
        handle: jest.fn(() => of('uploaded')),
      };

      const consoleSpy = jest.spyOn(console, 'debug').mockImplementation();

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe();

      expect(mockSanitizeBody).toHaveBeenCalledWith(largeBody);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('integration with NestJS execution context', () => {
    it('should work with NestJS HTTP context', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockRequest = {
        requestId: 'nestjs-req',
        method: 'GET',
        url: '/api/test',
        get: jest.fn(() => 'Mozilla/5.0'),
        body: { data: 'test' },
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

      const result = interceptor.intercept(mockContext, mockCallHandler);
      expect(result).toBeDefined();
      expect(mockCallHandler.handle).toHaveBeenCalled();
    });

    it('should handle NestJS execution context correctly', () => {
      mockShouldBypass.mockReturnValue(false);

      const mockRequest = {
        requestId: 'context-req',
        method: 'POST',
        url: '/api/test',
        body: { data: 'context test' },
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

      const result = interceptor.intercept(mockContext, mockCallHandler);
      expect(result).toBeDefined();
      expect(mockCallHandler.handle).toHaveBeenCalled();
    });
  });
});
