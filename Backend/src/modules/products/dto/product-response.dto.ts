import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsOptional } from 'class-validator';
import { Expose } from 'class-transformer'; // أضف هذا

export class ProductResponseDto {
  @ApiProperty({ description: 'المعرف الفريد للمنتج' })
  @Expose()
  _id: string;

  @ApiProperty({ description: 'معرف التاجر مالك المنتج' })
  @Expose()
  merchantId: string;

  @ApiProperty({ description: 'الرابط الأصلي للمنتج' })
  @Expose()
  originalUrl: string;

  // الحقول الجديدة
  @ApiProperty({ description: 'اسم المنصة المصدر', example: 'zid' })
  @Expose()
  platform: string;

  @ApiProperty({ description: 'اسم المنتج', example: '' })
  @Expose()
  name: string;

  @ApiProperty({ description: 'السعر', example: 0 })
  @Expose()
  price: number;

  @ApiProperty({ description: 'هل المنتج متوفر؟', example: true })
  @Expose()
  isAvailable: boolean;

  @ApiProperty({ description: 'وصف المنتج', example: '' })
  @Expose()
  description: string;

  @ApiProperty({ description: 'الصور', type: [String] })
  @Expose()
  images: string[];

  @IsOptional()
  @IsMongoId()
  @Expose()
  category: string;

  @ApiProperty({ description: 'حالة التوفر المنخفض', example: '' })
  @Expose()
  lowQuantity: string;

  @ApiProperty({ description: 'المواصفات الإضافية', type: [String] })
  @Expose()
  specsBlock: string[];

  @ApiProperty({ description: 'الكلمات المفتاحية', type: [String] })
  @Expose()
  keywords: string[];

  @ApiProperty({
    description: 'آخر تحديث جزئي (minimal)',
    type: String,
    format: 'date-time',
  })
  @Expose()
  lastFetchedAt: Date;

  @ApiProperty({
    description: 'آخر تحديث شامل (full)',
    type: String,
    format: 'date-time',
  })
  @Expose()
  lastFullScrapedAt: Date;

  @ApiProperty({
    description: 'حالة الخطأ عند السكريبينج إن وجدت',
    example: null,
    required: false,
  })
  @Expose()
  errorState?: string;
}
