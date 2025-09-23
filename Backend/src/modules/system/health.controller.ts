// src/modules/system/health.controller.ts
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Controller, Get, UseGuards, Inject } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Cache } from 'cache-manager';
import Redis from 'ioredis';
import { Connection } from 'mongoose';
import { Public } from 'src/common/decorators/public.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

// ثوابت لتجنب الأرقام السحرية
const BYTES_PER_KB = 1024;
const BYTES_PER_MB = BYTES_PER_KB * BYTES_PER_KB;
const MEMORY_WARNING_THRESHOLD = 90; // نسبة مئوية

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  services: {
    database: ServiceHealth;
    cache: ServiceHealth;
    memory: ServiceHealth;
  };
}

interface ServiceHealth {
  status: 'healthy' | 'unhealthy';
  responseTime?: number;
  details?: Record<string, unknown>;
}

@ApiTags('System')
@UseGuards(JwtAuthGuard)
@Controller('health')
export class HealthController {
  constructor(
    @InjectConnection() private readonly mongoConnection: Connection,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    @InjectRedis() private readonly redis?: Redis, // <-- اختياري
  ) {}

  @Get()
  @Public()
  @SkipThrottle()
  @ApiOperation({ summary: 'فحص صحة النظام الأساسي' })
  @ApiResponse({
    status: 200,
    description: 'النظام يعمل بشكل طبيعي',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'healthy' },
        timestamp: { type: 'string' },
        uptime: { type: 'number' },
      },
    },
  })
  getBasicHealth(): HealthStatus {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      services: {
        database: { status: 'healthy' },
        cache: { status: 'healthy' },
        memory: { status: 'healthy' },
      },
    };
  }

  @Get('detailed')
  @Public()
  @SkipThrottle()
  @ApiOperation({ summary: 'فحص صحة مفصل لجميع الخدمات' })
  @ApiResponse({ status: 200, description: 'تقرير صحة شامل' })
  async getDetailedHealth(): Promise<HealthStatus> {
    // فحص قاعدة البيانات
    const dbHealth = await this.checkDatabase();

    // فحص الكاش
    const cacheHealth = await this.checkCache();

    // فحص الذاكرة
    const memoryHealth = this.checkMemory();

    // تحديد الحالة العامة
    const services = [dbHealth, cacheHealth, memoryHealth];
    const overallStatus = services.every((s) => s.status === 'healthy')
      ? 'healthy'
      : services.some((s) => s.status === 'healthy')
        ? 'degraded'
        : 'unhealthy';

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      services: {
        database: dbHealth,
        cache: cacheHealth,
        memory: memoryHealth,
      },
    };
  }

  @Get('readiness')
  @Public()
  @SkipThrottle()
  @ApiOperation({ summary: 'فحص جاهزية النظام للطلبات' })
  async getReadiness(): Promise<{
    status: string;
    timestamp: string;
    issues?: Record<string, unknown>;
  }> {
    const startTime = Date.now();
    try {
      // فحص سريع للخدمات الأساسية
      const [dbOk, cacheOk] = await Promise.all([
        this.quickDbCheck(),
        this.quickCacheCheck(),
      ]);

      if (dbOk && cacheOk) {
        return {
          status: 'ready',
          timestamp: new Date(startTime).toISOString(),
        };
      } else {
        return {
          status: 'not_ready',
          timestamp: new Date(startTime).toISOString(),
          issues: {
            database: !dbOk,
            cache: !cacheOk,
          },
        };
      }
    } catch (error) {
      return {
        status: 'not_ready',
        timestamp: new Date(startTime).toISOString(),
        issues: { error: (error as Error).message },
      } as {
        status: string;
        timestamp: string;
        issues?: Record<string, unknown>;
      };
    }
  }

  @Get('liveness')
  @Public()
  @SkipThrottle()
  @ApiOperation({ summary: 'فحص أن التطبيق يعمل' })
  getLiveness(): {
    status: string;
    timestamp: string;
    pid: number;
    uptime: number;
  } {
    // فحص بسيط أن العملية تعمل
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
      pid: process.pid,
      uptime: process.uptime(),
    };
  }

  /**
   * فحص قاعدة البيانات
   */
  private async checkDatabase(): Promise<ServiceHealth> {
    const startTime = Date.now();

    try {
      await this.mongoConnection.db?.admin().ping();

      return {
        status: 'healthy',
        responseTime: Date.now() - startTime,
        details: {
          state: this.mongoConnection.readyState,
          name: this.mongoConnection.name,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        details: { error: (error as Error).message },
      };
    }
  }

  /**
   * فحص الكاش
   */
  private async checkCache(): Promise<ServiceHealth> {
    const startTime = Date.now();
    const testKey = `health_check_${Date.now()}`;
    const testValue = 'ok';

    try {
      await this.cacheManager.set(testKey, testValue, 5);
      const retrieved = await this.cacheManager.get(testKey);
      await this.cacheManager.del(testKey);

      const isHealthy = retrieved === testValue;

      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        responseTime: Date.now() - startTime,
        details: { testPassed: isHealthy },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        details: { error: (error as Error).message },
      };
    }
  }

  /**
   * فحص الذاكرة
   */
  private checkMemory(): ServiceHealth {
    const usage = process.memoryUsage();
    const totalMB = Math.round(usage.heapTotal / BYTES_PER_MB);
    const usedMB = Math.round(usage.heapUsed / BYTES_PER_MB);
    const usagePercent = (usedMB / totalMB) * 100;

    const isHealthy = usagePercent < MEMORY_WARNING_THRESHOLD;

    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      details: {
        heapTotal: `${totalMB}MB`,
        heapUsed: `${usedMB}MB`,
        usagePercent: `${usagePercent.toFixed(1)}%`,
        external: `${Math.round(usage.external / BYTES_PER_MB)}MB`,
      },
    };
  }

  /**
   * فحص سريع لقاعدة البيانات
   */
  private async quickDbCheck(): Promise<boolean> {
    try {
      await this.mongoConnection.db?.admin().ping();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * فحص سريع للكاش
   */
  private async quickCacheCheck(): Promise<boolean> {
    try {
      if (this.redis) {
        const pong = await this.redis.ping();
        return pong === 'PONG';
      }
      // fallback للـ cache-manager
      const k = `quick_check_${Date.now()}`;
      await this.cacheManager.set(k, 'ok', 1);
      const v = await this.cacheManager.get(k);
      await this.cacheManager.del(k);
      return v === 'ok';
    } catch {
      return false;
    }
  }
}
