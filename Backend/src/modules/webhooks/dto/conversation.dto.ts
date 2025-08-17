import { IsArray, IsEnum, IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MessageItem {
  @ApiProperty({
    description: 'دور المرسل في المحادثة',
    enum: ['customer', 'bot', 'agent'],
    example: 'customer',
  })
  @IsString()
  @IsNotEmpty()
  role: 'customer' | 'bot' | 'agent';

  @ApiProperty({
    description: 'نص الرسالة',
    example: 'مرحباً، أريد الاستفسار عن طلبي',
  })
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiProperty({
    description: 'وقت إرسال الرسالة',
    example: '2025-08-16T04:00:00.000Z',
  })
  @IsNotEmpty()
  timestamp: Date;

  @ApiPropertyOptional({
    description: 'بيانات إضافية للرسالة',
    example: { orderId: '12345', status: 'pending' },
  })
  metadata?: any;
}

export class ConversationDto {
  @ApiProperty({
    description: 'معرف الجلسة الفريدة للمحادثة',
    example: 'session_123456789',
  })
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @ApiProperty({
    description: 'قناة المحادثة',
    enum: ['whatsapp', 'telegram', 'webchat'],
    example: 'whatsapp',
  })
  @IsString()
  @IsNotEmpty()
  channel: string;

  @ApiProperty({
    description: 'قائمة الرسائل المتبادلة في المحادثة',
    type: [MessageItem],
    example: [
      {
        role: 'customer',
        text: 'مرحباً، أريد الاستفسار عن طلبي',
        timestamp: '2025-08-16T04:00:00.000Z',
      },
      {
        role: 'bot',
        text: 'مرحباً! كيف يمكنني مساعدتك اليوم؟',
        timestamp: '2025-08-16T04:01:00.000Z',
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MessageItem)
  messages: MessageItem[];
}
