// src/modules/usage/usage.controller.ts
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { UsageService } from './usage.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';

@Controller('usage')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsageController {
  constructor(private readonly usageService: UsageService) {}

  // يمكن السماح للتاجر برؤية استخدامه بدون ADMIN، أو احصرها على ADMIN حسب سياستك
  @Roles('ADMIN')
  @Get(':merchantId')
  getUsage(@Param('merchantId') merchantId: string, @Query('monthKey') monthKey?: string) {
    return this.usageService.getUsage(merchantId, monthKey);
  }
}
