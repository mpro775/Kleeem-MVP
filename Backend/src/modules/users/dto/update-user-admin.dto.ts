import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsBoolean,
  IsEnum,
  IsString,
  IsMongoId,
  MaxLength,
  ValidateIf,
} from 'class-validator';

import { UserRole } from '../schemas/user.schema';

export class UpdateUserAdminDto {
  @ApiPropertyOptional({
    description: 'تفعيل/إيقاف حساب المستخدم',
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({
    description: 'سبب التعطيل (عند active=false)',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @ApiPropertyOptional({
    description: 'دور المستخدم',
    enum: UserRole,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({
    description: 'ربط المستخدم بتاجر (معرف التاجر، أو null لفك الربط)',
  })
  @IsOptional()
  @ValidateIf(
    (o: UpdateUserAdminDto) => o.merchantId != null && o.merchantId !== '',
  )
  @IsMongoId()
  merchantId?: string | null;
}
