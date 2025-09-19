import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { Match } from 'src/common/decorators/match.decorator';
import { I18nMessage } from '../../../common/validators/i18n-validator';

export class RegisterDto {
  @ApiProperty({
    description: 'البريد الإلكتروني',
    example: 'user@example.com',
  })
  @IsEmail({}, I18nMessage('email'))
  @IsNotEmpty(I18nMessage('validation.required'))
  email: string;

  @ApiProperty({
    description: 'كلمة المرور (6 أحرف فأكثر)',
    example: 'securePass',
  })
  @IsString(I18nMessage('validation.string'))
  @MinLength(6, I18nMessage('validation.minLength'))
  @IsNotEmpty(I18nMessage('validation.required'))
  password: string;

  @ApiProperty({ description: 'تأكيد كلمة المرور', example: 'securePass' })
  @IsString(I18nMessage('validation.string'))
  @MinLength(6, I18nMessage('validation.minLength'))
  @IsNotEmpty(I18nMessage('validation.required'))
  @Match('password', { message: 'كلمتا المرور غير متطابقتين' })
  confirmPassword: string;

  @ApiProperty({ description: 'اسم المستخدم/التاجر', example: 'أحمد' })
  @IsString(I18nMessage('validation.string'))
  @MinLength(3, I18nMessage('validation.minLength'))
  @IsNotEmpty(I18nMessage('validation.required'))
  name: string;
}
