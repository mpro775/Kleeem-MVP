import { BadRequestException } from '@nestjs/common';

const BYTES_PER_KILOBYTE = 1024;

export const DEFAULT_ALLOWED_MIME = new Set<string>([
  // صور
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',

  // مستندات شائعة
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'text/plain',
]);

export type FileGuardOptions = {
  maxBytes?: number; // الحد الأقصى للحجم بالبايت (مثلاً 15MB)
  allowedMime?: Set<string>;
};

export function ensureMimeAllowed(
  mime?: string,
  allowed = DEFAULT_ALLOWED_MIME,
): void {
  if (!mime || !allowed.has(mime)) {
    throw new BadRequestException({
      code: 'UNSUPPORTED_MEDIA_TYPE',
      message: `MIME not allowed: ${mime || 'unknown'}`,
    });
  }
}

export function ensureSizeAllowed(
  sizeBytes: number,
  maxBytes = 15 * BYTES_PER_KILOBYTE * BYTES_PER_KILOBYTE,
): void {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    // بعض المصادر لا تُرجع Content-Length: نسمح لكن نتحقق لاحقًا أثناء التحميل المتدرّج
    return;
  }
  if (sizeBytes > maxBytes) {
    throw new BadRequestException({
      code: 'FILE_TOO_LARGE',
      message: `File exceeds limit (${formatBytes(sizeBytes)} > ${formatBytes(maxBytes)})`,
    });
  }
}

export function formatBytes(n: number): string {
  const u = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let v = n;
  while (v >= BYTES_PER_KILOBYTE && i < u.length - 1) {
    v /= BYTES_PER_KILOBYTE;
    i++;
  }
  return `${v.toFixed(1)} ${u[i]}`;
}
