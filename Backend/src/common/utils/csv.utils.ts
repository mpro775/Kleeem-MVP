/** تهريب قيمة للـ CSV */
function escapeCsvValue(val: unknown): string {
  if (val == null) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** تحويل صف إلى سطر CSV */
export function rowToCsvLine(row: unknown[]): string {
  return row.map(escapeCsvValue).join(',');
}

/** تحويل مصفوفة صفوف إلى نص CSV */
export function toCsv(headers: string[], rows: unknown[][]): string {
  const BOM = '\uFEFF'; // UTF-8 BOM for Excel
  const headerLine = rowToCsvLine(headers);
  const dataLines = rows.map((r) => rowToCsvLine(r));
  return BOM + [headerLine, ...dataLines].join('\r\n');
}
