import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, Min, IsOptional, IsString, IsBoolean } from 'class-validator';

/**
 * نموذج التراجع عن إصدار سابق من سير العمل
 */
export class RollbackDto {
  @ApiProperty({
    description: 'رقم النسخة التي تريد الرجوع إليها',
    example: 2,
    type: Number,
    minimum: 1,
  })
  @IsInt({ message: 'يجب أن يكون رقم الإصدار رقمًا صحيحًا' })
  @Min(1, { message: 'يجب أن يكون رقم الإصدار أكبر من صفر' })
  version: number;

  @ApiPropertyOptional({
    description: 'حفظ النسخة الحالية كنسخة جديدة قبل التراجع (افتراضي: false)',
    example: true,
    type: Boolean,
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'يجب أن تكون saveCurrentVersion منطقية (true/false)' })
  saveCurrentVersion?: boolean = false;

  @ApiPropertyOptional({
    description: 'سبب التراجع (اختياري)',
    example: 'التراجع بسبب وجود خطأ في المنطق',
    type: String,
  })
  @IsOptional()
  @IsString({ message: 'يجب أن يكون reason نصيًا' })
  reason?: string;

  @ApiPropertyOptional({
    description: 'تفعيل النسخة الجديدة بعد التراجع (افتراضي: false)',
    example: true,
    type: Boolean,
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'يجب أن تكون activateAfterRollback منطقية (true/false)' })
  activateAfterRollback?: boolean = false;
}
