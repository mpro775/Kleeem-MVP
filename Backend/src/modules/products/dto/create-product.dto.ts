import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
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

import { I18nMessage } from '../../../common/validators/i18n-validator';
import { Currency } from '../enums/product.enums';

import { OfferDto } from './offer.dto';

export enum ProductSource {
  MANUAL = 'manual',
  API = 'api',
  SCRAPER = 'scraper',
}

export class CreateProductDto {
  @IsOptional()
  @IsString(I18nMessage('validation.string'))
  originalUrl?: string;
  @IsOptional() @IsString(I18nMessage('validation.string')) sourceUrl?: string;
  @IsOptional() @IsString(I18nMessage('validation.string')) externalId?: string;
  @IsOptional() @IsString(I18nMessage('validation.string')) platform?: string;

  @IsString(I18nMessage('validation.string')) name!: string;
  @IsOptional()
  @IsString(I18nMessage('validation.string'))
  description?: string;

  @Type(() => Number)
  @IsNumber({}, I18nMessage('validation.number'))
  price!: number;

  @IsOptional()
  @IsEnum(Currency, I18nMessage('validation.enum'))
  currency?: Currency = Currency.SAR;

  @IsOptional()
  @ValidateNested()
  @Type(() => OfferDto)
  offer?: OfferDto;

  @IsOptional()
  @IsBoolean(I18nMessage('validation.boolean'))
  isAvailable?: boolean = true;

  @IsString(I18nMessage('validation.string'))
  category!: string;

  @IsOptional()
  @IsArray(I18nMessage('validation.array'))
  @IsString(I18nMessage('validation.string', { each: true }))
  specsBlock?: string[] = [];

  @IsOptional()
  @IsArray(I18nMessage('validation.array'))
  @IsString(I18nMessage('validation.string', { each: true }))
  keywords?: string[] = [];

  @IsOptional()
  @IsArray(I18nMessage('validation.array'))
  @IsString(I18nMessage('validation.string', { each: true }))
  images?: string[] = [];

  @IsOptional()
  @IsEnum(ProductSource, I18nMessage('validation.enum'))
  source?: ProductSource = ProductSource.MANUAL;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    example: { color: ['أسود', 'أزرق'], المقاس: ['M', 'L'] },
    description: 'خصائص متعددة القيم: مفتاح → مصفوفة قيم',
  })
  @IsOptional()
  @IsObject(I18nMessage('validation.object'))
  attributes?: Record<string, string[]>;

  @IsOptional()
  @IsString(I18nMessage('validation.string'))
  lowQuantity?: string;

  @IsOptional()
  @IsString(I18nMessage('validation.string'))
  slug?: string;

  @IsOptional()
  @IsString(I18nMessage('validation.string'))
  storefrontSlug?: string;

  @IsOptional()
  @IsString(I18nMessage('validation.string'))
  storefrontDomain?: string;
}
