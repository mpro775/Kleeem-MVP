import type { WorkingHour } from "../type";

/** تنسيق ساعات العمل لعرض مرتب (ويضمن مصفوفة دائمًا) */
export function normalizeWorkingHours(hours?: WorkingHour[]): WorkingHour[] {
  return Array.isArray(hours) ? hours : [];
}

/** إرجاع أول عنوان مقروء */
export function getPrimaryAddress(
  addresses?: Array<{
    street?: string;
    city?: string;
    state?: string;
    country?: string;
  }>
) {
  if (!addresses?.length) return "";
  const a = addresses[0];
  return [a.street, a.city, a.state, a.country].filter(Boolean).join(", ");
}
