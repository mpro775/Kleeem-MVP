// ملف جديد src/chat/public-chat-widget.controller.ts
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { ChatWidgetService } from './chat-widget.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { Public } from 'src/common/decorators/public.decorator';
@UseGuards(JwtAuthGuard)
@ApiTags('ودجة الدردشة (عام)')
@Controller('public/chat-widget')
export class PublicChatWidgetController {
  constructor(private readonly svc: ChatWidgetService) {}

    @Get(':widgetSlug')
  @Public()
  @ApiOperation({ 
    summary: 'الحصول على إعدادات الودجة العامة',
    description: 'يُرجع إعدادات الودجة العامة بناءً على الـ slug الخاص بها. هذه نقطة نهاية عامة ولا تتطلب مصادقة.'
  })
  @ApiParam({ name: 'widgetSlug', description: 'الـ slug الفريد للودجة', example: 'widget-slug-123' })
  @ApiResponse({ status: 200, description: 'تم العثور على إعدادات الودجة.' })
  @ApiResponse({ status: 404, description: 'لم يتم العثور على ودجة بهذا الـ slug.' })
  getByWidgetSlug(@Param('widgetSlug') widgetSlug: string) {
    return this.svc.getSettingsBySlugOrPublicSlug(widgetSlug);
  }
  
}
