// src/analytics/analytics.controller.ts

import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
  ApiBadRequestResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { CurrentMerchantId, CurrentUserId } from 'src/common';
import { Public } from 'src/common/decorators/public.decorator';
import { ErrorResponse } from 'src/common/dto/error-response.dto';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TranslationService } from '../../common/services/translation.service';

import {
  AnalyticsService,
  Overview,
  KeywordCount,
  TopProduct,
} from './analytics.service';
import { AddToKnowledgeDto } from './dto/add-to-knowledge.dto';
import { CreateKleemMissingResponseDto } from './dto/create-kleem-missing-response.dto';
import { CreateMissingResponseDto } from './dto/create-missing-response.dto';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly analytics: AnalyticsService,
    private readonly translationService: TranslationService,
  ) {}

  /** نظرة عامة */
  @Get('overview')
  @ApiOperation({
    operationId: 'analytics_overview',
    summary: 'analytics.operations.dashboard.summary',
    description: 'analytics.operations.dashboard.description',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['week', 'month', 'quarter'],
    example: 'week',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard overview data',
    schema: {
      type: 'object',
      properties: {
        totalMessages: { type: 'number', example: 1250 },
        totalConversations: { type: 'number', example: 89 },
        avgResponseTime: { type: 'number', example: 45.5 },
        missingResponses: { type: 'number', example: 12 },
        topChannels: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              channel: { type: 'string', example: 'whatsapp' },
              count: { type: 'number', example: 456 },
            },
          },
        },
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Merchant not found',
    type: ErrorResponse,
  })
  async overview(
    @CurrentMerchantId() merchantId: string | null,
    @Query('period') period: 'week' | 'month' | 'quarter' = 'week',
  ): Promise<Overview> {
    if (!merchantId)
      throw new ForbiddenException('analytics.responses.error.noMerchant');
    return this.analytics.getOverview(merchantId, period);
  }

  /** أبرز الكلمات المفتاحية */
  @Get('top-keywords')
  @ApiOperation({
    operationId: 'analytics_topKeywords',
    summary: 'analytics.operations.metrics.summary',
    description: 'analytics.operations.metrics.description',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['week', 'month', 'quarter'],
    example: 'week',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 10,
    minimum: 1,
    maximum: 100,
  })
  @ApiResponse({
    status: 200,
    description: 'Top keywords data',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          keyword: { type: 'string', example: 'سعر' },
          count: { type: 'number', example: 25 },
          percentage: { type: 'number', example: 12.5 },
        },
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Merchant not found',
    type: ErrorResponse,
  })
  async topKeywords(
    @CurrentMerchantId() merchantId: string | null,
    @Query('period') period: 'week' | 'month' | 'quarter' = 'week',
    @Query('limit') limit = '10',
  ): Promise<KeywordCount[]> {
    if (!merchantId)
      throw new ForbiddenException('analytics.responses.error.noMerchant');
    const n = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
    return this.analytics.getTopKeywords(merchantId, period, n);
  }

  /** الخط الزمني للرسائل */
  @Get('messages-timeline')
  @ApiOperation({
    operationId: 'analytics_messagesTimeline',
    summary: 'analytics.operations.trends.summary',
    description: 'analytics.operations.trends.description',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['week', 'month', 'quarter'],
    example: 'week',
  })
  @ApiQuery({
    name: 'groupBy',
    required: false,
    enum: ['day', 'hour'],
    example: 'day',
  })
  @ApiResponse({
    status: 200,
    description: 'Messages timeline data',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          date: { type: 'string', example: '2023-09-18' },
          count: { type: 'number', example: 45 },
          channel: { type: 'string', example: 'whatsapp' },
        },
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Merchant not found',
    type: ErrorResponse,
  })
  async messagesTimeline(
    @CurrentMerchantId() merchantId: string | null,
    @Query('period') period: 'week' | 'month' | 'quarter' = 'week',
    @Query('groupBy') groupBy: 'day' | 'hour' = 'day',
  ) {
    if (!merchantId)
      throw new ForbiddenException('analytics.responses.error.noMerchant');
    return this.analytics.getMessagesTimeline(merchantId, period, groupBy);
  }

  /** عدد المنتجات */
  @Get('products-count')
  @ApiOperation({
    operationId: 'analytics_productsCount',
    summary: 'analytics.operations.performance.summary',
    description: 'analytics.operations.performance.description',
  })
  @ApiResponse({
    status: 200,
    description: 'Products count data',
    schema: {
      type: 'object',
      properties: {
        total: { type: 'number', example: 156 },
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Merchant not found',
    type: ErrorResponse,
  })
  async productsCount(
    @CurrentMerchantId() merchantId: string | null,
  ): Promise<{ total: number }> {
    if (!merchantId)
      throw new ForbiddenException('analytics.responses.error.noMerchant');
    return { total: await this.analytics.getProductsCount(merchantId) };
  }

  /** Webhook عام */
  @Post('webhook')
  @Public()
  @ApiOperation({
    operationId: 'analytics_webhook',
    summary: 'Webhook للتحليلات',
    description: 'Receive analytics data from external sources',
  })
  @ApiBody({ type: CreateMissingResponseDto })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        id: { type: 'string', example: '66f1a2b3c4d5e6f7g8h9i0j' },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid webhook data',
    type: ErrorResponse,
  })
  async webhook(@Body() body: CreateMissingResponseDto) {
    const doc = await this.analytics.createFromWebhook(body);
    return { success: true, id: (doc as any)._id };
  }

  /** الرسائل المنسيّة / غير المجاب عنها */
  @Get('missing-responses')
  @ApiOperation({
    operationId: 'analytics_missingResponses',
    summary: 'جلب الرسائل المنسية / غير المجاب عنها',
    description: 'Retrieve paginated list of missing/unanswered responses',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({
    name: 'resolved',
    required: false,
    enum: ['all', 'true', 'false'],
    example: 'all',
  })
  @ApiQuery({
    name: 'channel',
    required: false,
    enum: ['all', 'whatsapp', 'telegram', 'webchat'],
    example: 'all',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['all', 'missing', 'kleem'],
    example: 'all',
  })
  @ApiQuery({ name: 'search', required: false, type: String, example: 'سعر' })
  @ApiQuery({
    name: 'from',
    required: false,
    type: String,
    example: '2023-09-01',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    type: String,
    example: '2023-09-18',
  })
  @ApiResponse({
    status: 200,
    description: 'Missing responses data',
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: '66f1a2b3c4d5e6f7g8h9i0j' },
              question: { type: 'string', example: 'ما هو سعر المنتج؟' },
              channel: { type: 'string', example: 'whatsapp' },
              resolved: { type: 'boolean', example: false },
              createdAt: { type: 'string', example: '2023-09-18T10:30:00Z' },
            },
          },
        },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 20 },
            total: { type: 'number', example: 156 },
            pages: { type: 'number', example: 8 },
          },
        },
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Merchant not found',
    type: ErrorResponse,
  })
  async list(
    @CurrentMerchantId() merchantId: string | null,
    @Query() query: any,
  ) {
    if (!merchantId)
      throw new ForbiddenException('analytics.responses.error.noMerchant');
    return this.analytics.listMissingResponses({
      merchantId,
      page: Number(query.page ?? 1),
      limit: Number(query.limit ?? 20),
      resolved: query.resolved ?? 'all',
      channel: query.channel ?? 'all',
      type: query.type ?? 'all',
      search: query.search ?? '',
      from: query.from,
      to: query.to,
    });
  }

  /** تحديد رسالة كمُعالجة */
  @Patch('missing-responses/:id/resolve')
  @ApiOperation({
    operationId: 'analytics_resolveMissingResponse',
    summary: 'تحديد رسالة كمُعالجة',
    description: 'Mark a single missing response as resolved',
  })
  @ApiResponse({
    status: 200,
    description: 'Response marked as resolved',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        item: { type: 'object', description: 'Resolved response object' },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid response ID',
    type: ErrorResponse,
  })
  async resolveOne(@CurrentUserId() userId: string, @Param('id') id: string) {
    const doc = await this.analytics.markResolved(id, userId);
    return { success: true, item: doc };
  }

  /** تحديد عدة رسائل كمُعالجة */
  @Patch('missing-responses/resolve')
  @ApiOperation({
    operationId: 'analytics_resolveBulkMissingResponses',
    summary: 'تحديد عدة رسائل كمُعالجة',
    description: 'Mark multiple missing responses as resolved',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        ids: {
          type: 'array',
          items: { type: 'string' },
          example: ['66f1a2b3c4d5e6f7g8h9i0j', '66f2b3c4d5e6f7g8h9i0j1'],
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Bulk resolve completed',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        modifiedCount: { type: 'number', example: 2 },
        matchedCount: { type: 'number', example: 2 },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid request data',
    type: ErrorResponse,
  })
  async resolveBulk(@Body() body: { ids: string[] }) {
    const r = await this.analytics.bulkResolve(body.ids);
    return { success: true, ...r };
  }

  /** تحويل رسالة منسية إلى معرفة (FAQ) */
  @Post('missing-responses/:id/add-to-knowledge')
  @ApiOperation({
    operationId: 'analytics_addToKnowledge',
    summary: 'تحويل الرسالة المنسيّة إلى معرفة (FAQ) + وضعها مُعالجة',
    description:
      'Convert missing response to knowledge base entry and mark as resolved',
  })
  @ApiBody({ type: AddToKnowledgeDto })
  @ApiResponse({
    status: 201,
    description: 'Response converted to knowledge and marked as resolved',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        knowledgeId: { type: 'string', example: '66f3c4d5e6f7g8h9i0j1k2' },
        responseMarkedResolved: { type: 'boolean', example: true },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid data or missing response not found',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description: 'Merchant not found',
    type: ErrorResponse,
  })
  async addToKnowledge(
    @CurrentMerchantId() merchantId: string | null,
    @CurrentUserId() userId: string, // ✅ ديكوريتر صحيح
    @Param('id') id: string,
    @Body() body: AddToKnowledgeDto,
  ) {
    if (!merchantId)
      throw new ForbiddenException('analytics.responses.error.noMerchant');
    return this.analytics.addToKnowledge({
      merchantId,
      missingId: id,
      payload: body,
      userId,
    });
  }

  /** إحصاءات الرسائل المنسية */
  @Get('missing-responses/stats')
  @ApiOperation({
    operationId: 'analytics_missingResponsesStats',
    summary: 'إحصاءات الرسائل المنسية',
    description:
      'Get statistics for missing responses with optional email notification',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    example: 7,
    minimum: 1,
    maximum: 90,
  })
  @ApiQuery({
    name: 'notify',
    required: false,
    enum: ['true', 'false'],
    example: 'false',
    description: 'Send email notification to user',
  })
  @ApiResponse({
    status: 200,
    description: 'Missing responses statistics',
    schema: {
      type: 'object',
      properties: {
        total: { type: 'number', example: 45 },
        resolved: { type: 'number', example: 32 },
        unresolved: { type: 'number', example: 13 },
        resolutionRate: { type: 'number', example: 71.1 },
        byChannel: {
          type: 'object',
          properties: {
            whatsapp: { type: 'number', example: 25 },
            telegram: { type: 'number', example: 12 },
            webchat: { type: 'number', example: 8 },
          },
        },
        avgResolutionTime: { type: 'number', example: 2.5 },
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Merchant not found',
    type: ErrorResponse,
  })
  async stats(
    @CurrentMerchantId() merchantId: string | null,
    @CurrentUserId() userId: string,
    @Query('days') days?: string,
    @Query('notify') notify?: 'true' | 'false',
  ) {
    if (!merchantId)
      throw new ForbiddenException('analytics.responses.error.noMerchant');
    const d = Math.min(Math.max(Number(days ?? 7), 1), 90);
    const result = await this.analytics.stats(merchantId, d);

    if (notify === 'true' && userId) {
      await this.analytics.notifyMissingStatsToUser({
        merchantId,
        userId,
        days: d,
      });
    }
    return result;
  }

  /** أبرز المنتجات */
  @Get('top-products')
  @ApiOperation({
    operationId: 'analytics_topProducts',
    summary: 'الحصول على أبرز المنتجات',
    description: 'Get most queried products by customer interactions',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['week', 'month', 'quarter'],
    example: 'week',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 5,
    minimum: 1,
    maximum: 50,
  })
  @ApiResponse({
    status: 200,
    description: 'Top products data',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          productId: { type: 'string', example: '66f4d5e6f7g8h9i0j1k2l3' },
          productName: { type: 'string', example: 'هاتف سامسونج جالاكسي' },
          queryCount: { type: 'number', example: 45 },
          percentage: { type: 'number', example: 28.5 },
        },
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Merchant not found',
    type: ErrorResponse,
  })
  async topProducts(
    @CurrentMerchantId() merchantId: string | null,
    @Query('period') period: 'week' | 'month' | 'quarter' = 'week',
    @Query('limit') limit = '5',
  ): Promise<TopProduct[]> {
    if (!merchantId)
      throw new ForbiddenException('analytics.responses.error.noMerchant');
    const n = Math.min(Math.max(parseInt(limit, 10) || 5, 1), 50);
    return this.analytics.getTopProducts(merchantId, period, n);
  }

  /** Webhook عام (Kleem) */
  @Post('webhook/kleem')
  @Public()
  @ApiOperation({
    operationId: 'analytics_kleemWebhook',
    summary: 'Kleem Analytics Webhook',
    description: 'Receive analytics data from Kleem chatbot system',
  })
  @ApiBody({ type: CreateKleemMissingResponseDto })
  @ApiResponse({
    status: 200,
    description: 'Kleem webhook processed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        id: { type: 'string', example: '66f1a2b3c4d5e6f7g8h9i0j' },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid Kleem webhook data',
    type: ErrorResponse,
  })
  async kleemWebhook(@Body() body: CreateKleemMissingResponseDto) {
    const doc = await this.analytics.createKleemFromWebhook(body);
    return { success: true, id: doc._id };
  }
}
