import { Type } from 'class-transformer';
import { QuickConfigDto } from './quick-config.dto';
import {
  IsBoolean,
  IsObject,
  IsOptional,
  ValidateNested,
  IsNotEmpty,
  IsDefined
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * معاينة الإعدادات قبل التطبيق
 * @description يستخدم لمعاينة تأثير إعدادات التهيئة السريعة أو المتقدمة قبل حفظها
 */
export class PreviewPromptDto {
  @ApiPropertyOptional({
    description: 'إعدادات التهيئة السريعة - اختيارية',
    type: QuickConfigDto,
    required: false
  })
  @IsOptional()
  @ValidateNested({ message: 'يجب أن تكون إعدادات التهيئة السريعة صالحة' })
  @Type(() => QuickConfigDto)
  quickConfig?: Partial<QuickConfigDto>;

  @ApiProperty({
    description: 'استخدام الإعدادات المتقدمة بدلاً من الإعدادات السريعة',
    example: false,
    default: false
  })
  @IsBoolean({ message: 'يجب أن تكون قيمة useAdvanced منطقية (صح/خطأ)' })
  @IsDefined({ message: 'يجب تحديد ما إذا كانت الإعدادات المتقدمة مستخدمة أم لا' })
  useAdvanced: boolean;

  @ApiProperty({
    description: 'متغيرات الاختبار لاستخدامها في المعاينة',
    type: Object,
    example: {
      productName: 'هاتف ذكي',
      customerName: 'أحمد محمد'
    },
    required: true
  })
  @IsObject({ message: 'يجب أن تكون متغيرات الاختبار كائنًا' })
  @IsNotEmpty({ message: 'يجب إدخال متغيرات الاختبار' })
  testVars: Record<string, string>;
}
