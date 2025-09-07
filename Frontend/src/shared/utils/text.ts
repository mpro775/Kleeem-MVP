// src/utils/text.ts
export function toMessageString(x: unknown): string {
    if (typeof x === 'string') return x;
    if (x == null) return '';
    if (Array.isArray(x)) return x.map(toMessageString).join(' · ');
    if (typeof x === 'object') {
      const anyObj = x as any;
      if (typeof anyObj.message === 'string') return anyObj.message;
      try {
        // لا تطبع buffer
        const clone: Record<string, any> = {};
        Object.keys(anyObj).forEach(k => {
          if (k.toLowerCase() === 'buffer') return;
          clone[k] = anyObj[k];
        });
        return JSON.stringify(clone);
      } catch {
        return String(x);
      }
    }
    return String(x);
  }
  
  export function safeText(x: unknown): string {
    const s = toMessageString(x);
    // كضمانة: امنع ظهور [object Object]
    return s && s !== '[object Object]' ? s : '';
  }
  