// src/modules/customers/dto/send-otp.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class SendOtpDto {
  @ApiProperty({
    description: 'معرّف التاجر',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString({ message: 'يجب أن يكون معرّف التاجر نصيًا' })
  @IsNotEmpty({ message: 'معرّف التاجر مطلوب' })
  merchantId!: string;

  @ApiProperty({
    description: 'البريد الإلكتروني أو رقم الهاتف',
    example: 'customer@example.com',
  })
  @IsString({ message: 'يجب أن يكون التواصل نصيًا' })
  @IsNotEmpty({ message: 'معلومات التواصل مطلوبة' })
  contact!: string;

  @ApiProperty({
    description: 'نوع التواصل',
    example: 'email',
    enum: ['email', 'phone'],
  })
  @IsString({ message: 'يجب أن يكون نوع التواصل نصيًا' })
  @IsIn(['email', 'phone'], { message: 'نوع التواصل يجب أن يكون email أو phone' })
  contactType!: 'email' | 'phone';
}
