// src/analytics/analytics.controller.ts
import { Public } from 'src/common/decorators/public.decorator';

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
  AnalyticsService,
  Overview,
  KeywordCount,
  TopProduct,
} from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

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
import { AddToKnowledgeDto } from './dto/add-to-knowledge.dto';
import { CurrentMerchantId, CurrentUserId } from 'src/common';

@ApiTags('التحليلات')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  /** نظرة عامة */
  @Get('overview')
  @ApiOperation({ summary: 'الحصول على نظرة عامة على التحليلات' })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['week', 'month', 'quarter'],
    example: 'week',
  })
  @ApiResponse({ status: 200, description: 'OK' })
  async overview(
    @CurrentMerchantId() merchantId: string | null,
    @Query('period') period: 'week' | 'month' | 'quarter' = 'week',
  ): Promise<Overview> {
    if (!merchantId) throw new ForbiddenException('لا يوجد تاجر مرتبط بالحساب');
    return this.analytics.getOverview(merchantId, period);
  }

  /** أبرز الكلمات المفتاحية */
  @Get('top-keywords')
  @ApiOperation({ summary: 'الحصول على أبرز الكلمات المفتاحية' })
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
  })
  @ApiResponse({ status: 200, description: 'OK' })
  async topKeywords(
    @CurrentMerchantId() merchantId: string | null,
    @Query('period') period: 'week' | 'month' | 'quarter' = 'week',
    @Query('limit') limit = '10',
  ): Promise<KeywordCount[]> {
    if (!merchantId) throw new ForbiddenException('لا يوجد تاجر مرتبط بالحساب');
    const n = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
    return this.analytics.getTopKeywords(merchantId, period, n);
  }

  /** الخط الزمني للرسائل */
  @Get('messages-timeline')
  @ApiOperation({ summary: 'الحصول على الخط الزمني للرسائل' })
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
  @ApiResponse({ status: 200, description: 'OK' })
  async messagesTimeline(
    @CurrentMerchantId() merchantId: string | null,
    @Query('period') period: 'week' | 'month' | 'quarter' = 'week',
    @Query('groupBy') groupBy: 'day' | 'hour' = 'day',
  ) {
    if (!merchantId) throw new ForbiddenException('لا يوجد تاجر مرتبط بالحساب');
    return this.analytics.getMessagesTimeline(merchantId, period, groupBy);
  }

  /** عدد المنتجات */
  @Get('products-count')
  @ApiOperation({ summary: 'الحصول على عدد المنتجات' })
  @ApiResponse({ status: 200, description: 'OK' })
  async productsCount(
    @CurrentMerchantId() merchantId: string | null,
  ): Promise<{ total: number }> {
    if (!merchantId) throw new ForbiddenException('لا يوجد تاجر مرتبط بالحساب');
    return { total: await this.analytics.getProductsCount(merchantId) };
  }

  /** Webhook عام */
  @Post('webhook')
  @Public()
  @ApiOperation({ summary: 'Webhook للتحليلات' })
  @ApiBody({ type: CreateMissingResponseDto })
  async webhook(@Body() body: CreateMissingResponseDto) {
    const doc = await this.analytics.createFromWebhook(body);
    return { success: true, id: (doc as any)._id };
  }

  /** الرسائل المنسيّة / غير المجاب عنها */
  @Get('missing-responses')
  @ApiOperation({ summary: 'جلب الرسائل المنسية / غير المجاب عنها' })
  async list(
    @CurrentMerchantId() merchantId: string | null,
    @Query() query: any,
  ) {
    if (!merchantId) throw new ForbiddenException('لا يوجد تاجر مرتبط بالحساب');
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
  @ApiOperation({ summary: 'تحديد رسالة كمُعالجة' })
  async resolveOne(@CurrentUserId() userId: string, @Param('id') id: string) {
    const doc = await this.analytics.markResolved(id, userId);
    return { success: true, item: doc };
  }

  /** تحديد عدة رسائل كمُعالجة */
  @Patch('missing-responses/resolve')
  @ApiOperation({ summary: 'تحديد عدة رسائل كمُعالجة' })
  async resolveBulk(@Body() body: { ids: string[] }) {
    const r = await this.analytics.bulkResolve(body.ids);
    return { success: true, ...r };
  }

  /** تحويل رسالة منسية إلى معرفة (FAQ) */
  @Post('missing-responses/:id/add-to-knowledge')
  @ApiOperation({
    summary: 'تحويل الرسالة المنسيّة إلى معرفة (FAQ) + وضعها مُعالجة',
  })
  @ApiBody({ type: AddToKnowledgeDto })
  async addToKnowledge(
    @CurrentMerchantId() merchantId: string | null,
    @CurrentUserId() userId: string, // ✅ ديكوريتر صحيح
    @Param('id') id: string,
    @Body() body: AddToKnowledgeDto,
  ) {
    if (!merchantId) throw new ForbiddenException('لا يوجد تاجر مرتبط بالحساب');
    return this.analytics.addToKnowledge({
      merchantId,
      missingId: id,
      payload: body,
      userId,
    });
  }

  /** إحصاءات الرسائل المنسية */
  @Get('missing-responses/stats')
  @ApiOperation({ summary: 'إحصاءات الرسائل المنسية' })
  async stats(
    @CurrentMerchantId() merchantId: string | null,
    @CurrentUserId() userId: string,
    @Query('days') days?: string,
    @Query('notify') notify?: 'true' | 'false',
  ) {
    if (!merchantId) throw new ForbiddenException('لا يوجد تاجر مرتبط بالحساب');
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
  @ApiOperation({ summary: 'الحصول على أبرز المنتجات' })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['week', 'month', 'quarter'],
    example: 'week',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 5 })
  @ApiResponse({ status: 200, description: 'OK' })
  async topProducts(
    @CurrentMerchantId() merchantId: string | null,
    @Query('period') period: 'week' | 'month' | 'quarter' = 'week',
    @Query('limit') limit = '5',
  ): Promise<TopProduct[]> {
    if (!merchantId) throw new ForbiddenException('لا يوجد تاجر مرتبط بالحساب');
    const n = Math.min(Math.max(parseInt(limit, 10) || 5, 1), 50);
    return this.analytics.getTopProducts(merchantId, period, n);
  }

  /** Webhook عام (Kleem) */
  @Post('webhook/kleem')
  @Public()
  async kleemWebhook(@Body() body: CreateKleemMissingResponseDto) {
    const doc = await this.analytics.createKleemFromWebhook(body);
    return { success: true, id: doc._id };
  }
}
