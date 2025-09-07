// src/modules/categories/dto/move-category.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsOptional, IsNumber, Min } from 'class-validator';

export class MoveCategoryDto {
  @ApiProperty({ required: false, description: 'الأب الجديد أو null للجذر' })
  @IsOptional()
  @IsMongoId()
  parent?: string | null;

  @ApiProperty({ required: false, description: 'ضع العقدة بعد هذا الأخ' })
  @IsOptional()
  @IsMongoId()
  afterId?: string | null;

  @ApiProperty({ required: false, description: 'ضع العقدة قبل هذا الأخ' })
  @IsOptional()
  @IsMongoId()
  beforeId?: string | null;

  @ApiProperty({
    required: false,
    description: 'موضع ترتيبي (0..n) بين الإخوة',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  position?: number | null;
}
