// src/modules/customers/dto/send-otp.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { ContactType } from '../schemas/customer-otp.schema';

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
    enum: ContactType,
  })
  @IsEnum(ContactType, { message: 'نوع التواصل يجب أن يكون email أو phone' })
  contactType!: ContactType;
}
