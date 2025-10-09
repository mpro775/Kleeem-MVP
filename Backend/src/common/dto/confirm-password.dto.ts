// src/common/dto/confirm-password.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

import { MIN_PASSWORD_LENGTH } from '../constants/common';
export class ConfirmPasswordDto {
  @ApiProperty({ description: 'كلمة مرور المستخدم الحالية' })
  @IsString()
  @MinLength(MIN_PASSWORD_LENGTH)
  confirmPassword!: string;
}
