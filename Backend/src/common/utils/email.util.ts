// src/common/utils/email.util.ts
export function normalizeEmail(email?: string): string | undefined {
  if (!email) return undefined;
  return email.toLowerCase().trim();
}
