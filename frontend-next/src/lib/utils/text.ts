export function safeText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
}

export function toMessageString(x: unknown): string {
  if (typeof x === 'string') return x;
  if (x == null) return '';
  if (Array.isArray(x)) return x.map(toMessageString).join(' · ');
  if (typeof x === 'object') {
    const anyObj = x as { message?: string };
    if (typeof anyObj.message === 'string') return anyObj.message;
    try {
      // لا تطبع buffer
      const clone: Record<string, unknown> = {};
      Object.keys(anyObj).forEach((k) => {
        if (k.toLowerCase() === 'buffer') return;
        clone[k as keyof typeof anyObj] = anyObj[k as keyof typeof anyObj];
      });
      return JSON.stringify(clone);
    } catch {
      return String(x);
    }
  }
  return String(x);
}

export function toDisplayString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null) {
    const obj = value as { name?: string; label?: string; toString?: () => string };
    if (obj.name) return obj.name;
    if (obj.label) return obj.label;
    if (obj.toString) return obj.toString();
  }
  return String(value);
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

export function capitalize(text: string): string {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

