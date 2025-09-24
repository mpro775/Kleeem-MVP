import { IsBoolean, IsNumber, IsOptional, IsISO8601 } from 'class-validator';

export class OfferDto {
  @IsBoolean()
  enabled: boolean;

  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  oldPrice?: number;

  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  newPrice?: number;

  @IsOptional()
  @IsISO8601()
  startAt?: string; // ISO string

  @IsOptional()
  @IsISO8601()
  endAt?: string; // ISO string
}
