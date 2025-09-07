// src/common/dto/confirm-password.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ConfirmPasswordDto {
  @ApiProperty({ description: 'كلمة مرور المستخدم الحالية' })
  @IsString()
  @MinLength(6)
  confirmPassword: string;
}
