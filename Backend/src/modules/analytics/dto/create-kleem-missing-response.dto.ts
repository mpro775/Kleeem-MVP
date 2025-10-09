// src/analytics/dto/create-kleem-missing-response.dto.ts
import { IsString, IsOptional, IsBoolean, IsIn } from 'class-validator';

export class CreateKleemMissingResponseDto {
  @IsString()
  @IsIn(['telegram', 'whatsapp', 'webchat'])
  channel?: 'telegram' | 'whatsapp' | 'webchat';

  @IsString()
  question?: string;

  @IsOptional()
  @IsString()
  botReply?: string;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  aiAnalysis?: string;

  @IsOptional()
  @IsBoolean()
  resolved?: boolean;

  // (اختياري) وسم/تصنيف يدوي
  @IsOptional()
  @IsString()
  category?: string;

  // (اختياري) مصدر القناة إن وُجد (مثلاً botId أو integrationId)
  @IsOptional()
  @IsString()
  sourceId?: string;
}
