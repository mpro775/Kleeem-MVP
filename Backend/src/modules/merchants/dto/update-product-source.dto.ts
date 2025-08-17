import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export type ProductSource = 'internal' | 'salla' | 'zid';

/**
 * تحديث مصدر منتجات التاجر
 * @description يحدد مصدر بيانات المنتجات الذي سيقوم النظام بالاستيراد منه
 */
export class UpdateProductSourceDto {
  @ApiProperty({
    description: 'مصدر المنتجات',
    enum: ['internal', 'salla', 'zid'],
    example: 'salla',
    required: true
  })
  @IsIn(['internal', 'salla', 'zid'], {
    message: 'يجب أن يكون مصدر المنتجات إما internal أو salla أو zid'
  })
  source: ProductSource;
}
