// src/modules/webhooks/webhooks.controller.ts
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import * as bcrypt from 'bcrypt';
import { Response, Request } from 'express';
import { Public } from 'src/common/decorators/public.decorator';

import { IdempotencyGuard } from '../../common/guards/idempotency.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ServiceTokenGuard } from '../../common/guards/service-token.guard';

import { AgentReplyDto } from './dto/agent-reply.dto';
import { BotReplyDto } from './dto/bot-reply.dto';
import { TestBotReplyDto } from './dto/test-bot-reply.dto';
import { WebhookLoggingInterceptor } from './interceptors/webhook-logging.interceptor';
import { WebhooksService } from './webhooks.service';

import type { ChannelRepository } from './repositories/channel.repository';
import type { PublicChannel } from './types/channels';

@ApiTags('webhooks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseInterceptors(WebhookLoggingInterceptor)
@Controller('webhooks')
export class WebhooksController {
  constructor(
    private readonly service: WebhooksService,
    @Inject('ChannelsRepository')
    private readonly channelsRepo: ChannelRepository,
  ) {}

  @Public()
  @Get(':merchantId/incoming')
  async verifyWebhook(
    @Param('merchantId') merchantId: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const token =
      typeof req.query['hub.verify_token'] === 'string'
        ? req.query['hub.verify_token']
        : '';
    const ch = await this.channelsRepo.findDefaultWaCloudWithVerify(merchantId);
    const verifyTokenHash = (ch as unknown as { verifyTokenHash?: string })
      ?.verifyTokenHash;
    if (!verifyTokenHash) {
      res.status(404).send('Channel not found');
      return;
    }

    const ok = await bcrypt.compare(token, verifyTokenHash);
    if (!ok) {
      res.status(403).send('Forbidden');
      return;
    }

    const { status, body } = this.service.verifyWebhookSubscription(
      merchantId,
      req.query as Record<string, unknown>,
    );
    res.status(status).send(body);
    return;
  }

  @Public()
  @Post('incoming/:merchantId')
  @HttpCode(200)
  @Throttle({
    default: {
      ttl: parseInt(process.env.WEBHOOKS_INCOMING_TTL ?? '10', 10),
      limit: parseInt(process.env.WEBHOOKS_INCOMING_LIMIT ?? '1', 10),
    },
  })
  @ApiOperation({ summary: 'معالجة الرسائل الواردة من القنوات' })
  @ApiParam({ name: 'merchantId', description: 'معرّف التاجر' })
  @ApiBody({ description: 'Body متغيّر حسب منصة الإرسال' })
  @ApiResponse({ status: 200, description: 'تم الاستلام' })
  async handleIncoming(
    @Param('merchantId') merchantId: string,
    @Body() body: unknown,
    @Req() req: Request,
  ): Promise<unknown> {
    return this.service.processIncoming(
      merchantId,
      body,
      req as Request & { rawBody?: Buffer },
    );
  }

  @UseGuards(ServiceTokenGuard, IdempotencyGuard)
  @Public()
  @Post('bot-reply/:merchantId')
  @Throttle({
    default: {
      ttl: parseInt(process.env.WEBHOOKS_BOT_REPLY_TTL ?? '10', 10),
      limit: parseInt(process.env.WEBHOOKS_BOT_REPLY_LIMIT ?? '1', 10),
    },
  })
  @ApiOperation({ summary: 'معالجة ردود البوت الآلية' })
  @ApiParam({ name: 'merchantId', description: 'معرّف التاجر' })
  @ApiBody({ type: BotReplyDto })
  async handleBotReply(
    @Param('merchantId') merchantId: string,
    @Body() body: BotReplyDto,
  ): Promise<{ sessionId: string; status: 'ok' }> {
    return this.service.handleBotReply({
      ...body,
      merchantId,
      channel: body.channel as unknown as PublicChannel,
    });
  }

  @Public()
  @Post(':merchantId/test-bot-reply')
  @Throttle({
    default: {
      ttl: parseInt(process.env.WEBHOOKS_TEST_BOT_REPLY_TTL ?? '10', 10),
      limit: parseInt(process.env.WEBHOOKS_TEST_BOT_REPLY_LIMIT ?? '1', 10),
    },
  })
  @ApiOperation({ summary: 'إرسال ردّ التستنج إلى الداشبورد فقط' })
  @ApiParam({ name: 'merchantId', description: 'معرّف التاجر' })
  @ApiBody({ type: TestBotReplyDto })
  async handleTestBotReply(
    @Param('merchantId') merchantId: string,
    @Body() body: TestBotReplyDto,
  ): Promise<{
    sessionId: string;
    status: 'ok';
    test: true;
  }> {
    return this.service.handleTestBotReply({ ...body, merchantId });
  }

  @Post('agent-reply/:merchantId')
  @Throttle({
    default: {
      ttl: parseInt(process.env.WEBHOOKS_AGENT_REPLY_TTL ?? '10', 10),
      limit: parseInt(process.env.WEBHOOKS_AGENT_REPLY_LIMIT ?? '1', 10),
    },
  })
  @ApiOperation({ summary: 'معالجة ردود الموظفين' })
  @ApiParam({ name: 'merchantId', description: 'معرّف التاجر' })
  @ApiBody({ type: AgentReplyDto })
  async handleAgentReply(
    @Param('merchantId') merchantId: string,
    @Body() body: AgentReplyDto,
  ): Promise<{
    sessionId: string;
  }> {
    return this.service.handleAgentReply({ ...body, merchantId });
  }
}
