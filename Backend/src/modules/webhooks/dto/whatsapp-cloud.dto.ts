// src/modules/webhooks/dto/whatsapp-cloud.dto.ts
import { Type } from 'class-transformer';
import {
  IsString,
  IsArray,
  IsObject,
  IsOptional,
  ValidateNested,
} from 'class-validator';

class WhatsAppCloudContactDto {
  @IsString()
  @IsOptional()
  profile?: {
    name: string;
  };

  @IsString()
  wa_id: string;
}

class WhatsAppCloudMessageDto {
  @IsString()
  id: string;

  @IsString()
  @IsOptional()
  timestamp?: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  from: string;

  @IsObject()
  @IsOptional()
  text?: {
    body: string;
  };

  @IsObject()
  @IsOptional()
  image?: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  document?: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  audio?: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  video?: Record<string, unknown>;
}

class WhatsAppCloudStatusDto {
  @IsString()
  id: string;

  @IsString()
  @IsOptional()
  timestamp?: string;

  @IsString()
  recipient_id: string;

  @IsString()
  status: string;
}

class WhatsAppCloudValueDto {
  @IsString()
  messaging_product: string;

  @IsObject()
  @IsOptional()
  metadata?: {
    display_phone_number: string;
    phone_number_id: string;
  };

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WhatsAppCloudContactDto)
  @IsOptional()
  contacts?: WhatsAppCloudContactDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WhatsAppCloudMessageDto)
  @IsOptional()
  messages?: WhatsAppCloudMessageDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WhatsAppCloudStatusDto)
  @IsOptional()
  statuses?: WhatsAppCloudStatusDto[];
}

class WhatsAppCloudChangeDto {
  @ValidateNested()
  @Type(() => WhatsAppCloudValueDto)
  value: WhatsAppCloudValueDto;

  @IsString()
  field: string;
}

class WhatsAppCloudEntryDto {
  @IsString()
  id: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WhatsAppCloudChangeDto)
  changes: WhatsAppCloudChangeDto[];
}

export class WhatsAppCloudDto {
  @IsString()
  object: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WhatsAppCloudEntryDto)
  entry: WhatsAppCloudEntryDto[];
}
