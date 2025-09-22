// src/catalog/catalog.controller.ts
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
  ApiResponse,
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { ErrorResponse } from 'src/common/dto/error-response.dto';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

import { CatalogService } from './catalog.service';

@ApiTags('الكتالوج')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('catalog')
export class CatalogController {
  constructor(private readonly svc: CatalogService) {}

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
  @ApiResponse({
    status: 201,
    description: 'تم بدء عملية المزامنة بنجاح',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'تم بدء مزامنة الكتالوج بنجاح' },
        syncId: { type: 'string', example: 'sync_66f1a2b3c4d5e6f7g8h9i0j' },
        merchantId: { type: 'string', example: 'm_12345' },
        startedAt: { type: 'string', example: '2023-09-18T10:30:00Z' },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'معرف التاجر غير صحيح أو بيانات المزامنة غير مكتملة',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'التاجر غير موجود',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description: 'ليس لديك صلاحية لمزامنة هذا الكتالوج',
    type: ErrorResponse,
  })
  @ApiResponse({
    status: 500,
    description: 'خطأ داخلي في الخادم أثناء عملية المزامنة',
    type: ErrorResponse,
  })
  async sync(@Param('merchantId') merchantId: string) {
    // التحقق من صحة merchantId
    if (!merchantId || !merchantId.startsWith('m_')) {
      throw new BadRequestException({
        code: 'INVALID_MERCHANT_ID',
        message: 'معرف التاجر يجب أن يبدأ بـ m_',
        details: ['merchantId must start with m_'],
      });
    }

    try {
      const result = await this.svc.syncForMerchant(merchantId);

      // إذا لم يتم العثور على التاجر
      if (!result) {
        throw new NotFoundException({
          code: 'MERCHANT_NOT_FOUND',
          message: 'التاجر غير موجود',
        });
      }

      return {
        success: true,
        message: 'تم بدء مزامنة الكتالوج بنجاح',
        syncId: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        merchantId,
        startedAt: new Date().toISOString(),
        ...result,
      };
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
        details: [error.message],
      });
    }
  }

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
  @ApiResponse({
    status: 200,
    description: 'حالة المزامنة',
    schema: {
      type: 'object',
      properties: {
        merchantId: { type: 'string', example: 'm_12345' },
        lastSync: {
          type: 'object',
          nullable: true,
          properties: {
            syncId: { type: 'string', example: 'sync_66f1a2b3c4d5e6f7g8h9i0j' },
            startedAt: { type: 'string', example: '2023-09-18T10:30:00Z' },
            completedAt: { type: 'string', example: '2023-09-18T10:45:00Z' },
            status: {
              type: 'string',
              enum: ['pending', 'running', 'completed', 'failed'],
              example: 'completed',
            },
            imported: { type: 'number', example: 150 },
            updated: { type: 'number', example: 25 },
            failed: { type: 'number', example: 3 },
          },
        },
        stats: {
          type: 'object',
          properties: {
            totalProducts: { type: 'number', example: 175 },
            lastUpdated: { type: 'string', example: '2023-09-18T10:45:00Z' },
            source: {
              type: 'string',
              enum: ['zid', 'salla', 'manual'],
              example: 'zid',
            },
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'معرف التاجر غير صحيح',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'التاجر غير موجود',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description: 'ليس لديك صلاحية للوصول إلى هذا الكتالوج',
    type: ErrorResponse,
  })
  async getSyncStatus(@Param('merchantId') merchantId: string) {
    // التحقق من صحة merchantId
    if (!merchantId || !merchantId.startsWith('m_')) {
      throw new BadRequestException({
        code: 'INVALID_MERCHANT_ID',
        message: 'معرف التاجر يجب أن يبدأ بـ m_',
        details: ['merchantId must start with m_'],
      });
    }

    try {
      // هنا يمكن إضافة منطق للحصول على حالة المزامنة من قاعدة البيانات
      // في الوقت الحالي نعيد استجابة ثابتة
      return {
        merchantId,
        lastSync: {
          syncId: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          startedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 دقيقة مضت
          completedAt: new Date().toISOString(),
          status: 'completed',
          imported: 150,
          updated: 25,
          failed: 3,
        },
        stats: {
          totalProducts: 175,
          lastUpdated: new Date().toISOString(),
          source: 'zid',
        },
      };
    } catch (error) {
      throw new BadRequestException({
        code: 'STATUS_RETRIEVAL_FAILED',
        message: 'فشل في الحصول على حالة المزامنة',
        details: [error.message],
      });
    }
  }

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
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['week', 'month', 'quarter', 'year'],
    example: 'month',
    description: 'الفترة الزمنية للإحصائيات',
  })
  @ApiResponse({
    status: 200,
    description: 'إحصائيات الكتالوج',
    schema: {
      type: 'object',
      properties: {
        merchantId: { type: 'string', example: 'm_12345' },
        period: { type: 'string', example: 'month' },
        overview: {
          type: 'object',
          properties: {
            totalProducts: { type: 'number', example: 175 },
            activeProducts: { type: 'number', example: 165 },
            inactiveProducts: { type: 'number', example: 10 },
            totalCategories: { type: 'number', example: 12 },
            lastSyncDate: { type: 'string', example: '2023-09-18T10:45:00Z' },
          },
        },
        syncHistory: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              date: { type: 'string', example: '2023-09-18' },
              imported: { type: 'number', example: 45 },
              updated: { type: 'number', example: 12 },
              failed: { type: 'number', example: 2 },
            },
          },
        },
        performance: {
          type: 'object',
          properties: {
            avgSyncTime: { type: 'number', example: 8.5 }, // بالدقائق
            successRate: { type: 'number', example: 96.7 }, // نسبة مئوية
            lastErrorCount: { type: 'number', example: 2 },
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'معرف التاجر غير صحيح أو فترة غير صحيحة',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'التاجر غير موجود',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description: 'ليس لديك صلاحية للوصول إلى إحصائيات هذا الكتالوج',
    type: ErrorResponse,
  })
  async getStats(
    @Param('merchantId') merchantId: string,
    @Query('period') period: 'week' | 'month' | 'quarter' | 'year' = 'month',
  ) {
    // التحقق من صحة merchantId
    if (!merchantId || !merchantId.startsWith('m_')) {
      throw new BadRequestException({
        code: 'INVALID_MERCHANT_ID',
        message: 'معرف التاجر يجب أن يبدأ بـ m_',
        details: ['merchantId must start with m_'],
      });
    }

    // التحقق من صحة الفترة
    const validPeriods = ['week', 'month', 'quarter', 'year'];
    if (!validPeriods.includes(period)) {
      throw new BadRequestException({
        code: 'INVALID_PERIOD',
        message: 'الفترة يجب أن تكون واحدة من: week, month, quarter, year',
        details: [`Valid periods: ${validPeriods.join(', ')}`],
      });
    }

    try {
      // هنا يمكن إضافة منطق للحصول على الإحصائيات من قاعدة البيانات
      // في الوقت الحالي نعيد استجابة ثابتة
      return {
        merchantId,
        period,
        overview: {
          totalProducts: 175,
          activeProducts: 165,
          inactiveProducts: 10,
          totalCategories: 12,
          lastSyncDate: new Date().toISOString(),
        },
        syncHistory: [
          {
            date: '2023-09-18',
            imported: 45,
            updated: 12,
            failed: 2,
          },
          {
            date: '2023-09-17',
            imported: 38,
            updated: 15,
            failed: 1,
          },
          {
            date: '2023-09-16',
            imported: 52,
            updated: 8,
            failed: 0,
          },
        ],
        performance: {
          avgSyncTime: 8.5,
          successRate: 96.7,
          lastErrorCount: 2,
        },
      };
    } catch (error) {
      throw new BadRequestException({
        code: 'STATS_RETRIEVAL_FAILED',
        message: 'فشل في الحصول على الإحصائيات',
        details: [error.message],
      });
    }
  }
}
