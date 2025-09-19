// src/modules/system/health.controller.ts
import { Controller, Get, UseGuards, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from 'src/common/decorators/public.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import Redis from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';

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
  details?: any;
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
  getBasicHealth() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
    };
  }

  @Get('detailed')
  @Public()
  @SkipThrottle()
  @ApiOperation({ summary: 'فحص صحة مفصل لجميع الخدمات' })
  @ApiResponse({ status: 200, description: 'تقرير صحة شامل' })
  async getDetailedHealth(): Promise<HealthStatus> {
    const startTime = Date.now();

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
  async getReadiness() {
    try {
      // فحص سريع للخدمات الأساسية
      const [dbOk, cacheOk] = await Promise.all([
        this.quickDbCheck(),
        this.quickCacheCheck(),
      ]);

      if (dbOk && cacheOk) {
        return { status: 'ready', timestamp: new Date().toISOString() };
      } else {
        return {
          status: 'not_ready',
          timestamp: new Date().toISOString(),
          issues: {
            database: !dbOk,
            cache: !cacheOk,
          },
        };
      }
    } catch (error) {
      return {
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  @Get('liveness')
  @Public()
  @SkipThrottle()
  @ApiOperation({ summary: 'فحص أن التطبيق يعمل' })
  getLiveness() {
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
        details: { error: error.message },
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
        details: { error: error.message },
      };
    }
  }

  /**
   * فحص الذاكرة
   */
  private checkMemory(): ServiceHealth {
    const usage = process.memoryUsage();
    const totalMB = Math.round(usage.heapTotal / 1024 / 1024);
    const usedMB = Math.round(usage.heapUsed / 1024 / 1024);
    const usagePercent = (usedMB / totalMB) * 100;

    const isHealthy = usagePercent < 90; // تحذير إذا تجاوز 90%

    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      details: {
        heapTotal: `${totalMB}MB`,
        heapUsed: `${usedMB}MB`,
        usagePercent: `${usagePercent.toFixed(1)}%`,
        external: `${Math.round(usage.external / 1024 / 1024)}MB`,
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
