import { Injectable, Inject } from '@nestjs/common';
import * as Handlebars from 'handlebars';

import { MerchantsRepository } from '../repositories/merchants.repository';
import { MerchantDocument } from '../schemas/merchant.schema';
import { QuickConfig } from '../schemas/quick-config.schema';

import { PromptBuilderService } from './prompt-builder.service';
import { buildHbsContext, stripGuardSections } from './prompt-utils';
import { PromptVersionService } from './prompt-version.service';

@Injectable()
export class MerchantPromptService {
  constructor(
    private readonly versions: PromptVersionService,
    private readonly promptBuilder: PromptBuilderService,
    @Inject('MerchantsRepository')
    private readonly repo: MerchantsRepository,
  ) {}

  async saveAdvancedVersion(
    id: string,
    newTpl: string,
    note?: string,
  ): Promise<void> {
    await this.versions.snapshot(id, note);
    const m = await this.repo.findOne(id);
    m.currentAdvancedConfig.template = newTpl;
    await m.save?.();
  }

  async listAdvancedVersions(
    id: string,
  ): Promise<{ template: string; note?: string; updatedAt: Date }[]> {
    return this.versions.list(id);
  }

  async revertAdvancedVersion(id: string, index: number): Promise<void> {
    return this.versions.revert(id, index);
  }

  async previewPromptV2(
    id: string,
    dto: {
      quickConfig?: Record<string, unknown>;
      testVars?: Record<string, unknown>;
      audience?: 'merchant' | 'agent';
    },
  ): Promise<string> {
    const m = await this.repo.findOne(id);
    const merged = (m.toObject ? m.toObject() : m) as MerchantDocument;

    if (dto.quickConfig && Object.keys(dto.quickConfig).length) {
      merged.quickConfig = {
        ...merged.quickConfig,
        ...(dto.quickConfig as Partial<QuickConfig>),
      } as QuickConfig;
    }

    const ctx = buildHbsContext(merged, dto.testVars ?? {});
    const audience = dto.audience ?? 'merchant';

    const withGuard = await this.promptBuilder.compileTemplate(merged);

    if (audience === 'agent') {
      return Handlebars.compile(withGuard)(ctx);
    }

    const noGuard = stripGuardSections(withGuard);
    return Handlebars.compile(noGuard)(ctx);
  }

  async getAdvancedTemplateForEditor(
    id: string,
    testVars: Record<string, string> = {},
  ): Promise<{ template: string; note?: string }> {
    const m = await this.repo.findOne(id);

    const current = m.currentAdvancedConfig?.template?.trim() ?? '';
    if (current) {
      return {
        template: current,
        note: m.currentAdvancedConfig?.note ?? '',
      };
    }

    const finalWithGuard = await this.promptBuilder.compileTemplate(m);
    const noGuard = stripGuardSections(finalWithGuard);

    const filled = Handlebars.compile(noGuard)(buildHbsContext(m, testVars));

    return { template: filled, note: 'Generated from final (no guard)' };
  }
}
