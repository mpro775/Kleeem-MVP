import {
  Controller,
  Get,
  Put,
  Post,
  Param,
  Body,
  UseGuards,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { ErrorResponse } from 'src/common/dto/error-response.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';

import {
  ApiSuccessResponse,
  ApiCreatedResponse as CommonApiCreatedResponse,
} from '../../common';

import { ChatWidgetService } from './chat-widget.service';
import { HandoffDto } from './dto/handoff.dto';
import { UpdateWidgetSettingsDto } from './dto/update-widget-settings.dto';

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
        merchantId: { type: 'string', example: 'm_12345' },
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
  getSettings(@Param('merchantId') merchantId: string) {
    if (!merchantId || !merchantId.startsWith('m_')) {
      throw new BadRequestException({
        code: 'INVALID_MERCHANT_ID',
        message: 'معرف التاجر يجب أن يبدأ بـ m_',
        details: ['merchantId must start with m_'],
      });
    }

    return this.svc.getSettings(merchantId);
  }

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
            merchantId: { type: 'string', example: 'm_12345' },
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
    @Param('merchantId') merchantId: string,
    @Body() dto: UpdateWidgetSettingsDto,
  ) {
    if (!merchantId || !merchantId.startsWith('m_')) {
      throw new BadRequestException({
        code: 'INVALID_MERCHANT_ID',
        message: 'معرف التاجر يجب أن يبدأ بـ m_',
        details: ['merchantId must start with m_'],
      });
    }

    return this.svc.updateSettings(merchantId, dto);
  }

  @Post('handoff')
  @ApiOperation({
    operationId: 'chatWidget_handoff',
    summary: 'بدء محادثة مع موظف بشري',
    description: 'نقل المحادثة من الدردشة الآلية إلى موظف بشري للمساعدة',
  })
  @ApiBody({ type: HandoffDto })
  @ApiCreatedResponse({
    description: 'تم بدء المحادثة البشرية بنجاح',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'تم نقل المحادثة إلى موظف بشري' },
        handoffId: {
          type: 'string',
          example: 'handoff_66f1a2b3c4d5e6f7g8h9i0j',
        },
        sessionId: { type: 'string', example: 'session_abc123' },
        assignedAgent: {
          type: 'object',
          nullable: true,
          properties: {
            id: { type: 'string', example: 'agent_123' },
            name: { type: 'string', example: 'أحمد محمد' },
            email: { type: 'string', example: 'ahmed@company.com' },
          },
        },
        estimatedWaitTime: { type: 'number', example: 120 }, // بالثواني
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'urgent'],
          example: 'medium',
        },
        createdAt: { type: 'string', example: '2023-09-18T16:15:00Z' },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'بيانات handoff غير صحيحة أو معرف التاجر غير صحيح',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'لم يتم العثور على التاجر أو الجلسة',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description: 'ليس لديك صلاحية لإجراء handoff',
    type: ErrorResponse,
  })
  async handoff(
    @Param('merchantId') merchantId: string,
    @Body() dto: HandoffDto,
  ) {
    if (!merchantId || !merchantId.startsWith('m_')) {
      throw new BadRequestException({
        code: 'INVALID_MERCHANT_ID',
        message: 'معرف التاجر يجب أن يبدأ بـ m_',
        details: ['merchantId must start with m_'],
      });
    }

    return this.svc.handleHandoff(merchantId, dto);
  }
  @Get('embed-settings')
  @Public()
  @ApiOperation({
    operationId: 'chatWidget_getEmbedSettings',
    summary: 'الحصول على إعدادات التضمين',
    description:
      'الحصول على إعدادات تضمين الودجة (iframe/popup) ورابط المشاركة',
  })
  @ApiOkResponse({
    description: 'تم العثور على إعدادات التضمين',
    schema: {
      type: 'object',
      properties: {
        merchantId: { type: 'string', example: 'm_12345' },
        embedMode: {
          type: 'string',
          enum: ['iframe', 'popup'],
          example: 'iframe',
        },
        shareUrl: {
          type: 'string',
          example: 'https://widget.example.com/chat/chat_abc123',
        },
        widgetSlug: { type: 'string', example: 'chat_abc123' },
        embedCode: {
          type: 'object',
          properties: {
            iframe: {
              type: 'string',
              example:
                '<iframe src="https://widget.example.com/chat/chat_abc123" width="400" height="600"></iframe>',
            },
            popup: {
              type: 'string',
              example:
                '<script src="https://widget.example.com/js/chat.js?slug=chat_abc123"></script>',
            },
          },
        },
        dimensions: {
          type: 'object',
          properties: {
            width: { type: 'number', example: 400 },
            height: { type: 'number', example: 600 },
            minWidth: { type: 'number', example: 300 },
            minHeight: { type: 'number', example: 400 },
          },
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'لم يتم العثور على التاجر أو إعدادات الودجة',
    type: ErrorResponse,
  })
  async getEmbedSettings(@Param('merchantId') merchantId: string) {
    if (!merchantId || !merchantId.startsWith('m_')) {
      throw new BadRequestException({
        code: 'INVALID_MERCHANT_ID',
        message: 'معرف التاجر يجب أن يبدأ بـ m_',
        details: ['merchantId must start with m_'],
      });
    }

    return this.svc.getEmbedSettings(merchantId);
  }
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
        url: {
          type: 'string',
          example: 'https://chat.example.com/widget/chat_abc123',
        },
        widgetSlug: { type: 'string', example: 'chat_abc123' },
        merchantId: { type: 'string', example: 'm_12345' },
        expiresAt: { type: 'string', nullable: true, example: null },
        isActive: { type: 'boolean', example: true },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'لم يتم العثور على التاجر أو إعدادات الودجة',
    type: ErrorResponse,
  })
  async getShareUrl(@Param('merchantId') merchantId: string) {
    if (!merchantId || !merchantId.startsWith('m_')) {
      throw new BadRequestException({
        code: 'INVALID_MERCHANT_ID',
        message: 'معرف التاجر يجب أن يبدأ بـ m_',
        details: ['merchantId must start with m_'],
      });
    }

    const settings = await this.svc.getSettings(merchantId);
    return {
      success: true,
      url: `https://chat.example.com/widget/${settings.widgetSlug}`,
      widgetSlug: settings.widgetSlug,
      merchantId,
      expiresAt: null,
      isActive: true,
    };
  }
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
        merchantId: { type: 'string', example: 'm_12345' },
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
  generateSlug(@Param('merchantId') merchantId: string) {
    if (!merchantId || !merchantId.startsWith('m_')) {
      throw new BadRequestException({
        code: 'INVALID_MERCHANT_ID',
        message: 'معرف التاجر يجب أن يبدأ بـ m_',
        details: ['merchantId must start with m_'],
      });
    }

    return this.svc.generateWidgetSlug(merchantId);
  }

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
            merchantId: { type: 'string', example: 'm_12345' },
            embedMode: {
              type: 'string',
              enum: ['iframe', 'popup'],
              example: 'popup',
            },
            widgetSlug: { type: 'string', example: 'chat_abc123' },
            shareUrl: {
              type: 'string',
              example: 'https://chat.example.com/widget/chat_abc123',
            },
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
    @Param('merchantId') merchantId: string,
    @Body() dto: UpdateWidgetSettingsDto,
  ) {
    if (!merchantId || !merchantId.startsWith('m_')) {
      throw new BadRequestException({
        code: 'INVALID_MERCHANT_ID',
        message: 'معرف التاجر يجب أن يبدأ بـ m_',
        details: ['merchantId must start with m_'],
      });
    }

    // نقبِل فقط الحقل embedMode من dto
    return this.svc.updateEmbedSettings(merchantId, {
      embedMode: dto.embedMode,
    });
  }
}
