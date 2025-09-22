// src/common/swagger.ts
import { applyDecorators } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOkResponse,
  getSchemaPath,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { ApiResponseDto } from 'src/modules/documents/dto/common.dto';

import type { Type } from '@nestjs/common';

export const Ok = <TModel extends Type<any>>(
  model: TModel,
  description = 'OK',
) =>
  applyDecorators(
    ApiExtraModels(ApiResponseDto, model),
    ApiOkResponse({
      description,
      schema: {
        allOf: [
          { $ref: getSchemaPath(ApiResponseDto) },
          {
            properties: {
              data: { $ref: getSchemaPath(model) },
            },
          },
        ],
      },
    }),
  );

export const Created = <TModel extends Type<any>>(
  model: TModel,
  description = 'Created',
) =>
  applyDecorators(
    ApiExtraModels(ApiResponseDto, model),
    ApiCreatedResponse({
      description,
      schema: {
        allOf: [
          { $ref: getSchemaPath(ApiResponseDto) },
          {
            properties: {
              data: { $ref: getSchemaPath(model) },
            },
          },
        ],
      },
    }),
  );
