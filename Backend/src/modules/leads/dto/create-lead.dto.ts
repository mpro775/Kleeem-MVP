import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsObject, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateLeadDto {
  @ApiProperty({
    description: 'معرف الجلسة (sessionId)',
    example: 'session_123456789',
    required: true,
  })
  @IsString({ message: 'يجب أن يكون معرف الجلسة نصيًا' })
  @IsNotEmpty({ message: 'معرف الجلسة مطلوب' })
  sessionId?: string;

  @ApiProperty({
    description: 'بيانات النموذج كـ key/value object',
    example: {
      name: 'أحمد محمد',
      email: 'ahmed@example.com',
      phone: '+966501234567',
      message: 'أرغب في معرفة المزيد عن الخدمات المقدمة',
    },
    required: true,
  })
  @IsObject({ message: 'يجب أن تكون البيانات كائنًا' })
  @IsNotEmpty({ message: 'بيانات النموذج مطلوبة' })
  data?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'مصدر العميل المحتمل',
    example: 'الموقع الإلكتروني',
    required: false,
  })
  @IsString({ message: 'يجب أن يكون المصدر نصيًا' })
  @IsOptional()
  source?: string;
}
