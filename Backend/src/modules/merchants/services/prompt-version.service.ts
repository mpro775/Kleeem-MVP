import { Injectable, BadRequestException, Inject } from '@nestjs/common';

import { PromptVersionRepository } from '../repositories/prompt-version.repository';

@Injectable()
export class PromptVersionService {
  constructor(
    @Inject('PromptVersionRepository')
    private readonly repo: PromptVersionRepository,
  ) {}

  /** يحفظ نسخة متقدمة حالية في سجل history قبل التعديل */
  async snapshot(merchantId: string, note?: string): Promise<void> {
    const m = await this.repo.getOrFail(merchantId);

    const currentTpl = m.currentAdvancedConfig?.template?.trim();
    if (currentTpl) {
      await this.repo.appendAdvancedHistory(merchantId, {
        template: currentTpl,
        note: note ?? '',
        updatedAt: new Date(),
      });
    }
  }

  /** يعيد قائمة سجل القوالب المتقدمة */
  async list(
    merchantId: string,
  ): Promise<{ template: string; note?: string; updatedAt: Date }[]> {
    return this.repo.getAdvancedHistory(merchantId);
  }

  /**
   * التراجع إلى نسخة سابقة بواسطة مؤشرها في المصفوفة
   * @param versionIndex رقم المؤشر (0-based)
   */
  async revert(merchantId: string, versionIndex: number): Promise<void> {
    // نتأكد من وجود التاجر
    await this.repo.getOrFail(merchantId);

    const history = await this.repo.getAdvancedHistory(merchantId);

    if (versionIndex < 0 || versionIndex >= history.length) {
      throw new BadRequestException('Invalid version index');
    }

    // خزن النسخة الحالية كسجل أولاً
    await this.snapshot(merchantId, 'Revert snapshot');

    // ثم طبّق النسخة المطلوبة على currentAdvancedConfig
    const version = history[versionIndex];
    await this.repo.setCurrentAdvancedConfig(merchantId, {
      template: version.template,
      updatedAt: new Date(),
      note: version.note ?? '',
    });
  }
}
