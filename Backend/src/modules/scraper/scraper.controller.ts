import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ScraperService } from './scraper.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiBody,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';

class ScrapeUrlDto {
  url: string;
}

@ApiTags('المُعالج')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('scraper')
export class ScraperController {
  constructor(private readonly scraperService: ScraperService) {}

  @Post('run')
  @ApiOperation({ summary: 'تشغيل استخراج بيانات منتج من رابط (محمي)' })
  @ApiBody({
    type: ScrapeUrlDto,
    description: 'رابط صفحة المنتج المطلوب استخلاص بياناته',
  })
  @ApiOkResponse({
    description: 'تم استخراج بيانات المنتج بنجاح',
    schema: {
      example: {
        name: 'اسم المنتج',
        price: 'سعر المنتج',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'طلب غير صالح: الرابط غير صحيح أو مفقود',
  })
  @ApiUnauthorizedResponse({
    description: 'غير مصرح: توكن JWT غير صالح أو مفقود',
  })
  @ApiInternalServerErrorResponse({
    description: 'خطأ في الخادم أثناء عملية الاستخلاص',
  })
  @HttpCode(HttpStatus.OK)
  async runScraping(@Body() dto: ScrapeUrlDto) {
    return this.scraperService.scrapeProduct(dto.url);
  }
}

/**
 * النواقص:
 * - يمكن توثيق حالات 404 إذا كان الرابط يؤدي لصفحة غير موجودة.
 * - إضافة مثال للخطأ في ApiInternalServerErrorResponse لعرض بنية رسالة الخطأ.
 * - توصيف ResponseDto مفصّل إذا كان يحتوي على حقول إضافية مثل images أو description.
 */
