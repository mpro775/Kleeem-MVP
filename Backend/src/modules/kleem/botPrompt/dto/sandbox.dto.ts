import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Max,
  IsNotEmpty,
} from 'class-validator';

export class SandboxDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'نص الرسالة المرسلة إلى البوت',
    example: 'مرحباً، كيف يمكنني الاشتراك في الخدمة؟',
    required: true,
  })
  text!: string;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({
    description: 'إرفاق المعرفة من الأسئلة الشائعة',
    example: true,
    default: true,
  })
  attachKnowledge?: boolean = true;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(20)
  @ApiPropertyOptional({
    description: 'عدد النتائج المراد استرجاعها من قاعدة المعرفة',
    example: 5,
    default: 5,
    minimum: 1,
    maximum: 20,
  })
  topK?: number = 5;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({
    description: 'عرض المعاينة فقط دون استدعاء نموذج الذكاء الاصطناعي',
    example: false,
    default: false,
  })
  dryRun?: boolean = false;
}
