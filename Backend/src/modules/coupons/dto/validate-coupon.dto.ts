// src/modules/coupons/dto/validate-coupon.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsArray,
  ValidateNested,
  IsOptional,
} from 'class-validator';

export class CartItemDto {
  @ApiProperty({
    description: 'معرّف المنتج',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString({ message: 'يجب أن يكون معرّف المنتج نصياً' })
  @IsNotEmpty({ message: 'معرّف المنتج مطلوب' })
  productId!: string;

  @ApiPropertyOptional({
    description: 'معرّف الفئة',
    example: '507f1f77bcf86cd799439012',
  })
  @IsString({ message: 'يجب أن يكون معرّف الفئة نصياً' })
  @IsOptional()
  categoryId?: string;

  @ApiProperty({ description: 'السعر', example: 100, minimum: 0 })
  @IsNumber({}, { message: 'يجب أن يكون السعر رقمياً' })
  @Min(0, { message: 'السعر يجب أن يكون أكبر من أو يساوي صفر' })
  price!: number;

  @ApiProperty({ description: 'الكمية', example: 2, minimum: 1 })
  @IsNumber({}, { message: 'يجب أن تكون الكمية رقمية' })
  @Min(1, { message: 'الكمية يجب أن تكون على الأقل 1' })
  quantity!: number;
}

export class ValidateCouponDto {
  @ApiProperty({ description: 'كود الكوبون', example: 'SUMMER2025' })
  @IsString({ message: 'يجب أن يكون كود الكوبون نصياً' })
  @IsNotEmpty({ message: 'كود الكوبون مطلوب' })
  code!: string;

  @ApiProperty({
    description: 'معرّف التاجر',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString({ message: 'يجب أن يكون معرّف التاجر نصياً' })
  @IsNotEmpty({ message: 'معرّف التاجر مطلوب' })
  merchantId!: string;

  @ApiPropertyOptional({
    description: 'رقم هاتف العميل',
    example: '+966501234567',
  })
  @IsString({ message: 'يجب أن يكون رقم الهاتف نصياً' })
  @IsOptional()
  customerPhone?: string;

  @ApiProperty({
    description: 'عناصر السلة',
    type: [CartItemDto],
  })
  @IsArray({ message: 'يجب أن تكون عناصر السلة مصفوفة' })
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  cartItems!: CartItemDto[];

  @ApiProperty({
    description: 'المبلغ الإجمالي للسلة',
    example: 500,
    minimum: 0,
  })
  @IsNumber({}, { message: 'يجب أن يكون المبلغ الإجمالي رقمياً' })
  @Min(0, { message: 'المبلغ الإجمالي يجب أن يكون أكبر من أو يساوي صفر' })
  totalAmount!: number;
}
