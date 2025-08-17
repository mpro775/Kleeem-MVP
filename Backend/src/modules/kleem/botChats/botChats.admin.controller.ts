// src/modules/kleem/botChats/botChats.admin.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { BotChatsService } from './botChats.service';
import { QueryBotRatingsDto } from './dto/query-bot-ratings.dto';

@Controller('admin/kleem/bot-chats/ratings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class BotChatsAdminController {
  constructor(private readonly svc: BotChatsService) {}

  @Get()
  list(@Query() q: QueryBotRatingsDto) {
    return this.svc.listBotRatings(q);
  }

  @Get('stats')
  stats(@Query('from') from?: string, @Query('to') to?: string) {
    return this.svc.botRatingsStats(from, to);
  }
}
