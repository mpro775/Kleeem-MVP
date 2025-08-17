// src/modules/merchants/dto/product-setup-config.dto.ts

import { IsEnum, IsOptional, IsString, IsBoolean } from 'class-validator';

export class ProductSetupConfigDto {
  
  @IsEnum(['traditional', 'ecommerce'])
  storeType: 'traditional' | 'ecommerce';

  @IsOptional()
  @IsEnum(['zid', 'salla', 'shopify', 'custom'])
  provider?: 'zid' | 'salla' | 'shopify' | 'custom';

  @IsOptional()
  @IsString()
  apiUrl?: string;

  @IsOptional()
  @IsString()
  accessToken?: string;

  @IsBoolean()
  hasApi: boolean;
}
