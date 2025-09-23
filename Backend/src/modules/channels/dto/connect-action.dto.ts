// src/modules/channels/dto/connect-action.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean } from 'class-validator';

// ملاحظة: التحقق النهائي حسب المزود داخل الـ Adapter.
export class ConnectActionDto {
  // Telegram
  @ApiPropertyOptional({ description: 'Telegram Bot Token' })
  @IsOptional()
  @IsString()
  botToken?: string;

  // WhatsApp Cloud
  @ApiPropertyOptional({ description: 'Meta Access Token' })
  @IsOptional()
  @IsString()
  accessToken?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phoneNumberId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  wabaId?: string;

  @ApiPropertyOptional({ description: 'App Secret for signature verification' })
  @IsOptional()
  @IsString()
  appSecret?: string;

  @ApiPropertyOptional({ description: 'Verify token for webhook challenge' })
  @IsOptional()
  @IsString()
  verifyToken?: string;

  // Webchat (لا يحتاج أسرار)
  @ApiPropertyOptional({ description: 'تفعيل فوري بدون أسرار' })
  @IsOptional()
  @IsBoolean()
  enable?: boolean;
}
