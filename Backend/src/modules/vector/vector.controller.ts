// src/vector/vector.controller.ts
import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { IdempotencyGuard } from 'src/common/guards/idempotency.guard';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { ServiceTokenGuard } from 'src/common/guards/service-token.guard';

import { Public } from '../../common/decorators/public.decorator';
import { TranslationService } from '../../common/services/translation.service';

import { SemanticRequestDto } from './dto/semantic-request.dto';
import { VectorService } from './vector.service';

/**
 * واجهة تحكم البحث الدلالي
 * تتعامل مع عمليات البحث عن المنتجات باستخدام النماذج اللغوية
 */
@UseGuards(JwtAuthGuard)
@ApiTags('vector')
@Controller('vector')
@ApiBearerAuth()
export class VectorController {
  constructor(
    private readonly vector: VectorService,
    private readonly translationService: TranslationService,
  ) {}

  /**
   * البحث عن منتجات مشابهة باستخدام POST
   * يستخدم هذا النهج عند إرسال بيانات البحث في body الطلب
   */
  @Post('products')
  @Public()
  @ApiOperation({
    summary: 'vector.operations.semanticProductsPost.summary',
    description: 'vector.operations.semanticProductsPost.description',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'vector.responses.success.found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'vector.responses.error.badRequest',
  })
  @ApiBody({ type: SemanticRequestDto })
  async semanticSProducts(@Body() dto: SemanticRequestDto): Promise<{
    success: boolean;
    data: {
      recommendations: unknown[];
      count: number;
      query: string;
    };
  }> {
    try {
      const recs = (await this.vector.querySimilarProducts(
        dto.text,
        dto.merchantId,
        dto.topK,
      )) as unknown[];
      return {
        success: true,
        data: {
          recommendations: recs,
          count: recs.length,
          query: dto.text,
        },
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException({
        success: false,
        message: 'vector.responses.error.searchFailed',
        error: errorMessage,
      });
    }
  }

  /**
   * البحث عن منتجات مشابهة باستخدام GET
   * يستخدم هذا النهج عند إرسال معايير البحث كاستعلامات URL
   */
  @Get('products')
  @Public()
  @ApiOperation({
    summary: 'vector.operations.semanticProductsGet.summary',
    description: 'vector.operations.semanticProductsGet.description',
  })
  @ApiQuery({
    name: 'text',
    required: true,
    description: 'vector.fields.text',
    example: 'هاتف ذكي بمواصفات عالية',
  })
  @ApiQuery({
    name: 'merchantId',
    required: true,
    description: 'vector.fields.merchantId',
    example: '60d21b4667d0d8992e610c85',
  })
  @ApiQuery({
    name: 'topK',
    required: false,
    description: 'vector.fields.topK',
    example: '5',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'vector.responses.success.found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'vector.responses.error.badRequest',
  })
  async semanticSearchProductsByQuery(
    @Query('text') text: string,
    @Query('merchantId') merchantId: string,
    @Query(
      'topK',
      new DefaultValuePipe(5),
      new ParseIntPipe({ errorHttpStatusCode: HttpStatus.BAD_REQUEST }),
    )
    topK = 5,
  ): Promise<{
    success: boolean;
    data: {
      recommendations: unknown[];
      count: number;
      query: string;
    };
  }> {
    if (!text || !merchantId) {
      throw new BadRequestException({
        success: false,
        message: 'vector.responses.error.missingParams',
      });
    }

    if (topK < 1 || topK > 10) {
      throw new BadRequestException({
        success: false,
        message: 'vector.responses.error.invalidTopK',
      });
    }

    try {
      const recs = (await this.vector.querySimilarProducts(
        text,
        merchantId,
        topK,
      )) as unknown[];
      return {
        success: true,
        data: {
          recommendations: recs,
          count: recs.length,
          query: text,
        },
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException({
        success: false,
        message: 'vector.responses.error.searchFailed',
        error: errorMessage,
      });
    }
  }

  /**
   * بحث موحد في جميع أنواع البيانات
   * يبحث في المنتجات والفئات والعلامات التجارية
   */
  @UseGuards(ServiceTokenGuard, IdempotencyGuard)
  @Post('unified-search')
  @Public()
  @ApiOperation({
    summary: 'vector.operations.unifiedSearch.summary',
    description: 'vector.operations.unifiedSearch.description',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['merchantId', 'query'],
      properties: {
        merchantId: {
          type: 'string',
          description: 'vector.fields.merchantId',
          example: '60d21b4667d0d8992e610c85',
        },
        query: {
          type: 'string',
          description: 'vector.fields.query',
          example: 'هاتف ذكي',
        },
        topK: {
          type: 'number',
          description: 'عدد النتائج المطلوبة (اختياري)',
          default: 5,
          minimum: 1,
          maximum: 20,
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'vector.responses.success.searchCompleted',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'vector.responses.error.badRequest',
  })
  async unifiedSearch(
    @Body('merchantId') merchantId: string,
    @Body('query') query: string,
    @Body('topK') topK = 5,
  ): Promise<{
    success: boolean;
    data: {
      results: unknown[];
      count: number;
      query: string;
    };
  }> {
    if (!merchantId || !query) {
      throw new BadRequestException({
        success: false,
        message: 'vector.responses.error.missingMerchantQuery',
      });
    }

    const k = Math.min(Math.max(1, Number(topK) || 5), 20);

    try {
      const results = await this.vector.unifiedSemanticSearch(
        query,
        merchantId,
        k,
      );

      return {
        success: true,
        data: {
          results,
          count: results.length,
          query,
        },
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException({
        success: false,
        message: 'vector.responses.error.searchFailed',
        error: errorMessage,
      });
    }
  }
}
