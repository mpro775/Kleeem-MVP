// src/modules/users/dto/update-user.dto.ts
import {
  IsString,
  IsEmail,
  MinLength,
  IsOptional,
  IsBoolean,
  Matches,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'البريد الإلكتروني الجديد',
    example: 'newemail@example.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;


  @ApiPropertyOptional({ description: 'رقم الهاتف (بصيغة دولية)', example: '+9665xxxxxxxx' })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9]{7,15}$/,{ message: 'صيغة رقم هاتف غير صحيحة'})
  phone?: string;
  
  @ApiPropertyOptional({
    description: 'الاسم الجديد للمستخدم',
    example: 'Saleh Saeed',
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  name?: string;

  @ApiPropertyOptional({
    description: 'الدور الجديد',
    example: 'MERCHANT',
  })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({
    description: 'حالة أول تسجيل دخول (لتوجيه Onboarding)',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  firstLogin?: boolean;
}
