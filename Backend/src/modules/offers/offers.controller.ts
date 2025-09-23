import {
  Controller,
  Get,
  Query,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';

import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

import { OffersService } from './offers.service';

@Controller('offers')
@UseGuards(JwtAuthGuard)
export class OffersController {
  constructor(private readonly offers: OffersService) {}

  @Get()
  @Public()
  async listAll(
    @Query('merchantId') merchantId: string,
    @Query('limit') limitRaw?: string,
    @Query('offset') offsetRaw?: string,
  ): Promise<Record<string, unknown>[]> {
    if (!merchantId) throw new BadRequestException('merchantId is required');
    const limit = Math.min(Math.max(parseInt(limitRaw || '50', 10), 1), 100);
    const offset = Math.max(parseInt(offsetRaw || '0', 10), 0);

    return this.offers.listAllOffers(merchantId, { limit, offset });
  }
}
