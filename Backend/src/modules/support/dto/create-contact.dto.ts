// src/modules/support/dto/create-contact.dto.ts
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

import { MAX_MESSAGE_LENGTH } from '../support.constants';
import { CONTACT_TOPIC_VALUES, ContactTopic } from '../support.enums';

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
    typeof value === 'string' ? value.toLowerCase() : (value as string),
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
  @MaxLength(MAX_MESSAGE_LENGTH)
  message!: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  recaptchaToken?: string;
}
