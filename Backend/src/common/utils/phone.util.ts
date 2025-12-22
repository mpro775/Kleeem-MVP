// src/common/utils/phone.util.ts
export function normalizePhone(phone?: string): string | undefined {
  if (!phone) return undefined;

  // إزالة جميع الأحرف غير الرقمية
  let digits = phone.replace(/\D+/g, '');

  // إزالة البادئة الدولية إن وجدت (مثل +966 أو 00966)
  if (digits.startsWith('966') && digits.length > 9) {
    digits = digits.substring(3);
  } else if (digits.startsWith('00966') && digits.length > 11) {
    digits = digits.substring(5);
  }

  // إزالة الصفر البادئ إن وجد
  if (digits.startsWith('0') && digits.length > 9) {
    digits = digits.substring(1);
  }

  // التأكد من أن الرقم يحتوي على 9 أرقام على الأقل (للأرقام السعودية)
  if (digits.length < 9) {
    return undefined;
  }

  return digits;
}

export function isValidSaudiPhone(phone?: string): boolean {
  if (!phone) return false;
  const normalized = normalizePhone(phone);
  return normalized ? normalized.length >= 9 && /^\d+$/.test(normalized) : false;
}
