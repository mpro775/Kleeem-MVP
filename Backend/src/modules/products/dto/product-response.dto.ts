import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer'; // أضف هذا
import { IsMongoId, IsOptional } from 'class-validator';

import { Currency } from '../enums/product.enums';
import { ProductVariant } from '../schemas/product-variant.schema';
const EXAMPLE_PRICE_YER = 5000;
const EXAMPLE_PRICE_SAR = 75;
const EXAMPLE_PRICE_USD = 20;
export class ProductResponseDto {
  @ApiProperty({ description: 'المعرف الفريد للمنتج' })
  @Expose()
  _id?: string;

  @ApiProperty({ description: 'معرف التاجر مالك المنتج' })
  @Expose()
  merchantId?: string;

  // الحقول الجديدة
  @ApiProperty({ description: 'اسم المنصة المصدر', example: 'zid' })
  @Expose()
  platform?: string;

  @ApiProperty({ description: 'اسم المنتج', example: '' })
  @Expose()
  name?: string;

  @ApiPropertyOptional({ description: 'وصف قصير للمنتج' })
  @Expose()
  shortDescription?: string;

  @ApiProperty({ description: 'هل المنتج متوفر؟', example: true })
  @Expose()
  isAvailable?: boolean;

  @ApiPropertyOptional({
    description: 'وصف تفصيلي غني (HTML/JSON)',
    example: '<p>تفاصيل المنتج...</p>',
  })
  @Expose()
  richDescription?: string;

  @ApiProperty({ description: 'الصور', type: [String] })
  @Expose()
  images?: string[];

  @IsOptional()
  @IsMongoId()
  @Expose()
  category?: string;

  @ApiProperty({ description: 'المواصفات الإضافية', type: [String] })
  @Expose()
  specsBlock?: string[];

  @ApiProperty({ description: 'الكلمات المفتاحية', type: [String] })
  @Expose()
  keywords?: string[];

  @ApiPropertyOptional({
    description: 'ملصقات العرض على الكارت',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        label: { type: 'string' },
        color: { type: 'string' },
        showOnCard: { type: 'boolean' },
        order: { type: 'number' },
      },
    },
  })
  @Expose()
  badges?: {
    label: string;
    color?: string | null;
    showOnCard?: boolean;
    order?: number;
  }[];

  @ApiProperty({
    description: 'سمات المنتج (keySlug/valueSlugs)',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        keySlug: { type: 'string' },
        valueSlugs: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  @Expose()
  attributes?: { keySlug: string; valueSlugs: string[] }[];

  @Expose() currency?: Currency;
  @ApiProperty({
    description: 'أسعار متعددة العملات',
    type: 'object',
    additionalProperties: { type: 'number' },
    example: {
      YER: EXAMPLE_PRICE_YER,
      SAR: EXAMPLE_PRICE_SAR,
      USD: EXAMPLE_PRICE_USD,
    },
  })
  @Expose()
  prices?: Record<string, number>;
  @ApiProperty({
    description: 'السعر بالعملة الأساسية (YER)',
    example: EXAMPLE_PRICE_YER,
  })
  @Expose()
  priceDefault?: number;

  @Expose() offer?: {
    enabled: boolean;
    oldPrice?: number;
    newPrice?: number;
    startAt?: string;
    endAt?: string;
  };
  @Expose() hasActiveOffer?: boolean;
  @Expose() priceEffective?: number;
  @ApiProperty({
    description: 'السلاج المخصص للمنتج',
    example: 'my-product-slug',
  })
  @Expose()
  slug?: string;

  @ApiProperty({
    description: 'السلاج المخصص للمتجر',
    example: 'my-store-slug',
  })
  @Expose()
  storefrontSlug?: string;

  @ApiProperty({ description: 'النطاق المخصص للمتجر', example: 'my-store.com' })
  @Expose()
  storefrontDomain?: string;

  // ============ نظام المتغيرات ============
  @ApiPropertyOptional({
    description: 'متغيرات المنتج',
    type: [ProductVariant],
  })
  @Expose()
  @Type(() => ProductVariant)
  variants?: ProductVariant[];

  @ApiPropertyOptional({ description: 'هل المنتج يحتوي على متغيرات؟' })
  @Expose()
  hasVariants?: boolean;

  // ============ نوع المنتج ============
  @ApiPropertyOptional({
    description: 'نوع المنتج',
    enum: ['physical', 'digital', 'service'],
  })
  @Expose()
  productType?: 'physical' | 'digital' | 'service';

  @ApiPropertyOptional({
    description: 'معلومات الملف الرقمي',
    type: 'object',
    additionalProperties: true,
  })
  @Expose()
  digitalAsset?: {
    downloadUrl: string;
    fileSize?: number;
    format?: string;
  };

  @ApiPropertyOptional({ description: 'هل المخزون غير محدود؟' })
  @Expose()
  isUnlimitedStock?: boolean;

  // ============ نظام المخزون ============
  @ApiPropertyOptional({ description: 'كمية المخزون المتاحة' })
  @Expose()
  stock?: number;

  @ApiPropertyOptional({ description: 'عتبة التنبيه للمخزون المنخفض' })
  @Expose()
  lowStockThreshold?: number | null;

  // ============ حالة النشر ============
  @ApiPropertyOptional({
    description: 'حالة المنتج',
    enum: ['draft', 'published', 'scheduled', 'archived'],
  })
  @Expose()
  status?: 'draft' | 'published' | 'scheduled' | 'archived';

  @ApiPropertyOptional({
    description: 'تاريخ النشر',
    type: Date,
  })
  @Expose()
  publishedAt?: Date;

  @ApiPropertyOptional({
    description: 'تاريخ النشر المؤجل',
    type: Date,
  })
  @Expose()
  scheduledPublishAt?: Date;

  // ============ المنتجات الشبيهة ============
  @ApiPropertyOptional({
    description: 'معرفات المنتجات الشبيهة',
    type: [String],
  })
  @Expose()
  relatedProducts?: string[];
}
