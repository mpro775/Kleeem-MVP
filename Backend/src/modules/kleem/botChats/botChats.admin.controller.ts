// src/modules/kleem/botChats/botChats.admin.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';

import { BotChatsService } from './botChats.service';
import { QueryBotRatingsDto } from './dto/query-bot-ratings.dto';

@Controller('admin/kleem/bot-chats/ratings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class BotChatsAdminController {
  constructor(private readonly svc: BotChatsService) {}

  @Get()
  list(@Query() q: QueryBotRatingsDto): Promise<{
    items: Array<{
      id: string;
      sessionId: string;
      updatedAt: Date;
      message: string;
      rating: 0 | 1;
      feedback?: string;
      timestamp: Date;
    }>;
    total: number;
    page: number;
    limit: number;
  }> {
    return this.svc.listBotRatings(q);
  }

  @Get('stats')
  stats(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<{
    summary: {
      totalRated: number;
      thumbsUp: number;
      thumbsDown: number;
      upRate: number;
    };
    weekly: unknown[];
    topBad: Array<{ text: string; count: number; feedbacks: string[] }>;
  }> {
    return this.svc.botRatingsStats(from, to) as Promise<{
      summary: {
        totalRated: number;
        thumbsUp: number;
        thumbsDown: number;
        upRate: number;
      };
      weekly: unknown[];
      topBad: Array<{ text: string; count: number; feedbacks: string[] }>;
    }>;
  }
}
