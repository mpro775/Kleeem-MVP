// src/modules/webhooks/dtos/test-bot-reply.dto.ts
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class TestBotReplyDto {
  @IsString()
  @IsNotEmpty()
  merchantId!: string;

  @IsString()
  @IsNotEmpty()
  sessionId!: string;

  @IsString()
  @IsNotEmpty()
  text!: string;

  @IsOptional()
  metadata?: Record<string, unknown>;
}
