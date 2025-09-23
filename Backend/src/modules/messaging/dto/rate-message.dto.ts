// src/modules/messaging/dto/rate-message.dto.ts
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { MAX_LENGTH_FEEDBACK } from 'src/common/constants/common';

export class RateMessageDto {
  @ApiProperty({ enum: [0, 1], description: '1 إيجابي، 0 سلبي' })
  @IsIn([0, 1])
  rating!: 0 | 1;

  @ApiPropertyOptional({ description: 'ملاحظة اختيارية عند التقييم السلبي' })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_LENGTH_FEEDBACK)
  feedback?: string;
}
