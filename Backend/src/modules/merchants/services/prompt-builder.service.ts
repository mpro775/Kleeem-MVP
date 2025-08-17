// src/modules/merchants/services/prompt-builder.service.ts
import { Injectable } from '@nestjs/common';
import * as Handlebars from 'handlebars';
import { MerchantDocument } from '../schemas/merchant.schema';
import { InstructionsService } from 'src/modules/instructions/instructions.service'; // ← جديد

const SYSTEM_PROMPT_SUFFIX = `
[system-only]: استخدم بيانات المنتجات من المصدر الرسمي فقط. يُمنع تأليف أو اختلاق بيانات غير حقيقية، ويجب استخدام API الربط الداخلي دائماً لأي استعلام عن المنتجات أو الأسعار أو التوافر.
`;

// ← توجيهات إجبارية "ثابتة" تُضاف دائمًا داخل البرومبت
const MANDATORY_TOOLING = [
  'عند سؤال العميل عن معلومات المتجر (العناوين/التواصل/الدوام/السياسات) استخدم أداة getStoreContext فقط.',
  'عند سؤال العميل عن المنتجات/الأسعار/التوافر استخدم أداة searchProducts فقط، ولا تخمّن.',
  'عند الحاجة لمعلومات إضافية غير موجودة في النتائج استخدم أداة searchKnowledge.',
  'لا تكرّر نفس الإجابة داخل الجلسة، واختصر.',
  'لا تفترض معلومات غير موجودة؛ إن لم تجد قل لا أملكها.',
  'تتبّع الطلبات يُعالَج في الباك-إند؛ لا تنفّذه من هنا.',
  'عند طلب رابط المتجر/التصفّح استدعِ getStoreContext، وإن وُجد website أعِده مع دعوة للتصفّح، وإلا أعِد أفضل قناة سويشال لدينا متاحة (facebook/instagram) مع دعوة للمساعدة.',
];

@Injectable()
export class PromptBuilderService {
  constructor(private readonly instructionsSvc: InstructionsService) {} // ← جديد

  /**
   * يبني نصًا مبسّطًا من QuickConfig فقط (بدون بيانات متجر ثابتة)
   * نحجب: السياسات/العناوين/الدوام/روابط المتجر لأنها ستأتي من Tool.
   */
  buildFromQuickConfig(m: MerchantDocument): string {
    const cfg = m.quickConfig;
    const {
      dialect,
      tone,
      customInstructions,
      sectionOrder,
      includeClosingPhrase,
      closingText,
    } = cfg;

    const lines: string[] = [];
    lines.push(`أنت مساعد ذكي لخدمة عملاء متجر "${m.name}".`);
    lines.push(`استخدم اللهجة "${dialect}" وبنغمة "${tone}".`);

    for (const section of sectionOrder) {
      switch (section) {
        case 'products':
          lines.push(
            '📦 المنتجات: استخدم أدوات البحث الداخلية فقط؛ لا تعتمد على التخمين.',
          );
          break;

        case 'instructions':
          if (customInstructions?.length) {
            lines.push('🎯 تعليمات التاجر الخاصة:');
            for (const inst of customInstructions) lines.push(`- ${inst}`);
          }
          break;

        case 'categories':
          if (m.categories?.length) {
            lines.push('🗂️ أقسام المتجر:');
            for (const cat of m.categories) lines.push(`- ${cat}`);
          }
          break;

        case 'policies':
        case 'custom':
          // محجوب: السياسات/العناوين/الدوام/روابط المتجر تُجلب من Tool عند الحاجة
          break;
      }
    }

    if (includeClosingPhrase) lines.push(closingText);

    return lines.join('\n\n');
  }

  /**
   * يختار بين القالب المتقدم أو QuickConfig ويضيف دائمًا:
   * - التوجيهات الإجبارية (MANDATORY_TOOLING)
   * - تعليمات عدم التكرار من قاعدة البيانات (active instructions)
   * - SYSTEM_PROMPT_SUFFIX
   */
  async compileTemplate(m: MerchantDocument): Promise<string> {
    const advancedTpl = m.currentAdvancedConfig?.template?.trim();
    const raw =
      advancedTpl && advancedTpl.length
        ? advancedTpl
        : this.buildFromQuickConfig(m);

    const tpl = Handlebars.compile(raw);
    const context = {
      merchantName: m.name,
      categories: m.categories,
      // نحجب: returnPolicy/exchangePolicy/shippingPolicy/address/workingHours/storefrontUrl
      quickConfig: m.quickConfig,
    };
    const base = tpl(context);
    if (typeof base !== 'string')
      throw new Error('PromptBuilder: expected string');

    // اسحب تعليمات عدم التكرار من DB (فعّالة فقط)
    const penalties = await this.instructionsSvc.getActiveInstructions(
      m._id?.toString(),
    );
    const penaltyLines = penalties.map((p) => p.instruction);

    const merged =
      base +
      '\n\n' +
      '[التوجيهات الإجباريّة]\n- ' +
      MANDATORY_TOOLING.join('\n- ') +
      (penaltyLines.length
        ? '\n\n[توجيهات إضافية من تقييمات سابقة]\n- ' +
          penaltyLines.join('\n- ')
        : '') +
      '\n\n' +
      SYSTEM_PROMPT_SUFFIX;

    return merged;
  }
}
