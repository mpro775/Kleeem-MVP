// src/modules/system/health.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
// لو عندك Throttler: 
import { SkipThrottle } from '@nestjs/throttler';
// لو عندك JwtGuard افتراضي: 
import { Public } from 'src/common/decorators/public.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';



@UseGuards(JwtAuthGuard)
@Controller('health')
export class HealthController {
  @Get()
  @Public()         // اسمح بدون توثيق
  @SkipThrottle()   // لا تطبّق rate limit
  get() {
    return { status: 'ok', ts: Date.now() };
  }
}
