// src/modules/webhooks/dto/bot-reply.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

export class BotReplyDto {
  @ApiProperty({
    description: 'معرّف الجلسة (sessionId) الذي أرسلت منه الرسالة الأصلية',
    example: '966501234567',
  })
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @ApiProperty({
    description: 'نص الردّ الذي ولّده n8n',
    example: 'مرحباً، شحن الآيفون متوفّر بسعر 120 ريال.',
  })
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiProperty({
    description: 'بيانات إضافية اختياريّة (مثلاً أزرار تفاعلية)',
    type: Object,
    required: false,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
