import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, IsNotEmpty, Length, ValidateIf } from 'class-validator';

import {
  MAX_POSTAL_CODE_LENGTH,
  MIN_POSTAL_CODE_LENGTH,
} from '../../constants';

export class AddressDto {
  @IsString({ message: 'يجب أن يكون اسم الشارع نصيًا' })
  @IsNotEmpty({ message: 'اسم الشارع مطلوب' })
  @Length(3, 200, { message: 'يجب أن يكون طول اسم الشارع بين 3 و 200 حرف' })
  @ApiProperty({
    description: 'اسم الشارع والعنوان التفصيلي',
    example: 'شارع الملك فهد',
    minLength: 3,
    maxLength: 200,
    required: true,
  })
  street!: string;

  @IsString({ message: 'يجب أن يكون اسم المدينة نصيًا' })
  @IsNotEmpty({ message: 'اسم المدينة مطلوب' })
  @Length(2, 100, { message: 'يجب أن يكون طول اسم المدينة بين 2 و 100 حرف' })
  @ApiProperty({
    description: 'اسم المدينة',
    example: 'الرياض',
    minLength: 2,
    maxLength: 100,
    required: true,
  })
  city!: string;

  @IsString({ message: 'يجب أن يكون اسم الدولة نصيًا' })
  @IsNotEmpty({ message: 'اسم الدولة مطلوب' })
  @Length(2, 100, { message: 'يجب أن يكون طول اسم الدولة بين 2 و 100 حرف' })
  @ApiProperty({
    description: 'اسم الدولة',
    example: 'المملكة العربية السعودية',
    minLength: 2,
    maxLength: 100,
    required: true,
  })
  country!: string;

  @ApiPropertyOptional({
    description: 'المنطقة أو الولاية (اختياري)',
    example: 'منطقة الرياض',
  })
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() === ''
      ? undefined
      : (value as string),
  )
  @ValidateIf(
    (_, v) => v !== undefined && v !== null && String(v).trim() !== '',
  )
  @IsString({ message: 'يجب أن يكون اسم المنطقة/الولاية نصيًا' })
  @Length(2, 100, {
    message: 'يجب أن يكون طول اسم المنطقة/الولاية بين 2 و 100 حرف',
  })
  state?: string;

  @ApiPropertyOptional({
    description: 'الرمز البريدي (اختياري)',
    example: '12345',
  })
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() === ''
      ? undefined
      : (value as string),
  )
  @ValidateIf(
    (_, v) => v !== undefined && v !== null && String(v).trim() !== '',
  )
  @IsString({ message: 'يجب أن يكون الرمز البريدي نصيًا' })
  @Length(MIN_POSTAL_CODE_LENGTH, MAX_POSTAL_CODE_LENGTH, {
    message: 'يجب أن يكون طول الرمز البريدي بين 4 و 20 حرف',
  })
  postalCode?: string;
}
