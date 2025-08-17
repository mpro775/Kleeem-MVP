import { IsString, IsNotEmpty, IsOptional, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddressDto {
  @IsString({ message: 'يجب أن يكون اسم الشارع نصيًا' })
  @IsNotEmpty({ message: 'اسم الشارع مطلوب' })
  @Length(3, 200, { message: 'يجب أن يكون طول اسم الشارع بين 3 و 200 حرف' })
  @ApiProperty({
    description: 'اسم الشارع والعنوان التفصيلي',
    example: 'شارع الملك فهد',
    minLength: 3,
    maxLength: 200,
    required: true
  })
  street: string;

  @IsString({ message: 'يجب أن يكون اسم المدينة نصيًا' })
  @IsNotEmpty({ message: 'اسم المدينة مطلوب' })
  @Length(2, 100, { message: 'يجب أن يكون طول اسم المدينة بين 2 و 100 حرف' })
  @ApiProperty({
    description: 'اسم المدينة',
    example: 'الرياض',
    minLength: 2,
    maxLength: 100,
    required: true
  })
  city: string;

  @IsString({ message: 'يجب أن يكون اسم الدولة نصيًا' })
  @IsNotEmpty({ message: 'اسم الدولة مطلوب' })
  @Length(2, 100, { message: 'يجب أن يكون طول اسم الدولة بين 2 و 100 حرف' })
  @ApiProperty({
    description: 'اسم الدولة',
    example: 'المملكة العربية السعودية',
    minLength: 2,
    maxLength: 100,
    required: true
  })
  country: string;

  @IsString({ message: 'يجب أن يكون اسم المنطقة/الولاية نصيًا' })
  @IsOptional()
  @Length(2, 100, { message: 'يجب أن يكون طول اسم المنطقة/الولاية بين 2 و 100 حرف' })
  @ApiPropertyOptional({
    description: 'المنطقة أو الولاية (اختياري)',
    example: 'منطقة الرياض',
    minLength: 2,
    maxLength: 100,
    required: false
  })
  state?: string;

  @IsString({ message: 'يجب أن يكون الرمز البريدي نصيًا' })
  @IsOptional()
  @Length(4, 20, { message: 'يجب أن يكون طول الرمز البريدي بين 4 و 20 حرف' })
  @ApiPropertyOptional({
    description: 'الرمز البريدي (اختياري)',
    example: '12345',
    minLength: 4,
    maxLength: 20,
    required: false
  })
  postalCode?: string;
}
