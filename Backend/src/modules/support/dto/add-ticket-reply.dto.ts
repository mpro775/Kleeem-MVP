import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class AddTicketReplyDto {
  @ApiProperty({ description: 'نص الرد' })
  @IsString()
  @MaxLength(5000)
  body!: string;

  @ApiPropertyOptional({
    description: 'تعليق داخلي (لا يظهر للمستخدم)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;
}
