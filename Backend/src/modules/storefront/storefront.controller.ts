// src/storefront/storefront.controller.ts
import {
  Body,
  Controller,
  Post,
  Get,
  Param,
  Patch,
  UseGuards,
  Query,
  BadRequestException,
  UploadedFiles,
  UseInterceptors,
  Header,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiExtraModels,
  ApiConsumes,
} from '@nestjs/swagger';
import { StorefrontService } from './storefront.service';
import {
  CreateStorefrontDto,
  UpdateStorefrontDto,
  BannerDto,
} from './dto/create-storefront.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import {
  ApiSuccessResponse,
  ApiCreatedResponse as CommonApiCreatedResponse,
 
} from '../../common';
import { UpdateStorefrontByMerchantDto } from './dto/update-storefront-by-merchant.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
/**
 * واجهة تحكم المتجر
 * تتعامل مع عمليات إدارة واجهة المتجر وإعداداتها
 */
@ApiTags('واجهة المتجر')
@Controller('storefront')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiExtraModels(BannerDto)
export class StorefrontController {
  constructor(private svc: StorefrontService) {}
  @Public() @Get('merchant') badMerchantReq() {
    throw new BadRequestException('merchantId is required');
  }
  @Public() @Get('merchant/:merchantId') async findByMerchant(
    @Param('merchantId') merchantId: string,
  ) {
    return this.svc.findByMerchant(merchantId);
  }
  @Patch('merchant/:id') async update(
    @Param('id') id: string,
    @Body() dto: UpdateStorefrontDto,
  ) {
    return this.svc.update(id, dto);
  }
  @Patch('by-merchant/:merchantId') async updateByMerchant(
    @Param('merchantId') merchantId: string,
    @Body() dto: UpdateStorefrontByMerchantDto,
  ) {
    return this.svc.updateByMerchant(merchantId, dto);
  }

  @Public()
  @Get('slug/check')
  @ApiOperation({ summary: 'التحقق من توفر slug' })
  @ApiSuccessResponse(Object, 'نتيجة التحقق')
  async checkSlug(@Query('slug') slug: string) {
    if (!slug) throw new BadRequestException('slug مطلوب');
    return this.svc.checkSlugAvailable(slug);
  }
  @Get(':slugOrId')
  @Public()
  @ApiOperation({
    summary: 'البحث عن واجهة المتجر باستخدام Slug أو المعرف',
    description: 'يسترد إعدادات واجهة المتجر الخاصة بالمعرف أو Slug المحدد',
  })
  @ApiParam({
    name: 'slugOrId',
    required: true,
    description: 'Slug أو المعرف الخاص بواجهة المتجر',
    example: 'store-slug-or-id',
  })
  @ApiSuccessResponse(Object, 'تم العثور على إعدادات واجهة المتجر')
  @ApiResponse({
    status: 404,
    description: 'لم يتم العثور على إعدادات واجهة المتجر',
  })
  async storefront(@Param('slugOrId') slugOrId: string) {
    return this.svc.getStorefront(slugOrId);
  }
  @Post()
  @ApiOperation({
    summary: 'إنشاء واجهة متجر جديدة',
    description: 'ينشئ إعدادات واجهة متجر جديدة مع التخصيصات المطلوبة',
  })
  @CommonApiCreatedResponse(CreateStorefrontDto, 'تم إنشاء واجهة المتجر بنجاح')
  @ApiResponse({
    status: 400,
    description: 'بيانات الطلب غير صالحة',
  })
  @ApiResponse({
    status: 401,
    description: 'غير مصرح - يلزم تسجيل الدخول',
  })
  @ApiBody({
    type: CreateStorefrontDto,
    description: 'بيانات واجهة المتجر المطلوب إنشاؤها',
  })
  async create(@Body() dto: CreateStorefrontDto) {
    return this.svc.create(dto);
  }

  @Post('by-merchant/:merchantId/banners/upload')
  @ApiOperation({ summary: 'رفع صور البنرات (≤5 بنرات إجماليًا، ≤5MP للصورة)' })
  @ApiParam({ name: 'merchantId', required: true, description: 'معرف التاجر' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('files', 5)) // أقصى عدد بالطلب 5
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'صور البنرات (PNG/JPG/WEBP)',
        },
      },
      required: ['files'],
    },
  })
  async uploadBanners(
    @Param('merchantId') merchantId: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.svc.uploadBannerImagesToMinio(merchantId, files);
  }
  @Public()
  @Get('merchant/:merchantId/my-orders')
  @ApiOperation({ summary: 'جلب طلبات الزبون حسب الجلسة/الهاتف' })
  @ApiParam({ name: 'merchantId', description: 'معرّف التاجر' })
  async myOrders(
    @Param('merchantId') merchantId: string,
    @Query('sessionId') sessionId: string,
    @Query('phone') phone?: string,          // ✅ دعم الهاتف مباشرة من الطلب
    @Query('limit') limit = '50',
  ) {
    if (!merchantId || (!sessionId && !phone)) {
      throw new BadRequestException('merchantId و sessionId/phone مطلوبة');
    }
    const lim = Math.min(parseInt(limit, 10) || 50, 200);
    return this.svc.getMyOrdersForSession(merchantId, sessionId, phone, lim);
  }

  @Get('/public/storefront/:slug/brand.css')
  @Header('Content-Type', 'text/css')
  async getBrandCss(@Param('slug') slug: string) {
    return this.svc.getBrandCssBySlug(slug);
  }
}
