// src/features/prompt-studio/types.ts

export interface QuickConfig {
  dialect: string; // لهجة
  tone: string; // نغمة
  customInstructions: string[]; // ≤ 5 × 80 char (نقصّها في الهوك قبل الإرسال)
  includeClosingPhrase: boolean; // عرض نص الخاتمة؟
  closingText: string; // نص الخاتمة
  customerServicePhone?: string; // (اختياري) هاتف خدمة العملاء
  customerServiceWhatsapp?: string; // (اختياري) واتساب خدمة العملاء
}

export interface PreviewPromptDto {
  quickConfig?: Partial<QuickConfig>;
  useAdvanced: boolean;
  testVars: Record<string, string>;
  audience: "merchant" | "agent";
}

export interface PreviewResponse {
  preview: string;
}

/**
 * مساواة بين تكوينين سريعَين (لمنع طلبات معاينة زائدة)
 * - تتجاهل اختلاف ترتيب المسافات
 * - تقارن customInstructions عنصرًا بعنصر
 */
export function areEqualQuickConfigs(a: QuickConfig, b: QuickConfig) {
  const safe = (v: string | undefined) => (v ?? "").toString().trim();
  const arrEq = (x?: string[], y?: string[]) => {
    const xa = Array.isArray(x) ? x : [];
    const ya = Array.isArray(y) ? y : [];
    if (xa.length !== ya.length) return false;
    for (let i = 0; i < xa.length; i++) {
      if (safe(xa[i]) !== safe(ya[i])) return false;
    }
    return true;
  };

  return (
    safe(a?.dialect) === safe(b?.dialect) &&
    safe(a?.tone) === safe(b?.tone) &&
    !!a?.includeClosingPhrase === !!b?.includeClosingPhrase &&
    safe(a?.closingText) === safe(b?.closingText) &&
    safe(a?.customerServicePhone) === safe(b?.customerServicePhone) &&
    safe(a?.customerServiceWhatsapp) === safe(b?.customerServiceWhatsapp) &&
    arrEq(a?.customInstructions, b?.customInstructions)
  );
}
