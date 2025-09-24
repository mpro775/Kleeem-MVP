import * as fs from 'fs/promises';
import * as path from 'path';

import axios from 'axios';
import { fileTypeFromBuffer } from 'file-type';

import type { AxiosResponseHeaders, RawAxiosResponseHeaders } from 'axios';

/* ======================= ثوابت مضبوطة ======================= */
const BYTES_PER_KB = 1024;
const BYTES_PER_MB = BYTES_PER_KB * BYTES_PER_KB;
const TIMEOUT_MS = 30_000; // 30s
const MAX_FILE_SIZE_BYTES = 10 * BYTES_PER_MB; // 10MB
const TMP_DIR = '/tmp';
const SAFE_NAME_MAX = 200;

const SECURITY_CONFIG = {
  MAX_FILE_SIZE: MAX_FILE_SIZE_BYTES,
  ALLOWED_MIME_TYPES: new Set<string>([
    // صور
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
    'image/gif',
    // مستندات
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
    // صوتيات
    'audio/mpeg',
    'audio/ogg',
    'audio/wav',
    'audio/mp4',
    'audio/m4a',
    // فيديو (محدود)
    'video/mp4',
    'video/webm',
  ]),
  TIMEOUT: TIMEOUT_MS,
} as const;

/* ======================= أدوات مساعدة آمنة ======================= */
type HeaderBag = Record<string, string | undefined>;

function headersToBag(
  headers:
    | AxiosResponseHeaders
    | RawAxiosResponseHeaders
    | Record<string, unknown>
    | undefined,
): HeaderBag {
  const bag: HeaderBag = {};
  if (!headers) return bag;
  for (const [k, v] of Object.entries(headers)) {
    const key = String(k).toLowerCase();
    // axios قد يرجع أحيانًا مصفوفات؛ نأخذ أول قيمة نصية
    if (Array.isArray(v)) {
      bag[key] = v.find((x) => typeof x === 'string');
    } else if (typeof v === 'string') {
      bag[key] = v;
    } else if (typeof v === 'number' || typeof v === 'boolean') {
      bag[key] = String(v);
    } else {
      bag[key] = undefined;
    }
  }
  return bag;
}

function getHeader(headers: HeaderBag, name: string): string | undefined {
  return headers[name.toLowerCase()];
}

function sanitizeFilename(name: string): string {
  const base = name.replace(/[^\w.-]+/g, '_');
  return base.length > SAFE_NAME_MAX ? base.slice(0, SAFE_NAME_MAX) : base;
}

/** HTTPS فقط */
function validateSecureUrl(urlStr: string): void {
  const u = new URL(urlStr);
  if (u.protocol !== 'https:') {
    throw new Error('Only HTTPS URLs are allowed for file download');
  }
}

/** allow-list */
function validateMimeType(mimeType: string): void {
  const mt = mimeType.toLowerCase();
  if (!SECURITY_CONFIG.ALLOWED_MIME_TYPES.has(mt)) {
    throw new Error(`File type '${mt}' is not allowed`);
  }
}

/** الحجم من الرؤوس أو من البيانات الفعلية */
function validateFileSize(contentLength?: string, actualSize?: number): void {
  const parsedLen = contentLength ? parseInt(contentLength, 10) : Number.NaN;
  const size = Number.isFinite(parsedLen) ? parsedLen : (actualSize ?? 0);
  if (size > SECURITY_CONFIG.MAX_FILE_SIZE) {
    throw new Error(
      `File size ${size} exceeds limit ${SECURITY_CONFIG.MAX_FILE_SIZE} bytes`,
    );
  }
}

/** تخمين (fallback فقط) */
function guessMimeFromExt(ext?: string): string {
  const e = (ext || '').toLowerCase();
  const mimeMap: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.pdf': 'application/pdf',
    '.mp3': 'audio/mpeg',
    '.ogg': 'audio/ogg',
    '.wav': 'audio/wav',
    '.m4a': 'audio/mp4',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.csv': 'text/csv',
    '.txt': 'text/plain',
  };
  return mimeMap[e] || 'application/octet-stream';
}

/** كشف ذكي للـ MIME: buffer → file-type → header → ext */
async function resolveMime(
  buffer: Buffer,
  filename?: string,
  headerMime?: string,
): Promise<string> {
  try {
    const ft = await fileTypeFromBuffer(buffer);
    if (ft?.mime) return ft.mime;
  } catch {
    // تجاهل؛ سنعتمد على الرؤوس/الامتداد
  }
  if (headerMime && typeof headerMime === 'string') return headerMime;
  return guessMimeFromExt(filename ? path.extname(filename) : undefined);
}

/* ======================= تنزيل من تيليجرام ======================= */
export async function downloadTelegramFile(
  fileId: string,
  telegramToken: string,
): Promise<{ tmpPath: string; originalName: string; mimeType?: string }> {
  // 1) getFile
  const getFileUrl = `https://api.telegram.org/bot${encodeURIComponent(
    telegramToken,
  )}/getFile`;

  const fileRes = await axios.get(getFileUrl, {
    params: { file_id: fileId },
    timeout: SECURITY_CONFIG.TIMEOUT,
  });

  const filePath: unknown =
    (fileRes.data as Record<string, unknown> | undefined)?.result &&
    (fileRes.data as { result?: { file_path?: string } }).result?.file_path;

  if (typeof filePath !== 'string' || filePath.trim().length === 0) {
    throw new Error('Telegram getFile: missing file_path');
  }

  const downloadUrl = `https://api.telegram.org/file/bot${encodeURIComponent(
    telegramToken,
  )}/${filePath}`;
  validateSecureUrl(downloadUrl);

  const fileName = sanitizeFilename(path.basename(filePath));

  // HEAD لمعرفة الحجم قبل التنزيل (اختياري)
  const headResp = await axios
    .head(downloadUrl, { timeout: SECURITY_CONFIG.TIMEOUT })
    .catch(() => ({ headers: {} as Record<string, unknown> }));

  const headHeaders = headersToBag(headResp.headers);
  validateFileSize(getHeader(headHeaders, 'content-length'));

  // 2) GET + حدود الحجم
  const res = await axios.get<ArrayBuffer>(downloadUrl, {
    responseType: 'arraybuffer',
    timeout: SECURITY_CONFIG.TIMEOUT,
    maxContentLength: SECURITY_CONFIG.MAX_FILE_SIZE,
    maxBodyLength: SECURITY_CONFIG.MAX_FILE_SIZE,
  });

  const resHeaders = headersToBag(res.headers);
  const buf = Buffer.from(res.data);
  validateFileSize(getHeader(resHeaders, 'content-length'), buf.length);

  // 🔍 كشف الـ MIME الحقيقي (موحّد)
  const headerMime = getHeader(resHeaders, 'content-type');
  const mime = await resolveMime(buf, fileName, headerMime);

  validateMimeType(mime);

  const localPath = path.join(TMP_DIR, `${Date.now()}-${fileName}`);
  await fs.writeFile(localPath, buf);

  return { tmpPath: localPath, originalName: fileName, mimeType: mime };
}

/* ======================= تنزيل عام عبر HTTPS ======================= */
export async function downloadRemoteFile(
  fileUrl: string,
  fileName?: string,
): Promise<{ tmpPath: string; originalName: string; mimeType?: string }> {
  validateSecureUrl(fileUrl);

  const inferredName = path.basename(fileUrl.split('?')[0] || 'file');
  const name = sanitizeFilename(fileName || inferredName);

  // HEAD لمعرفة الحجم قبل التنزيل (اختياري)
  const headResp = await axios
    .head(fileUrl, { timeout: SECURITY_CONFIG.TIMEOUT })
    .catch(() => ({ headers: {} as Record<string, unknown> }));

  const headHeaders = headersToBag(headResp.headers);
  validateFileSize(getHeader(headHeaders, 'content-length'));

  // GET مع حدود الحجم
  const res = await axios.get<ArrayBuffer>(fileUrl, {
    responseType: 'arraybuffer',
    timeout: SECURITY_CONFIG.TIMEOUT,
    maxContentLength: SECURITY_CONFIG.MAX_FILE_SIZE,
    maxBodyLength: SECURITY_CONFIG.MAX_FILE_SIZE,
  });

  const resHeaders = headersToBag(res.headers);
  const buf = Buffer.from(res.data);
  validateFileSize(getHeader(resHeaders, 'content-length'), buf.length);

  const headerMime = getHeader(resHeaders, 'content-type');
  const mime = await resolveMime(buf, name, headerMime);

  validateMimeType(mime);

  const localPath = path.join(TMP_DIR, `${Date.now()}-${name}`);
  await fs.writeFile(localPath, buf);

  return { tmpPath: localPath, originalName: name, mimeType: mime };
}
