import {
  Body,
  Controller,
  Get,
  Put,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';

import { BotRuntimeSettings } from './botRuntimeSettings.schema';
import { UpdateBotRuntimeSettingsDto } from './dto/update-settings.dto';
import { SettingsService } from './settings.service';

/**
 * واجهة برمجة التطبيقات لإدارة إعدادات تشغيل بوت المحادثة
 * تتيح هذه النقاط النهائية إدارة الإعدادات المختلفة للبوت مثل الروابط والنصوص المخصصة
 */
@ApiTags('كليم - إعدادات البوت')
@ApiBearerAuth()
@Controller('admin/kleem/settings/chat')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class SettingsController {
  constructor(private readonly svc: SettingsService) {}

  /**
   * استرجاع إعدادات تشغيل البوت الحالية
   * @returns إعدادات تشغيل البوت
   */
  @Get()
  @ApiOperation({
    summary: 'استرجاع إعدادات البوت',
    description: 'استرجاع كافة إعدادات تشغيل البوت الحالية',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'تم استرجاع الإعدادات بنجاح',
    type: BotRuntimeSettings,
  })
  @ApiUnauthorizedResponse({ description: 'غير مصرح - يلزم تسجيل الدخول' })
  @ApiForbiddenResponse({ description: 'غير مصرح - لا تملك الصلاحيات الكافية' })
  async get(): Promise<BotRuntimeSettings> {
    return this.svc.get();
  }

  /**
   * تحديث إعدادات تشغيل البوت
   * @param dto كائن يحتوي على الإعدادات المطلوب تحديثها
   * @returns الإعدادات المحدثة
   */
  @Put()
  @ApiOperation({
    summary: 'تحديث إعدادات البوت',
    description: 'تحديث إعدادات تشغيل البوت. يمكن تحديث بعض أو كل الحقول.',
  })
  @ApiBody({
    description: 'بيانات الإعدادات المطلوب تحديثها',
    type: UpdateBotRuntimeSettingsDto,
    required: true,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'تم تحديث الإعدادات بنجاح',
    type: BotRuntimeSettings,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'بيانات غير صالحة',
  })
  @ApiUnauthorizedResponse({ description: 'غير مصرح - يلزم تسجيل الدخول' })
  @ApiForbiddenResponse({ description: 'غير مصرح - لا تملك الصلاحيات الكافية' })
  async update(
    @Body() dto: UpdateBotRuntimeSettingsDto,
  ): Promise<BotRuntimeSettings> {
    return this.svc.update(dto);
  }
}
