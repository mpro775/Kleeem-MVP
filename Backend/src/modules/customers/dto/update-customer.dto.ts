// src/modules/customers/dto/update-customer.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateCustomerDto } from './create-customer.dto';
import { IsOptional, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {
  @ApiPropertyOptional({
    description: 'حالة الحظر',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isBlocked?: boolean;
}
