// src/modules/webhooks/dto/whatsapp-qr.dto.ts
import { Type } from 'class-transformer';
import {
  IsString,
  IsArray,
  IsObject,
  IsOptional,
  IsBoolean,
  IsNumber,
  ValidateNested,
} from 'class-validator';

class WhatsAppQrMessageKeyDto {
  @IsString()
  id!: string;

  @IsBoolean()
  @IsOptional()
  fromMe?: boolean = false;

  @IsString()
  @IsOptional()
  remoteJid?: string = '';

  @IsString()
  @IsOptional()
  participant?: string;
}

class WhatsAppQrMessageContentDto {
  @IsString()
  @IsOptional()
  conversation?: string;

  @IsObject()
  @IsOptional()
  extendedTextMessage?: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  imageMessage?: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  documentMessage?: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  audioMessage?: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  videoMessage?: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  stickerMessage?: Record<string, unknown>;
}

class WhatsAppQrMessageDto {
  @ValidateNested()
  @Type(() => WhatsAppQrMessageKeyDto)
  key!: WhatsAppQrMessageKeyDto;

  @IsString()
  @IsOptional()
  id?: string;

  @ValidateNested()
  @Type(() => WhatsAppQrMessageContentDto)
  @IsOptional()
  message?: WhatsAppQrMessageContentDto;

  @IsNumber()
  @IsOptional()
  messageTimestamp?: number;

  @IsString()
  @IsOptional()
  pushName?: string;

  @IsString()
  @IsOptional()
  broadcast?: string;
}

class WhatsAppQrDataDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WhatsAppQrMessageDto)
  @IsOptional()
  messages?: WhatsAppQrMessageDto[];
}

class WhatsAppQrInstanceDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  status?: string;
}

class WhatsAppQrEventDto {
  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  status?: string;
}

export class WhatsAppQrDto {
  @ValidateNested()
  @Type(() => WhatsAppQrEventDto)
  @IsOptional()
  event?: WhatsAppQrEventDto;

  @ValidateNested()
  @Type(() => WhatsAppQrInstanceDto)
  @IsOptional()
  instance?: WhatsAppQrInstanceDto;

  @ValidateNested()
  @Type(() => WhatsAppQrDataDto)
  @IsOptional()
  data?: WhatsAppQrDataDto;

  // Alternative structure without data wrapper
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WhatsAppQrMessageDto)
  @IsOptional()
  messages?: WhatsAppQrMessageDto[];

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  connection?: string;
}
