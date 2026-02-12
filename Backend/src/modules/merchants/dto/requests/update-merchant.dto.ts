import { PartialType } from '@nestjs/swagger';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, IsUrl, ValidateNested } from 'class-validator';

import { CreateMerchantDto } from './create-merchant.dto';
import { LeadsSettingsDto } from './leads-settings.dto';

export class UpdateMerchantDto extends PartialType(CreateMerchantDto) {
  @ApiPropertyOptional({
    description: 'رابط شعار التاجر',
    example: 'https://example.com/logo.png',
  })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional({
    description: 'إعدادات جمع العملاء المحتملين (Leads)',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LeadsSettingsDto)
  leadsSettings?: LeadsSettingsDto;
}
