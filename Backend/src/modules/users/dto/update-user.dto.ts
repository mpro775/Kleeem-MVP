// src/modules/users/dto/update-user.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  MinLength,
  IsOptional,
  IsBoolean,
  Matches,
} from 'class-validator';

import { I18nMessage } from '../../../common/validators/i18n-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'البريد الإلكتروني الجديد',
    example: 'newemail@example.com',
  })
  @IsOptional()
  @IsEmail({}, I18nMessage('validation.email'))
  email?: string;

  @ApiPropertyOptional({
    description: 'رقم الهاتف (بصيغة دولية)',
    example: '+9665xxxxxxxx',
  })
  @IsOptional()
  @IsString(I18nMessage('validation.string'))
  @Matches(/^\+?[0-9]{7,15}$/, I18nMessage('validation.phone'))
  phone?: string;

  @ApiPropertyOptional({
    description: 'الاسم الجديد للمستخدم',
    example: 'Saleh Saeed',
  })
  @IsOptional()
  @IsString(I18nMessage('validation.string'))
  @MinLength(3, I18nMessage('validation.minLength'))
  name?: string;

  @ApiPropertyOptional({
    description: 'الدور الجديد',
    example: 'MERCHANT',
  })
  @IsOptional()
  @IsString(I18nMessage('validation.string'))
  role?: string;

  @ApiPropertyOptional({
    description: 'حالة أول تسجيل دخول (لتوجيه Onboarding)',
    example: false,
  })
  @IsOptional()
  @IsBoolean(I18nMessage('validation.boolean'))
  firstLogin?: boolean;
}
