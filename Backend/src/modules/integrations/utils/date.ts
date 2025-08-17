// src/utils/date.ts
export function toDateOrNull(val: unknown): Date | null {
  if (val == null) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val === 'string' || typeof val === 'number') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof val === 'object') {
    const rec = val as Record<string, unknown>;
    const candidates = [
      rec.iso,
      rec.date,
      rec.datetime,
      rec.timestamp,
      rec.updated_at,
      rec.updatedAt,
      rec.value,
    ];
    for (const c of candidates) {
      const d = toDateOrNull(c);
      if (d) return d;
    }
  }
  return null;
}
