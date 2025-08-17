// src/modules/merchants/controllers/merchant-prompt.controller.ts

import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  ParseIntPipe,
  ValidationPipe,
  UsePipes,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MerchantsService } from '../merchants.service';
import { PromptVersionService } from '../services/prompt-version.service';
import { PromptPreviewService } from '../services/prompt-preview.service';
import { QuickConfigDto } from '../dto/quick-config.dto';
import { AdvancedTemplateDto } from '../dto/advanced-template.dto';
import { PreviewPromptDto } from '../dto/preview-prompt.dto';
import { MerchantDocument } from '../schemas/merchant.schema';
import { StorefrontService } from '../../storefront/storefront.service';
import { PromptBuilderService } from '../services/prompt-builder.service'; // إذا ستستخدمها هنا

@ApiTags('Merchants • Prompt')
@Controller('merchants/:id/prompt')
export class MerchantPromptController {
  constructor(
    private readonly merchantSvc: MerchantsService,
    private readonly versionSvc: PromptVersionService,
    private readonly previewSvc: PromptPreviewService,
    private readonly storefrontService: StorefrontService, // أضف هذا
    private readonly promptBuilder: PromptBuilderService,
  ) {}

  @Get('quick-config')
  @ApiOperation({ summary: 'جلب إعدادات Quick Setup' })
  @ApiResponse({ status: 200, type: QuickConfigDto })
  async getQuickConfig(@Param('id') id: string) {
    const m = await this.merchantSvc.findOne(id);
    return m.quickConfig;
  }

  @Patch('quick-config')
  @ApiOperation({ summary: 'تحديث Quick Setup' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  @ApiResponse({ status: 200, type: QuickConfigDto })
  async updateQuickConfig(
    @Param('id') id: string,
    @Body() dto: QuickConfigDto,
  ): Promise<QuickConfigDto> {
    const updated = await this.merchantSvc.updateQuickConfig(id, dto);
    return updated;
  }

  @Get('advanced-template')
  @ApiOperation({ summary: 'جلب القالب المتقدّم' })
  @ApiResponse({ status: 200, type: AdvancedTemplateDto })
  async getAdvancedTemplate(@Param('id') id: string) {
    const m = await this.merchantSvc.findOne(id);
    return {
      template: m.currentAdvancedConfig.template,
      note: m.currentAdvancedConfig.note,
    };
  }

  @Post('advanced-template')
  @ApiOperation({ summary: 'حفظ قالب متقدّم جديد (وإنشاء نسخة احتياطية)' })
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @ApiResponse({ status: 200 })
  async saveAdvancedTemplate(
    @Param('id') id: string,
    @Body() dto: AdvancedTemplateDto,
  ) {
    const tpl = dto.template?.trim();
    if (!tpl) throw new BadRequestException('template is required');
    await this.versionSvc.snapshot(id, dto.note);
    await this.merchantSvc.saveAdvancedVersion(id, tpl, dto.note);
    return { message: 'Advanced template saved' };
  }

  @Get('advanced-versions')
  @ApiOperation({ summary: 'جلب سجلّ نسخ القالب المتقدّم' })
  async listVersions(@Param('id') id: string) {
    return this.versionSvc.list(id);
  }

  @Post('advanced-versions/:index/revert')
  @ApiOperation({ summary: 'التراجع إلى نسخة سابقة حسب المؤشر' })
  async revertVersion(
    @Param('id') id: string,
    @Param('index', ParseIntPipe) index: number,
  ) {
    await this.versionSvc.revert(id, index);
    return { message: `Reverted to version ${index}` };
  }

  @Post('preview')
  @ApiOperation({ summary: 'معاينة البرومبت مع متغيرات اختبارية' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  @ApiResponse({ status: 200, schema: { example: { preview: '...' } } })
  async preview(@Param('id') id: string, @Body() dto: PreviewPromptDto) {
    // جلب التاجر الأصلي
    const m = await this.merchantSvc.findOne(id);

    // دمج quickConfig الأصلي مع ما أرسله العميل (جزئيًّا)
    const mergedConfig = { ...m.quickConfig, ...(dto.quickConfig || {}) };

    // اصنع نسخة مؤقتة من التاجر مع الإعدادات المدموجة
    const tempMerchant = { ...m, quickConfig: mergedConfig };

    // اختر القالب: متقدم أم سريع
    const rawTpl =
      dto.useAdvanced && m.currentAdvancedConfig.template
        ? m.currentAdvancedConfig.template
        : this.promptBuilder.buildFromQuickConfig(
            tempMerchant as MerchantDocument,
          );

    // نفّذ المعاينة
    const preview = this.previewSvc.preview(rawTpl, dto.testVars);

    return { preview };
  }

  @Get('final-prompt')
  @ApiOperation({ summary: 'جلب الـ finalPrompt النص النهائي' })
  @ApiResponse({ status: 200, schema: { example: { prompt: '...' } } })
  async finalPrompt(@Param('id') id: string) {
    const m = await this.merchantSvc.findOne(id);
    if (!m.finalPromptTemplate)
      throw new BadRequestException('Final prompt not configured');
    return { prompt: m.finalPromptTemplate };
  }
}
