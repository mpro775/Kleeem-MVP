import {
  Controller,
  Get,
  Put,
  Post,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { ChatWidgetService } from './chat-widget.service';
import { UpdateWidgetSettingsDto } from './dto/update-widget-settings.dto';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { HandoffDto } from './dto/handoff.dto';
import { Public } from 'src/common/decorators/public.decorator';
import {
  ApiSuccessResponse,
  ApiCreatedResponse as CommonApiCreatedResponse,
} from '../../common';

@ApiTags('ودجة الدردشة')
@UseGuards(JwtAuthGuard, RolesGuard) // تأكد من أنك عدلت الـ Guards ليتحققوا من الصلاحيات
@ApiParam({
  name: 'merchantId',
  description: 'معرف التاجر',
  example: 'm_12345',
})
@Controller('merchants/:merchantId/widget-settings')
export class ChatWidgetController {
  constructor(private readonly svc: ChatWidgetService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'الحصول على إعدادات ودجة التاجر' })
  @ApiSuccessResponse(Object, 'تم العثور على الإعدادات.')
  @ApiResponse({ status: 404, description: 'لم يتم العثور على التاجر.' })
  getSettings(@Param('merchantId') merchantId: string) {
    return this.svc.getSettings(merchantId);
  }

  @Put()
  @Public()
  @ApiOperation({ summary: 'تحديث إعدادات ودجة التاجر' })
  @ApiBody({ type: UpdateWidgetSettingsDto })
  @ApiSuccessResponse(UpdateWidgetSettingsDto, 'تم تحديث الإعدادات بنجاح.')
  @ApiResponse({ status: 404, description: 'لم يتم العثور على التاجر.' })
  updateSettings(
    @Param('merchantId') merchantId: string,
    @Body() dto: UpdateWidgetSettingsDto,
  ) {
    return this.svc.updateSettings(merchantId, dto);
  }

  @Post('handoff')
  @ApiOperation({ summary: 'بدء محادثة مع موظف بشري' })
  @ApiBody({ type: HandoffDto })
  @CommonApiCreatedResponse(HandoffDto, 'تم بدء المحادثة البشرية بنجاح.')
  async handoff(
    @Param('merchantId') merchantId: string,
    @Body() dto: HandoffDto,
  ) {
    return this.svc.handleHandoff(merchantId, dto);
  }
  @Get('embed-settings')
  @Public()
  @ApiOperation({
    summary: 'الحصول على إعدادات التضمين (الوضع + رابط المشاركة)',
  })
  @ApiResponse({ status: 200, description: 'تم العثور على إعدادات التضمين.' })
  async getEmbedSettings(@Param('merchantId') merchantId: string) {
    return this.svc.getEmbedSettings(merchantId);
  }
  @Get('share-url')
  @Public()
  @ApiOperation({ summary: 'الحصول على رابط المشاركة للودجة' })
  @ApiResponse({ status: 200, description: 'تم إنشاء رابط المشاركة.' })
  async getShareUrl(@Param('merchantId') merchantId: string) {
    const settings = await this.svc.getSettings(merchantId);
    return { url: `http://localhost:5173/chat/${settings.widgetSlug}` };
  }
  @Post('slug')
  @Public()
  @ApiOperation({ summary: 'إنشاء slug فريد للودجة' })
  @ApiResponse({ status: 201, description: 'تم إنشاء الـ slug بنجاح.' })
  generateSlug(@Param('merchantId') merchantId: string) {
    return this.svc.generateWidgetSlug(merchantId);
  }

  @Put('embed-settings')
  @ApiOperation({ summary: 'تحديث وضع التضمين الافتراضي' })
  @ApiBody({
    type: UpdateWidgetSettingsDto,
    description: 'يتم قبول حقل embedMode فقط',
  })
  @ApiResponse({ status: 200, description: 'تم تحديث وضع التضمين بنجاح.' })
  async updateEmbedSettings(
    @Param('merchantId') merchantId: string,
    @Body() dto: UpdateWidgetSettingsDto,
  ) {
    // نقبِل فقط الحقل embedMode من dto
    return this.svc.updateEmbedSettings(merchantId, {
      embedMode: dto.embedMode,
    });
  }
}
