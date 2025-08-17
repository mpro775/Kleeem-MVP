import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsObject,
  ValidateNested,
  IsUrl,
  IsPhoneNumber,
  IsNotEmpty,
  IsJSON,
  IsBooleanString
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * تفاصيل إعدادات القناة
 * @description يحتوي على إعدادات قناة اتصال واحدة (واتساب/تيليجرام/ويبشات)
 */
export class ChannelDetailsDto {
  @ApiPropertyOptional({
    description: 'تفعيل/تعطيل القناة',
    type: Boolean,
    default: false,
    example: true
  })
  @IsOptional()
  @IsBoolean({ message: 'يجب أن تكون حالة التفعيل قيمة منطقية (true/false)' })
  enabled?: boolean;

  @ApiPropertyOptional({
    description: 'رقم الهاتف المرتبط بالقناة (مطلوب للواتساب)',
    example: '+966501234567',
    maxLength: 20,
    required: false
  })
  @IsOptional()
  @IsString({ message: 'يجب أن يكون رقم الهاتف نصيًا' })
  @IsPhoneNumber(undefined, { message: 'يجب إدخال رقم هاتف صحيح' })
  phone?: string;

  @ApiPropertyOptional({
    description: 'توكن الوصول للقناة (مطلوب لمعظم المنصات)',
    example: '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11',
    required: false
  })
  @IsOptional()
  @IsString({ message: 'يجب أن يكون التوكن نصيًا' })
  token?: string;

  @ApiPropertyOptional({
    description: 'معرف المحادثة (مطلوب لبعض المنصات مثل تيليجرام)',
    example: '-1001234567890',
    required: false
  })
  @IsOptional()
  @IsString({ message: 'يجب أن يكون معرف المحادثة نصيًا' })
  chatId?: string;

  @ApiPropertyOptional({
    description: 'رابط الويب هوك لاستقبال التحديثات',
    example: 'https://your-domain.com/api/webhook/telegram',
    required: false
  })
  @IsOptional()
  @IsString({ message: 'يجب أن يكون رابط الويب هوك نصيًا' })
  @IsUrl({}, { message: 'يجب إدخال رابط ويب هوك صحيح' })
  webhookUrl?: string;

  @ApiPropertyOptional({
    description: 'إعدادات خاصة بالويدجت (تختلف حسب المنصة)',
    type: Object,
    example: {
      theme: 'light',
      position: 'right',
      welcomeMessage: 'مرحباً بك! كيف يمكنني مساعدتك؟'
    },
    required: false
  })
  @IsOptional()
  @IsObject({ message: 'يجب أن تكون إعدادات الويدجت كائنًا' })
  widgetSettings?: Record<string, any>;
}

/**
 * كائن يحتوي على جميع قنوات الاتصال المتاحة
 * @description يجمع إعدادات جميع منصات الاتصال المتاحة للتاجر
 */
export class ChannelsDto {
  @ApiPropertyOptional({
    description: 'إعدادات قناة الواتساب',
    type: () => ChannelDetailsDto,
    required: false
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ChannelDetailsDto)
  whatsapp?: ChannelDetailsDto;

  @ApiPropertyOptional({
    description: 'إعدادات قناة التليجرام',
    type: () => ChannelDetailsDto,
    required: false
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ChannelDetailsDto)
  telegram?: ChannelDetailsDto;

  @ApiPropertyOptional({
    description: 'إعدادات قناة الدردشة المدمجة',
    type: () => ChannelDetailsDto,
    required: false
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ChannelDetailsDto)
  webchat?: ChannelDetailsDto;
}
