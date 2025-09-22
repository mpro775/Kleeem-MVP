// src/modules/kleem/botFaq/dto/bulk-import.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ValidateNested,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';

import { CreateBotFaqDto } from './create-botFaq.dto';

export class BulkImportDto {
  @ApiProperty({
    description: 'مصفوفة من الأسئلة الشائعة للاستيراد',
    type: [CreateBotFaqDto],
    example: [
      {
        question: 'كيف يمكنني إعادة تعيين كلمة المرور؟',
        answer:
          'يمكنك إعادة تعيين كلمة المرور من خلال النقر على "نسيت كلمة المرور" في صفحة تسجيل الدخول.',
        source: 'manual',
        tags: ['حساب', 'تسجيل دخول'],
        locale: 'ar',
      },
    ],
    minItems: 1,
    maxItems: 500,
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'يجب أن تحتوي المصفوفة على عنصر واحد على الأقل' })
  @ArrayMaxSize(500, {
    message: 'لا يمكن أن تحتوي المصفوفة على أكثر من 500 عنصر',
  })
  @ValidateNested({ each: true })
  @Type(() => CreateBotFaqDto)
  items: CreateBotFaqDto[];
}
