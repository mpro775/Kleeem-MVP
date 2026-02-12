// src/modules/customers/dto/update-customer.dto.ts
import { PartialType } from '@nestjs/swagger';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsBoolean } from 'class-validator';

import { CreateCustomerDto } from './create-customer.dto';

export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {
  @ApiPropertyOptional({
    description: 'حالة الحظر',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isBlocked?: boolean;
}
