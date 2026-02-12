import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, IsOptional, IsEnum } from 'class-validator';

import { AddressLabel } from '../schemas/customer-address.schema';

export class CreateAddressDto {
  @ApiProperty({
    description: 'نوع العنوان',
    example: 'home',
    enum: AddressLabel,
  })
  @Type(() => String)
  @IsEnum(AddressLabel)
  label!: AddressLabel;

  @ApiProperty({ description: 'البلد', example: 'السعودية' })
  @IsString()
  country!: string;

  @ApiProperty({ description: 'المدينة', example: 'الرياض' })
  @IsString()
  city!: string;

  @ApiProperty({ description: 'العنوان الرئيسي', example: 'شارع الملك فهد' })
  @IsString()
  address1!: string;

  @ApiPropertyOptional({ description: 'تفاصيل إضافية' })
  @IsOptional()
  @IsString()
  address2?: string;

  @ApiPropertyOptional({ description: 'الرمز البريدي' })
  @IsOptional()
  @IsString()
  zip?: string;
}
