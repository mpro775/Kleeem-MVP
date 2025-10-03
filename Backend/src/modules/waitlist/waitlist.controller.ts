// src/waitlist/waitlist.controller.ts
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { MS_PER_SECOND } from 'src/common/constants/common';

import { CreateWaitlistLeadDto } from './dto/create-waitlist-lead.dto';
import { WaitlistService } from './waitlist.service';

@Controller('api/public/waitlist-leads')
export class WaitlistController {
  constructor(private readonly service: WaitlistService) {}

  @Post()
  @Throttle({ default: { limit: 20, ttl: 60 * 60 * MS_PER_SECOND } }) // 20/ساعة/IP
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateWaitlistLeadDto,
    @Req() req: Request,
  ): Promise<{ id: string; createdAt: Date }> {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      undefined;
    const userAgent = req.headers['user-agent'];
    return this.service.create(dto, { ip, userAgent });
  }
}
