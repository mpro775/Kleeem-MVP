// utils/phone.util.ts (اختياري للتوحيد)
export function normalizePhone(p?: string) {
    if (!p) return undefined;
    const digits = p.replace(/\D+/g, '');
    return digits; // أضف منطق كود الدولة إن أردت
  }
  