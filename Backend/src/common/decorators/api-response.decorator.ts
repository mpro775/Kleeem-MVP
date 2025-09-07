// src/common/decorators/api-response.decorator.ts
import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiResponse as SwaggerApiResponse,
  getSchemaPath,
} from '@nestjs/swagger';

/** Decorator لتوثيق الاستجابات في Swagger */
export function ApiResponse<T extends Type<any>>(
  model: T,
  status: number = 200,
  description?: string,
) {
  return applyDecorators(
    SwaggerApiResponse({
      status,
      description,
      schema: {
        allOf: [
          {
            properties: {
              success: { type: 'boolean' },
              data: { $ref: getSchemaPath(model) },
              requestId: { type: 'string' },
              timestamp: { type: 'string' },
            },
          },
        ],
      },
    }),
  );
}

/** Decorator للاستجابة الناجحة */
export function ApiSuccessResponse<T extends Type<any>>(
  model: T,
  description?: string,
) {
  return ApiResponse(model, 200, description || 'تمت العملية بنجاح');
}

/** Decorator للاستجابة المحدثة */
export function ApiCreatedResponse<T extends Type<any>>(
  model: T,
  description?: string,
) {
  return ApiResponse(model, 201, description || 'تم الإنشاء بنجاح');
}

/** Decorator للاستجابة المحذوفة */
export function ApiDeletedResponse(description?: string) {
  return applyDecorators(
    SwaggerApiResponse({
      status: 204,
      description: description || 'تم الحذف بنجاح',
    }),
  );
}
