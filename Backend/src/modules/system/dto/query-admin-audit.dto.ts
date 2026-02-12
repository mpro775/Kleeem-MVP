import { Type } from 'class-transformer';
import { IsOptional, IsString, IsInt, Min } from 'class-validator';

export class QueryAdminAuditDto {
  @IsOptional()
  @IsString()
  actorId?: string;

  @IsOptional()
  @IsString()
  resource?: string;

  @IsOptional()
  @IsString()
  from?: string; // ISO date

  @IsOptional()
  @IsString()
  to?: string; // ISO date

  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit = 50;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;
}
