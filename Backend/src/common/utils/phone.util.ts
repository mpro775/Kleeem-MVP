// src/common/utils/phone.util.ts

/** أقل عدد أرقام لرقم سعودي صالح (بدون كود الدولة) */
const SAUDI_MIN_DIGITS = 9;

/** طول بادئة 966 */
const PREFIX_966_LENGTH = 3;

/** طول بادئة 00966 */
const PREFIX_00966_LENGTH = 5;

/** أقل طول كلي عند وجود 00966 ليكون الرقم صالحاً بعد إزالة البادئة */
const MIN_LENGTH_WITH_00966 = 11;

export function normalizePhone(phone?: string): string | undefined {
  if (!phone) return undefined;

  // إزالة جميع الأحرف غير الرقمية
  let digits = phone.replace(/\D+/g, '');

  // إزالة البادئة الدولية إن وجدت (مثل +966 أو 00966)
  if (digits.startsWith('966') && digits.length > SAUDI_MIN_DIGITS) {
    digits = digits.substring(PREFIX_966_LENGTH);
  } else if (
    digits.startsWith('00966') &&
    digits.length > MIN_LENGTH_WITH_00966
  ) {
    digits = digits.substring(PREFIX_00966_LENGTH);
  }

  // إزالة الصفر البادئ إن وجد
  if (digits.startsWith('0') && digits.length > SAUDI_MIN_DIGITS) {
    digits = digits.substring(1);
  }

  // التأكد من أن الرقم يحتوي على 9 أرقام على الأقل (للأرقام السعودية)
  if (digits.length < SAUDI_MIN_DIGITS) {
    return undefined;
  }

  return digits;
}

export function isValidSaudiPhone(phone?: string): boolean {
  if (!phone) return false;
  const normalized = normalizePhone(phone);
  return normalized
    ? normalized.length >= SAUDI_MIN_DIGITS && /^\d+$/.test(normalized)
    : false;
}
