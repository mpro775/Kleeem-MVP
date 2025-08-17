import { Public } from 'src/common/decorators/public.decorator';
// src/analytics/analytics.controller.ts

import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  AnalyticsService,
  Overview,
  KeywordCount,
  TopProduct,
} from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

import { Request } from 'express';
import { CreateMissingResponseDto } from './dto/create-missing-response.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { CreateKleemMissingResponseDto } from './dto/create-kleem-missing-response.dto';

@ApiTags('التحليلات')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  /**
   * الحصول على نظرة عامة على التحليلات للتاجر
   * يُرجع بيانات تحليلات شاملة تتضمن الجلسات، الرسائل، الكلمات المفتاحية، المنتجات، والقنوات
   */
  @Get('overview')
  @ApiOperation({
    summary: 'الحصول على نظرة عامة على التحليلات',
    description:
      'استرداد نظرة عامة شاملة على التحليلات للتاجر الموثّق بما في ذلك الجلسات، الرسائل، أبرز الكلمات المفتاحية، أبرز المنتجات، وتوزيع القنوات',
  })
  @ApiQuery({
    name: 'period',
    description: 'الفترة الزمنية لبيانات التحليلات',
    required: false,
    enum: ['week', 'month', 'quarter'],
    example: 'week',
  })
  @ApiResponse({
    status: 200,
    description: 'تم استرداد النظرة العامة على التحليلات بنجاح',
    schema: {
      type: 'object',
      properties: {
        sessions: {
          type: 'object',
          properties: {
            count: { type: 'number', example: 1250 },
            changePercent: { type: 'number', example: 15.5 },
          },
        },
        messages: { type: 'number', example: 3420 },
        topKeywords: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              keyword: { type: 'string', example: 'تسوق' },
              count: { type: 'number', example: 45 },
            },
          },
        },
        topProducts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              productId: { type: 'string', example: 'prod_123' },
              name: { type: 'string', example: 'منتج رائج' },
              views: { type: 'number', example: 89 },
            },
          },
        },
        channels: {
          type: 'object',
          properties: {
            total: { type: 'number', example: 5 },
            breakdown: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  channel: { type: 'string', example: 'whatsapp' },
                  count: { type: 'number', example: 1250 },
                },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'غير مصرح به - رمز JWT غير صالح أو مفقود',
  })
  @ApiResponse({ status: 500, description: 'خطأ داخلي في الخادم' })
  async overview(
    @Req() req: Request & { user: { merchantId: string } },
    @Query('period') period: 'week' | 'month' | 'quarter' = 'week',
  ): Promise<Overview> {
    const merchantId = req.user.merchantId;
    const result = await this.analytics.getOverview(merchantId, period);
    return result;
  }

  /**
   * الحصول على أبرز الكلمات المفتاحية المستخدمة من قبل العملاء
   * يُرجع الكلمات المفتاحية الأكثر استخدامًا في تفاعلات العملاء
   */
  @Get('top-keywords')
  @ApiOperation({
    summary: 'الحصول على أبرز الكلمات المفتاحية',
    description:
      'استرداد الكلمات المفتاحية الأكثر استخدامًا في تفاعلات العملاء للتاجر الموثّق',
  })
  @ApiQuery({
    name: 'period',
    description: 'الفترة الزمنية لتحليل الكلمات المفتاحية',
    required: false,
    enum: ['week', 'month', 'quarter'],
    example: 'week',
  })
  @ApiQuery({
    name: 'limit',
    description: 'العدد الأقصى للكلمات المفتاحية المُراد إرجاعها',
    required: false,
    type: Number,
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'تم استرداد أبرز الكلمات المفتاحية بنجاح',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          keyword: { type: 'string', example: 'تسوق' },
          count: { type: 'number', example: 45 },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'غير مصرح به - رمز JWT غير صالح أو مفقود',
  })
  @ApiResponse({ status: 500, description: 'خطأ داخلي في الخادم' })
  async topKeywords(
    @Req() req: Request & { user: { merchantId: string } },
    @Query('period') period: 'week' | 'month' | 'quarter' = 'week',
    @Query('limit') limit = '10',
  ): Promise<KeywordCount[]> {
    const merchantId = req.user.merchantId;
    const kws = await this.analytics.getTopKeywords(merchantId, period, +limit);
    return kws;
  }
  /**
   * الحصول على بيانات الخط الزمني للرسائل
   * يُرجع عدد الرسائل مجمّعة حسب اليوم أو الساعة لعرضها على الخط الزمني
   */
  @Get('messages-timeline')
  @ApiOperation({
    summary: 'الحصول على الخط الزمني للرسائل',
    description:
      'استرداد عدد الرسائل مجمّعة حسب اليوم أو الساعة لعرضها على الخط الزمني',
  })
  @ApiQuery({
    name: 'period',
    description: 'الفترة الزمنية لبيانات الخط الزمني',
    required: false,
    enum: ['week', 'month', 'quarter'],
    example: 'week',
  })
  @ApiQuery({
    name: 'groupBy',
    description: 'فاصل التجميع لبيانات الخط الزمني',
    required: false,
    enum: ['day', 'hour'],
    example: 'day',
  })
  @ApiResponse({
    status: 200,
    description: 'تم استرداد الخط الزمني للرسائل بنجاح',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          date: { type: 'string', example: '2024-01-15' },
          count: { type: 'number', example: 125 },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'غير مصرح به - رمز JWT غير صالح أو مفقود',
  })
  @ApiResponse({ status: 500, description: 'خطأ داخلي في الخادم' })
  async messagesTimeline(
    @Req() req: Request & { user: { merchantId: string } },
    @Query('period') period: 'week' | 'month' | 'quarter' = 'week',
    @Query('groupBy') groupBy: 'day' | 'hour' = 'day',
  ) {
    return this.analytics.getMessagesTimeline(
      req.user.merchantId,
      period,
      groupBy,
    );
  }

  /**
   * الحصول على العدد الإجمالي للمنتجات
   * يُرجع العدد الإجمالي لمنتجات التاجر
   */
  @Get('products-count')
  @ApiOperation({
    summary: 'الحصول على عدد المنتجات',
    description: 'يُرجع العدد الإجمالي للمنتجات للتاجر الموثّق',
  })
  @ApiResponse({
    status: 200,
    description: 'تم استرداد عدد المنتجات بنجاح',
    schema: {
      type: 'object',
      properties: {
        total: { type: 'number', example: 156 },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'غير مصرح به - رمز JWT غير صالح أو مفقود',
  })
  @ApiResponse({ status: 500, description: 'خطأ داخلي في الخادم' })
  async productsCount(@Req() req: Request & { user: { merchantId: string } }) {
    return {
      total: await this.analytics.getProductsCount(req.user.merchantId),
    };
  }
  /**
   * نقطة نهاية Webhook لأحداث التحليلات
   * نقطة نهاية عامة لاستقبال بيانات التحليلات من مصادر خارجية
   */
  @Post('webhook')
  @Public()
  @ApiOperation({
    summary: 'Webhook للتحليلات',
    description:
      'نقطة نهاية webhook عامة لاستقبال بيانات التحليلات من مصادر وخدمات خارجية',
  })
  @ApiBody({
    description: 'بيانات حدث التحليلات',
    type: CreateMissingResponseDto,
    examples: {
      example1: {
        summary: 'مثال على حمولة webhook',
        value: {
          event: 'product_view',
          data: {
            productId: 'prod_123',
            userId: 'user_456',
            timestamp: '2024-01-15T10:30:00Z',
          },
          source: 'webhook',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'تمت معالجة بيانات Webhook بنجاح',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        id: { type: 'string', example: '507f1f77bcf86cd799439011' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'طلب غير صالح - تنسيق الحمولة غير صالح',
  })
  @ApiResponse({ status: 500, description: 'خطأ داخلي في الخادم' })
  async webhook(@Body() body: CreateMissingResponseDto) {
    const doc = await this.analytics.createFromWebhook(body);
    return { success: true, id: doc._id };
  }
  /**
   * الحصول على أبرز المنتجات حسب المشاهدات/التفاعلات
   * يُرجع المنتجات الأكثر شيوعًا بناءً على تفاعلات العملاء
   */
  @Get('top-products')
  @ApiOperation({
    summary: 'الحصول على أبرز المنتجات',
    description:
      'استرداد المنتجات الأكثر شيوعًا بناءً على تفاعلات العملاء ومشاهداتهم للتاجر الموثّق',
  })
  @ApiQuery({
    name: 'period',
    description: 'الفترة الزمنية لتحليل المنتجات',
    required: false,
    enum: ['week', 'month', 'quarter'],
    example: 'week',
  })
  @ApiQuery({
    name: 'limit',
    description: 'العدد الأقصى للمنتجات المُراد إرجاعها',
    required: false,
    type: Number,
    example: 5,
  })
  @ApiResponse({
    status: 200,
    description: 'تم استرداد أبرز المنتجات بنجاح',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          productId: { type: 'string', example: 'prod_123456' },
          name: { type: 'string', example: 'منتج رائج' },
          views: { type: 'number', example: 89 },
          interactions: { type: 'number', example: 156 },
          conversionRate: { type: 'number', example: 0.12 },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'غير مصرح به - رمز JWT غير صالح أو مفقود',
  })
  @ApiResponse({ status: 500, description: 'خطأ داخلي في الخادم' })
  async topProducts(
    @Req() req: Request & { user: { merchantId: string } },
    @Query('period') period: 'week' | 'month' | 'quarter' = 'week',
    @Query('limit') limit = '5',
  ): Promise<TopProduct[]> {
    const merchantId = req.user.merchantId;
    const prods = await this.analytics.getTopProducts(
      merchantId,
      period,
      +limit,
    );
    return prods;
  }
  @Post('webhook/kleem')
  @Public()
  async kleemWebhook(@Body() body: CreateKleemMissingResponseDto) {
    const doc = await this.analytics.createKleemFromWebhook(body);
    return { success: true, id: doc._id };
  }
}
