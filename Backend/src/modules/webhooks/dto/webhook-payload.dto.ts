// src/modules/webhooks/dto/webhook-payload.dto.ts
import { Type } from 'class-transformer';
import {
  IsString,
  IsObject,
  IsOptional,
  ValidateNested,
} from 'class-validator';

import { WebhookMediaDto } from './webhook-media.dto';

export class WebhookPayloadDto {
  @IsString()
  @IsOptional()
  messageId?: string;

  @IsString()
  @IsOptional()
  from?: string;

  @IsString()
  @IsOptional()
  text?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;

  @ValidateNested()
  @Type(() => WebhookMediaDto)
  @IsOptional()
  media?: WebhookMediaDto;
}
