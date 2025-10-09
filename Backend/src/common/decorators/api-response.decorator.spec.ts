import { applyDecorators } from '@nestjs/common';
import {
  ApiResponse as SwaggerApiResponse,
  getSchemaPath,
} from '@nestjs/swagger';

import {
  ApiResponse,
  ApiSuccessResponse,
  ApiCreatedResponse,
  ApiDeletedResponse,
} from './api-response.decorator';

// Mock the dependencies
jest.mock('@nestjs/common', () => ({
  applyDecorators: jest.fn(),
}));

jest.mock('@nestjs/swagger', () => ({
  ApiResponse: jest.fn(),
  getSchemaPath: jest.fn(),
}));

describe('ApiResponse Decorators', () => {
  let applyDecoratorsMock: jest.MockedFunction<typeof applyDecorators>;
  let swaggerApiResponseMock: jest.MockedFunction<typeof SwaggerApiResponse>;
  let getSchemaPathMock: jest.MockedFunction<typeof getSchemaPath>;

  beforeEach(() => {
    applyDecoratorsMock = applyDecorators as jest.MockedFunction<
      typeof applyDecorators
    >;
    swaggerApiResponseMock = SwaggerApiResponse as jest.MockedFunction<
      typeof SwaggerApiResponse
    >;
    getSchemaPathMock = getSchemaPath as jest.MockedFunction<
      typeof getSchemaPath
    >;

    // Reset all mocks
    jest.clearAllMocks();

    // Default mock implementations
    applyDecoratorsMock.mockReturnValue((() => {}) as any);
    swaggerApiResponseMock.mockReturnValue((() => {}) as any);
    getSchemaPathMock.mockImplementation(
      (model: any) => `#/components/schemas/${model.name}`,
    );
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('ApiResponse', () => {
    it('should be defined', () => {
      expect(ApiResponse).toBeDefined();
    });

    it('should return a decorator function', () => {
      class TestModel {}
      const decorator = ApiResponse(TestModel);
      expect(typeof decorator).toBe('function');
    });

    it('should call applyDecorators with correct default parameters', () => {
      class TestModel {}

      ApiResponse(TestModel);

      expect(applyDecoratorsMock).toHaveBeenCalledTimes(1);
      expect(swaggerApiResponseMock).toHaveBeenCalledWith({
        status: 200,
        description: undefined,
        schema: {
          allOf: [
            {
              properties: {
                success: { type: 'boolean' },
                data: { $ref: '#/components/schemas/TestModel' },
                requestId: { type: 'string' },
                timestamp: { type: 'string' },
              },
            },
          ],
        },
      });
      expect(getSchemaPathMock).toHaveBeenCalledWith(TestModel);
    });

    it('should use custom status code', () => {
      class TestModel {}

      ApiResponse(TestModel, 404);

      expect(swaggerApiResponseMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 404,
        }),
      );
    });

    it('should use custom description', () => {
      class TestModel {}

      ApiResponse(TestModel, 200, 'Custom description');

      expect(swaggerApiResponseMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 200,
          description: 'Custom description',
        }),
      );
    });

    it('should handle different model types', () => {
      class UserModel {}
      class ProductModel {}

      ApiResponse(UserModel);
      expect(getSchemaPathMock).toHaveBeenCalledWith(UserModel);

      ApiResponse(ProductModel);
      expect(getSchemaPathMock).toHaveBeenCalledWith(ProductModel);
    });

    it('should include all required schema properties', () => {
      class TestModel {}

      ApiResponse(TestModel);

      const swaggerCall = swaggerApiResponseMock.mock.calls[0][0] as any;
      expect(swaggerCall.schema.allOf[0].properties).toEqual({
        success: { type: 'boolean' },
        data: { $ref: '#/components/schemas/TestModel' },
        requestId: { type: 'string' },
        timestamp: { type: 'string' },
      });
    });

    it('should work with different status codes and descriptions', () => {
      class TestModel {}

      const testCases = [
        { status: 200, description: 'Success' },
        { status: 201, description: 'Created' },
        { status: 400, description: 'Bad Request' },
        { status: 404, description: 'Not Found' },
        { status: 500, description: 'Internal Server Error' },
      ];

      testCases.forEach(({ status, description }) => {
        ApiResponse(TestModel, status, description);

        expect(swaggerApiResponseMock).toHaveBeenCalledWith(
          expect.objectContaining({
            status,
            description,
          }),
        );
      });
    });
  });

  describe('ApiSuccessResponse', () => {
    it('should be defined', () => {
      expect(ApiSuccessResponse).toBeDefined();
    });

    it('should call ApiResponse with status 200 and default description', () => {
      class TestModel {}

      ApiSuccessResponse(TestModel);

      expect(swaggerApiResponseMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 200,
          description: 'تمت العملية بنجاح',
        }),
      );
    });

    it('should use custom description', () => {
      class TestModel {}

      ApiSuccessResponse(TestModel, 'Custom success message');

      expect(swaggerApiResponseMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 200,
          description: 'Custom success message',
        }),
      );
    });

    it('should pass the model to ApiResponse', () => {
      class TestModel {}

      ApiSuccessResponse(TestModel);

      expect(getSchemaPathMock).toHaveBeenCalledWith(TestModel);
      const swaggerCall = swaggerApiResponseMock.mock.calls[0][0] as any;
      expect(swaggerCall.schema.allOf[0].properties.data).toEqual({
        $ref: '#/components/schemas/TestModel',
      });
    });
  });

  describe('ApiCreatedResponse', () => {
    it('should be defined', () => {
      expect(ApiCreatedResponse).toBeDefined();
    });

    it('should call ApiResponse with status 201 and default description', () => {
      class TestModel {}

      ApiCreatedResponse(TestModel);

      expect(swaggerApiResponseMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 201,
          description: 'تم الإنشاء بنجاح',
        }),
      );
    });

    it('should use custom description', () => {
      class TestModel {}

      ApiCreatedResponse(TestModel, 'Custom created message');

      expect(swaggerApiResponseMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 201,
          description: 'Custom created message',
        }),
      );
    });

    it('should pass the model to ApiResponse', () => {
      class TestModel {}

      ApiCreatedResponse(TestModel);

      expect(getSchemaPathMock).toHaveBeenCalledWith(TestModel);
    });
  });

  describe('ApiDeletedResponse', () => {
    it('should be defined', () => {
      expect(ApiDeletedResponse).toBeDefined();
    });

    it('should call applyDecorators with correct parameters', () => {
      ApiDeletedResponse();

      expect(applyDecoratorsMock).toHaveBeenCalledTimes(1);
      expect(swaggerApiResponseMock).toHaveBeenCalledWith({
        status: 204,
        description: 'تم الحذف بنجاح',
      });
    });

    it('should use custom description', () => {
      ApiDeletedResponse('Custom delete message');

      expect(swaggerApiResponseMock).toHaveBeenCalledWith({
        status: 204,
        description: 'Custom delete message',
      });
    });

    it('should not call getSchemaPath since it has no model', () => {
      ApiDeletedResponse();

      expect(getSchemaPathMock).not.toHaveBeenCalled();
    });
  });

  describe('decorator composition', () => {
    it('should compose multiple decorators correctly', () => {
      class TestModel {}

      // Test that each function calls applyDecorators once
      ApiSuccessResponse(TestModel);
      expect(applyDecoratorsMock).toHaveBeenCalledTimes(1);

      applyDecoratorsMock.mockClear();

      ApiCreatedResponse(TestModel);
      expect(applyDecoratorsMock).toHaveBeenCalledTimes(1);

      applyDecoratorsMock.mockClear();

      ApiDeletedResponse();
      expect(applyDecoratorsMock).toHaveBeenCalledTimes(1);
    });

    it('should handle decorator chaining', () => {
      class TestModel {}

      const successDecorator = ApiSuccessResponse(TestModel);
      const createdDecorator = ApiCreatedResponse(TestModel);
      const deletedDecorator = ApiDeletedResponse();

      expect(typeof successDecorator).toBe('function');
      expect(typeof createdDecorator).toBe('function');
      expect(typeof deletedDecorator).toBe('function');
    });
  });

  describe('real-world usage scenarios', () => {
    it('should work for user creation endpoint', () => {
      class UserDto {
        id!: string;
        name!: string;
        email!: string;
      }

      ApiCreatedResponse(UserDto, 'تم إنشاء المستخدم بنجاح');

      expect(swaggerApiResponseMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 201,
          description: 'تم إنشاء المستخدم بنجاح',
          schema: expect.objectContaining({
            allOf: expect.arrayContaining([
              expect.objectContaining({
                properties: expect.objectContaining({
                  data: { $ref: '#/components/schemas/UserDto' },
                }),
              }),
            ]),
          }),
        }),
      );
    });

    it('should work for product retrieval endpoint', () => {
      class ProductDto {
        id!: string;
        name!: string;
        price!: number;
      }

      ApiSuccessResponse(ProductDto, 'تم استرجاع المنتج بنجاح');

      expect(swaggerApiResponseMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 200,
          description: 'تم استرجاع المنتج بنجاح',
        }),
      );
    });

    it('should work for delete operation', () => {
      ApiDeletedResponse('تم حذف العنصر بنجاح');

      expect(swaggerApiResponseMock).toHaveBeenCalledWith({
        status: 204,
        description: 'تم حذف العنصر بنجاح',
      });
    });

    it('should handle error responses', () => {
      class ErrorDto {
        message!: string;
        code!: string;
      }

      ApiResponse(ErrorDto, 400, 'خطأ في البيانات المرسلة');

      expect(swaggerApiResponseMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 400,
          description: 'خطأ في البيانات المرسلة',
        }),
      );
    });
  });

  describe('schema structure validation', () => {
    it('should maintain consistent schema structure', () => {
      class TestModel {}

      ApiResponse(TestModel);

      const swaggerCall = swaggerApiResponseMock.mock.calls[0][0] as any;
      const schema = swaggerCall.schema;

      expect(schema).toHaveProperty('allOf');
      expect(Array.isArray(schema.allOf)).toBe(true);
      expect(schema.allOf).toHaveLength(1);

      const schemaProperties = schema.allOf[0].properties;
      expect(schemaProperties).toHaveProperty('success');
      expect(schemaProperties).toHaveProperty('data');
      expect(schemaProperties).toHaveProperty('requestId');
      expect(schemaProperties).toHaveProperty('timestamp');

      expect(schemaProperties.success).toEqual({ type: 'boolean' });
      expect(schemaProperties.data).toEqual({
        $ref: '#/components/schemas/TestModel',
      });
      expect(schemaProperties.requestId).toEqual({ type: 'string' });
      expect(schemaProperties.timestamp).toEqual({ type: 'string' });
    });

    it('should generate correct schema path references', () => {
      class ComplexModel {}

      ApiResponse(ComplexModel);

      expect(getSchemaPathMock).toHaveBeenCalledWith(ComplexModel);
      const swaggerCall = swaggerApiResponseMock.mock.calls[0][0] as any;
      expect(swaggerCall.schema.allOf[0].properties.data.$ref).toBe(
        '#/components/schemas/ComplexModel',
      );
    });
  });

  describe('TypeScript integration', () => {
    it('should accept Type as generic parameter', () => {
      class TestModel {
        id!: string;
      }

      // This should compile without TypeScript errors
      const decorator = ApiSuccessResponse(TestModel as any);
      expect(typeof decorator).toBe('function');
    });

    it('should work with interface-based types', () => {
      // Mock a type that represents an interface
      class MockInterfaceType {
        id!: string;
        name!: string;
        email!: string;
      }

      expect(() => {
        ApiResponse(MockInterfaceType);
      }).not.toThrow();
    });
  });
});
