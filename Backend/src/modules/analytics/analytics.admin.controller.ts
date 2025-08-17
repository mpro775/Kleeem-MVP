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
import { Roles } from 'src/common/decorators/roles.decorator'; // role: 'admin'
import { RolesGuard } from 'src/common/guards/roles.guard';
import { UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { QueryKleemMissingResponsesDto } from './dto/query-kleem-missing-responses.dto';

@UseGuards(RolesGuard)
@Roles('admin')
@Controller('admin/analytics/kleem-missing-responses')
export class AnalyticsAdminController {
  constructor(private readonly service: AnalyticsService) {}

  @Get()
  list(@Query() q: QueryKleemMissingResponsesDto) {
    return this.service.listKleemMissing(q);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    body: { resolved?: boolean; manualReply?: string; category?: string },
  ) {
    return this.service.updateKleemMissing(id, body);
  }

  @Post('bulk-resolve')
  bulkResolve(@Body() body: { ids: string[] }) {
    return this.service.bulkResolve(body.ids || []);
  }
}
