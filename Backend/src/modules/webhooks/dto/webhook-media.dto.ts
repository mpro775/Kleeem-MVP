// src/modules/webhooks/dto/webhook-media.dto.ts
import { IsString, IsOptional, IsEnum } from 'class-validator';

export enum MediaType {
  IMAGE = 'image',
  AUDIO = 'audio',
  VIDEO = 'video',
  PDF = 'pdf',
  DOCUMENT = 'document',
  OTHER = 'other',
}

export class WebhookMediaDto {
  @IsString()
  @IsOptional()
  mediaUrl?: string;

  @IsEnum(MediaType)
  @IsOptional()
  mediaType?: MediaType;

  @IsString()
  @IsOptional()
  fileName?: string;

  @IsString()
  @IsOptional()
  mimeType?: string;

  @IsString()
  @IsOptional()
  fileId?: string;
}
