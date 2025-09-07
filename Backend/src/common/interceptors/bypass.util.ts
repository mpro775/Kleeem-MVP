// src/common/interceptors/bypass.util.ts
import type { Request } from 'express';

const BYPASS_PATHS = ['/metrics']; // أضف ما تشاء لاحقًا (مثل /ready أو /live)

export function shouldBypass(req: Request | any): boolean {
  const url = (req?.originalUrl || req?.url || '').split('?')[0];
  return BYPASS_PATHS.some((p) => url === p || url.startsWith(p + '/'));
}
