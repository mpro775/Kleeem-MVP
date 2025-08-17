// src/modules/kleem/botChats/dto/query-bot-ratings.dto.ts
import { IsOptional, IsIn, IsInt, Min, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryBotRatingsDto {
  @IsOptional()
  @IsIn(['1', '0']) // 1=like, 0=dislike
  rating?: '1' | '0';

  @IsOptional()
  @IsString()
  q?: string; // بحث في نص رد البوت أو الـ feedback

  @IsOptional()
  @IsString()
  sessionId?: string;

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
