// src/waitlist/dto/create-waitlist-lead.dto.ts
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  IsUrl,
} from 'class-validator';

const MAX_NAME_LENGTH = 120;
const MAX_PHONE_LENGTH = 40;
const MAX_NOTES_LENGTH = 1000;

export class CreateWaitlistLeadDto {
  @IsOptional() @IsString() sessionId?: string;

  @IsEmail() email!: string;

  @IsOptional() @IsString() @MaxLength(MAX_NAME_LENGTH) name?: string;
  @IsOptional() @IsString() @MaxLength(MAX_PHONE_LENGTH) phone?: string;

  @IsEnum(['yes', 'no'] as const) hasStore!: 'yes' | 'no';
  @IsEnum(['Salla', 'Zid', 'Shopify', 'WooCommerce', 'None'] as const)
  platform!: 'Salla' | 'Zid' | 'Shopify' | 'WooCommerce' | 'None';
  @IsEnum(['assistant', 'mini-store', 'both'] as const) interest!:
    | 'assistant'
    | 'mini-store'
    | 'both';

  @IsOptional() @IsString() @MaxLength(MAX_NOTES_LENGTH) notes?: string;

  @IsOptional() @IsString() utm_source?: string;
  @IsOptional() @IsString() utm_medium?: string;
  @IsOptional() @IsString() utm_campaign?: string;
  @IsOptional() @IsString() utm_term?: string;
  @IsOptional() @IsString() utm_content?: string;

  @IsOptional() @IsUrl() pageUrl?: string;
  @IsOptional() @IsString() referrer?: string;

  // Honeypot
  @IsOptional() @IsString() company?: string;
}
