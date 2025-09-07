// src/modules/support/dto/create-contact.dto.ts
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { CONTACT_TOPIC_VALUES, ContactTopic } from '../support.enums';
import { Transform } from 'class-transformer';

export class CreateContactDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  // حوّل الإدخال إلى lowercase أولًا ثم تحقق ضمن القائمة
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase() : value,
  )
  @IsIn(CONTACT_TOPIC_VALUES, {
    message:
      'topic must be one of the following values: sales, support, billing, partnership',
  })
  topic!: ContactTopic;

  @IsString()
  @MinLength(5)
  @MaxLength(200)
  subject!: string;

  @IsString()
  @MinLength(20)
  @MaxLength(5000)
  message!: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  recaptchaToken?: string;
}
