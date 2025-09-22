import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, Matches } from 'class-validator';

import { WeekDay } from '../../schemas/working-hours.schema';

/**
 * ساعات العمل اليومية للتاجر
 * @description يحدد ساعات العمل ليوم معين من الأسبوع
 */
export class WorkingHourDto {
  @ApiProperty({
    description: 'يوم الأسبوع',
    enum: WeekDay,
    example: 'Sunday',
    required: true,
  })
  @IsEnum(WeekDay, { message: 'يجب تحديد يوم أسبوع صالح' })
  day: WeekDay;

  @ApiProperty({
    description: 'وقت الفتح (بتنسيق HH:mm)',
    example: '09:00',
    pattern: '^\\d{2}:\\d{2}$',
    required: true,
  })
  @IsString({ message: 'يجب أن يكون وقت الفتح نصيًا' })
  @Matches(/^\d{2}:\d{2}$/, {
    message: 'يجب أن يكون وقت الفتح بتنسيق HH:mm',
  })
  openTime: string;

  @ApiProperty({
    description: 'وقت الإغلاق (بتنسيق HH:mm)',
    example: '17:00',
    pattern: '^\\d{2}:\\d{2}$',
    required: true,
  })
  @IsString({ message: 'يجب أن يكون وقت الإغلاق نصيًا' })
  @Matches(/^\d{2}:\d{2}$/, {
    message: 'يجب أن يكون وقت الإغلاق بتنسيق HH:mm',
  })
  closeTime: string;
}
