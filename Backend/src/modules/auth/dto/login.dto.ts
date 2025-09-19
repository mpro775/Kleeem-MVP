// src/modules/auth/dto/login.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';
import { I18nMessage } from '../../../common/validators/i18n-validator';

export class LoginDto {
  @ApiProperty({
    description: 'البريد الإلكتروني للمستخدم',
    example: 'user@example.com',
  })
  @IsEmail({}, I18nMessage('email'))
  email: string;

  @ApiProperty({ description: 'كلمة المرور', example: '12345678' })
  @IsString(I18nMessage('validation.string'))
  password: string;
}
