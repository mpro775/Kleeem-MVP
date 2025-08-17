import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO لتحديث إعدادات ودجة الدردشة. جميع الخصائص اختيارية.
 */
export class UpdateWidgetSettingsDto {
  // General
  @ApiPropertyOptional({ description: 'اسم البوت', example: 'مساعد' }) @IsString() @IsOptional() botName?: string;
  @ApiPropertyOptional({ description: 'رسالة الترحيب', example: 'مرحباً! كيف يمكنني مساعدتك اليوم؟' }) @IsString() @IsOptional() welcomeMessage?: string;
  @ApiPropertyOptional({ description: 'الـ slug الفريد للودجة', example: 'my-awesome-widget' }) @IsString() @IsOptional() slug?: string;

  // Appearance
  @ApiPropertyOptional({
    description: 'السمة اللونية للودجة',
    enum: ['default', 'gray', 'blue', 'purple', 'custom'],
  })
  @IsEnum(['default', 'gray', 'blue', 'purple', 'custom'])
  @IsOptional()
  theme?: string;

  @ApiPropertyOptional({ description: 'لون العلامة التجارية الأساسي (في حالة السمة المخصصة)', example: '#FF5733' }) @IsString() @IsOptional() brandColor?: string;
  @ApiPropertyOptional({ description: 'عائلة الخطوط المستخدمة في الودجة', example: 'Arial, sans-serif' }) @IsString() @IsOptional() fontFamily?: string;
  @ApiPropertyOptional({ description: 'لون خلفية الترويسة', example: '#FFFFFF' }) @IsString() @IsOptional() headerBgColor?: string;
  @ApiPropertyOptional({ description: 'لون خلفية جسم الودجة', example: '#F5F5F5' }) @IsString() @IsOptional() bodyBgColor?: string;

  @ApiPropertyOptional({ description: 'تفعيل/تعطيل خاصية المحادثة البشرية', example: true }) @IsBoolean() @IsOptional() handoffEnabled?: boolean;
  @ApiPropertyOptional({ description: 'قناة التواصل للمحادثة البشرية', enum: ['slack', 'email', 'webhook'] })
  @IsEnum(['slack', 'email', 'webhook'])
  @IsOptional()
  handoffChannel?: 'slack' | 'email' | 'webhook';
  @ApiPropertyOptional({ description: 'إعدادات قناة التواصل (مثل رابط webhook أو بريد إلكتروني)', type: 'object', additionalProperties: true, example: { url: 'https://hooks.slack.com/...' } })
  @IsOptional()
  handoffConfig?: Record<string, any>;

  // Tags
  @ApiPropertyOptional({ description: 'تصنيفات المواضيع المقترحة', type: [String], example: ['استفسار عن منتج', 'مشكلة في الطلب'] })
  @IsArray()
  @IsOptional()
  topicsTags?: string[];
  @ApiPropertyOptional({ description: 'تصنيفات المشاعر المقترحة', type: [String], example: ['إيجابي', 'سلبي', 'محايد'] })
  @IsArray()
  @IsOptional()
  sentimentTags?: string[];
  @ApiPropertyOptional({ description: 'تفعيل/تعطيل التصنيف التلقائي للمحادثات', example: false }) @IsBoolean() @IsOptional() autoTagging?: boolean;

  @ApiPropertyOptional({
    enum: ['bubble', 'iframe', 'bar', 'conversational'],
    description: 'وضع التضمين الافتراضي للودجة',
  })
  @IsEnum(['bubble', 'iframe', 'bar', 'conversational'])
  @IsOptional()
  embedMode?: 'bubble' | 'iframe' | 'bar' | 'conversational';
}
