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

import { StorefrontService } from '../../storefront/storefront.service';
import { AdvancedTemplateDto } from '../dto/requests/advanced-template.dto';
import { PreviewPromptDto } from '../dto/requests/preview-prompt.dto';
import { QuickConfigDto } from '../dto/requests/quick-config.dto';
import { MerchantsService } from '../merchants.service';
import { MerchantDocument } from '../schemas/merchant.schema';
import { QuickConfig } from '../schemas/quick-config.schema';
import { PromptBuilderService } from '../services/prompt-builder.service'; // إذا ستستخدمها هنا
import { PromptPreviewService } from '../services/prompt-preview.service';
import { PromptVersionService } from '../services/prompt-version.service';

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
  async getQuickConfig(@Param('id') id: string): Promise<QuickConfigDto> {
    const m = await this.merchantSvc.findOne(id);
    return (m as unknown as { quickConfig: QuickConfigDto }).quickConfig;
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
  async getAdvancedTemplate(
    @Param('id') id: string,
  ): Promise<{ template: string; note: string }> {
    const m = await this.merchantSvc.findOne(id);
    const merchantDoc = m as unknown as {
      currentAdvancedConfig: { template: string; note: string };
    };
    return {
      template: merchantDoc.currentAdvancedConfig.template,
      note: merchantDoc.currentAdvancedConfig.note,
    };
  }

  @Post('advanced-template')
  @ApiOperation({ summary: 'حفظ قالب متقدّم جديد (وإنشاء نسخة احتياطية)' })
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @ApiResponse({ status: 200 })
  async saveAdvancedTemplate(
    @Param('id') id: string,
    @Body() dto: AdvancedTemplateDto,
  ): Promise<{ message: string }> {
    const tpl = dto.template?.trim();
    if (!tpl) throw new BadRequestException('template is required');
    await this.versionSvc.snapshot(id, dto.note);
    await this.merchantSvc.saveAdvancedVersion(id, tpl, dto.note);
    return { message: 'Advanced template saved' };
  }

  @Get('advanced-versions')
  @ApiOperation({ summary: 'جلب سجلّ نسخ القالب المتقدّم' })
  async listVersions(
    @Param('id') id: string,
  ): Promise<{ template: string; note?: string; updatedAt: Date }[]> {
    return this.versionSvc.list(id);
  }

  @Post('advanced-versions/:index/revert')
  @ApiOperation({ summary: 'التراجع إلى نسخة سابقة حسب المؤشر' })
  async revertVersion(
    @Param('id') id: string,
    @Param('index', ParseIntPipe) index: number,
  ): Promise<{ message: string }> {
    await this.versionSvc.revert(id, index);
    return { message: `Reverted to version ${index}` };
  }

  @Post('preview')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async preview(
    @Param('id') id: string,
    @Body() dto: PreviewPromptDto,
  ): Promise<{ preview: string }> {
    const m = await this.merchantSvc.findOne(id);

    // 1) خذ نسخة Plain من المستند
    const merchantDoc = m as unknown as { toObject: () => MerchantDocument };
    const base = merchantDoc.toObject ? merchantDoc.toObject() : merchantDoc;

    // 2) ادمج quickConfig القادم من الفرونت (بدون حفظ)
    const mergedConfig = {
      ...((base as unknown as { quickConfig?: QuickConfig }).quickConfig || {}),
      ...(dto.quickConfig || {}),
    };

    // 3) ابنِ نسخة تاجر مؤقتة تُمرَّر للمبنّي
    const tempMerchant = {
      ...base,
      quickConfig: mergedConfig,
    } as unknown as MerchantDocument;

    // 4) اختر القالب (متقدم أو سريع)

    const rawTpl: string =
      dto.useAdvanced &&
      (base as unknown as { currentAdvancedConfig?: { template: string } })
        .currentAdvancedConfig?.template
        ? (base as unknown as { currentAdvancedConfig: { template: string } })
            .currentAdvancedConfig.template
        : this.promptBuilder.buildFromQuickConfig(tempMerchant);

    // 5) (مهم) مرّر سياق كامل لِـ Handlebars لكي يرى merchantName/quickConfig
    const ctx: Record<string, unknown> = {
      merchantName: (base as unknown as { name: string }).name,
      categories:
        (base as unknown as { categories?: string[] }).categories ?? [],
      quickConfig: mergedConfig,
      ...(dto.testVars || {}),
    };

    const preview = this.previewSvc.preview(rawTpl, ctx);
    return { preview };
  }

  @Get('final-prompt')
  @ApiOperation({ summary: 'جلب الـ finalPrompt النص النهائي' })
  @ApiResponse({ status: 200, schema: { example: { prompt: '...' } } })
  async finalPrompt(@Param('id') id: string): Promise<{ prompt: string }> {
    const m = await this.merchantSvc.findOne(id);
    const merchantDoc = m as unknown as { finalPromptTemplate: string };
    if (!merchantDoc.finalPromptTemplate)
      throw new BadRequestException('Final prompt not configured');
    return { prompt: merchantDoc.finalPromptTemplate };
  }
}
