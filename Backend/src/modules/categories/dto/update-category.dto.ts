// src/modules/categories/dto/update-category.dto.ts

import { PartialType } from '@nestjs/swagger';

import { CreateCategoryDto } from './create-category.dto';

/**
 * DTO لتحديث فئة. يرث من CreateCategoryDto ويجعل جميع خصائصه اختيارية.
 */
export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}
