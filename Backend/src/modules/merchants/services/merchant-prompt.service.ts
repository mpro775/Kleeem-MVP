import { Injectable, Inject } from '@nestjs/common';
import { PromptVersionService } from './prompt-version.service';
import { PromptBuilderService } from './prompt-builder.service';
import { buildHbsContext, stripGuardSections } from './prompt-utils';
import * as Handlebars from 'handlebars';
import { MerchantsRepository } from '../repositories/merchants.repository';

@Injectable()
export class MerchantPromptService {
  constructor(
    private readonly versions: PromptVersionService,
    private readonly promptBuilder: PromptBuilderService,
    @Inject('MerchantsRepository')
    private readonly repo: MerchantsRepository,
  ) {}

  async saveAdvancedVersion(id: string, newTpl: string, note?: string) {
    await this.versions.snapshot(id, note);
    const m = await this.repo.findOne(id);
    (m as any).currentAdvancedConfig.template = newTpl;
    await (m as any).save?.();
  }

  async listAdvancedVersions(id: string) {
    return this.versions.list(id);
  }

  async revertAdvancedVersion(id: string, index: number) {
    return this.versions.revert(id, index);
  }

  async previewPromptV2(
    id: string,
    dto: {
      quickConfig?: Record<string, any>;
      testVars?: Record<string, any>;
      audience?: 'merchant' | 'agent';
    },
  ): Promise<string> {
    const m = await this.repo.findOne(id);
    const merged = (m as any).toObject ? (m as any).toObject() : m;

    if (dto.quickConfig && Object.keys(dto.quickConfig).length) {
      merged.quickConfig = { ...merged.quickConfig, ...dto.quickConfig };
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
  ) {
    const m = await this.repo.findOne(id);

    const current = (m as any).currentAdvancedConfig?.template?.trim() ?? '';
    if (current) {
      return {
        template: current,
        note: (m as any).currentAdvancedConfig?.note ?? '',
      };
    }

    const finalWithGuard = await this.promptBuilder.compileTemplate(m as any);
    const noGuard = stripGuardSections(finalWithGuard);

    const filled = Handlebars.compile(noGuard)(
      buildHbsContext(m as any, testVars),
    );

    return { template: filled, note: 'Generated from final (no guard)' };
  }
}
