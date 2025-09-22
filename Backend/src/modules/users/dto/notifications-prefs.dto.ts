import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class ChannelsDto {
  @ApiProperty({ default: true }) @IsBoolean() inApp: boolean;
  @ApiProperty({ default: true }) @IsBoolean() email: boolean;
  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  telegram?: boolean;
  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  whatsapp?: boolean;
}

class TopicsDto {
  @ApiProperty({ default: true }) @IsBoolean() syncFailed: boolean;
  @ApiProperty({ default: true }) @IsBoolean() syncCompleted: boolean;
  @ApiProperty({ default: true }) @IsBoolean() webhookFailed: boolean;
  @ApiProperty({ default: true }) @IsBoolean() embeddingsCompleted: boolean;
  @ApiProperty({ enum: ['off', 'daily', 'weekly'], default: 'daily' })
  @IsIn(['off', 'daily', 'weekly'])
  missingResponsesDigest: 'off' | 'daily' | 'weekly';
}

class QuietHoursDto {
  @ApiProperty({ default: false }) @IsBoolean() enabled: boolean;
  @ApiProperty({ required: false, default: '22:00' })
  @IsOptional()
  @IsString()
  start?: string;
  @ApiProperty({ required: false, default: '08:00' })
  @IsOptional()
  @IsString()
  end?: string;
  @ApiProperty({ required: false, default: 'Asia/Aden' })
  @IsOptional()
  @IsString()
  timezone?: string;
}

export class NotificationsPrefsDto {
  @ValidateNested() @Type(() => ChannelsDto) channels: ChannelsDto;
  @ValidateNested() @Type(() => TopicsDto) topics: TopicsDto;
  @ValidateNested() @Type(() => QuietHoursDto) quietHours: QuietHoursDto;
}
