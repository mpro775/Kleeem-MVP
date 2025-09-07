// src/modules/storefront-leads/storefront-leads.controller.ts
import { Controller, Post, Body, Param } from '@nestjs/common';
import { LeadsService } from '../leads/leads.service';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UseGuards } from '@nestjs/common';

@UseGuards(JwtAuthGuard)
@Controller('storefront/merchant/:merchantId/leads')
export class StorefrontLeadsController {
  constructor(private readonly leads: LeadsService) {}
  @Public()
  @Post()
  createLite(
    @Param('merchantId') merchantId: string,
    @Body()
    body: { sessionId: string; data: Record<string, any>; source?: string },
  ) {
    // يمررها كما هي لوحدة الـ Leads
    return this.leads.create(merchantId, {
      sessionId: body.sessionId,
      data: body.data,
      source: body.source,
    });
  }
}
