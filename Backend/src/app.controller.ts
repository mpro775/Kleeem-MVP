import { Controller, Get, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import * as Sentry from '@sentry/node';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { Public } from './common/decorators/public.decorator';

@Controller()
@ApiTags('App')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
  @Public()
  @Get('test-error')
  testError() {
    throw new Error('Backend test error');
  }
}
