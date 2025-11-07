import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  ValidateNested,
} from 'class-validator';

import { I18nMessage } from '../../../common/validators/i18n-validator';
import { Currency } from '../enums/product.enums';

import { OfferDto } from './offer.dto';
import { CreateVariantDto } from './product-variant.dto';

export enum ProductSource {
  MANUAL = 'manual',
  API = 'api',
  SCRAPER = 'scraper',
}

const EXAMPLE_PRICE = 99.99;
const EXAMPLE_STOCK = 50;
const EXAMPLE_WEIGHT = 250;
const EXAMPLE_FILE_SIZE = 1024000;
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

  // ============ نظام المتغيرات ============
  @ApiPropertyOptional({
    description: 'متغيرات المنتج (ألوان، مقاسات، إلخ)',
    type: [CreateVariantDto],
    example: [
      {
        sku: 'TSHIRT-RED-L',
        barcode: '1234567890123',
        attributes: { color: 'أحمر', size: 'L' },
        price: EXAMPLE_PRICE,
        stock: EXAMPLE_STOCK,
        lowStockThreshold: 10,
        images: ['https://example.com/red-l.jpg'],
        isAvailable: true,
        weight: EXAMPLE_WEIGHT,
      },
    ],
  })
  @IsOptional()
  @IsArray(I18nMessage('validation.array'))
  @ValidateNested({ each: true })
  @Type(() => CreateVariantDto)
  variants?: CreateVariantDto[];

  @ApiPropertyOptional({
    description: 'هل المنتج يحتوي على متغيرات؟',
    example: false,
  })
  @IsOptional()
  @IsBoolean(I18nMessage('validation.boolean'))
  hasVariants?: boolean;

  // ============ نوع المنتج ============
  @ApiPropertyOptional({
    description: 'نوع المنتج',
    enum: ['physical', 'digital', 'service'],
    example: 'physical',
  })
  @IsOptional()
  @IsEnum(['physical', 'digital', 'service'], I18nMessage('validation.enum'))
  productType?: 'physical' | 'digital' | 'service';

  @ApiPropertyOptional({
    description: 'معلومات الملف الرقمي (للمنتجات الرقمية فقط)',
    type: 'object',
    additionalProperties: true,
    example: {
      downloadUrl: 'https://example.com/download/file.pdf',
      fileSize: EXAMPLE_FILE_SIZE,
      format: 'PDF',
    },
  })
  @IsOptional()
  @IsObject(I18nMessage('validation.object'))
  digitalAsset?: {
    downloadUrl: string;
    fileSize?: number;
    format?: string;
  };

  @ApiPropertyOptional({
    description: 'هل المخزون غير محدود؟ (للمنتجات الرقمية والخدمات)',
    example: false,
  })
  @IsOptional()
  @IsBoolean(I18nMessage('validation.boolean'))
  isUnlimitedStock?: boolean;

  // ============ حالة النشر ============
  @ApiPropertyOptional({
    description: 'حالة المنتج',
    enum: ['draft', 'published', 'scheduled', 'archived'],
    example: 'published',
  })
  @IsOptional()
  @IsEnum(
    ['draft', 'published', 'scheduled', 'archived'],
    I18nMessage('validation.enum'),
  )
  status?: 'draft' | 'published' | 'scheduled' | 'archived';

  @ApiPropertyOptional({
    description: 'تاريخ النشر',
    type: Date,
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate(I18nMessage('validation.date'))
  publishedAt?: Date;

  @ApiPropertyOptional({
    description: 'تاريخ النشر المؤجل',
    type: Date,
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate(I18nMessage('validation.date'))
  scheduledPublishAt?: Date;

  // ============ المنتجات الشبيهة ============
  @ApiPropertyOptional({
    description: 'معرفات المنتجات الشبيهة (حد أقصى 10)',
    type: [String],
    example: ['507f1f77bcf86cd799439011', '507f191e810c19729de860ea'],
  })
  @IsOptional()
  @IsArray(I18nMessage('validation.array'))
  @IsMongoId(I18nMessage('validation.mongoId', { each: true }))
  @Max(10, I18nMessage('validation.max'))
  relatedProducts?: string[];
}
