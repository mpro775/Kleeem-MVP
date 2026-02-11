import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl } from 'class-validator'; // تأكد من الاستيراد
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateMerchantDto } from './create-merchant.dto';

export class UpdateMerchantDto extends PartialType(CreateMerchantDto) {
  // إعادة تعريف الحقل يدوياً لضمان عدم حذفه
  @ApiPropertyOptional({
    description: 'رابط شعار التاجر',
    example: 'https://example.com/logo.png',
  })
  @IsOptional()
  @IsString() // استخدم IsString أو IsUrl
  logoUrl?: string;
}