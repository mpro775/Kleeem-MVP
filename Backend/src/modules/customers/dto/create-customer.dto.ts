// src/modules/customers/dto/create-customer.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsArray, IsObject, IsIn } from 'class-validator';
import { SignupSource } from '../schemas/customer.schema';

export class CreateCustomerDto {
  @ApiProperty({
    description: 'معرّف التاجر',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString()
  merchantId!: string;

  @ApiProperty({
    description: 'اسم العميل',
    example: 'أحمد محمد',
  })
  @IsString()
  name!: string;

  @ApiPropertyOptional({
    description: 'البريد الإلكتروني',
    example: 'ahmed@example.com',
  })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({
    description: 'رقم الهاتف',
    example: '+966501234567',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: 'موافقة على التسويق',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  marketingConsent?: boolean;

  @ApiPropertyOptional({
    description: 'قائمة التاجات',
    example: ['VIP', 'loyal'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'بيانات إضافية',
    example: { notes: 'عميل مهم' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'مصدر التسجيل',
    example: 'manual',
    enum: ['otp', 'order', 'lead', 'manual'],
  })
  @IsOptional()
  @IsIn(['otp', 'order', 'lead', 'manual'])
  signupSource?: SignupSource;
}
