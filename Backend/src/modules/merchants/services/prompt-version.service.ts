// src/modules/merchants/services/prompt-version.service.ts

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MerchantDocument } from '../schemas/merchant.schema';

@Injectable()
export class PromptVersionService {
  constructor(
    @InjectModel('Merchant')
    private readonly merchantModel: Model<MerchantDocument>,
  ) {}

  /** يحفظ نسخة متقدمة حالية في سجل history قبل التعديل */
  async snapshot(merchantId: string, note?: string) {
    const m = await this.merchantModel.findById(merchantId);
    if (!m) throw new NotFoundException('Merchant not found');

    if (!Array.isArray(m.advancedConfigHistory)) {
      m.advancedConfigHistory = [];
    }

    const currentTpl = m.currentAdvancedConfig?.template?.trim();
    if (currentTpl) {
      m.advancedConfigHistory.push({
        template: currentTpl,
        note,
        updatedAt: new Date(),
      });
      await m.save();
    }
  }

  /** يعيد قائمة سجل القوالب المتقدمة */
  async list(merchantId: string) {
    const m = await this.merchantModel
      .findById(merchantId, 'advancedConfigHistory')
      .lean();
    if (!m) throw new NotFoundException('Merchant not found');
    return Array.isArray(m.advancedConfigHistory)
      ? m.advancedConfigHistory
      : [];
  }

  /**
   * التراجع إلى نسخة سابقة بواسطة مؤشرها في المصفوفة
   * @param versionIndex رقم المؤشر (0-based)
   */
  async revert(merchantId: string, versionIndex: number) {
    const m = await this.merchantModel.findById(merchantId);
    if (!m) throw new NotFoundException('Merchant not found');

    const history = Array.isArray(m.advancedConfigHistory)
      ? m.advancedConfigHistory
      : [];

    if (versionIndex < 0 || versionIndex >= history.length) {
      throw new BadRequestException('Invalid version index');
    }

    // أولًا، خزن النسخة الحالية كسجل
    await this.snapshot(merchantId, 'Revert snapshot');

    // ثمّ استرجع القالب من history وقم بالتطبيق
    const version = history[versionIndex];
    m.currentAdvancedConfig.template = version.template;
    m.currentAdvancedConfig.updatedAt = new Date();
    m.currentAdvancedConfig.note = version.note;
    await m.save();
  }
}
