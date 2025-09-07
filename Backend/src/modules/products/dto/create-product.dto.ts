import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Currency } from '../enums/product.enums';
import { OfferDto } from './offer.dto';

export enum ProductSource {
  MANUAL = 'manual',
  API = 'api',
  SCRAPER = 'scraper',
}

export class CreateProductDto {
  @IsOptional() @IsString() originalUrl?: string;
  @IsOptional() @IsString() sourceUrl?: string;
  @IsOptional() @IsString() externalId?: string;
  @IsOptional() @IsString() platform?: string;

  @IsString() name!: string;
  @IsOptional() @IsString() description?: string;

  @Type(() => Number)
  @IsNumber()
  price!: number;

  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency = Currency.SAR;

  @IsOptional()
  @ValidateNested()
  @Type(() => OfferDto)
  offer?: OfferDto;

  @IsOptional() @IsBoolean() isAvailable?: boolean = true;

  @IsString() category!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specsBlock?: string[] = [];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[] = [];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[] = [];

  @IsOptional()
  @IsEnum(ProductSource)
  source?: ProductSource = ProductSource.MANUAL;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    example: { color: ['أسود', 'أزرق'], المقاس: ['M', 'L'] },
    description: 'خصائص متعددة القيم: مفتاح → مصفوفة قيم',
  })
  @IsOptional()
  @IsObject()
  attributes?: Record<string, string[]>;

  @IsOptional()
  @IsString()
  lowQuantity?: string;

  @IsOptional()
  @IsString()
  slug?: string;
  
  @IsOptional()
  @IsString()
  storefrontSlug?: string;
  
  @IsOptional()
  @IsString()
  storefrontDomain?: string;
}
