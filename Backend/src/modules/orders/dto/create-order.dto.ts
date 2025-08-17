import {
  IsString,
  IsArray,
  IsObject,
  IsOptional,
  IsDate,
  IsNotEmpty,
  IsNumber,
  IsEmail,
  IsPhoneNumber,
  ValidateNested,
  ArrayMinSize,
  IsDateString,
  Min,
  IsBoolean,
  IsMongoId
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class OrderItemDto {
  @ApiProperty({
    description: 'معرف المنتج',
    example: 'prod-123',
    required: true
  })
  @IsString({ message: 'يجب أن يكون معرف المنتج نصيًا' })
  @IsNotEmpty({ message: 'معرف المنتج مطلوب' })
  productId: string;

  @ApiProperty({
    description: 'كمية المنتج',
    minimum: 1,
    example: 2,
    required: true
  })
  @IsNumber({}, { message: 'يجب أن تكون الكمية رقمية' })
  @Min(1, { message: 'يجب أن تكون الكمية على الأقل 1' })
  quantity: number;

  @ApiProperty({
    description: 'سعر الوحدة',
    minimum: 0,
    example: 100,
    required: true
  })
  @IsNumber({}, { message: 'يجب أن يكون السعر رقميًا' })
  @Min(0, { message: 'يجب أن يكون السعر أكبر من أو يساوي صفر' })
  price: number;

  @ApiProperty({
    description: 'اسم المنتج',
    example: 'منتج مميز',
    required: true
  })
  @IsString({ message: 'يجب أن يكون اسم المنتج نصيًا' })
  @IsNotEmpty({ message: 'اسم المنتج مطلوب' })
  name: string;

  @ApiPropertyOptional({
    description: 'ملاحظات إضافية على المنتج',
    example: 'اللون: أحجام',
    required: false
  })
  @IsString({ message: 'يجب أن تكون الملاحظات نصية' })
  @IsOptional()
  notes?: string;
}

class CustomerDto {
  @ApiProperty({
    description: 'اسم العميل',
    example: 'محمد أحمد',
    required: true
  })
  @IsString({ message: 'يجب أن يكون اسم العميل نصيًا' })
  @IsNotEmpty({ message: 'اسم العميل مطلوب' })
  name: string;

  @ApiProperty({
    description: 'رقم هاتف العميل',
    example: '+966501234567',
    required: true
  })
  @IsPhoneNumber('SA', { message: 'رقم الهاتف غير صالح. يجب أن يكون رقم هاتف سعودي صالح' })
  @IsNotEmpty({ message: 'رقم الهاتف مطلوب' })
  phone: string;

  @ApiPropertyOptional({
    description: 'البريد الإلكتروني للعميل',
    example: 'customer@example.com',
    required: false
  })
  @IsEmail({}, { message: 'البريد الإلكتروني غير صالح' })
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description: 'عنوان العميل',
    type: Object,
    required: false,
    example: {
      street: 'شارع الملك فهد',
      city: 'الرياض',
      country: 'المملكة العربية السعودية'
    }
  })
  @IsObject({ message: 'يجب أن يكون العنوان كائنًا' })
  @IsOptional()
  address?: Record<string, any>;
}

/**
 * نموذج إنشاء طلب جديد
 * يحتوي على بيانات الطلب الأساسية المطلوبة لإنشاء طلب جديد
 */
export class CreateOrderDto {
  @ApiProperty({
    description: 'معرف التاجر',
    example: 'merchant-123',
    required: true
  })
  @IsString({ message: 'يجب أن يكون معرف التاجر نصيًا' })
  @IsNotEmpty({ message: 'معرف التاجر مطلوب' })
  merchantId: string;

  @ApiProperty({
    description: 'معرف الجلسة',
    example: 'session-456',
    required: true
  })
  @IsString({ message: 'يجب أن يكون معرف الجلسة نصيًا' })
  @IsNotEmpty({ message: 'معرف الجلسة مطلوب' })
  sessionId: string;

  @ApiPropertyOptional({
    description: 'معرف الطلب',
    example: 'order-123',
    required: false
  })
  @IsString({ message: 'يجب أن يكون معرف الطلب نصيًا' })
  @IsOptional()
  source: string;

  @ApiPropertyOptional({
    description: 'تاريخ إنشاء الطلب (اختياري - سيتم تعيينه تلقائيًا إذا لم يتم توفيره)',
    type: Date,
    example: '2023-01-01T12:00:00.000Z'
  })
  @IsDateString({}, { message: 'يجب أن يكون تاريخًا صالحًا' })
  @IsOptional()
  createdAt?: Date;

  @ApiProperty({
    description: 'بيانات العميل',
    type: CustomerDto,
    required: true
  })
  @ValidateNested()
  @Type(() => CustomerDto)
  customer: CustomerDto;

  @ApiProperty({
    description: 'عناصر الطلب',
    type: [OrderItemDto],
    required: true,
    minItems: 1
  })
  @IsArray({ message: 'يجب أن تكون العناصر مصفوفة' })
  @ArrayMinSize(1, { message: 'يجب أن يحتوي الطلب على عنصر واحد على الأقل' })
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiPropertyOptional({
    description: 'بيانات إضافية للطلب',
    type: Object,
    required: false,
    example: {
      source: 'website',
      ip: '192.168.1.1',
      userAgent: 'Mozilla/5.0...'
    }
  })
  @IsObject({ message: 'يجب أن تكون البيانات الوصفية كائنًا' })
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'معرف الطلب',
    example: 'order-123',
    required: false
  })
  @IsString({ message: 'يجب أن يكون معرف الطلب نصيًا' })
  @IsOptional()
  externalId?: string;

  @ApiPropertyOptional({
    description: 'حالة السداد (افتراضي: false)',
    type: Boolean,
    default: false,
    required: false
  })
  @IsBoolean({ message: 'يجب أن تكون حالة السداد قيمة منطقية' })
  @IsOptional()
  isPaid?: boolean = false;

  @ApiPropertyOptional({
    description: 'إجمالي مبلغ الطلب (سيتم حسابه تلقائيًا إذا لم يتم توفيره)',
    type: Number,
    minimum: 0,
    example: 200,
    required: false
  })
  @IsNumber({}, { message: 'يجب أن يكون الإجمالي رقميًا' })
  @Min(0, { message: 'يجب أن يكون الإجمالي أكبر من أو يساوي صفر' })
  @IsOptional()
  totalAmount?: number;

  @ApiPropertyOptional({
    description: 'حالة الطلب (مثل: pending, processing, completed, cancelled)',
    example: 'pending',
    default: 'pending',
    required: false
  })
  @IsString({ message: 'يجب أن تكون الحالة نصية' })
  @IsOptional()
  status?: string = 'pending';

  @ApiPropertyOptional({
    description: 'طريقة الدفع',
    example: 'credit_card',
    required: false
  })
  @IsString({ message: 'يجب أن تكون طريقة الدفع نصية' })
  @IsOptional()
  paymentMethod?: string;

  @ApiPropertyOptional({
    description: 'تاريخ ووقت السداد',
    type: Date,
    example: '2023-01-01T12:30:00.000Z',
    required: false
  })
  @IsDateString({}, { message: 'يجب أن يكون تاريخ السداد صالحًا' })
  @IsOptional()
  paidAt?: Date;

  @ApiPropertyOptional({
    description: 'ملاحظات إضافية على الطلب',
    example: 'التوصيل بعد الساعة 5 مساءً',
    required: false
  })
  @IsString({ message: 'يجب أن تكون الملاحظات نصية' })
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({
    description: 'رقم الفاتورة (إذا كان متاحًا)',
    example: 'INV-2023-001',
    required: false
  })
  @IsString({ message: 'يجب أن يكون رقم الفاتورة نصيًا' })
  @IsOptional()
  invoiceNumber?: string;

  @ApiPropertyOptional({
    description: 'بيانات المنتجات',
    type: Object,
    required: false,
    example: {
      productId: 'prod-123',
      name: 'منتج مميز',
      quantity: 2,
      price: 100
    }
  })
  @IsObject({ message: 'يجب أن تكون بيانات المنتجات كائنًا' })
  @IsOptional()
  products?: Array<{
    productId?: string;
    name: string;
    quantity: number;
    price: number;
  }>;
}
