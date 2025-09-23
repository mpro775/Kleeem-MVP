import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsArray,
  IsNotEmpty,
  MinLength,
  MaxLength,
  ArrayMaxSize,
  ArrayMinSize,
} from 'class-validator';
const MAX_TEMPLATE_LENGTH_Kaleem = 10000;
export class CreateBotPromptDto {
  @IsEnum(['system', 'user'], {
    message: 'النوع يجب أن يكون إما system أو user',
  })
  @ApiProperty({
    description: 'نوع البرومبت',
    enum: ['system', 'user'],
    example: 'system',
  })
  type: 'system' | 'user';

  @IsString()
  @IsNotEmpty({ message: 'محتوى البرومبت مطلوب' })
  @MinLength(10, { message: 'يجب أن يكون طول المحتوى 10 أحرف على الأقل' })
  @MaxLength(MAX_TEMPLATE_LENGTH_Kaleem, {
    message: 'يجب ألا يتجاوز المحتوى 10000 حرف',
  })
  @ApiProperty({
    description: 'محتوى البرومبت',
    minLength: 10,
    maxLength: MAX_TEMPLATE_LENGTH_Kaleem,
    example: 'أنت مساعد ذكي يساعد المستخدمين في الإجابة على استفساراتهم.',
  })
  content: string;

  @IsOptional()
  @IsString({ message: 'يجب أن يكون الاسم نصيًا' })
  @MaxLength(100, { message: 'يجب ألا يتجاوز الاسم 100 حرف' })
  @ApiPropertyOptional({
    description: 'اسم البرومبت (اختياري)',
    maxLength: 100,
    example: 'البرومبت الأساسي',
  })
  name?: string;

  @IsOptional()
  @IsArray({ message: 'يجب أن تكون الوسوم مصفوفة' })
  @ArrayMaxSize(10, { message: 'يجب ألا تزيد عدد الوسوم عن 10' })
  @ArrayMinSize(1, { message: 'يجب إدخال وسم واحد على الأقل' })
  @IsString({ each: true, message: 'يجب أن يكون كل وسم نصيًا' })
  @MaxLength(30, { each: true, message: 'يجب ألا يتجاوز طول كل وسم 30 حرفًا' })
  @ApiPropertyOptional({
    description: 'وسوم للتصنيف والبحث',
    type: [String],
    example: ['افتراضي', 'دعم فني', 'مبيعات'],
  })
  tags?: string[];

  @IsOptional()
  @IsBoolean({ message: 'يجب أن تكون القيمة منطقية (true/false)' })
  @ApiPropertyOptional({
    description: 'حالة تفعيل البرومبت',
    default: false,
    example: false,
  })
  active: boolean = false;
}
