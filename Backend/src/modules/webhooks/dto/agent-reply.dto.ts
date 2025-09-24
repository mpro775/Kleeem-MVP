// src/modules/webhooks/dtos/agent-reply.dto.ts
import { IsString, IsNotEmpty, IsIn, IsOptional } from 'class-validator';

import type { PublicChannel } from '../types/channels';

export class AgentReplyDto {
  @IsString()
  @IsNotEmpty()
  merchantId!: string;

  @IsString()
  @IsNotEmpty()
  sessionId!: string;

  @IsString()
  @IsNotEmpty()
  text!: string;

  @IsIn(['whatsapp', 'telegram', 'webchat'])
  channel!: PublicChannel;

  @IsOptional()
  @IsString()
  agentId?: string;

  @IsOptional()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>;
}
