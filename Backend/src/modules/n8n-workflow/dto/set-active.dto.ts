import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

/**
 * نموذج تحديث حالة التفعيل لسير العمل
 */
export class SetActiveDto {
  @ApiProperty({
    description: 'حالة التفعيل: true للتفعيل، false للتعطيل',
    example: true,
    type: Boolean,
  })
  @IsBoolean({ message: 'يجب أن تكون قيمة active منطقية (true/false)' })
  active: boolean;

  @ApiPropertyOptional({
    description: 'سبب تغيير الحالة (اختياري)',
    example: 'تم إصلاح المشكلة في العقدة الرئيسية',
    type: String,
  })
  @IsOptional()
  @IsString({ message: 'يجب أن يكون reason نصيًا' })
  reason?: string;

  @ApiPropertyOptional({
    description: 'تطبيق التغيير على جميع الإصدارات (افتراضي: false)',
    example: false,
    type: Boolean,
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'يجب أن تكون applyToAllVersions منطقية (true/false)' })
  applyToAllVersions?: boolean = false;
}
