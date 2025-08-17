import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsOptional,
  IsObject,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

export class MessageItemDto {
  @ApiProperty({
    description: 'دور المرسل في المحادثة',
    enum: ['customer', 'bot', 'agent'],
    example: 'customer',
  })
  @IsString()
  @IsNotEmpty()
  @IsEnum(['customer', 'bot', 'agent'])
  role: 'customer' | 'bot' | 'agent';

  @ApiProperty({
    description: 'نص الرسالة',
    example: 'مرحباً، أود الاستفسار عن حالة طلبي',
  })
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiPropertyOptional({
    description: 'بيانات إضافية للرسالة (اختياري)',
    type: Object,
    example: { isRead: true, attachment: 'image.jpg' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    description:
      'تاريخ ووقت إرسال الرسالة (سيتم تعيينه تلقائياً إذا لم يتم إرساله)',
    type: Date,
    example: '2025-08-16T10:30:00.000Z',
  })
  @IsOptional()
  timestamp?: Date;
}

export class CreateMessageDto {
  @ApiProperty({
    description: 'معرّف التاجر',
    example: '60d0fe4f5311236168a109ca',
  })
  @IsString()
  @IsNotEmpty()
  merchantId: string;

  @ApiProperty({
    description: 'معرّف الجلسة (عادةً رقم الهاتف أو المعرف الفريد للجلسة)',
    example: '9665xxxxxxx',
  })
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @ApiProperty({
    description: 'قناة التواصل',
    enum: ['whatsapp', 'telegram', 'webchat'],
    example: 'whatsapp',
  })
  @IsString()
  @IsNotEmpty()
  @IsEnum(['whatsapp', 'telegram', 'webchat'])
  channel: string;

  @ApiProperty({
    description: 'مصفوفة تحتوي على الرسائل المراد إضافتها',
    type: [MessageItemDto],
    example: [
      {
        role: 'customer',
        text: 'مرحباً، أريد معرفة حالة طلبي',
        metadata: { orderId: '12345' },
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MessageItemDto)
  messages: MessageItemDto[];
}
