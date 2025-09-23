import {
  Controller,
  Get,
  Delete,
  Post,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { UserRole } from '../../modules/users/schemas/user.schema';
import { Roles } from '../decorators/roles.decorator';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

import { CacheWarmerOrchestrator } from './cache-warmer.orchestrator';
import { CacheService } from './cache.service';

@ApiTags('Cache Management')
@Controller('admin/cache')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class CacheController {
  constructor(
    private readonly cacheService: CacheService,
    private readonly cacheWarmerService: CacheWarmerOrchestrator,
  ) {}

  @Get('stats')
  @ApiOperation({ summary: 'الحصول على إحصائيات الكاش' })
  @ApiResponse({ status: 200, description: 'إحصائيات الكاش' })
  getStats(): { success: boolean; data: ReturnType<CacheService['getStats']> } {
    return {
      success: true,
      data: this.cacheService.getStats(),
    };
  }

  @Post('stats/reset')
  @ApiOperation({ summary: 'إعادة تعيين إحصائيات الكاش' })
  @ApiResponse({ status: 200, description: 'تم إعادة تعيين الإحصائيات' })
  resetStats(): { success: boolean; message: string } {
    this.cacheService.resetStats();
    return {
      success: true,
      message: 'تم إعادة تعيين إحصائيات الكاش',
    };
  }

  @Delete('clear')
  @ApiOperation({ summary: 'مسح جميع الكاش' })
  @ApiResponse({ status: 200, description: 'تم مسح الكاش' })
  async clearCache(): Promise<{ success: boolean; message: string }> {
    await this.cacheService.clear();
    return {
      success: true,
      message: 'تم مسح جميع الكاش',
    };
  }

  @Delete('invalidate/:pattern')
  @ApiOperation({ summary: 'إبطال الكاش بنمط معين' })
  @ApiResponse({ status: 200, description: 'تم إبطال الكاش' })
  async invalidatePattern(
    @Param('pattern') pattern: string,
  ): Promise<{ success: boolean; message: string }> {
    await this.cacheService.invalidate(pattern);
    return {
      success: true,
      message: `تم إبطال الكاش للنمط: ${pattern}`,
    };
  }

  @Delete('key/:key')
  @ApiOperation({ summary: 'حذف مفتاح كاش محدد' })
  @ApiResponse({ status: 200, description: 'تم حذف المفتاح' })
  async deleteKey(
    @Param('key') key: string,
  ): Promise<{ success: boolean; message: string }> {
    await this.cacheService.delete(key);
    return {
      success: true,
      message: `تم حذف المفتاح: ${key}`,
    };
  }

  @Post('warm')
  @ApiOperation({ summary: 'تسخين الكاش يدوياً' })
  @ApiResponse({ status: 200, description: 'تم تسخين الكاش' })
  async warmCache(
    @Body() body?: { type?: string },
  ): Promise<{ success: boolean; message: string }> {
    await this.cacheWarmerService.manualWarm(body?.type);
    return {
      success: true,
      message: `تم تسخين الكاش${body?.type ? ` للنوع: ${body.type}` : ''}`,
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'فحص حالة الكاش' })
  @ApiResponse({ status: 200, description: 'حالة الكاش' })
  async healthCheck(): Promise<
    | {
        success: true;
        data: {
          status: string;
          timestamp: string;
          stats: ReturnType<CacheService['getStats']>;
        };
      }
    | {
        success: false;
        data: {
          status: string;
          error: string;
          timestamp: string;
        };
      }
  > {
    try {
      const testKey = 'health_check_' + Date.now();
      const testValue = { timestamp: Date.now() };

      // اختبار الكتابة والقراءة
      await this.cacheService.set(testKey, testValue, 10);
      const retrieved = await this.cacheService.get(testKey);
      await this.cacheService.delete(testKey);

      const isHealthy =
        retrieved &&
        (retrieved as { timestamp: number }).timestamp === testValue.timestamp;

      return {
        success: true,
        data: {
          status: isHealthy ? 'healthy' : 'unhealthy',
          timestamp: new Date().toISOString(),
          stats: this.cacheService.getStats(),
        },
      };
    } catch (error) {
      return {
        success: false,
        data: {
          status: 'unhealthy',
          error: (error as Error).message,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }
}
