// src/modules/messaging/dto/rate-message.dto.ts
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class RateMessageDto {
  @ApiProperty({ enum: [0,1], description: '1 إيجابي، 0 سلبي' })
  @IsIn([0,1])
  rating!: 0 | 1;

  @ApiPropertyOptional({ description: 'ملاحظة اختيارية عند التقييم السلبي' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  feedback?: string;
}
