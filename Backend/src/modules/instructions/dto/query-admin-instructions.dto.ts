import { Type } from 'class-transformer';
import {
  IsOptional,
  IsBooleanString,
  IsIn,
  IsInt,
  Min,
  Max,
  IsString,
} from 'class-validator';

export class QueryAdminInstructionsDto {
  @IsOptional()
  @IsString()
  merchantId?: string;

  @IsOptional()
  @IsBooleanString()
  active?: string;

  @IsOptional()
  @IsIn(['auto', 'manual'])
  type?: 'auto' | 'manual';

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  limit = 30;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page = 1;
}
