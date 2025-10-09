// src/analytics/analytics.controller.ts

// external
import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
// internal
import { CurrentMerchantId, CurrentUserId } from 'src/common';
import { Public } from 'src/common/decorators/public.decorator';
import { ErrorResponse } from 'src/common/dto/error-response.dto';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TranslationService } from '../../common/services/translation.service';

import {
  AnalyticsService,
  type KeywordCount,
  type Overview,
  type TopProduct,
} from './analytics.service';
import { AddToKnowledgeDto } from './dto/add-to-knowledge.dto';
import { CreateKleemMissingResponseDto } from './dto/create-kleem-missing-response.dto';
import { CreateMissingResponseDto } from './dto/create-missing-response.dto';

// -----------------------------------------------------------------------------
// Constants (no-magic-numbers)
const DEFAULT_PERIOD = 'week' as const;
const MAX_TOP_KEYWORDS = 100;
const DEFAULT_TOP_KEYWORDS = 10;
const MAX_TOP_PRODUCTS = 50;
const DEFAULT_TOP_PRODUCTS = 5;
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MIN_DAYS = 1;
const MAX_DAYS = 90;
const DEFAULT_DAYS = 7;

// API documentation examples
const EXAMPLE_TOTAL_MESSAGES = 1250;
const EXAMPLE_AVG_RESPONSE_TIME = 45.5;
const EXAMPLE_KEYWORD_PERCENTAGE = 12.5;
const EXAMPLE_KEYWORD_COUNT = 25;
const EXAMPLE_TOTAL_CONVERSATIONS = 89;
const EXAMPLE_MISSING_RESPONSES = 12;
const EXAMPLE_PRODUCTS_COUNT = 156;
const EXAMPLE_PAGES = 8;
const EXAMPLE_RESOLUTION_RATE = 71.1;
const EXAMPLE_AVG_RESOLUTION_TIME = 2.5;

// -----------------------------------------------------------------------------
// Types & helpers
type Period = 'week' | 'month' | 'quarter';
type GroupBy = 'day' | 'hour';
type BoolString = 'true' | 'false';

type TimelineEntry = {
  _id: string;
  count: number;
};

type MissingResponsesListQuery = {
  page: number;
  limit: number;
  resolved: 'all' | 'true' | 'false';
  channel: 'all' | 'whatsapp' | 'telegram' | 'webchat';
  type: 'all' | 'missing_response' | 'unavailable_product';
  search: string;
  from?: string;
  to?: string;
};

function parseIntSafe(v: unknown, fallback: number): number {
  const n = typeof v === 'string' ? Number.parseInt(v, 10) : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

function buildListQuery(q: Record<string, unknown>): MissingResponsesListQuery {
  // Map API types to internal service types
  let type: MissingResponsesListQuery['type'] = 'all';
  const apiType = q.type as string;
  if (apiType === 'missing') {
    type = 'missing_response';
  } else if (apiType === 'kleem') {
    // Kleem missing responses might be handled differently or not supported
    // For now, treat as missing_response or we could add specific handling
    type = 'missing_response';
  }

  return {
    page: parseIntSafe(q.page, DEFAULT_PAGE),
    limit: parseIntSafe(q.limit, DEFAULT_LIMIT),
    resolved: (q.resolved as MissingResponsesListQuery['resolved']) ?? 'all',
    channel: (q.channel as MissingResponsesListQuery['channel']) ?? 'all',
    type,
    search: typeof q.search === 'string' ? q.search : '',
    from: typeof q.from === 'string' ? q.from : '',
    to: typeof q.to === 'string' ? q.to : '',
  };
}

// -----------------------------------------------------------------------------

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
    example: DEFAULT_PERIOD,
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard overview data',
    schema: {
      type: 'object',
      properties: {
        totalMessages: { type: 'number', example: EXAMPLE_TOTAL_MESSAGES },
        totalConversations: {
          type: 'number',
          example: EXAMPLE_TOTAL_CONVERSATIONS,
        },
        avgResponseTime: { type: 'number', example: EXAMPLE_AVG_RESPONSE_TIME },
        missingResponses: {
          type: 'number',
          example: EXAMPLE_MISSING_RESPONSES,
        },
        topChannels: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              channel: { type: 'string', example: 'whatsapp' },
              count: { type: 'number', example: EXAMPLE_TOTAL_CONVERSATIONS },
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
    @Query('period') period: Period = DEFAULT_PERIOD,
  ): Promise<Overview> {
    if (!merchantId) {
      throw new ForbiddenException('analytics.responses.error.noMerchant');
    }
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
    example: DEFAULT_PERIOD,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: DEFAULT_TOP_KEYWORDS,
    minimum: 1,
    maximum: MAX_TOP_KEYWORDS,
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
          count: { type: 'number', example: EXAMPLE_KEYWORD_COUNT },
          percentage: { type: 'number', example: EXAMPLE_KEYWORD_PERCENTAGE },
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
    @Query('period') period: Period = DEFAULT_PERIOD,
    @Query('limit') limit = String(DEFAULT_TOP_KEYWORDS),
  ): Promise<KeywordCount[]> {
    if (!merchantId) {
      throw new ForbiddenException('analytics.responses.error.noMerchant');
    }
    const n = clamp(
      parseIntSafe(limit, DEFAULT_TOP_KEYWORDS),
      1,
      MAX_TOP_KEYWORDS,
    );
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
    example: DEFAULT_PERIOD,
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
          _id: { type: 'string', example: '2023-09-18' },
          count: { type: 'number', example: EXAMPLE_TOTAL_MESSAGES },
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
    @Query('period') period: Period = DEFAULT_PERIOD,
    @Query('groupBy') groupBy: GroupBy = 'day',
  ): Promise<TimelineEntry[]> {
    if (!merchantId) {
      throw new ForbiddenException('analytics.responses.error.noMerchant');
    }
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
        total: { type: 'number', example: EXAMPLE_PRODUCTS_COUNT },
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
    if (!merchantId) {
      throw new ForbiddenException('analytics.responses.error.noMerchant');
    }
    const total = await this.analytics.getProductsCount(merchantId);
    return { total };
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
        id: { type: 'string', example: '66f1a2...' },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid webhook data',
    type: ErrorResponse,
  })
  async webhook(
    @Body() body: CreateMissingResponseDto,
  ): Promise<{ success: boolean; id: string }> {
    const doc = await this.analytics.createFromWebhook(body);
    return { success: true, id: doc._id.toString() };
  }

  /** الرسائل المنسيّة / غير المجاب عنها */
  @Get('missing-responses')
  @ApiOperation({
    operationId: 'analytics_missingResponses',
    summary: 'جلب الرسائل المنسية / غير المجاب عنها',
    description: 'Retrieve paginated list of missing/unanswered responses',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: DEFAULT_PAGE,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: DEFAULT_LIMIT,
  })
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
        items: { type: 'array', items: { type: 'object' } },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number', example: DEFAULT_PAGE },
            limit: { type: 'number', example: DEFAULT_LIMIT },
            total: { type: 'number', example: EXAMPLE_PRODUCTS_COUNT },
            pages: { type: 'number', example: EXAMPLE_PAGES },
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
    @Query() query: Record<string, unknown>,
  ): Promise<unknown> {
    if (!merchantId) {
      throw new ForbiddenException('analytics.responses.error.noMerchant');
    }
    const parsed = buildListQuery(query);
    return this.analytics.listMissingResponses({ merchantId, ...parsed });
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
  async resolveOne(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
  ): Promise<{ success: true; item: unknown }> {
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
          example: ['id1', 'id2'],
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
  async resolveBulk(
    @Body() body: { ids: string[] },
  ): Promise<{ success: true; modifiedCount: number; matchedCount: number }> {
    const r = await this.analytics.bulkResolve(body.ids);
    return { success: true, modifiedCount: r.updated, matchedCount: r.updated };
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
        knowledgeId: { type: 'string', example: '66f3...' },
        responseMarkedResolved: { type: 'boolean', example: true },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid data or not found',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description: 'Merchant not found',
    type: ErrorResponse,
  })
  async addToKnowledge(
    @CurrentMerchantId() merchantId: string | null,
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() body: AddToKnowledgeDto,
  ): Promise<unknown> {
    if (!merchantId) {
      throw new ForbiddenException('analytics.responses.error.noMerchant');
    }
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
    example: DEFAULT_DAYS,
    minimum: MIN_DAYS,
    maximum: MAX_DAYS,
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
        total: { type: 'number', example: EXAMPLE_MISSING_RESPONSES },
        resolved: { type: 'number', example: EXAMPLE_MISSING_RESPONSES },
        unresolved: { type: 'number', example: EXAMPLE_MISSING_RESPONSES },
        resolutionRate: { type: 'number', example: EXAMPLE_RESOLUTION_RATE },
        byChannel: { type: 'object' },
        avgResolutionTime: {
          type: 'number',
          example: EXAMPLE_AVG_RESOLUTION_TIME,
        },
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
    @Query('notify') notify?: BoolString,
  ): Promise<unknown> {
    if (!merchantId) {
      throw new ForbiddenException('analytics.responses.error.noMerchant');
    }
    const d = clamp(parseIntSafe(days, DEFAULT_DAYS), MIN_DAYS, MAX_DAYS);
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
    example: DEFAULT_PERIOD,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: DEFAULT_TOP_PRODUCTS,
    minimum: 1,
    maximum: MAX_TOP_PRODUCTS,
  })
  @ApiResponse({
    status: 200,
    description: 'Top products data',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          productId: { type: 'string', example: '66f4...' },
          productName: { type: 'string', example: 'هاتف سامسونج جالاكسي' },
          queryCount: { type: 'number', example: EXAMPLE_PRODUCTS_COUNT },
          percentage: { type: 'number', example: EXAMPLE_KEYWORD_PERCENTAGE },
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
    @Query('period') period: Period = DEFAULT_PERIOD,
    @Query('limit') limit = String(DEFAULT_TOP_PRODUCTS),
  ): Promise<TopProduct[]> {
    if (!merchantId) {
      throw new ForbiddenException('analytics.responses.error.noMerchant');
    }
    const n = clamp(
      parseIntSafe(limit, DEFAULT_TOP_PRODUCTS),
      1,
      MAX_TOP_PRODUCTS,
    );
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
        id: { type: 'string', example: '66f1...' },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid Kleem webhook data',
    type: ErrorResponse,
  })
  async kleemWebhook(
    @Body() body: CreateKleemMissingResponseDto,
  ): Promise<{ success: true; id: string }> {
    const doc = await this.analytics.createKleemFromWebhook(body);
    return { success: true, id: String(doc._id) };
  }
}
