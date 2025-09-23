// src/chat/dto/public-widget.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';

export class PublicWidgetThemeDto {
  @ApiProperty() @IsString() headerBgColor!: string;
  @ApiProperty() @IsString() brandColor!: string;
  @ApiProperty() @IsString() fontFamily!: string;
}

export class PublicWidgetSettingsResponseDto {
  @ApiProperty() merchantId!: string;
  @ApiPropertyOptional() widgetSlug?: string;

  @ApiProperty({ enum: ['bubble', 'iframe', 'bar', 'conversational'] })
  @IsEnum(['bubble', 'iframe', 'bar', 'conversational'])
  embedMode!: 'bubble' | 'iframe' | 'bar' | 'conversational';

  @ApiProperty({ type: PublicWidgetThemeDto }) theme!: PublicWidgetThemeDto;

  @ApiProperty() botName!: string;
  @ApiProperty() welcomeMessage!: string;
  @ApiProperty() useStorefrontBrand!: boolean;
  @ApiPropertyOptional({ type: [String] }) topicsTags?: string[];
  @ApiPropertyOptional({ type: [String] }) sentimentTags?: string[];
  @ApiProperty() handoffEnabled!: boolean;

  @ApiProperty({ enum: ['slack', 'email', 'webhook'] })
  @IsEnum(['slack', 'email', 'webhook'])
  handoffChannel!: 'slack' | 'email' | 'webhook';

  @ApiPropertyOptional({ type: Object, additionalProperties: true })
  handoffConfig?: Record<string, unknown>;
}

export class PublicWidgetStatusResponseDto {
  @ApiProperty() widgetSlug!: string;
  @ApiProperty() isOnline!: boolean;
  @ApiProperty() isWithinBusinessHours!: boolean;
  @ApiProperty() estimatedWaitTime!: number;
  @ApiProperty() availableAgents!: number;
  @ApiProperty() totalActiveChats!: number;
  @ApiProperty() lastUpdated!: string;
}

export class CreateSessionDto {
  @ApiPropertyOptional() @IsString() @IsOptional() visitorId?: string;
  @ApiPropertyOptional({ type: Object })
  @IsObject()
  @IsOptional()
  visitorInfo?: {
    name?: string;
    email?: string;
    phone?: string;
    userAgent?: string;
    referrer?: string;
    ipAddress?: string;
  };
  @ApiPropertyOptional() @IsString() @IsOptional() initialMessage?: string;
  @ApiPropertyOptional({ type: Object })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class CreateSessionResponseDto {
  @ApiProperty() success!: boolean;
  @ApiProperty() sessionId!: string;
  @ApiProperty() widgetSlug!: string;
  @ApiProperty() visitorId!: string;
  @ApiProperty({ enum: ['active', 'waiting', 'assigned'] }) status!:
    | 'active'
    | 'waiting'
    | 'assigned';
  @ApiPropertyOptional({ type: Object, nullable: true }) assignedAgent?: {
    id: string;
    name: string;
    avatar?: string;
  } | null;
  @ApiProperty() estimatedWaitTime!: number;
  @ApiProperty() welcomeMessage!: string;
  @ApiProperty() createdAt!: string;
  @ApiProperty() expiresAt!: string;
}
