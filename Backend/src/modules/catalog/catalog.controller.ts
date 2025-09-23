// ================== External imports ==================
import { randomUUID } from 'crypto';

import {
  Controller,
  Param,
  Post,
  Get,
  UseGuards,
  BadRequestException,
  NotFoundException,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiExtraModels,
} from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';
// ================== Internal imports ==================
import { ErrorResponse } from 'src/common/dto/error-response.dto';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

import { CatalogService } from './catalog.service';

// ================== Type-only imports ==================
import type { ReadonlyDeep } from 'type-fest';

// ================== Constants ==================
const MS_PER_SECOND = 1_000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_15 = 15;
const MS_15_MIN = MINUTES_15 * SECONDS_PER_MINUTE * MS_PER_SECOND;

const EX_IMPORTED = 150;
const EX_UPDATED = 25;
const EX_FAILED = 3;
const EX_TOTAL_PRODUCTS = 175;
const EX_ACTIVE_PRODUCTS = 165;
const EX_INACTIVE_PRODUCTS = 10;
const EX_TOTAL_CATEGORIES = 12;
const EX_AVG_SYNC_TIME = 8.5;
const EX_SUCCESS_RATE = 96.7;
const EX_LAST_ERROR_COUNT = 2;

// ================== DTOs & Enums ==================
export enum SyncStatusEnum {
  pending = 'pending',
  running = 'running',
  completed = 'completed',
  failed = 'failed',
}

export enum SyncSourceEnum {
  zid = 'zid',
  salla = 'salla',
  manual = 'manual',
}

export class MerchantIdParamDto {
  @IsString()
  @Matches(/^m_.+/, { message: 'merchantId must start with m_' })
  merchantId!: string;
}

export class GetStatsQueryDto {
  @IsOptional()
  @IsEnum(['week', 'month', 'quarter', 'year'], {
    message: 'period must be one of: week, month, quarter, year',
  })
  period?: 'week' | 'month' | 'quarter' | 'year';
}

export class SyncResponseDto {
  success!: boolean;
  message!: string;
  syncId!: string;
  merchantId!: string;
  startedAt!: string;
}

export class SyncRunDto {
  syncId!: string;
  startedAt!: string;
  completedAt!: string;
  status!: SyncStatusEnum;
  imported!: number;
  updated!: number;
  failed!: number;
}

export class SyncStatsDto {
  totalProducts!: number;
  lastUpdated!: string;
  source!: SyncSourceEnum;
}

export class SyncStatusResponseDto {
  merchantId!: string;
  lastSync!: SyncRunDto | null;
  stats!: SyncStatsDto;
}

export class CatalogOverviewDto {
  totalProducts!: number;
  activeProducts!: number;
  inactiveProducts!: number;
  totalCategories!: number;
  lastSyncDate!: string;
}

export class SyncHistoryItemDto {
  date!: string;
  imported!: number;
  updated!: number;
  failed!: number;
}

export class PerformanceDto {
  /** بالدقائق */
  avgSyncTime!: number;
  /** نسبة مئوية */
  successRate!: number;
  lastErrorCount!: number;
}

export class CatalogStatsResponseDto {
  merchantId!: string;
  period!: 'week' | 'month' | 'quarter' | 'year';
  overview!: CatalogOverviewDto;
  syncHistory!: SyncHistoryItemDto[];
  performance!: PerformanceDto;
}

// ================== Helpers ==================
function newSyncId(): string {
  return `sync_${Date.now()}_${randomUUID()}`;
}

function assert(
  condition: unknown,
  errorFactory: () => Error,
): asserts condition {
  if (!condition) throw errorFactory();
}

// ================== Controller ==================
@ApiTags('الكتالوج')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@ApiExtraModels(
  SyncResponseDto,
  SyncStatusResponseDto,
  CatalogStatsResponseDto,
  ErrorResponse,
)
@Controller('catalog')
export class CatalogController {
  constructor(private readonly svc: CatalogService) {}

  // ---------- Sync ----------
  /**
   * مزامنة كتالوج التاجر
   * يبدأ عملية مزامنة لكتالوج تاجر معين
   */
  @Post(':merchantId/sync')
  @ApiOperation({
    operationId: 'catalog_syncMerchant',
    summary: 'مزامنة كتالوج التاجر',
    description:
      'يبدأ عملية مزامنة لكتالوج تاجر معين مع التحقق من صحة البيانات والصلاحيات',
  })
  @ApiParam({
    name: 'merchantId',
    description: 'معرف التاجر لمزامنة الكتالوج',
    example: 'm_12345',
    type: 'string',
  })
  @ApiCreatedResponse({
    description: 'تم بدء عملية المزامنة بنجاح',
    type: SyncResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'معرف التاجر غير صحيح أو بيانات المزامنة غير مكتملة',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({ description: 'التاجر غير موجود', type: ErrorResponse })
  @ApiForbiddenResponse({
    description: 'ليس لديك صلاحية لمزامنة هذا الكتالوج',
    type: ErrorResponse,
  })
  async sync(
    @Param() { merchantId }: MerchantIdParamDto,
  ): Promise<SyncResponseDto> {
    try {
      const startedAt = new Date().toISOString();
      const serviceResult = await this.svc.syncForMerchant(merchantId);

      assert(
        serviceResult,
        () =>
          new NotFoundException({
            code: 'MERCHANT_NOT_FOUND',
            message: 'التاجر غير موجود',
          }),
      );

      // بإمكان svc أن يعيد معلومات إضافية؛ ندمجها إن وجدت
      const response: SyncResponseDto = {
        success: true,
        message: 'تم بدء مزامنة الكتالوج بنجاح',
        syncId: newSyncId(),
        merchantId,
        startedAt,
        ...(serviceResult as Record<string, unknown>),
      } as unknown as SyncResponseDto;

      return response;
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException({
        code: 'SYNC_FAILED',
        message: 'فشلت عملية المزامنة',
        details: [error instanceof Error ? error.message : 'Unknown error'],
      });
    }
  }

  // ---------- Get Sync Status ----------
  /**
   * الحصول على حالة مزامنة الكتالوج
   */
  @Get(':merchantId/status')
  @ApiOperation({
    operationId: 'catalog_getSyncStatus',
    summary: 'الحصول على حالة مزامنة الكتالوج',
    description: 'يحصل على آخر حالة لعملية مزامنة الكتالوج للتاجر المحدد',
  })
  @ApiParam({
    name: 'merchantId',
    description: 'معرف التاجر',
    example: 'm_12345',
    type: 'string',
  })
  @ApiOkResponse({ description: 'حالة المزامنة', type: SyncStatusResponseDto })
  @ApiBadRequestResponse({
    description: 'معرف التاجر غير صحيح',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({ description: 'التاجر غير موجود', type: ErrorResponse })
  @ApiForbiddenResponse({
    description: 'ليس لديك صلاحية للوصول إلى هذا الكتالوج',
    type: ErrorResponse,
  })
  getSyncStatus(
    @Param() { merchantId }: MerchantIdParamDto,
  ): SyncStatusResponseDto {
    try {
      return this.buildSyncStatusResponse(merchantId);
    } catch (error) {
      throw new BadRequestException({
        code: 'STATUS_RETRIEVAL_FAILED',
        message: 'فشل في الحصول على حالة المزامنة',
        details: [error instanceof Error ? error.message : 'Unknown error'],
      });
    }
  }

  private buildSyncStatusResponse(merchantId: string): SyncStatusResponseDto {
    const now = Date.now();
    const lastStarted = new Date(now - MS_15_MIN).toISOString();
    const completed = new Date(now).toISOString();

    return {
      merchantId,
      lastSync: {
        syncId: newSyncId(),
        startedAt: lastStarted,
        completedAt: completed,
        status: SyncStatusEnum.completed,
        imported: EX_IMPORTED,
        updated: EX_UPDATED,
        failed: EX_FAILED,
      },
      stats: {
        totalProducts: EX_TOTAL_PRODUCTS,
        lastUpdated: completed,
        source: SyncSourceEnum.zid,
      },
    };
  }

  // ---------- Stats ----------
  /**
   * إحصائيات الكتالوج
   */
  @Get(':merchantId/stats')
  @ApiOperation({
    operationId: 'catalog_getStats',
    summary: 'إحصائيات الكتالوج',
    description: 'يحصل على إحصائيات شاملة لكتالوج التاجر',
  })
  @ApiParam({
    name: 'merchantId',
    description: 'معرف التاجر',
    example: 'm_12345',
    type: 'string',
  })
  @ApiOkResponse({
    description: 'إحصائيات الكتالوج',
    type: CatalogStatsResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'معرف التاجر غير صحيح أو فترة غير صحيحة',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({ description: 'التاجر غير موجود', type: ErrorResponse })
  @ApiForbiddenResponse({
    description: 'ليس لديك صلاحية للوصول إلى إحصائيات هذا الكتالوج',
    type: ErrorResponse,
  })
  getStats(
    @Param() { merchantId }: MerchantIdParamDto,
    @Query() query: GetStatsQueryDto,
  ): CatalogStatsResponseDto {
    // التحقق من صحة الفترة عبر DTO يكفي، لكن نضيف دفاعًا وقائيًا
    const period = query.period ?? 'month';
    const VALID_PERIODS = ['week', 'month', 'quarter', 'year'];
    if (!(VALID_PERIODS as ReadonlyDeep<string[]>).includes(period)) {
      throw new BadRequestException({
        code: 'INVALID_PERIOD',
        message: 'الفترة يجب أن تكون واحدة من: week, month, quarter, year',
        details: [`Valid periods: ${VALID_PERIODS.join(', ')}`],
      });
    }

    try {
      // منطق قاعدة البيانات يمكن إضافته هنا؛ نرجع مثالًا منظّمًا
      const nowIso = new Date().toISOString();
      const response: CatalogStatsResponseDto = {
        merchantId,
        period,
        overview: {
          totalProducts: EX_TOTAL_PRODUCTS,
          activeProducts: EX_ACTIVE_PRODUCTS,
          inactiveProducts: EX_INACTIVE_PRODUCTS,
          totalCategories: EX_TOTAL_CATEGORIES,
          lastSyncDate: nowIso,
        },
        syncHistory: [
          {
            date: '2023-09-18',
            imported: EX_IMPORTED,
            updated: EX_UPDATED,
            failed: EX_FAILED,
          },
          {
            date: '2023-09-17',
            imported: EX_IMPORTED,
            updated: EX_UPDATED,
            failed: EX_FAILED,
          },
          {
            date: '2023-09-16',
            imported: EX_IMPORTED,
            updated: EX_UPDATED,
            failed: EX_FAILED,
          },
        ],
        performance: {
          avgSyncTime: EX_AVG_SYNC_TIME,
          successRate: EX_SUCCESS_RATE,
          lastErrorCount: EX_LAST_ERROR_COUNT,
        },
      };
      return response;
    } catch (error) {
      throw new BadRequestException({
        code: 'STATS_RETRIEVAL_FAILED',
        message: 'فشل في الحصول على الإحصائيات',
        details: [error instanceof Error ? error.message : 'Unknown error'],
      });
    }
  }
}
