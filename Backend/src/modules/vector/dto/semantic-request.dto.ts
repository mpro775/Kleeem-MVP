import { Type } from 'class-transformer';
import { 
  IsString, 
  IsNotEmpty, 
  IsOptional, 
  IsNumber, 
  Min, 
  Max, 
  IsInt 
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * نموذج طلب البحث الدلالي
 * يستخدم للبحث عن منتجات مشابهة بناءً على نص البحث
 */
export class SemanticRequestDto {
  @ApiProperty({
    description: 'نص البحث',
    example: 'هاتف ذكي بمواصفات عالية',
    required: true,
  })
  @IsString({ message: 'يجب أن يكون نص البحث نصيًا' })
  @IsNotEmpty({ message: 'نص البحث مطلوب' })
  text: string;

  @ApiProperty({
    description: 'معرف التاجر',
    example: '60d21b4667d0d8992e610c85',
    required: true,
  })
  @IsString({ message: 'يجب أن يكون معرف التاجر نصيًا' })
  @IsNotEmpty({ message: 'معرف التاجر مطلوب' })
  merchantId: string;

  @ApiPropertyOptional({
    description: 'عدد النتائج المطلوب استرجاعها',
    example: 5,
    default: 5,
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'يجب أن يكون عدد النتائج رقمًا' })
  @IsInt({ message: 'يجب أن يكون عدد النتائج عددًا صحيحًا' })
  @Min(1, { message: 'يجب أن يكون عدد النتائج على الأقل 1' })
  @Max(50, { message: 'لا يمكن تجاوز 50 نتيجة في الطلب الواحد' })
  topK?: number = 5;
}
