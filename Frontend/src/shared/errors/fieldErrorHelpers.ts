// src/shared/errors/fieldErrorHelpers.ts
import type { FieldErrors } from './AppError';

/** يوزّع أخطاء الحقول القادمة من الباك على react-hook-form */
export function applyServerFieldErrors(
  fields: FieldErrors | undefined,
  setError: (name: string, error: { type?: string; message?: string }) => void
) {
  if (!fields) return;
  Object.entries(fields).forEach(([path, msgs]) => {
    setError(path as string, { type: 'server', message: Array.isArray(msgs) ? msgs[0] : String(msgs) });
  });
}
