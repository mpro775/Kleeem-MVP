// src/shared/errors/fieldErrorHelpers.ts
import type { FieldErrors } from './AppError';

/** يوزّع أخطاء الحقول القادمة من الباك على react-hook-form */
export function applyServerFieldErrors<T extends Record<string, any> = Record<string, any>>(
  fields: FieldErrors | undefined,
  setError: (name: keyof T | string | number, error: { type?: string; message?: string }) => void
) {
  if (!fields) return;
  Object.entries(fields).forEach(([path, msgs]) => {
    setError(path as keyof T & string, { type: 'server', message: Array.isArray(msgs) ? msgs[0] : String(msgs) });
  });
}
