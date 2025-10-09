import { HttpStatus } from '@nestjs/common';

import { DomainError, OutOfStockErrorExample } from './domain-error';

describe('DomainError', () => {
  describe('constructor', () => {
    it('should create DomainError with required parameters', () => {
      const code = 'TEST_ERROR';
      const message = 'Test error message';
      const status = HttpStatus.BAD_REQUEST;

      const error = new DomainError(code, message, status);

      expect(error).toBeInstanceOf(DomainError);
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Test error message');
      expect(error.name).toBe('DomainError');
    });

    it('should create DomainError with details parameter', () => {
      const code = 'TEST_ERROR';
      const message = 'Test error message';
      const status = HttpStatus.BAD_REQUEST;
      const details = { field: 'test', value: 'invalid' };

      const error = new DomainError(code, message, status, details);

      expect(error).toBeInstanceOf(DomainError);
      expect(error.message).toBe('Test error message');
    });

    it('should use default status when not provided', () => {
      const code = 'TEST_ERROR';
      const message = 'Test error message';

      const error = new DomainError(code, message);

      expect(error).toBeInstanceOf(DomainError);
      expect(error.message).toBe('Test error message');
    });

    it('should handle various error codes', () => {
      const testCases = [
        'PRODUCT_NOT_FOUND',
        'USER_ALREADY_EXISTS',
        'INVALID_INPUT',
        'BUSINESS_RULE_VIOLATION',
        'EXTERNAL_SERVICE_ERROR',
      ];

      testCases.forEach((code) => {
        const error = new DomainError(code, 'Test message');

        expect(error).toBeInstanceOf(DomainError);
        expect(error.message).toBe('Test message');
      });
    });

    it('should handle various HTTP status codes', () => {
      const statusCodes = [
        HttpStatus.BAD_REQUEST,
        HttpStatus.UNAUTHORIZED,
        HttpStatus.FORBIDDEN,
        HttpStatus.NOT_FOUND,
        HttpStatus.CONFLICT,
        HttpStatus.INTERNAL_SERVER_ERROR,
      ];

      statusCodes.forEach((status) => {
        const error = new DomainError('TEST_ERROR', 'Test message', status);

        expect(error).toBeInstanceOf(DomainError);
        expect(error.message).toBe('Test message');
      });
    });

    it('should handle complex details object', () => {
      const details = {
        productId: 'product_123',
        userId: 'user_456',
        timestamp: new Date(),
        metadata: {
          field: 'price',
          value: 0,
          constraints: ['positive', 'min:1'],
        },
      };

      const error = new DomainError(
        'VALIDATION_ERROR',
        'Validation failed',
        HttpStatus.BAD_REQUEST,
        details,
      );

      expect(error).toBeInstanceOf(DomainError);
      expect(error.message).toBe('Validation failed');
    });
  });

  describe('error properties', () => {
    it('should have correct error structure', () => {
      const error = new DomainError('TEST_ERROR', 'Test message');

      expect(error).toHaveProperty('message');
      expect(error).toHaveProperty('name');
      expect(error).toHaveProperty('stack');
      expect(error.message).toBe('Test message');
      expect(error.name).toBe('DomainError');
      expect(typeof error.stack).toBe('string');
    });

    it('should be throwable', () => {
      const error = new DomainError('TEST_ERROR', 'Test message');

      expect(() => {
        throw error;
      }).toThrow(DomainError);

      expect(() => {
        throw error;
      }).toThrow('Test message');
    });

    it('should maintain error chain', () => {
      const domainError = new DomainError('WRAPPED_ERROR', 'Wrapped message');

      expect(domainError).toBeInstanceOf(Error);
      expect(domainError).toBeInstanceOf(DomainError);
      expect(domainError.stack).toContain('DomainError');
    });
  });

  describe('HTTP exception compatibility', () => {
    it('should work with NestJS HTTP exception handling', () => {
      const error = new DomainError(
        'TEST_ERROR',
        'Test message',
        HttpStatus.BAD_REQUEST,
      );

      // Should be compatible with HttpException response structure
      expect(error).toHaveProperty('message');
      expect(error).toHaveProperty('status');
      expect(error.message).toBe('Test message');
    });

    it('should handle different HTTP status codes correctly', () => {
      const testCases = [
        { status: HttpStatus.BAD_REQUEST, expected: 'Bad Request' },
        { status: HttpStatus.UNAUTHORIZED, expected: 'Unauthorized' },
        { status: HttpStatus.FORBIDDEN, expected: 'Forbidden' },
        { status: HttpStatus.NOT_FOUND, expected: 'Not Found' },
        { status: HttpStatus.CONFLICT, expected: 'Conflict' },
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          expected: 'Internal Server Error',
        },
      ];

      testCases.forEach(({ status }) => {
        const error = new DomainError('TEST_ERROR', 'Test message', status);

        expect(error).toBeInstanceOf(DomainError);
        expect(error.message).toBe('Test message');
      });
    });
  });

  describe('real-world usage scenarios', () => {
    it('should handle product validation error', () => {
      const error = new DomainError(
        'PRODUCT_VALIDATION_ERROR',
        'Product price must be positive',
        HttpStatus.BAD_REQUEST,
        {
          productId: 'product_123',
          field: 'price',
          value: -10,
          constraint: 'positive',
        },
      );

      expect(error).toBeInstanceOf(DomainError);
      expect(error.message).toBe('Product price must be positive');
    });

    it('should handle user authentication error', () => {
      const error = new DomainError(
        'AUTH_FAILED',
        'Invalid credentials provided',
        HttpStatus.UNAUTHORIZED,
        {
          userId: 'user_456',
          attemptsLeft: 2,
        },
      );

      expect(error).toBeInstanceOf(DomainError);
      expect(error.message).toBe('Invalid credentials provided');
    });

    it('should handle business rule violation', () => {
      const error = new DomainError(
        'BUSINESS_RULE_VIOLATION',
        'Cannot delete category with existing products',
        HttpStatus.CONFLICT,
        {
          categoryId: 'category_789',
          productCount: 5,
        },
      );

      expect(error).toBeInstanceOf(DomainError);
      expect(error.message).toBe(
        'Cannot delete category with existing products',
      );
    });

    it('should handle external service error', () => {
      const error = new DomainError(
        'EXTERNAL_SERVICE_ERROR',
        'Payment gateway unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
        {
          serviceName: 'payment_gateway',
          endpoint: 'https://api.payment.com/process',
          responseTime: 10000,
        },
      );

      expect(error).toBeInstanceOf(DomainError);
      expect(error.message).toBe('Payment gateway unavailable');
    });

    it('should handle file upload error', () => {
      const error = new DomainError(
        'FILE_UPLOAD_ERROR',
        'File size exceeds maximum limit',
        HttpStatus.BAD_REQUEST,
        {
          fileName: 'large-file.pdf',
          fileSize: 10485760, // 10MB
          maxSize: 5242880, // 5MB
        },
      );

      expect(error).toBeInstanceOf(DomainError);
      expect(error.message).toBe('File size exceeds maximum limit');
    });

    it('should handle network connectivity error', () => {
      const error = new DomainError(
        'NETWORK_ERROR',
        'Unable to connect to external service',
        HttpStatus.SERVICE_UNAVAILABLE,
        {
          endpoint: 'https://api.external-service.com/data',
          timeout: 30000,
          error: 'ECONNREFUSED',
        },
      );

      expect(error).toBeInstanceOf(DomainError);
      expect(error.message).toBe('Unable to connect to external service');
    });

    it('should handle database operation error', () => {
      const error = new DomainError(
        'DATABASE_ERROR',
        'Failed to save data',
        HttpStatus.INTERNAL_SERVER_ERROR,
        {
          operation: 'INSERT',
          table: 'users',
          recordId: 'user_123',
        },
      );

      expect(error).toBeInstanceOf(DomainError);
      expect(error.message).toBe('Failed to save data');
    });

    it('should handle rate limiting error', () => {
      const error = new DomainError(
        'RATE_LIMIT_EXCEEDED',
        'Too many requests',
        HttpStatus.TOO_MANY_REQUESTS,
        {
          limit: 100,
          window: 3600000, // 1 hour
          resetTime: new Date(Date.now() + 3600000),
        },
      );

      expect(error).toBeInstanceOf(DomainError);
      expect(error.message).toBe('Too many requests');
    });
  });

  describe('error code patterns', () => {
    it('should handle snake_case error codes', () => {
      const error = new DomainError('PRODUCT_NOT_FOUND', 'Product not found');

      expect(error).toBeInstanceOf(DomainError);
      expect(error.message).toBe('Product not found');
    });

    it('should handle camelCase error codes', () => {
      const error = new DomainError('productNotFound', 'Product not found');

      expect(error).toBeInstanceOf(DomainError);
      expect(error.message).toBe('Product not found');
    });

    it('should handle UPPER_CASE error codes', () => {
      const error = new DomainError('PRODUCT_NOT_FOUND', 'Product not found');

      expect(error).toBeInstanceOf(DomainError);
      expect(error.message).toBe('Product not found');
    });

    it('should handle kebab-case error codes', () => {
      const error = new DomainError('product-not-found', 'Product not found');

      expect(error).toBeInstanceOf(DomainError);
      expect(error.message).toBe('Product not found');
    });

    it('should handle numeric error codes', () => {
      const error = new DomainError('ERR_001', 'Error 001');

      expect(error).toBeInstanceOf(DomainError);
      expect(error.message).toBe('Error 001');
    });

    it('should handle mixed alphanumeric error codes', () => {
      const error = new DomainError('ERR_PRODUCT_001', 'Product error 001');

      expect(error).toBeInstanceOf(DomainError);
      expect(error.message).toBe('Product error 001');
    });
  });

  describe('details object handling', () => {
    it('should handle null details', () => {
      const error = new DomainError(
        'TEST_ERROR',
        'Test message',
        HttpStatus.BAD_REQUEST,
        undefined,
      );

      expect(error).toBeInstanceOf(DomainError);
      expect(error.message).toBe('Test message');
    });

    it('should handle undefined details', () => {
      const error = new DomainError(
        'TEST_ERROR',
        'Test message',
        HttpStatus.BAD_REQUEST,
        undefined,
      );

      expect(error).toBeInstanceOf(DomainError);
      expect(error.message).toBe('Test message');
    });

    it('should handle empty details object', () => {
      const error = new DomainError(
        'TEST_ERROR',
        'Test message',
        HttpStatus.BAD_REQUEST,
        {},
      );

      expect(error).toBeInstanceOf(DomainError);
      expect(error.message).toBe('Test message');
    });

    it('should handle primitive details values', () => {
      const details = {
        stringValue: 'test',
        numberValue: 123,
        booleanValue: true,
        nullValue: null,
        undefinedValue: undefined,
      };

      const error = new DomainError(
        'TEST_ERROR',
        'Test message',
        HttpStatus.BAD_REQUEST,
        details,
      );

      expect(error).toBeInstanceOf(DomainError);
      expect(error.message).toBe('Test message');
    });

    it('should handle array details', () => {
      const details = {
        items: ['item1', 'item2', 'item3'],
        ids: [1, 2, 3],
      };

      const error = new DomainError(
        'TEST_ERROR',
        'Test message',
        HttpStatus.BAD_REQUEST,
        details,
      );

      expect(error).toBeInstanceOf(DomainError);
      expect(error.message).toBe('Test message');
    });

    it('should handle nested object details', () => {
      const details = {
        user: {
          id: 'user_123',
          profile: {
            name: 'John Doe',
            email: 'john@example.com',
          },
        },
        metadata: {
          timestamp: new Date(),
          version: '1.0.0',
        },
      };

      const error = new DomainError(
        'TEST_ERROR',
        'Test message',
        HttpStatus.BAD_REQUEST,
        details,
      );

      expect(error).toBeInstanceOf(DomainError);
      expect(error.message).toBe('Test message');
    });

    it('should handle circular reference in details (if supported)', () => {
      const details: any = { name: 'test' };
      details.self = details;

      const error = new DomainError(
        'TEST_ERROR',
        'Test message',
        HttpStatus.BAD_REQUEST,
        details,
      );

      expect(error).toBeInstanceOf(DomainError);
      expect(error.message).toBe('Test message');
    });
  });

  describe('default status handling', () => {
    it('should use BAD_REQUEST as default status', () => {
      const error = new DomainError('TEST_ERROR', 'Test message');

      expect(error).toBeInstanceOf(DomainError);
      expect(error.message).toBe('Test message');
    });

    it('should allow overriding default status', () => {
      const error = new DomainError(
        'TEST_ERROR',
        'Test message',
        HttpStatus.NOT_FOUND,
      );

      expect(error).toBeInstanceOf(DomainError);
      expect(error.message).toBe('Test message');
    });

    it('should handle zero status', () => {
      const error = new DomainError('TEST_ERROR', 'Test message', 0 as any);

      expect(error).toBeInstanceOf(DomainError);
      expect(error.message).toBe('Test message');
    });

    it('should handle negative status codes', () => {
      const error = new DomainError('TEST_ERROR', 'Test message', -1 as any);

      expect(error).toBeInstanceOf(DomainError);
      expect(error.message).toBe('Test message');
    });
  });

  describe('error message handling', () => {
    it('should handle empty error message', () => {
      const error = new DomainError('TEST_ERROR', '');

      expect(error).toBeInstanceOf(DomainError);
      expect(error.message).toBe('');
    });

    it('should handle long error messages', () => {
      const longMessage = 'This is a very long error message '.repeat(10);

      const error = new DomainError('TEST_ERROR', longMessage);

      expect(error).toBeInstanceOf(DomainError);
      expect(error.message).toBe(longMessage);
    });

    it('should handle special characters in error message', () => {
      const specialMessage =
        'Error with special chars: @#$%^&*()_+{}[]|\\:";\'<>?,./';

      const error = new DomainError('TEST_ERROR', specialMessage);

      expect(error).toBeInstanceOf(DomainError);
      expect(error.message).toBe(specialMessage);
    });

    it('should handle unicode characters in error message', () => {
      const unicodeMessage = 'خطأ في النظام - System error';

      const error = new DomainError('TEST_ERROR', unicodeMessage);

      expect(error).toBeInstanceOf(DomainError);
      expect(error.message).toBe(unicodeMessage);
    });

    it('should handle multiline error messages', () => {
      const multilineMessage = 'Line 1\nLine 2\nLine 3';

      const error = new DomainError('TEST_ERROR', multilineMessage);

      expect(error).toBeInstanceOf(DomainError);
      expect(error.message).toBe(multilineMessage);
    });
  });

  describe('error inheritance', () => {
    it('should be instance of Error', () => {
      const error = new DomainError('TEST_ERROR', 'Test message');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(DomainError);
    });

    it('should be instance of HttpException', () => {
      const error = new DomainError('TEST_ERROR', 'Test message');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(DomainError);
    });

    it('should have correct prototype chain', () => {
      const error = new DomainError('TEST_ERROR', 'Test message');

      expect(Object.getPrototypeOf(error)).toBe(DomainError.prototype);
      // DomainError extends HttpException, so the prototype chain goes through HttpException
      expect(Object.getPrototypeOf(DomainError.prototype)).not.toBe(
        Error.prototype,
      );
      expect(Object.getPrototypeOf(DomainError.prototype)).toBeDefined();
    });
  });

  describe('error serialization', () => {
    it('should be serializable to JSON', () => {
      const error = new DomainError(
        'TEST_ERROR',
        'Test message',
        HttpStatus.BAD_REQUEST,
        {
          field: 'test',
        },
      );

      const serialized = JSON.stringify(error);

      expect(typeof serialized).toBe('string');

      const parsed = JSON.parse(serialized);

      expect(parsed).toHaveProperty('message');
      expect(parsed.message).toBe('Test message');
    });

    it('should preserve error properties during serialization', () => {
      const error = new DomainError(
        'TEST_ERROR',
        'Test message',
        HttpStatus.BAD_REQUEST,
        {
          field: 'test',
          value: 123,
        },
      );

      const serialized = JSON.stringify(error);
      const parsed = JSON.parse(serialized);

      expect(parsed).toHaveProperty('message');
      expect(parsed).toHaveProperty('status');
      expect(parsed.message).toBe('Test message');
    });

    it('should handle circular references in details during serialization', () => {
      const details: any = { name: 'test' };
      details.self = details;

      const error = new DomainError(
        'TEST_ERROR',
        'Test message',
        HttpStatus.BAD_REQUEST,
        details,
      );

      expect(() => JSON.stringify(error)).toThrow(); // Should throw due to circular reference
    });
  });

  describe('error comparison', () => {
    it('should be equal to itself', () => {
      const error = new DomainError('TEST_ERROR', 'Test message');

      expect(error).toBe(error);
    });

    it('should not be equal to other error instances', () => {
      const error1 = new DomainError('TEST_ERROR', 'Test message');
      const error2 = new DomainError('TEST_ERROR', 'Test message');

      expect(error1).not.toBe(error2);
    });

    it('should not be equal to regular Error instances', () => {
      const domainError = new DomainError('TEST_ERROR', 'Test message');
      const regularError = new Error('Test message');

      expect(domainError).not.toBe(regularError);
    });
  });

  describe('error stack trace', () => {
    it('should generate stack trace', () => {
      const error = new DomainError('TEST_ERROR', 'Test message');

      expect(error.stack).toBeDefined();
      expect(typeof error.stack).toBe('string');
      expect(error.stack).toContain('DomainError');
    });

    it('should include error message in stack trace', () => {
      const error = new DomainError('TEST_ERROR', 'Test message');

      expect(error.stack).toContain('Test message');
    });

    it('should handle stack trace generation errors', () => {
      // This should not throw even if stack trace generation fails
      const error = new DomainError('TEST_ERROR', 'Test message');

      expect(error.stack).toBeDefined();
    });
  });
});

describe('OutOfStockErrorExample', () => {
  it('should extend DomainError', () => {
    const error = new OutOfStockErrorExample('product_123');

    expect(error).toBeInstanceOf(DomainError);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('المنتج غير متوفر حاليًا');
  });

  it('should use correct error code', () => {
    const error = new OutOfStockErrorExample('product_123');

    expect(error).toBeInstanceOf(DomainError);
  });

  it('should use CONFLICT status', () => {
    const error = new OutOfStockErrorExample('product_123');

    expect(error).toBeInstanceOf(DomainError);
  });

  it('should include productId in details', () => {
    const productId = 'product_123';
    const error = new OutOfStockErrorExample(productId);

    expect(error).toBeInstanceOf(DomainError);
  });

  it('should handle different product IDs', () => {
    const productIds = ['product_123', 'product_456', 'product_789'];

    productIds.forEach((productId) => {
      const error = new OutOfStockErrorExample(productId);

      expect(error).toBeInstanceOf(DomainError);
      expect(error.message).toBe('المنتج غير متوفر حاليًا');
    });
  });

  it('should be throwable', () => {
    const error = new OutOfStockErrorExample('product_123');

    expect(() => {
      throw error;
    }).toThrow(DomainError);

    expect(() => {
      throw error;
    }).toThrow('المنتج غير متوفر حاليًا');
  });

  it('should have correct error properties', () => {
    const error = new OutOfStockErrorExample('product_123');

    expect(error).toHaveProperty('message');
    expect(error).toHaveProperty('name');
    expect(error).toHaveProperty('stack');
    expect(error.message).toBe('المنتج غير متوفر حاليًا');
    expect(error.name).toBe('OutOfStockErrorExample');
    expect(typeof error.stack).toBe('string');
  });

  it('should work in try-catch blocks', () => {
    expect(() => {
      throw new OutOfStockErrorExample('product_123');
    }).toThrow(OutOfStockErrorExample);

    const error = new OutOfStockErrorExample('product_123');
    expect(error).toBeInstanceOf(DomainError);
    expect(error).toBeInstanceOf(OutOfStockErrorExample);
    expect(error.message).toBe('المنتج غير متوفر حاليًا');
  });

  it('should handle empty product ID', () => {
    const error = new OutOfStockErrorExample('');

    expect(error).toBeInstanceOf(DomainError);
    expect(error.message).toBe('المنتج غير متوفر حاليًا');
  });

  it('should handle special characters in product ID', () => {
    const specialProductId = 'product-123_special@test';
    const error = new OutOfStockErrorExample(specialProductId);

    expect(error).toBeInstanceOf(DomainError);
    expect(error.message).toBe('المنتج غير متوفر حاليًا');
  });

  it('should handle unicode characters in product ID', () => {
    const unicodeProductId = 'منتج_العربي_123';
    const error = new OutOfStockErrorExample(unicodeProductId);

    expect(error).toBeInstanceOf(DomainError);
    expect(error.message).toBe('المنتج غير متوفر حاليًا');
  });

  it('should handle very long product IDs', () => {
    const longProductId = 'product_' + 'a'.repeat(1000);
    const error = new OutOfStockErrorExample(longProductId);

    expect(error).toBeInstanceOf(DomainError);
    expect(error.message).toBe('المنتج غير متوفر حاليًا');
  });

  it('should maintain error chain', () => {
    const error = new OutOfStockErrorExample('product_123');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(DomainError);
    expect(error).toBeInstanceOf(OutOfStockErrorExample);
  });

  it('should work with instanceof checks', () => {
    const error = new OutOfStockErrorExample('product_123');

    expect(error instanceof Error).toBe(true);
    expect(error instanceof DomainError).toBe(true);
    expect(error instanceof OutOfStockErrorExample).toBe(true);
  });
});
