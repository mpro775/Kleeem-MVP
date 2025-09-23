// src/analytics/analytics.admin.controller.ts
import {
  Controller,
  Get,
  Query,
  Patch,
  Param,
  Body,
  Post,
} from '@nestjs/common';
import { UseGuards } from '@nestjs/common';
import { Roles } from 'src/common/decorators/roles.decorator'; // role: 'admin'
import { RolesGuard } from 'src/common/guards/roles.guard';

import { AnalyticsService } from './analytics.service';
import { QueryKleemMissingResponsesDto } from './dto/query-kleem-missing-responses.dto';
import { KleemMissingResponseDocument } from './schemas/kleem-missing-response.schema';

@UseGuards(RolesGuard)
@Roles('admin')
@Controller('admin/analytics/kleem-missing-responses')
export class AnalyticsAdminController {
  constructor(private readonly service: AnalyticsService) {}

  @Get()
  list(
    @Query() q: QueryKleemMissingResponsesDto,
  ): Promise<{ items: KleemMissingResponseDocument[]; total: number }> {
    return this.service.listKleemMissing(q);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    body: { resolved?: boolean; manualReply?: string; category?: string },
  ): Promise<KleemMissingResponseDocument> {
    return this.service.updateKleemMissing(id, body);
  }

  @Post('bulk-resolve')
  bulkResolve(@Body() body: { ids: string[] }): Promise<{ updated: number }> {
    return this.service.bulkResolve(body.ids || []);
  }
}
