import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { Match } from 'src/common/decorators/match.decorator';

export class RegisterDto {
  @ApiProperty({
    description: 'البريد الإلكتروني',
    example: 'user@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'كلمة المرور (6 أحرف فأكثر)',
    example: 'securePass',
  })
  @IsString()
  @MinLength(6)
  @IsNotEmpty()
  password: string;

  @ApiProperty({ description: 'تأكيد كلمة المرور', example: 'securePass' })
  @IsString()
  @MinLength(6)
  @IsNotEmpty()
  @Match('password', { message: 'كلمتا المرور غير متطابقتين' })
  confirmPassword: string;

  @ApiProperty({ description: 'اسم المستخدم/التاجر', example: 'أحمد' })
  @IsString()
  @MinLength(3)
  @IsNotEmpty()
  name: string;
}
