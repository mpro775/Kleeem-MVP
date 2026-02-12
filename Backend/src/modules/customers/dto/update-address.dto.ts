import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, IsOptional, IsBoolean, IsEnum } from 'class-validator';

import { AddressLabel } from '../schemas/customer-address.schema';

export class UpdateAddressDto {
  @ApiPropertyOptional({
    description: 'نوع العنوان',
    enum: AddressLabel,
  })
  @IsOptional()
  @Type(() => String)
  @IsEnum(AddressLabel)
  label?: AddressLabel;

  @ApiPropertyOptional({ description: 'البلد' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ description: 'المدينة' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'العنوان الرئيسي' })
  @IsOptional()
  @IsString()
  address1?: string;

  @ApiPropertyOptional({ description: 'تفاصيل إضافية' })
  @IsOptional()
  @IsString()
  address2?: string;

  @ApiPropertyOptional({ description: 'الرمز البريدي' })
  @IsOptional()
  @IsString()
  zip?: string;

  @ApiPropertyOptional({ description: 'العنوان الافتراضي' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
