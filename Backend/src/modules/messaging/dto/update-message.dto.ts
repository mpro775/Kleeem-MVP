import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
  ArrayMinSize,
  IsDate,
  IsNotEmpty,
} from 'class-validator';

export class MessageContentDto {
  @ApiProperty({
    description: 'دور المرسل في المحادثة',
    enum: ['customer', 'bot', 'agent'],
    example: 'bot',
  })
  @IsString()
  @IsNotEmpty()
  @IsEnum(['customer', 'bot', 'agent'])
  role: 'customer' | 'bot' | 'agent';

  @ApiProperty({
    description: 'نص الرسالة',
    example: 'مرحباً، شكراً لتواصلكم معنا. كيف يمكنني مساعدتك اليوم؟',
  })
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiPropertyOptional({
    description: 'بيانات إضافية للرسالة',
    type: Object,
    example: {
      isRead: true,
      attachment: 'invoice.pdf',
      customField: 'قيمة مخصصة',
    },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpdateMessageDto {
  @ApiPropertyOptional({
    description: 'تحديث قناة التواصل',
    enum: ['whatsapp', 'telegram', 'webchat'],
    example: 'telegram',
  })
  @IsOptional()
  @IsString()
  @IsEnum(['whatsapp', 'telegram', 'webchat'])
  channel?: string;

  @ApiPropertyOptional({
    description: 'تحديث البيانات الوصفية للجلسة',
    type: Object,
    example: {
      status: 'in_progress',
      priority: 'high',
      assignedTo: 'agent123',
      tags: ['متابعة', 'طلب_هام'],
    },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'استبدال كامل لمحتوى الرسائل في الجلسة',
    type: [MessageContentDto],
    example: [
      {
        role: 'customer',
        text: 'مرحباً، أريد تحديث طلبي',
        metadata: { orderId: '12345' },
      },
      {
        role: 'bot',
        text: 'بالطبع، سأساعدك في تحديث طلبك',
        metadata: { responseTime: '2s' },
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, {
    message: 'يجب أن تحتوي المصفوفة على رسالة واحدة على الأقل',
  })
  @ValidateNested({ each: true })
  @Type(() => MessageContentDto)
  messages?: MessageContentDto[];

  @ApiPropertyOptional({
    description: 'تحديث تاريخ انتهاء الجلسة',
    type: Date,
    example: '2025-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  expiresAt?: Date;
}
