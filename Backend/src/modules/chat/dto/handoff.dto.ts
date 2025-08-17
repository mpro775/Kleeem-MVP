import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO لبدء محادثة مع موظف بشري.
 */
export class HandoffDto {
  @ApiProperty({ description: 'معرف الجلسة', example: 'sess_12345' }) @IsString() sessionId: string;
  @ApiProperty({ description: 'ملاحظة أو سبب اختياري', required: false, example: 'أحتاج مساعدة في الطلب رقم 54321' })
  @IsOptional()
  @IsString()
  note?: string;
}
