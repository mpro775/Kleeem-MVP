// dto/query-plans.dto.ts
import { IsOptional, IsIn, IsNumberString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
export class QueryPlansDto {
  @ApiPropertyOptional({ enum: ['true', 'false'] }) @IsOptional() isActive?:
    | 'true'
    | 'false';
  @ApiPropertyOptional({ enum: ['true', 'false'] }) @IsOptional() isTrial?:
    | 'true'
    | 'false';
  @ApiPropertyOptional({
    enum: ['priceAsc', 'priceDesc', 'createdDesc', 'createdAsc'],
  })
  @IsOptional()
  @IsIn(['priceAsc', 'priceDesc', 'createdDesc', 'createdAsc'])
  sort?: 'priceAsc' | 'priceDesc' | 'createdDesc' | 'createdAsc';
  @ApiPropertyOptional({ example: '1' })
  @IsOptional()
  @IsNumberString()
  page?: string;
  @ApiPropertyOptional({ example: '20' })
  @IsOptional()
  @IsNumberString()
  limit?: string;
}
