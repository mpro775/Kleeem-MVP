import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { IsEnum, IsString, Matches } from 'class-validator';
import { Document } from 'mongoose';

export enum WeekDay {
  Sunday = 'Sunday',
  Monday = 'Monday',
  Tuesday = 'Tuesday',
  Wednesday = 'Wednesday',
  Thursday = 'Thursday',
  Friday = 'Friday',
  Saturday = 'Saturday',
}

@Schema({ _id: false })
export class WorkingHour {
  @Prop({ required: true, enum: Object.values(WeekDay) })
  @IsEnum(WeekDay)
  day!: WeekDay;

  // نستخدم تنسيق HH:mm (24h)؛ نتحقق من النمط عبر regex
  @Prop({ required: true })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, {
    message: 'openTime must be in HH:mm format',
  })
  openTime!: string;

  @Prop({ required: true })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, {
    message: 'closeTime must be in HH:mm format',
  })
  closeTime!: string;
}

export type WorkingHourDocument = WorkingHour & Document;
export const WorkingHourSchema = SchemaFactory.createForClass(WorkingHour);
