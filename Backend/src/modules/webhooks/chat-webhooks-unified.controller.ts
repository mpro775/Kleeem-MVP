// src/modules/webhooks/chat-webhooks-unified.controller.ts
import { Body, Controller, HttpCode, Param, Post, Req } from '@nestjs/common';
import { Public } from 'src/common/decorators/public.decorator';
import { ApiTags, ApiOperation, ApiParam, ApiBody } from '@nestjs/swagger';
import { SlugResolverService } from '../public/slug-resolver.service';
import { WebhooksController } from './webhooks.controller';

@ApiTags('Webhooks (Unified Slug)')
@Public()
@Controller('webhooks/chat')
export class ChatWebhooksUnifiedController {
  constructor(
    private readonly slugResolver: SlugResolverService,
    private readonly webhooks: WebhooksController,
  ) {}

  /** استقبال رسائل الويب-شات عبر slug واحد لكل الأوضاع (bubble/iframe/bar/conversational) */
  @Post('incoming/:slug')
  @HttpCode(200)

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
    @Body() body: any,
    @Req() req: any,
  ) {
    const { merchantId } = await this.slugResolver.resolve(slug);
  
    const channel = body?.channel ?? 'webchat'; // ✅ مهم جداً
  
    const patched = {
      merchantId,
      channel,                 // ✅ أضفناها
      provider: 'webchat',
      channelId: 'slug:' + slug,
      sessionId: body?.sessionId,
      user: body?.user,
      text: body?.text,
      payload: body?.payload,
      raw: body,
      metadata: {
        embedMode: body?.embedMode ?? 'bubble',
        source: 'slug-endpoint',
      },
    };
  
    // مرّر نفس الـ merchantId المستخرج من السلاج كـ param،
    // والـ patched كـ body:
    return this.webhooks.handleIncoming(patched.merchantId, patched, req);
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
  async replyBySlug(@Param('slug') slug: string, @Body() body: any) {
    const { merchantId } = await this.slugResolver.resolve(slug);

    // نوجّه المناداة لمنتهىك الحالي الموحد
    return this.webhooks.handleBotReply(merchantId, {
      sessionId: body?.sessionId,
      text: body?.text,
      channel: 'webchat',
      metadata: { ...(body?.metadata || {}), via: 'slug-endpoint' },
    });
  }
  @Post('incoming/:slug/ping')
  @Public()
  async ping(@Param('slug') slug: string) {
    await this.slugResolver.resolve(slug); // يتأكد أن slug صحيح
    return { ok: true };
  }
}
