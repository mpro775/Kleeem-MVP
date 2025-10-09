// src/media/dto/media-handler.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';

export enum MediaType {
  TEXT = 'text',
  VOICE = 'voice',
  AUDIO = 'audio',
  PHOTO = 'photo',
  IMAGE = 'image',
  DOCUMENT = 'document',
  PDF = 'pdf',
}

const MediaTypeLabels = {
  [MediaType.TEXT]: 'نص عادي',
  [MediaType.VOICE]: 'رسالة صوتية',
  [MediaType.AUDIO]: 'ملف صوتي',
  [MediaType.PHOTO]: 'صورة فوتوغرافية',
  [MediaType.IMAGE]: 'صورة',
  [MediaType.DOCUMENT]: 'مستند',
  [MediaType.PDF]: 'ملف PDF',
} as const;

export class MediaHandlerDto {
  @ApiProperty({
    description: 'نوع الوسائط',
    enum: MediaType,
    enumName: 'MediaType',
    example: MediaType.IMAGE,
    examples: Object.entries(MediaTypeLabels).map(([value, description]) => ({
      value,
      description,
    })),
  })
  @IsEnum(MediaType, { message: 'نوع الوسائط غير صالح' })
  type?: MediaType;

  @ApiProperty({
    description: 'رابط الملف',
    example: 'https://example.com/files/example.jpg',
  })
  @IsString({ message: 'يجب أن يكون رابط الملف نصيًا' })
  @IsNotEmpty({ message: 'رابط الملف مطلوب' })
  fileUrl?: string;

  @ApiPropertyOptional({
    description: 'معرف الجلسة (اختياري)',
    example: 'session_123456789',
  })
  @IsOptional()
  @IsString({ message: 'يجب أن يكون معرف الجلسة نصيًا' })
  sessionId?: string;

  @ApiPropertyOptional({
    description: 'قناة الاتصال',
    example: 'whatsapp',
    enum: ['whatsapp', 'telegram', 'webchat', 'other'],
  })
  @IsOptional()
  @IsString({ message: 'يجب أن تكون القناة نصية' })
  channel?: string;

  @ApiPropertyOptional({
    description: 'نوع MIME للملف (اختياري)',
    example: 'image/jpeg',
  })
  @IsOptional()
  @IsString({ message: 'يجب أن يكون نوع MIME نصيًا' })
  mimeType?: string;
}
