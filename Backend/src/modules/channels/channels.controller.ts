import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { ErrorResponse } from 'src/common/dto/error-response.dto';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ChannelLean } from '../webhooks/repositories/channel.repository';

import { ConnectResult, Status } from './adapters/channel-adapter';
import { ChannelsService } from './channels.service';
import { ConnectActionDto } from './dto/connect-action.dto';
import { CreateChannelDto } from './dto/create-channel.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';
import { ChannelDocument, ChannelProvider } from './schemas/channel.schema';

// Example constants for API documentation
const EXAMPLE_RESPONSE_TIME_MS = 150;
const EXAMPLE_MESSAGES_SENT = 1250;
const EXAMPLE_MESSAGES_RECEIVED = 980;
const EXAMPLE_SUCCESS_RATE = 98.5;
const EXAMPLE_AVG_RESPONSE_TIME_SEC = 2.3;

@ApiTags('القنوات')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class ChannelsController {
  constructor(private readonly svc: ChannelsService) {}

  @Post('merchants/:merchantId/channels')
  @ApiOperation({
    operationId: 'channels_create',
    summary: 'إنشاء قناة جديدة لتاجر',
    description: 'إنشاء قناة اتصال جديدة للتاجر مع المزود المحدد',
  })
  @ApiParam({
    name: 'merchantId',
    description: 'معرف التاجر',
    example: 'm_12345',
    type: 'string',
  })
  @ApiBody({ type: CreateChannelDto })
  @ApiCreatedResponse({
    description: 'تم إنشاء القناة بنجاح',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'تم إنشاء القناة بنجاح' },
        channel: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'ch_66f1a2b3c4d5e6f7g8h9i0j' },
            merchantId: { type: 'string', example: 'm_12345' },
            provider: {
              type: 'string',
              enum: ['whatsapp', 'telegram', 'webchat'],
              example: 'whatsapp',
            },
            name: { type: 'string', example: 'قناة واتساب رئيسية' },
            status: {
              type: 'string',
              enum: ['disconnected', 'connecting', 'connected'],
              example: 'disconnected',
            },
            createdAt: { type: 'string', example: '2023-09-18T10:30:00Z' },
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'بيانات غير صحيحة أو قناة موجودة مسبقاً',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description: 'ليس لديك صلاحية لإنشاء قنوات لهذا التاجر',
    type: ErrorResponse,
  })
  create(
    @Param('merchantId') merchantId: string,
    @Body() dto: Omit<CreateChannelDto, 'merchantId'>,
  ): Promise<ChannelDocument> {
    if (!merchantId || !merchantId.startsWith('m_')) {
      throw new BadRequestException({
        code: 'INVALID_MERCHANT_ID',
        message: 'معرف التاجر يجب أن يبدأ بـ m_',
        details: ['merchantId must start with m_'],
      });
    }

    return this.svc.create({ ...dto, merchantId });
  }

  @Get('merchants/:merchantId/channels')
  @ApiOperation({
    operationId: 'channels_list',
    summary: 'قائمة القنوات لتاجر',
    description: 'الحصول على قائمة بجميع القنوات المسجلة للتاجر المحدد',
  })
  @ApiParam({
    name: 'merchantId',
    description: 'معرف التاجر',
    example: 'm_12345',
    type: 'string',
  })
  @ApiQuery({
    name: 'provider',
    required: false,
    enum: ['whatsapp', 'telegram', 'webchat'],
    example: 'whatsapp',
    description: 'تصفية القنوات حسب المزود',
  })
  @ApiOkResponse({
    description: 'قائمة القنوات',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'ch_66f1a2b3c4d5e6f7g8h9i0j' },
          merchantId: { type: 'string', example: 'm_12345' },
          provider: {
            type: 'string',
            enum: ['whatsapp', 'telegram', 'webchat'],
            example: 'whatsapp',
          },
          name: { type: 'string', example: 'قناة واتساب رئيسية' },
          status: {
            type: 'string',
            enum: ['disconnected', 'connecting', 'connected'],
            example: 'connected',
          },
          isDefault: { type: 'boolean', example: true },
          createdAt: { type: 'string', example: '2023-09-18T10:30:00Z' },
          updatedAt: { type: 'string', example: '2023-09-18T15:45:00Z' },
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'معرف التاجر غير صحيح',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description: 'ليس لديك صلاحية للوصول إلى قنوات هذا التاجر',
    type: ErrorResponse,
  })
  list(
    @Param('merchantId') merchantId: string,
    @Query('provider') provider?: ChannelProvider,
  ): Promise<ChannelLean[]> {
    if (!merchantId || !merchantId.startsWith('m_')) {
      throw new BadRequestException({
        code: 'INVALID_MERCHANT_ID',
        message: 'معرف التاجر يجب أن يبدأ بـ m_',
        details: ['merchantId must start with m_'],
      });
    }

    return this.svc.list(merchantId, provider);
  }

  @Get('channels/:id')
  @ApiOperation({
    operationId: 'channels_get',
    summary: 'جلب قناة واحدة',
    description: 'الحصول على تفاصيل قناة محددة بالمعرف',
  })
  @ApiParam({
    name: 'id',
    description: 'معرف القناة',
    example: 'ch_66f1a2b3c4d5e6f7g8h9i0j',
    type: 'string',
  })
  @ApiOkResponse({
    description: 'تفاصيل القناة',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'ch_66f1a2b3c4d5e6f7g8h9i0j' },
        merchantId: { type: 'string', example: 'm_12345' },
        provider: {
          type: 'string',
          enum: ['whatsapp', 'telegram', 'webchat'],
          example: 'whatsapp',
        },
        name: { type: 'string', example: 'قناة واتساب رئيسية' },
        status: {
          type: 'string',
          enum: ['disconnected', 'connecting', 'connected'],
          example: 'connected',
        },
        isDefault: { type: 'boolean', example: true },
        config: {
          type: 'object',
          description: 'إعدادات القناة (حسب المزود)',
          properties: {
            phoneNumber: { type: 'string', example: '+966501234567' },
            webhookUrl: {
              type: 'string',
              example: 'https://api.example.com/webhook/whatsapp',
            },
          },
        },
        createdAt: { type: 'string', example: '2023-09-18T10:30:00Z' },
        updatedAt: { type: 'string', example: '2023-09-18T15:45:00Z' },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'القناة غير موجودة',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description: 'ليس لديك صلاحية للوصول إلى هذه القناة',
    type: ErrorResponse,
  })
  get(@Param('id') id: string): Promise<ChannelDocument> {
    if (!id || !id.startsWith('ch_')) {
      throw new BadRequestException({
        code: 'INVALID_CHANNEL_ID',
        message: 'معرف القناة يجب أن يبدأ بـ ch_',
        details: ['channelId must start with ch_'],
      });
    }

    return this.svc.get(id);
  }

  @Patch('channels/:id')
  @ApiOperation({
    operationId: 'channels_update',
    summary: 'تحديث قناة',
    description: 'تحديث إعدادات وبيانات القناة المحددة',
  })
  @ApiParam({
    name: 'id',
    description: 'معرف القناة',
    example: 'ch_66f1a2b3c4d5e6f7g8h9i0j',
    type: 'string',
  })
  @ApiBody({ type: UpdateChannelDto })
  @ApiOkResponse({
    description: 'تم تحديث القناة بنجاح',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'تم تحديث القناة بنجاح' },
        channel: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'ch_66f1a2b3c4d5e6f7g8h9i0j' },
            name: { type: 'string', example: 'قناة واتساب محدثة' },
            status: {
              type: 'string',
              enum: ['disconnected', 'connecting', 'connected'],
              example: 'connected',
            },
            updatedAt: { type: 'string', example: '2023-09-18T16:00:00Z' },
          },
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'القناة غير موجودة',
    type: ErrorResponse,
  })
  @ApiBadRequestResponse({
    description: 'بيانات غير صحيحة',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description: 'ليس لديك صلاحية لتحديث هذه القناة',
    type: ErrorResponse,
  })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateChannelDto,
  ): Promise<ChannelDocument> {
    if (!id || !id.startsWith('ch_')) {
      throw new BadRequestException({
        code: 'INVALID_CHANNEL_ID',
        message: 'معرف القناة يجب أن يبدأ بـ ch_',
        details: ['channelId must start with ch_'],
      });
    }

    return this.svc.update(id, dto);
  }

  @Post('channels/:id/actions/connect')
  @ApiOperation({
    operationId: 'channels_connect',
    summary: 'ربط القناة بالمزود',
    description:
      'إجراء عملية الربط مع المزود (يعيد QR code أو رابط أو webhook حسب نوع المزود)',
  })
  @ApiParam({
    name: 'id',
    description: 'معرف القناة',
    example: 'ch_66f1a2b3c4d5e6f7g8h9i0j',
    type: 'string',
  })
  @ApiBody({ type: ConnectActionDto })
  @ApiOkResponse({
    description: 'تم بدء عملية الربط',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        action: {
          type: 'string',
          enum: ['qr', 'redirect', 'webhook', 'connected'],
          example: 'qr',
        },
        data: {
          type: 'object',
          description: 'البيانات المطلوبة لإكمال الربط',
          properties: {
            qrCode: {
              type: 'string',
              description: 'QR code للواتساب',
              example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
            },
            redirectUrl: {
              type: 'string',
              description: 'رابط للتوجيه',
              example: 'https://api.telegram.org/auth?token=...',
            },
            webhookUrl: {
              type: 'string',
              description: 'رابط الـ webhook',
              example: 'https://api.example.com/webhook/channel',
            },
          },
        },
        channel: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'ch_66f1a2b3c4d5e6f7g8h9i0j' },
            status: {
              type: 'string',
              enum: ['connecting'],
              example: 'connecting',
            },
          },
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'القناة غير موجودة',
    type: ErrorResponse,
  })
  @ApiBadRequestResponse({
    description: 'القناة متصلة مسبقاً أو بيانات الربط غير صحيحة',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description: 'ليس لديك صلاحية لربط هذه القناة',
    type: ErrorResponse,
  })
  connect(
    @Param('id') id: string,
    @Body() body: ConnectActionDto,
  ): Promise<ConnectResult> {
    if (!id || !id.startsWith('ch_')) {
      throw new BadRequestException({
        code: 'INVALID_CHANNEL_ID',
        message: 'معرف القناة يجب أن يبدأ بـ ch_',
        details: ['channelId must start with ch_'],
      });
    }

    return this.svc.connect(id, body as Record<string, unknown>);
  }

  @Post('channels/:id/actions/refresh')
  @ApiOperation({
    operationId: 'channels_refresh',
    summary: 'تجديد صلاحية القناة',
    description: 'تجديد التوكن أو الصلاحيات للقناة المحددة',
  })
  @ApiParam({
    name: 'id',
    description: 'معرف القناة',
    example: 'ch_66f1a2b3c4d5e6f7g8h9i0j',
    type: 'string',
  })
  @ApiOkResponse({
    description: 'تم تجديد الصلاحيات بنجاح',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'تم تجديد صلاحيات القناة بنجاح' },
        channel: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'ch_66f1a2b3c4d5e6f7g8h9i0j' },
            status: {
              type: 'string',
              enum: ['connected'],
              example: 'connected',
            },
            refreshedAt: { type: 'string', example: '2023-09-18T16:15:00Z' },
          },
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'القناة غير موجودة',
    type: ErrorResponse,
  })
  @ApiBadRequestResponse({
    description: 'فشل في تجديد الصلاحيات',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description: 'ليس لديك صلاحية لتجديد هذه القناة',
    type: ErrorResponse,
  })
  refresh(@Param('id') id: string): Promise<{ ok: boolean }> {
    if (!id || !id.startsWith('ch_')) {
      throw new BadRequestException({
        code: 'INVALID_CHANNEL_ID',
        message: 'معرف القناة يجب أن يبدأ بـ ch_',
        details: ['channelId must start with ch_'],
      });
    }

    return this.svc.refresh(id);
  }

  @Post('channels/:id/actions/set-default')
  @ApiOperation({
    operationId: 'channels_setDefault',
    summary: 'تعيين كقناة افتراضية',
    description: 'تعيين القناة كقناة افتراضية لهذا المزود للتاجر',
  })
  @ApiParam({
    name: 'id',
    description: 'معرف القناة',
    example: 'ch_66f1a2b3c4d5e6f7g8h9i0j',
    type: 'string',
  })
  @ApiOkResponse({
    description: 'تم تعيين القناة كافتراضية بنجاح',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'تم تعيين القناة كافتراضية بنجاح' },
        channel: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'ch_66f1a2b3c4d5e6f7g8h9i0j' },
            isDefault: { type: 'boolean', example: true },
            provider: { type: 'string', example: 'whatsapp' },
          },
        },
        previousDefault: {
          type: 'object',
          nullable: true,
          properties: {
            id: { type: 'string', example: 'ch_66f1a2b3c4d5e6f7g8h9i0jk' },
            isDefault: { type: 'boolean', example: false },
          },
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'القناة غير موجودة',
    type: ErrorResponse,
  })
  @ApiBadRequestResponse({
    description: 'القناة غير متصلة أو لا يمكن تعيينها كافتراضية',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description: 'ليس لديك صلاحية لتعديل هذه القناة',
    type: ErrorResponse,
  })
  setDefault(@Param('id') id: string): Promise<ChannelDocument> {
    if (!id || !id.startsWith('ch_')) {
      throw new BadRequestException({
        code: 'INVALID_CHANNEL_ID',
        message: 'معرف القناة يجب أن يبدأ بـ ch_',
        details: ['channelId must start with ch_'],
      });
    }

    return this.svc.setDefault(id);
  }

  @Delete('channels/:id')
  @ApiOperation({
    operationId: 'channels_remove',
    summary: 'فصل/حذف قناة',
    description: 'فصل القناة عن المزود أو حذفها بالكامل',
  })
  @ApiParam({
    name: 'id',
    description: 'معرف القناة',
    example: 'ch_66f1a2b3c4d5e6f7g8h9i0j',
    type: 'string',
  })
  @ApiQuery({
    name: 'mode',
    required: false,
    enum: ['disable', 'disconnect', 'wipe'],
    example: 'disconnect',
    description:
      'وضع الحذف: disable (تعطيل), disconnect (فصل), wipe (حذف كامل)',
  })
  @ApiOkResponse({
    description: 'تم حذف/فصل القناة بنجاح',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'تم فصل القناة بنجاح' },
        mode: {
          type: 'string',
          enum: ['disable', 'disconnect', 'wipe'],
          example: 'disconnect',
        },
        channel: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'ch_66f1a2b3c4d5e6f7g8h9i0j' },
            status: {
              type: 'string',
              enum: ['disabled', 'disconnected'],
              example: 'disconnected',
            },
          },
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'القناة غير موجودة',
    type: ErrorResponse,
  })
  @ApiBadRequestResponse({
    description: 'وضع الحذف غير صحيح',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description: 'ليس لديك صلاحية لحذف هذه القناة',
    type: ErrorResponse,
  })
  remove(
    @Param('id') id: string,
    @Query(
      'mode',
      new ParseEnumPipe(['disable', 'disconnect', 'wipe'] as const, {
        optional: true,
      }),
    )
    mode?: 'disable' | 'disconnect' | 'wipe',
  ): Promise<{ deleted: boolean } | { ok: boolean }> {
    if (!id || !id.startsWith('ch_')) {
      throw new BadRequestException({
        code: 'INVALID_CHANNEL_ID',
        message: 'معرف القناة يجب أن يبدأ بـ ch_',
        details: ['channelId must start with ch_'],
      });
    }

    return this.svc.remove(id, mode ?? 'disconnect');
  }

  @Get('channels/:id/status')
  @ApiOperation({
    operationId: 'channels_status',
    summary: 'حالة القناة',
    description: 'الحصول على حالة مفصلة للقناة المحددة',
  })
  @ApiParam({
    name: 'id',
    description: 'معرف القناة',
    example: 'ch_66f1a2b3c4d5e6f7g8h9i0j',
    type: 'string',
  })
  @ApiOkResponse({
    description: 'حالة القناة',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'ch_66f1a2b3c4d5e6f7g8h9i0j' },
        status: {
          type: 'string',
          enum: ['disconnected', 'connecting', 'connected', 'error'],
          example: 'connected',
        },
        provider: {
          type: 'string',
          enum: ['whatsapp', 'telegram', 'webchat'],
          example: 'whatsapp',
        },
        health: {
          type: 'object',
          properties: {
            lastPing: { type: 'string', example: '2023-09-18T16:20:00Z' },
            isHealthy: { type: 'boolean', example: true },
            responseTime: { type: 'number', example: EXAMPLE_RESPONSE_TIME_MS }, // بالميلي ثانية
            lastError: {
              type: 'string',
              nullable: true,
              example: null,
            },
          },
        },
        stats: {
          type: 'object',
          properties: {
            messagesSent: { type: 'number', example: EXAMPLE_MESSAGES_SENT },
            messagesReceived: {
              type: 'number',
              example: EXAMPLE_MESSAGES_RECEIVED,
            },
            successRate: { type: 'number', example: EXAMPLE_SUCCESS_RATE }, // نسبة مئوية
            avgResponseTime: {
              type: 'number',
              example: EXAMPLE_AVG_RESPONSE_TIME_SEC,
            }, // بالثواني
          },
        },
        lastActivity: { type: 'string', example: '2023-09-18T16:15:00Z' },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'القناة غير موجودة',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description: 'ليس لديك صلاحية للوصول إلى حالة هذه القناة',
    type: ErrorResponse,
  })
  status(@Param('id') id: string): Promise<Status> {
    if (!id || !id.startsWith('ch_')) {
      throw new BadRequestException({
        code: 'INVALID_CHANNEL_ID',
        message: 'معرف القناة يجب أن يبدأ بـ ch_',
        details: ['channelId must start with ch_'],
      });
    }

    return this.svc.status(id);
  }

  @Post('channels/:id/send')
  @ApiOperation({
    operationId: 'channels_send',
    summary: 'إرسال رسالة اختبارية',
    description: 'إرسال رسالة اختبارية عبر القناة المحددة (للاختبار والتطوير)',
  })
  @ApiParam({
    name: 'id',
    description: 'معرف القناة',
    example: 'ch_66f1a2b3c4d5e6f7g8h9i0j',
    type: 'string',
  })
  @ApiBody({ type: SendMessageDto })
  @ApiOkResponse({
    description: 'تم إرسال الرسالة بنجاح',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'تم إرسال الرسالة بنجاح' },
        messageId: { type: 'string', example: 'msg_66f1a2b3c4d5e6f7g8h9i0j' },
        channelId: { type: 'string', example: 'ch_66f1a2b3c4d5e6f7g8h9i0j' },
        recipient: { type: 'string', example: '+966501234567' },
        sentAt: { type: 'string', example: '2023-09-18T16:25:00Z' },
        status: {
          type: 'string',
          enum: ['sent', 'delivered', 'read'],
          example: 'sent',
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'القناة غير موجودة',
    type: ErrorResponse,
  })
  @ApiBadRequestResponse({
    description: 'القناة غير متصلة أو بيانات الرسالة غير صحيحة',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description: 'ليس لديك صلاحية لإرسال رسائل عبر هذه القناة',
    type: ErrorResponse,
  })
  send(
    @Param('id') id: string,
    @Body() body: SendMessageDto,
  ): Promise<{ ok: boolean }> {
    if (!id || !id.startsWith('ch_')) {
      throw new BadRequestException({
        code: 'INVALID_CHANNEL_ID',
        message: 'معرف القناة يجب أن يبدأ بـ ch_',
        details: ['channelId must start with ch_'],
      });
    }

    return this.svc.send(id, body.to, body.text);
  }
}
