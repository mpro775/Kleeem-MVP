import { IsArray, ValidateNested, IsString, IsBoolean, IsEnum, IsNotEmpty, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum FieldType {
  TEXT = 'text',
  EMAIL = 'email',
  PHONE = 'phone',
  NUMBER = 'number',
  DATE = 'date',
  SELECT = 'select',
  CHECKBOX = 'checkbox',
  TEXTAREA = 'textarea'
}

/**
 * حقل نموذج العملاء المحتملين
 * @description يُعرّف حقلًا واحدًا في نموذج جمع بيانات العملاء المحتملين
 */
export class LeadFieldDto {
  @ApiProperty({
    description: 'المفتاح الفريد للحقل (يستخدم كمعرف في قاعدة البيانات)',
    example: 'fullName',
    required: true
  })
  @IsString({ message: 'يجب أن يكون مفتاح الحقل نصيًا' })
  @IsNotEmpty({ message: 'مفتاح الحقل مطلوب' })
  key: string;

  @ApiProperty({
    description: 'نوع حقل الإدخال',
    enum: FieldType,
    example: FieldType.TEXT,
    required: true
  })
  @IsEnum(FieldType, { message: 'نوع الحقل غير صالح' })
  fieldType: FieldType;

  @ApiProperty({
    description: 'تسمية الحقل المعروضة للمستخدم',
    example: 'الاسم الكامل',
    required: true
  })
  @IsString({ message: 'يجب أن تكون تسمية الحقل نصية' })
  @IsNotEmpty({ message: 'تسمية الحقل مطلوبة' })
  label: string;

  @ApiPropertyOptional({
    description: 'نص توضيحي داخل حقل الإدخال',
    example: 'أدخل الاسم الكامل',
    required: false
  })
  @IsString({ message: 'يجب أن يكون النص التوضيحي نصيًا' })
  @IsOptional()
  placeholder?: string;

  @ApiProperty({
    description: 'هل الحقل مطلوب؟',
    example: true,
    default: false
  })
  @IsBoolean({ message: 'يجب أن تكون قيمة الحقل المطلوب منطقية (صح/خطأ)' })
  required: boolean = false;
}

/**
 * إعدادات نموذج العملاء المحتملين
 * @description يحتوي على مصفوفة من حقول نموذج جمع بيانات العملاء المحتملين
 */
export class LeadsSettingsDto {
  @ApiProperty({
    description: 'مصفوفة تحتوي على إعدادات حقول نموذج العملاء المحتملين',
    type: [LeadFieldDto],
    example: [
      {
        key: 'fullName',
        fieldType: 'text',
        label: 'الاسم الكامل',
        placeholder: 'أدخل الاسم الكامل',
        required: true
      },
      {
        key: 'email',
        fieldType: 'email',
        label: 'البريد الإلكتروني',
        placeholder: 'example@domain.com',
        required: true
      },
      {
        key: 'phone',
        fieldType: 'phone',
        label: 'رقم الجوال',
        placeholder: '05XXXXXXXX',
        required: true
      }
    ]
  })
  @IsArray({ message: 'يجب أن تكون الإعدادات مصفوفة' })
  @ValidateNested({ each: true, message: 'يجب أن يحتوي كل عنصر على حقول صالحة' })
  @Type(() => LeadFieldDto)
  settings: LeadFieldDto[];
}
