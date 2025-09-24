// src/modules/webhooks/dtos/incoming-webhook.dto.ts
import { IsOptional, IsObject } from 'class-validator';

export class IncomingWebhookDto {
  @IsOptional()
  @IsObject()
  message?: object;
}
