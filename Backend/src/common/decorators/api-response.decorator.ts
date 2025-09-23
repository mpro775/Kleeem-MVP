// src/common/decorators/api-response.decorator.ts
import { applyDecorators } from '@nestjs/common';
import {
  ApiResponse as SwaggerApiResponse,
  getSchemaPath,
} from '@nestjs/swagger';

import type { Type } from '@nestjs/common';

/** Decorator لتوثيق الاستجابات في Swagger */
export function ApiResponse<T extends Type<unknown>>(
  model: T,
  status: number = 200,
  description?: string,
): ReturnType<typeof applyDecorators> {
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
export function ApiSuccessResponse<T extends Type<unknown>>(
  model: T,
  description?: string,
): ReturnType<typeof applyDecorators> {
  return ApiResponse(model, 200, description || 'تمت العملية بنجاح');
}

/** Decorator للاستجابة المحدثة */
export function ApiCreatedResponse<T extends Type<unknown>>(
  model: T,
  description?: string,
): ReturnType<typeof applyDecorators> {
  return ApiResponse(model, 201, description || 'تم الإنشاء بنجاح');
}

/** Decorator للاستجابة المحذوفة */
export function ApiDeletedResponse(
  description?: string,
): ReturnType<typeof applyDecorators> {
  return applyDecorators(
    SwaggerApiResponse({
      status: 204,
      description: description || 'تم الحذف بنجاح',
    }),
  );
}
