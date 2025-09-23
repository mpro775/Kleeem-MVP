// ================= External imports =================
import {
  Controller,
  Get,
  Put,
  Post,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { Matches } from 'class-validator';
// ================= Internal imports =================
import { Public } from 'src/common/decorators/public.decorator';
import { ErrorResponse } from 'src/common/dto/error-response.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';

import { ChatWidgetService } from './chat-widget.service';
import { UpdateWidgetSettingsDto } from './dto/update-widget-settings.dto';
import { ChatWidgetSettings } from './schema/chat-widget.schema';

// ================== Constants ==================
const MERCHANT_PREFIX = 'm_' as const;
const SHARE_BASE = 'https://chat.example.com/widget' as const;

// ================== DTOs ==================
class MerchantParamDto {
  @Matches(/^m_.+/, { message: 'merchantId must start with m_' })
  merchantId!: string;
}

@ApiTags('ودجة الدردشة')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiParam({
  name: 'merchantId',
  description: 'معرف التاجر',
  example: 'm_12345',
  type: 'string',
})
@Controller('merchants/:merchantId/widget-settings')
export class ChatWidgetController {
  constructor(private readonly svc: ChatWidgetService) {}

  // ---------- Get settings ----------
  @Get()
  @Public()
  @ApiOperation({
    operationId: 'chatWidget_getSettings',
    summary: 'الحصول على إعدادات ودجة التاجر',
    description: 'الحصول على إعدادات ودجة الدردشة للتاجر المحدد',
  })
  @ApiOkResponse({
    description: 'تم العثور على الإعدادات',
    schema: {
      type: 'object',
      properties: {
        merchantId: { type: 'string', example: `${MERCHANT_PREFIX}12345` },
        widgetSlug: { type: 'string', example: 'chat_abc123' },
        theme: {
          type: 'object',
          properties: {
            primaryColor: { type: 'string', example: '#007bff' },
            secondaryColor: { type: 'string', example: '#6c757d' },
            fontFamily: { type: 'string', example: 'Arial' },
          },
        },
        behavior: {
          type: 'object',
          properties: {
            autoOpen: { type: 'boolean', example: false },
            showOnMobile: { type: 'boolean', example: true },
            position: {
              type: 'string',
              enum: ['bottom-right', 'bottom-left'],
              example: 'bottom-right',
            },
          },
        },
        embedMode: {
          type: 'string',
          enum: ['iframe', 'popup'],
          example: 'iframe',
        },
        isActive: { type: 'boolean', example: true },
        createdAt: { type: 'string', example: '2023-09-18T10:30:00Z' },
        updatedAt: { type: 'string', example: '2023-09-18T15:45:00Z' },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'لم يتم العثور على التاجر أو إعدادات الودجة',
    type: ErrorResponse,
  })
  getSettings(
    @Param() { merchantId }: MerchantParamDto,
  ): Promise<ChatWidgetSettings> {
    return this.svc.getSettings(merchantId);
  }

  // ---------- Update settings ----------
  @Put()
  @Public()
  @ApiOperation({
    operationId: 'chatWidget_updateSettings',
    summary: 'تحديث إعدادات ودجة التاجر',
    description: 'تحديث إعدادات ودجة الدردشة للتاجر المحدد',
  })
  @ApiBody({ type: UpdateWidgetSettingsDto })
  @ApiOkResponse({
    description: 'تم تحديث الإعدادات بنجاح',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'تم تحديث إعدادات الودجة بنجاح' },
        settings: {
          type: 'object',
          description: 'الإعدادات المحدثة',
          properties: {
            merchantId: { type: 'string', example: `${MERCHANT_PREFIX}12345` },
            widgetSlug: { type: 'string', example: 'chat_abc123' },
            theme: {
              type: 'object',
              properties: {
                primaryColor: { type: 'string', example: '#ff6b35' },
                secondaryColor: { type: 'string', example: '#f7931e' },
              },
            },
            behavior: {
              type: 'object',
              properties: {
                autoOpen: { type: 'boolean', example: true },
                position: { type: 'string', example: 'bottom-left' },
              },
            },
            updatedAt: { type: 'string', example: '2023-09-18T16:00:00Z' },
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'بيانات غير صحيحة أو معرف التاجر غير صحيح',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'لم يتم العثور على التاجر أو إعدادات الودجة',
    type: ErrorResponse,
  })
  updateSettings(
    @Param() { merchantId }: MerchantParamDto,
    @Body() dto: UpdateWidgetSettingsDto,
  ): Promise<ChatWidgetSettings> {
    return this.svc.updateSettings(merchantId, dto);
  }

  // ---------- Get embed settings ----------
  @Get('embed-settings')
  @Public()
  @ApiOperation({
    operationId: 'chatWidget_getEmbedSettings',
    summary: 'الحصول على إعدادات التضمين',
    description:
      'الحصول على إعدادات تضمين الودجة (iframe/popup) ورابط المشاركة',
  })
  @ApiOkResponse({ description: 'تم العثور على إعدادات التضمين' })
  @ApiNotFoundResponse({
    description: 'لم يتم العثور على التاجر أو إعدادات الودجة',
    type: ErrorResponse,
  })
  async getEmbedSettings(@Param() { merchantId }: MerchantParamDto): Promise<{
    embedMode: string;
    availableModes: string[];
    shareUrl: string;
    colors: {
      headerBgColor: string;
      brandColor: string;
      onHeader: string;
    };
  }> {
    return this.svc.getEmbedSettings(merchantId);
  }

  // ---------- Share URL ----------
  @Get('share-url')
  @Public()
  @ApiOperation({
    operationId: 'chatWidget_getShareUrl',
    summary: 'الحصول على رابط المشاركة للودجة',
    description: 'إنشاء رابط مشاركة فريد لودجة الدردشة يمكن مشاركته مع العملاء',
  })
  @ApiOkResponse({
    description: 'تم إنشاء رابط المشاركة',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        url: { type: 'string', example: `${SHARE_BASE}/chat_abc123` },
        widgetSlug: { type: 'string', example: 'chat_abc123' },
        merchantId: { type: 'string', example: `${MERCHANT_PREFIX}12345` },
        expiresAt: { type: 'string', nullable: true, example: null },
        isActive: { type: 'boolean', example: true },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'لم يتم العثور على التاجر أو إعدادات الودجة',
    type: ErrorResponse,
  })
  async getShareUrl(@Param() { merchantId }: MerchantParamDto): Promise<{
    success: boolean;
    url: string;
    widgetSlug: string;
    merchantId: string;
    expiresAt: string | null;
    isActive: boolean;
  }> {
    const settings = await this.svc.getSettings(merchantId);
    return {
      success: true,
      url: `${SHARE_BASE}/${settings.widgetSlug}`,
      widgetSlug: settings.widgetSlug!,
      merchantId,
      expiresAt: null,
      isActive: true,
    };
  }

  // ---------- Generate slug ----------
  @Post('slug')
  @Public()
  @ApiOperation({
    operationId: 'chatWidget_generateSlug',
    summary: 'إنشاء slug فريد للودجة',
    description:
      'إنشاء معرف فريد (slug) لودجة الدردشة يمكن استخدامه في الروابط والتضمين',
  })
  @ApiCreatedResponse({
    description: 'تم إنشاء الـ slug بنجاح',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'تم إنشاء slug فريد للودجة' },
        slug: { type: 'string', example: 'chat_xyz789' },
        merchantId: { type: 'string', example: `${MERCHANT_PREFIX}12345` },
        generatedAt: { type: 'string', example: '2023-09-18T16:30:00Z' },
        expiresAt: { type: 'string', nullable: true, example: null },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'معرف التاجر غير صحيح أو فشل في إنشاء slug فريد',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'لم يتم العثور على التاجر',
    type: ErrorResponse,
  })
  generateSlug(@Param() { merchantId }: MerchantParamDto): Promise<string> {
    return this.svc.generateWidgetSlug(merchantId);
  }

  // ---------- Update embed settings ----------
  @Put('embed-settings')
  @ApiOperation({
    operationId: 'chatWidget_updateEmbedSettings',
    summary: 'تحديث وضع التضمين الافتراضي',
    description: 'تحديث إعدادات التضمين (iframe/popup) لودجة الدردشة',
  })
  @ApiBody({
    type: UpdateWidgetSettingsDto,
    description: 'يتم قبول حقل embedMode فقط',
  })
  @ApiOkResponse({
    description: 'تم تحديث وضع التضمين بنجاح',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'تم تحديث وضع التضمين بنجاح' },
        settings: {
          type: 'object',
          properties: {
            merchantId: { type: 'string', example: `${MERCHANT_PREFIX}12345` },
            embedMode: {
              type: 'string',
              enum: ['iframe', 'popup'],
              example: 'popup',
            },
            widgetSlug: { type: 'string', example: 'chat_abc123' },
            shareUrl: { type: 'string', example: `${SHARE_BASE}/chat_abc123` },
            updatedAt: { type: 'string', example: '2023-09-18T16:45:00Z' },
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'معرف التاجر غير صحيح أو وضع التضمين غير صحيح',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'لم يتم العثور على التاجر أو إعدادات الودجة',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description: 'ليس لديك صلاحية لتحديث إعدادات التضمين',
    type: ErrorResponse,
  })
  async updateEmbedSettings(
    @Param() { merchantId }: MerchantParamDto,
    @Body() dto: UpdateWidgetSettingsDto,
  ): Promise<{
    embedMode: string;
    shareUrl: string;
    availableModes: string[];
  }> {
    // نقبل فقط embedMode من dto
    return this.svc.updateEmbedSettings(merchantId, {
      embedMode: dto.embedMode,
    });
  }
}
