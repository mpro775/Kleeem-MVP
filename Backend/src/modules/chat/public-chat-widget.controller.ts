// src/chat/public-chat-widget.controller.ts
import {
  Controller,
  Get,
  Param,
  BadRequestException,
  NotFoundException,
  Post,
  Body,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { ErrorResponse } from 'src/common/dto/error-response.dto';

import { ChatWidgetService } from './chat-widget.service';
import {
  CreateSessionDto,
  CreateSessionResponseDto,
  PublicWidgetSettingsResponseDto,
  PublicWidgetStatusResponseDto,
} from './dto/public-widget.dto';

// Default values for widget status
const DEFAULT_ESTIMATED_WAIT_TIME = 45;
const DEFAULT_AVAILABLE_AGENTS = 3;
const DEFAULT_TOTAL_ACTIVE_CHATS = 12;
const DEFAULT_SESSION_WAIT_TIME = 30;

// Constants for session ID generation
const SESSION_ID_RANDOM_BASE = 36;
const SESSION_ID_LENGTH = 11;
const SESSION_ID_PREFIX_LENGTH = 2;

// Time constants
const MILLISECONDS_PER_SECOND = 1000;
const MILLISECONDS_PER_HOUR = 60 * 60 * MILLISECONDS_PER_SECOND;

@ApiTags('ودجة الدردشة (عام)')
@Controller('public/chat-widget')
export class PublicChatWidgetController {
  constructor(private readonly svc: ChatWidgetService) {}

  @Get(':widgetSlug')
  @Public()
  @ApiOperation({
    operationId: 'publicChatWidget_getSettings',
    summary: 'الحصول على إعدادات الودجة العامة',
  })
  @ApiParam({ name: 'widgetSlug', example: 'chat_abc123' })
  @ApiOkResponse({
    description: 'تم العثور على إعدادات الودجة',
    type: PublicWidgetSettingsResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'لم يتم العثور على ودجة بهذا الـ slug',
    type: ErrorResponse,
  })
  @ApiBadRequestResponse({
    description: 'الـ slug غير صحيح أو فارغ',
    type: ErrorResponse,
  })
  async getByWidgetSlug(
    @Param('widgetSlug') widgetSlug: string,
  ): Promise<PublicWidgetSettingsResponseDto> {
    if (!widgetSlug?.trim()) {
      throw new BadRequestException({
        code: 'INVALID_WIDGET_SLUG',
        message: 'الـ slug مطلوب ويجب أن يكون نصاً غير فارغ',
      });
    }
    const settings = await this.svc.getSettingsBySlugOrPublicSlug(widgetSlug);
    if (!settings)
      throw new NotFoundException({
        code: 'WIDGET_NOT_FOUND',
        message: 'لم يتم العثور على ودجة بهذا الـ slug',
      });

    // تطبيع لتوافق DTO (مثال على خريطة بسيطة من السكيمة إلى DTO)
    return {
      merchantId: settings.merchantId,
      widgetSlug: settings.widgetSlug as string,
      embedMode: settings.embedMode,
      theme: {
        headerBgColor: settings.headerBgColor,
        brandColor: settings.brandColor,
        fontFamily: settings.fontFamily,
      },
      botName: settings.botName,
      welcomeMessage: settings.welcomeMessage,
      useStorefrontBrand: settings.useStorefrontBrand,
      topicsTags: settings.topicsTags,
      sentimentTags: settings.sentimentTags,
      handoffEnabled: settings.handoffEnabled,
      handoffChannel: settings.handoffChannel,
      handoffConfig: settings.handoffConfig,
    };
  }

  @Get(':widgetSlug/status')
  @Public()
  @ApiOperation({
    operationId: 'publicChatWidget_getStatus',
    summary: 'الحصول على حالة الودجة',
  })
  @ApiParam({ name: 'widgetSlug', example: 'chat_abc123' })
  @ApiOkResponse({
    description: 'حالة الودجة',
    type: PublicWidgetStatusResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'لم يتم العثور على ودجة بهذا الـ slug',
    type: ErrorResponse,
  })
  @ApiBadRequestResponse({
    description: 'الـ slug غير صحيح',
    type: ErrorResponse,
  })
  async getWidgetStatus(
    @Param('widgetSlug') widgetSlug: string,
  ): Promise<PublicWidgetStatusResponseDto> {
    if (!widgetSlug?.trim()) {
      throw new BadRequestException({
        code: 'INVALID_WIDGET_SLUG',
        message: 'الـ slug مطلوب ويجب أن يكون نصاً غير فارغ',
      });
    }
    const exists = await this.svc.getSettingsBySlugOrPublicSlug(widgetSlug);
    if (!exists)
      throw new NotFoundException({
        code: 'WIDGET_NOT_FOUND',
        message: 'لم يتم العثور على ودجة بهذا الـ slug',
      });

    // بإمكانك جلب الحالة الفعلية من خدمة/ريبو
    return {
      widgetSlug,
      isOnline: true,
      isWithinBusinessHours: true,
      estimatedWaitTime: DEFAULT_ESTIMATED_WAIT_TIME,
      availableAgents: DEFAULT_AVAILABLE_AGENTS,
      totalActiveChats: DEFAULT_TOTAL_ACTIVE_CHATS,
      lastUpdated: new Date().toISOString(),
    };
  }

  @Post(':widgetSlug/session')
  @Public()
  @ApiOperation({
    operationId: 'publicChatWidget_createSession',
    summary: 'إنشاء جلسة دردشة جديدة',
  })
  @ApiParam({ name: 'widgetSlug', example: 'chat_abc123' })
  @ApiCreatedResponse({
    description: 'تم إنشاء الجلسة بنجاح',
    type: CreateSessionResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'بيانات الجلسة غير صحيحة',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'لم يتم العثور على ودجة بهذا الـ slug',
    type: ErrorResponse,
  })
  async createSession(
    @Param('widgetSlug') widgetSlug: string,
    @Body() body: CreateSessionDto,
  ): Promise<CreateSessionResponseDto> {
    if (!widgetSlug?.trim()) {
      throw new BadRequestException({
        code: 'INVALID_WIDGET_SLUG',
        message: 'الـ slug مطلوب ويجب أن يكون نصاً غير فارغ',
      });
    }
    const exists = await this.svc.getSettingsBySlugOrPublicSlug(widgetSlug);
    if (!exists)
      throw new NotFoundException({
        code: 'WIDGET_NOT_FOUND',
        message: 'لم يتم العثور على ودجة بهذا الـ slug',
      });

    const sessionId = `session_${Date.now()}_${Math.random().toString(SESSION_ID_RANDOM_BASE).slice(SESSION_ID_PREFIX_LENGTH, SESSION_ID_LENGTH)}`;

    return {
      success: true,
      sessionId,
      widgetSlug,
      visitorId: body.visitorId ?? `visitor_${Date.now()}`,
      status: 'waiting',
      assignedAgent: null,
      estimatedWaitTime: DEFAULT_SESSION_WAIT_TIME,
      welcomeMessage: exists.welcomeMessage ?? 'مرحباً! شكراً لتواصلك.',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + MILLISECONDS_PER_HOUR).toISOString(),
    };
  }
}
