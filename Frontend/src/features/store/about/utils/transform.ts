import type { WorkingHour } from "../type";

/** تنسيق ساعات العمل لعرض مرتب (ويضمن مصفوفة دائمًا) */
export function normalizeWorkingHours(hours?: WorkingHour[]): WorkingHour[] {
  return Array.isArray(hours) ? hours : [];
}

/** إرجاع أول عنوان مقروء */
export function getPrimaryAddress(
  addresses?: Array<{
    label?: string;
    street?: string;
    city?: string;
    state?: string;
    country?: string;
  }>
) {
  if (!addresses?.length) return "";
  const a = addresses[0];
  const addressParts = [a.street, a.city, a.state, a.country].filter(Boolean).join(", ");
  return a.label ? `${a.label}: ${addressParts}` : addressParts;
}

/** إرجاع جميع العناوين مع التسميات */
export function getAllAddresses(
  addresses?: Array<{
    label?: string;
    street?: string;
    city?: string;
    state?: string;
    country?: string;
  }>
): Array<{ label: string; fullAddress: string }> {
  if (!addresses?.length) return [];
  return addresses.map((a, idx) => ({
    label: a.label || `عنوان ${idx + 1}`,
    fullAddress: [a.street, a.city, a.state, a.country].filter(Boolean).join(", "),
  }));
}
