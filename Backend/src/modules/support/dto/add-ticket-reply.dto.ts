import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

import { MAX_MESSAGE_LENGTH } from '../support.constants';

export class AddTicketReplyDto {
  @ApiProperty({ description: 'نص الرد' })
  @IsString()
  @MaxLength(MAX_MESSAGE_LENGTH)
  body!: string;

  @ApiPropertyOptional({
    description: 'تعليق داخلي (لا يظهر للمستخدم)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;
}
