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
  BadRequestException
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiQuery,
  ApiBody,
  ApiBearerAuth
} from '@nestjs/swagger';
import { VectorService } from './vector.service';
import { SemanticRequestDto } from './dto/semantic-request.dto';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

/**
 * واجهة تحكم البحث الدلالي
 * تتعامل مع عمليات البحث عن المنتجات باستخدام النماذج اللغوية
 */
@ApiTags('البحث الدلالي')
@Controller('vector')
@ApiBearerAuth()
export class VectorController {
  constructor(private readonly vector: VectorService) {}

  /**
   * البحث عن منتجات مشابهة باستخدام POST
   * يستخدم هذا النهج عند إرسال بيانات البحث في body الطلب
   */
  @Post('products')
  @Public()
  @ApiOperation({
    summary: 'البحث عن منتجات مشابهة (POST)',
    description: 'يبحث عن منتجات مشابهة بناءً على نص البحث باستخدام body الطلب',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'تم العثور على منتجات مشابهة بنجاح',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'بيانات الطلب غير صالحة',
  })
  @ApiBody({ type: SemanticRequestDto })
  async semanticSProducts(@Body() dto: SemanticRequestDto) {
    try {
      const recs = await this.vector.querySimilarProducts(
        dto.text,
        dto.merchantId,
        dto.topK,
      );
      return { 
        success: true,
        data: {
          recommendations: recs,
          count: recs.length,
          query: dto.text
        }
      };
    } catch (error) {
      throw new BadRequestException({
        success: false,
        message: 'فشل في معالجة طلب البحث',
        error: error.message,
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
    summary: 'البحث عن منتجات مشابهة (GET)',
    description: 'يبحث عن منتجات مشابهة بناءً على معايير البحث في استعلام URL',
  })
  @ApiQuery({
    name: 'text',
    required: true,
    description: 'نص البحث عن المنتجات',
    example: 'هاتف ذكي بمواصفات عالية',
  })
  @ApiQuery({
    name: 'merchantId',
    required: true,
    description: 'معرف التاجر',
    example: '60d21b4667d0d8992e610c85',
  })
  @ApiQuery({
    name: 'topK',
    required: false,
    description: 'عدد النتائج المطلوبة (بين 1 و 50)',
    example: '5',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'تم العثور على منتجات مشابهة بنجاح',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'بيانات الطلب غير صالحة',
  })
  async semanticSearchProductsByQuery(
    @Query('text') text: string,
    @Query('merchantId') merchantId: string,
    @Query(
      'topK', 
      new DefaultValuePipe(5), 
      new ParseIntPipe({ errorHttpStatusCode: HttpStatus.BAD_REQUEST })
    ) topK = 5,
  ) {
    if (!text || !merchantId) {
      throw new BadRequestException({
        success: false,
        message: 'يجب توفير نص البحث ومعرف التاجر',
      });
    }

    if (topK < 1 || topK > 50) {
      throw new BadRequestException({
        success: false,
        message: 'يجب أن يكون عدد النتائج بين 1 و 50',
      });
    }

    try {
      const recs = await this.vector.querySimilarProducts(
        text,
        merchantId,
        topK,
      );
      return { 
        success: true,
        data: {
          recommendations: recs,
          count: recs.length,
          query: text
        }
      };
    } catch (error) {
      throw new BadRequestException({
        success: false,
        message: 'فشل في معالجة طلب البحث',
        error: error.message,
      });
    }
  }

  /**
   * بحث موحد في جميع أنواع البيانات
   * يبحث في المنتجات والفئات والعلامات التجارية
   */
  @Post('unified-search')
  @Public()
  @ApiOperation({
    summary: 'بحث موحد في جميع أنواع البيانات',
    description: 'يبحث في المنتجات والفئات والعلامات التجارية معًا',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['merchantId', 'query'],
      properties: {
        merchantId: {
          type: 'string',
          description: 'معرف التاجر',
          example: '60d21b4667d0d8992e610c85',
        },
        query: {
          type: 'string',
          description: 'نص البحث',
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
    description: 'تمت عملية البحث بنجاح',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'بيانات الطلب غير صالحة',
  })
  async unifiedSearch(
    @Body('merchantId') merchantId: string,
    @Body('query') query: string,
    @Body('topK') topK = 5,
  ) {
    if (!merchantId || !query) {
      throw new BadRequestException({
        success: false,
        message: 'يجب توفير معرف التاجر ونص البحث',
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
    } catch (error) {
      throw new BadRequestException({
        success: false,
        message: 'فشل في معالجة طلب البحث',
        error: error.message,
      });
    }
  }
}
