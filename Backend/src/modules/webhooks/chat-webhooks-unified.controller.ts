// src/modules/webhooks/chat-webhooks-unified.controller.ts
import {
  Body,
  Controller,
  HttpCode,
  Param,
  Post,
  Req,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBody } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from 'src/common/decorators/public.decorator';

import { SlugResolverService } from '../public/slug-resolver.service';

import { WebhookLoggingInterceptor } from './interceptors/webhook-logging.interceptor';
import { WebhooksController } from './webhooks.controller';

import type { Request } from 'express';

@ApiTags('Webhooks (Unified Slug)')
@Public()
@UseInterceptors(WebhookLoggingInterceptor)
@Controller('webhooks/chat')
export class ChatWebhooksUnifiedController {
  constructor(
    private readonly slugResolver: SlugResolverService,
    private readonly webhooks: WebhooksController,
  ) {}

  /** استقبال رسائل الويب-شات عبر slug واحد لكل الأوضاع (bubble/iframe/bar/conversational) */
  @Post('incoming/:slug')
  @HttpCode(200)
  @Throttle({
    default: {
      ttl: parseInt(process.env.WEBHOOKS_INCOMING_TTL || '10'),
      limit: parseInt(process.env.WEBHOOKS_INCOMING_LIMIT || '1'),
    },
  })
  @ApiOperation({ summary: 'Inbound via public slug (all webchat modes)' })
  @ApiParam({ name: 'slug', example: 'acme-store' })
  @ApiBody({
    schema: {
      example: {
        sessionId: 'web-1727000000000',
        text: 'مرحبا',
        user: { id: 'u1', name: 'Ali' },
        embedMode: 'bubble', // اختياري: 'bubble' | 'iframe' | 'bar' | 'conversational'
        payload: {
          /* أي حقول إضافية */
        },
      },
    },
  })
  async incomingBySlug(
    @Param('slug') slug: string,
    @Body() body: Record<string, unknown>,
    @Req() req: Request,
  ): Promise<void> {
    const { merchantId } = (await this.slugResolver.resolve(slug)) as {
      merchantId: string;
    };

    // channel يجب أن يكون string
    const channel = typeof body.channel === 'string' ? body.channel : 'webchat';

    const patched = {
      merchantId,
      channel,
      provider: 'webchat',
      channelId: `slug:${slug}`,
      sessionId:
        typeof body.sessionId === 'string' ? body.sessionId : undefined,
      user: body.user,
      text: typeof body.text === 'string' ? body.text : undefined,
      payload: body.payload,
      raw: body,
      metadata: {
        embedMode:
          typeof body.embedMode === 'string' ? body.embedMode : 'bubble',
        source: 'slug-endpoint',
      },
    };

    await this.webhooks.handleIncoming(merchantId, patched, req);
  }
  /** ردود البوت/النظام عبر slug موحّد */
  @Post('reply/:slug')
  @ApiOperation({ summary: 'Bot/system reply via public slug' })
  @ApiParam({ name: 'slug', example: 'acme-store' })
  @ApiBody({
    schema: {
      example: {
        sessionId: 'web-1727000000000',
        text: 'أقدر أساعدك بايش؟',
        // القناة تبقى webchat؛ نمُرر embedMode (اختياري)
        metadata: { embedMode: 'bubble' },
      },
    },
  })
  async replyBySlug(
    @Param('slug') slug: string,
    @Body() body: Record<string, unknown>,
  ): Promise<void> {
    const { merchantId } = (await this.slugResolver.resolve(slug)) as {
      merchantId: string;
    };

    // نوجّه المناداة لمنتهىك الحالي الموحد
    await this.webhooks.handleBotReply(merchantId, {
      sessionId: body?.sessionId as string,
      text: body?.text as string,
      channel: 'webchat',
      metadata: { ...(body?.metadata || {}), via: 'slug-endpoint' },
    });
  }
  @Post('incoming/:slug/ping')
  @Public()
  async ping(@Param('slug') slug: string): Promise<{ ok: boolean }> {
    await this.slugResolver.resolve(slug); // يتأكد أن slug صحيح
    return { ok: true };
  }
}
