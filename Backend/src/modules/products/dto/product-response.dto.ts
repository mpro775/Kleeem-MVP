import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer'; // أضف هذا
import { IsMongoId, IsOptional } from 'class-validator';

import { Currency } from '../enums/product.enums';
import { ProductVariant } from '../schemas/product-variant.schema';
export class ProductResponseDto {
  @ApiProperty({ description: 'المعرف الفريد للمنتج' })
  @Expose()
  _id?: string;

  @ApiProperty({ description: 'معرف التاجر مالك المنتج' })
  @Expose()
  merchantId?: string;

  @ApiProperty({ description: 'الرابط الأصلي للمنتج' })
  @Expose()
  originalUrl?: string;

  // الحقول الجديدة
  @ApiProperty({ description: 'اسم المنصة المصدر', example: 'zid' })
  @Expose()
  platform?: string;

  @ApiProperty({ description: 'اسم المنتج', example: '' })
  @Expose()
  name?: string;

  @ApiProperty({ description: 'السعر', example: 0 })
  @Expose()
  price?: number;

  @ApiProperty({ description: 'هل المنتج متوفر؟', example: true })
  @Expose()
  isAvailable?: boolean;

  @ApiProperty({ description: 'وصف المنتج', example: '' })
  @Expose()
  description?: string;

  @ApiProperty({ description: 'الصور', type: [String] })
  @Expose()
  images?: string[];

  @IsOptional()
  @IsMongoId()
  @Expose()
  category?: string;

  @ApiProperty({ description: 'حالة التوفر المنخفض', example: '' })
  @Expose()
  lowQuantity?: string;

  @ApiProperty({ description: 'المواصفات الإضافية', type: [String] })
  @Expose()
  specsBlock?: string[];

  @ApiProperty({ description: 'الكلمات المفتاحية', type: [String] })
  @Expose()
  keywords?: string[];

  @ApiProperty({ description: 'المواصفات الإضافية', type: [String] })
  @Expose()
  attributes?: Record<string, string[]>;

  @Expose() currency?: Currency;

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
    description: 'آخر تحديث جزئي (minimal)',
    type: String,
    format: 'date-time',
  })
  @Expose()
  lastFetchedAt?: Date;

  @ApiProperty({
    description: 'آخر تحديث شامل (full)',
    type: String,
    format: 'date-time',
  })
  @Expose()
  lastFullScrapedAt?: Date;

  @ApiProperty({
    description: 'حالة الخطأ عند السكريبينج إن وجدت',
    example: null,
    required: false,
  })
  @Expose()
  errorState?: string;

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
