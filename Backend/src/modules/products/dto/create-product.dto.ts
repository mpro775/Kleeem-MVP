// src/modules/products/dto/create-product.dto.ts
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsNumber,
  IsBoolean,
  IsDate,
  ValidateIf,
  IsUrl,
  IsEnum,
  IsMongoId,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
export enum ProductSource {
  MANUAL = 'manual',
  API = 'api',
  SCRAPER = 'scraper',
}
export class CreateProductDto {
  @ApiProperty({
    description: 'الرابط الأصلي للمنتج (من المتجر)',
    example: 'https://example.com/product/123',
  })
  @IsString()
  @IsNotEmpty()
  originalUrl: string;

  @ApiProperty({
    description: 'معرّف التاجر',
    example: '60f7e1a2b4c3d2e1f0a9b8c7',
  })
  @IsString()
  @IsNotEmpty()
  merchantId: string;

  @ApiPropertyOptional({ description: 'اسم المنتج', example: 'عطر فاخر' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'سعر المنتج', example: 150.75 })
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiPropertyOptional({ description: 'هل المنتج متوفر؟', example: true })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @ApiProperty({ description: 'مصدر المنتج', enum: ProductSource })
  @IsEnum(ProductSource)
  source: ProductSource;
  // للرابط أو endpoint الخاص بالـ API أو صفحة المنتج (لـ scraper)
  @ApiPropertyOptional({
    description: 'رابط المنتج أو API URL',
    example: 'https://...',
  })
  @ValidateIf(
    (o) => o.source === ProductSource.API || o.source === ProductSource.SCRAPER,
  )
  @IsUrl()
  sourceUrl?: string;

  // معرّف المنتج في الـ API الخارجي
  @ApiPropertyOptional({
    description: 'معرّف المنتج في API خارجي',
    example: '12345',
  })
  @ValidateIf((o) => o.source === ProductSource.API)
  @IsString()
  externalId?: string;
  @ApiPropertyOptional({
    description: 'كلمات مفتاحية مرتبطة بالمنتج',
    example: ['عطر', 'فرنسي', 'فاخر'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @ApiPropertyOptional({
    description: 'المنصة التي تم جلب المنتج منها',
    example: 'Salla',
  })
  @IsOptional()
  @IsString()
  platform?: string;

  @ApiPropertyOptional({
    description: 'وصف المنتج',
    example: 'عطر رجالي بعبق العود والمسك.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'روابط الصور الخاصة بالمنتج',
    example: ['https://img.com/1.jpg', 'https://img.com/2.jpg'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsMongoId()
  category?: string;

  @ApiPropertyOptional({
    description: 'الكمية المنخفضة التي تنذر بالنفاد',
    example: '5',
  })
  @IsOptional()
  @IsString()
  lowQuantity?: string;

  @ApiPropertyOptional({
    description: 'مواصفات المنتج بتنسيق نصوص',
    example: ['الحجم: 100ml', 'النوع: بخاخ'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specsBlock?: string[];

  @ApiPropertyOptional({
    description: 'تاريخ آخر تحديث جزئي للمنتج',
    example: new Date().toISOString(),
    type: String,
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  lastFetchedAt?: Date;

  @ApiPropertyOptional({
    description: 'تاريخ آخر تحديث كامل للمنتج',
    example: new Date().toISOString(),
    type: String,
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  lastFullScrapedAt?: Date;
}
