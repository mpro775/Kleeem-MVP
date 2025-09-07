// src/modules/merchants/services/prompt-utils.ts
import type { MerchantDocument } from '../schemas/merchant.schema';

export function buildHbsContext(
  m: MerchantDocument,
  testVars: Record<string, any>,
) {
  return {
    merchantName: m.name,
    categories: m.categories ?? [],
    quickConfig: m.quickConfig ?? {},
    ...testVars,
  };
}

// (اختياري لو ستستخدم Final بدون الحارس في مكان آخر)
export const GUARD_BLOCK_RX =
  /\n?\[التوجيهات الإجباريّة\][\s\S]*?(?=\n\[|$)|\n?\[system-only\][\s\S]*?(?=\n\[|$)|\n?\[توجيهات إضافية\][\s\S]*?(?=\n\[|$)/g;

export function stripGuardSections(text: string): string {
  return text
    .replace(GUARD_BLOCK_RX, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
