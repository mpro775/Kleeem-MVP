// src/modules/orders/dto/create-order.dto.ts
import {
  ApiProperty,
  ApiPropertyOptional,
  ApiHideProperty,
} from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import {
  IsString,
  IsArray,
  IsObject,
  IsOptional,
  IsNotEmpty,
  IsNumber,
  IsEmail,
  ValidateNested,
  ArrayMinSize,
  IsDateString,
  Min,
  IsBoolean,
} from 'class-validator';

class OrderItemInput {
  @ApiProperty({ description: 'معرّف المنتج', example: '66bdcf0b8f2e12...' })
  @IsString({ message: 'يجب أن يكون معرّف المنتج نصيًا' })
  @IsNotEmpty({ message: 'معرّف المنتج مطلوب' })
  productId?: string;

  @ApiProperty({ description: 'الكمية', minimum: 1, example: 2 })
  @IsNumber({}, { message: 'يجب أن تكون الكمية رقمية' })
  @Min(1, { message: 'الحد الأدنى للكمية هو 1' })
  quantity?: number;

  @ApiProperty({ description: 'السعر', minimum: 0, example: 100 })
  @IsNumber({}, { message: 'يجب أن يكون السعر رقمياً' })
  @Min(0, { message: 'السعر يجب أن يكون أكبر من أو يساوي صفر' })
  price?: number;

  @ApiProperty({ description: 'اسم المنتج', example: 'منتج مميز' })
  @IsString({ message: 'يجب أن يكون اسم المنتج نصيًا' })
  @IsNotEmpty({ message: 'اسم المنتج مطلوب' })
  name?: string;

  @ApiPropertyOptional({
    description: 'ملاحظات إضافية',
    example: 'اللون: أحمر',
  })
  @IsString({ message: 'يجب أن تكون الملاحظات نصية' })
  @IsOptional()
  notes?: string;
}

class OrderProductDto {
  @ApiPropertyOptional({ description: 'معرّف المنتج (اختياري)' })
  @IsString({ message: 'يجب أن يكون معرّف المنتج نصيًا' })
  @IsOptional()
  product?: string; // ← يتوافق مع schema (Types.ObjectId)

  @ApiProperty({ description: 'اسم المنتج', example: 'منتج مميز' })
  @IsString({ message: 'يجب أن يكون اسم المنتج نصيًا' })
  @IsNotEmpty({ message: 'اسم المنتج مطلوب' })
  name?: string;

  @ApiProperty({ description: 'السعر', minimum: 0, example: 100 })
  @IsNumber({}, { message: 'يجب أن يكون السعر رقمياً' })
  @Min(0, { message: 'السعر يجب أن يكون أكبر من أو يساوي صفر' })
  price?: number;

  @ApiProperty({ description: 'الكمية', minimum: 1, example: 2 })
  @IsNumber({}, { message: 'يجب أن تكون الكمية رقمية' })
  @Min(1, { message: 'الحد الأدنى للكمية هو 1' })
  quantity?: number;
}

class CustomerDto {
  @ApiProperty({ description: 'اسم العميل', example: 'محمد أحمد' })
  @IsString({ message: 'يجب أن يكون اسم العميل نصيًا' })
  @IsNotEmpty({ message: 'اسم العميل مطلوب' })
  name?: string;

  @ApiProperty({ description: 'رقم هاتف العميل', example: '+966501234567' })
  @IsNotEmpty({ message: 'رقم الهاتف مطلوب' })
  phone?: string;

  @ApiPropertyOptional({
    description: 'رقم الهاتف الموحّد بدون رموز',
    example: '966501234567',
  })
  @IsString({ message: 'يجب أن يكون رقم الهاتف الموحّد نصيًا' })
  @IsOptional()
  phoneNormalized?: string;

  @ApiPropertyOptional({
    description: 'عنوان العميل',
    example: { line1: 'شارع الملك فهد', city: 'الرياض', postalCode: '12345' },
  })
  @IsObject({ message: 'يجب أن يكون العنوان كائنًا' })
  @IsOptional()
  @Transform(({ value }): Record<string, unknown> => {
    // دعم تمرير العنوان كنص: "حي كذا، شارع كذا"
    if (typeof value === 'string') return { line1: value };
    return value;
  })
  address?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'البريد الإلكتروني',
    example: 'customer@example.com',
  })
  @IsEmail({}, { message: 'البريد الإلكتروني غير صالح' })
  @IsOptional()
  email?: string;
}

/**
 * DTO موحّد لإنشاء الطلبات
 * - يدعم body يحتوي "products"
 * - ويدعم body قديم يحتوي "items"؛ سيتم تحويلها تلقائيًا إلى "products"
 */
export class CreateOrderDto {
  @ApiProperty({
    description: 'معرّف التاجر',
    example: '68a3addee395b1a94f9fcf87',
  })
  @IsString({ message: 'يجب أن يكون معرّف التاجر نصيًا' })
  @IsNotEmpty({ message: 'معرّف التاجر مطلوب' })
  merchantId?: string;

  @ApiProperty({ description: 'معرّف الجلسة', example: 'sess-xyz' })
  @IsString({ message: 'يجب أن يكون معرّف الجلسة نصيًا' })
  @IsNotEmpty({ message: 'معرّف الجلسة مطلوب' })
  sessionId?: string;

  @ApiPropertyOptional({
    description: 'المصدر',
    example: 'mini-store',
    default: 'manual',
  })
  @IsString({ message: 'يجب أن يكون المصدر نصيًا' })
  @IsOptional()
  source?: string;

  @ApiPropertyOptional({
    description: 'تاريخ الإنشاء (اختياري)',
    example: '2025-08-27T12:00:00.000Z',
  })
  @IsDateString({}, { message: 'تاريخ غير صالح' })
  @IsOptional()
  createdAt?: Date;

  @ApiProperty({ description: 'بيانات العميل', type: CustomerDto })
  @ValidateNested()
  @Type(() => CustomerDto)
  customer?: CustomerDto;

  // ← هذا الحقل مخفي فقط للدعم الخلفي وتحويله إلى products
  @ApiHideProperty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemInput)
  @IsOptional()
  items?: OrderItemInput[];

  @ApiProperty({
    description: 'عناصر الطلب (معتمدة)',
    type: [OrderProductDto],
    minItems: 1,
  })
  @IsArray({ message: 'يجب أن تكون العناصر مصفوفة' })
  @ArrayMinSize(1, { message: 'يجب إدخال عنصر واحد على الأقل' })
  @ValidateNested({ each: true })
  @Type(() => OrderProductDto)
  @Transform(
    ({
      value,
      obj,
    }: {
      value: unknown;
      obj: { items?: OrderItemInput[] };
    }): OrderProductDto[] => {
      // إذا أُرسلت products مباشرة، اتركها كما هي
      if (Array.isArray(value)) return value;
      // إن أُرسلت items (النسخة القديمة من الفرونت)، حوّلها:
      if (Array.isArray(obj?.items)) {
        return obj.items.map((i: OrderItemInput) => ({
          product: i.productId ?? '',
          name: i.name ?? '',
          price: i.price ?? 0,
          quantity: i.quantity ?? 0,
        }));
      }
      return value as OrderProductDto[];
    },
  )
  products?: OrderProductDto[];

  @ApiPropertyOptional({
    description: 'بيانات إضافية',
    example: {
      source: 'website',
      ip: '192.168.1.1',
      userAgent: 'Mozilla/5.0...',
    },
  })
  @IsObject({ message: 'يجب أن تكون البيانات الإضافية كائنًا' })
  @IsOptional()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'مُعرّف خارجي', example: 'INV-2025-001' })
  @IsString({ message: 'يجب أن يكون المعرّف الخارجي نصيًا' })
  @IsOptional()
  externalId?: string;

  @ApiPropertyOptional({ description: 'تم الدفع؟', default: false })
  @IsBoolean({ message: 'حقل تم الدفع يجب أن يكون منطقيًا' })
  @IsOptional()
  isPaid?: boolean;

  @ApiPropertyOptional({
    description: 'الإجمالي (اختياري إذا يحسبه السيرفر)',
    example: 200,
  })
  @IsNumber({}, { message: 'الإجمالي يجب أن يكون رقمياً' })
  @Min(0, { message: 'الإجمالي يجب أن يكون ≥ 0' })
  @IsOptional()
  totalAmount?: number;

  @ApiPropertyOptional({
    description: 'حالة الطلب',
    example: 'pending',
    default: 'pending',
  })
  @IsString({ message: 'الحالة يجب أن تكون نصية' })
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'طريقة الدفع', example: 'credit_card' })
  @IsString({ message: 'طريقة الدفع يجب أن تكون نصية' })
  @IsOptional()
  paymentMethod?: string;

  @ApiPropertyOptional({
    description: 'تاريخ وقت السداد',
    example: '2025-08-27T12:30:00.000Z',
  })
  @IsDateString({}, { message: 'تاريخ السداد غير صالح' })
  @IsOptional()
  paidAt?: Date;

  @ApiPropertyOptional({
    description: 'ملاحظات',
    example: 'التوصيل بعد الساعة 5 مساءً',
  })
  @IsString({ message: 'الملاحظات يجب أن تكون نصية' })
  @IsOptional()
  notes?: string;

  // ⚠️ احذف التعريف القديم للـ products كـ Object[] داخل dto (كان مكرر ومربك)
}
