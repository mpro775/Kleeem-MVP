import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../users/schemas/user.schema';

import { GeminiService } from './gemini.service';

@ApiTags('Admin', 'Admin AI')
@ApiBearerAuth()
@Controller('admin/ai')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AiAdminController {
  constructor(private readonly geminiService: GeminiService) {}

  @Get('health')
  @ApiOperation({ summary: 'فحص صحة خدمة Gemini' })
  @ApiResponse({ status: 200, description: 'حالة الاتصال بـ Gemini' })
  getHealth(): Promise<{ ok: boolean; message?: string }> {
    return this.geminiService.checkHealth();
  }
}
