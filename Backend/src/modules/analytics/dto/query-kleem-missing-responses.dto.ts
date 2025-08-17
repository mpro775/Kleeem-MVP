// src/analytics/dto/query-kleem-missing-responses.dto.ts
import {
  IsOptional,
  IsBooleanString,
  IsIn,
  IsInt,
  Min,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class QueryKleemMissingResponsesDto {
  @IsOptional()
  @IsIn(['telegram', 'whatsapp', 'webchat'])
  channel?: 'telegram' | 'whatsapp' | 'webchat';

  @IsOptional()
  @IsBooleanString()
  resolved?: string; // 'true' | 'false'

  @IsOptional()
  @IsString()
  q?: string; // بحث نصّي في السؤال/تحليل AI/الرد اليدوي

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  from?: string; // ISO date

  @IsOptional()
  @IsString()
  to?: string; // ISO date

  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit = 20;
}
