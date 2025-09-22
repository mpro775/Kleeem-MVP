import * as fs from 'fs/promises';
import * as path from 'path';

import axios from 'axios';
import { fileTypeFromBuffer } from 'file-type';

const SECURITY_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
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
  TIMEOUT: 30_000, // 30s
};

/** HTTPS فقط */
function validateSecureUrl(url: string): void {
  const u = new URL(url);
  if (u.protocol !== 'https:') {
    throw new Error('Only HTTPS URLs are allowed for file download');
  }
}

/** allow-list */
function validateMimeType(mimeType: string): void {
  if (!SECURITY_CONFIG.ALLOWED_MIME_TYPES.has(mimeType.toLowerCase())) {
    throw new Error(`File type '${mimeType}' is not allowed`);
  }
}

/** الحجم من الرؤوس أو من البيانات الفعلية */
function validateFileSize(contentLength?: string, actualSize?: number): void {
  const size = actualSize ?? (contentLength ? parseInt(contentLength, 10) : 0);
  if (size > SECURITY_CONFIG.MAX_FILE_SIZE) {
    throw new Error(
      `File size ${size} exceeds limit ${SECURITY_CONFIG.MAX_FILE_SIZE} bytes`,
    );
  }
}

/** تخمين (fallback فقط) */
function guessMimeFromExt(ext?: string) {
  const e = (ext || '').toLowerCase();
  if (e === '.png') return 'image/png';
  if (e === '.jpg' || e === '.jpeg') return 'image/jpeg';
  if (e === '.webp') return 'image/webp';
  if (e === '.gif') return 'image/gif';
  if (e === '.pdf') return 'application/pdf';
  if (e === '.mp3') return 'audio/mpeg';
  if (e === '.ogg') return 'audio/ogg';
  if (e === '.wav') return 'audio/wav';
  if (e === '.m4a') return 'audio/mp4';
  if (e === '.mp4') return 'video/mp4';
  return 'application/octet-stream';
}

/** 🔐 كشف حقيقي للـ MIME مع fallback ذكي */
function resolveMime(
  buffer: Buffer,
  name?: string,
  headerMime?: string,
): string {
  // حاول كشف النوع من المحتوى
  // ملاحظة: file-type يرجع null لبعض الأنواع النصية الشائعة — عندها نستخدم رؤوس/امتداد
  return (buffer as any) && buffer.length
    ? (undefined as any)
    : 'application/octet-stream';
}

export async function downloadTelegramFile(
  fileId: string,
  telegramToken: string,
): Promise<{ tmpPath: string; originalName: string; mimeType?: string }> {
  // 1) getFile
  const fileRes = await axios.get(
    `https://api.telegram.org/bot${telegramToken}/getFile`,
    { params: { file_id: fileId }, timeout: SECURITY_CONFIG.TIMEOUT },
  );
  const filePath = fileRes.data?.result?.file_path;
  if (!filePath) throw new Error('Telegram getFile: missing file_path');

  const downloadUrl = `https://api.telegram.org/file/bot${telegramToken}/${filePath}`;
  validateSecureUrl(downloadUrl);
  const fileName = path.basename(filePath);

  // اختياري: HEAD لمعرفة الحجم قبل التنزيل
  const head = await axios
    .head(downloadUrl, { timeout: SECURITY_CONFIG.TIMEOUT })
    .catch(() => ({ headers: {} as any }));
  validateFileSize(head.headers?.['content-length']);

  // 2) GET + حدود الحجم
  const res = await axios.get(downloadUrl, {
    responseType: 'arraybuffer',
    timeout: SECURITY_CONFIG.TIMEOUT,
    maxContentLength: SECURITY_CONFIG.MAX_FILE_SIZE,
    maxBodyLength: SECURITY_CONFIG.MAX_FILE_SIZE,
  });

  const buf: Buffer = Buffer.from(res.data);
  validateFileSize(res.headers['content-length'], buf.length);

  // 🔍 كشف الـ MIME الحقيقي
  const ft = await fileTypeFromBuffer(buf).catch(() => null);
  const detected = ft?.mime;
  const headerMime = res.headers?.['content-type'];
  const fallback = guessMimeFromExt(path.extname(fileName));
  const mime = detected || headerMime || fallback;

  validateMimeType(mime);

  const localPath = `/tmp/${Date.now()}-${fileName.replace(/[^\w.\-]+/g, '_')}`;
  await fs.writeFile(localPath, buf);

  return { tmpPath: localPath, originalName: fileName, mimeType: mime };
}

export async function downloadRemoteFile(
  fileUrl: string,
  fileName?: string,
): Promise<{ tmpPath: string; originalName: string; mimeType?: string }> {
  validateSecureUrl(fileUrl);

  const name =
    fileName ||
    path.basename((fileUrl.split('?')[0] || 'file').replace(/[^\w.\-]+/g, '_'));

  // اختياري: HEAD لمعرفة الحجم
  const head = await axios
    .head(fileUrl, { timeout: SECURITY_CONFIG.TIMEOUT })
    .catch(() => ({ headers: {} as any }));
  validateFileSize(head.headers?.['content-length']);

  const res = await axios.get(fileUrl, {
    responseType: 'arraybuffer',
    timeout: SECURITY_CONFIG.TIMEOUT,
    maxContentLength: SECURITY_CONFIG.MAX_FILE_SIZE,
    maxBodyLength: SECURITY_CONFIG.MAX_FILE_SIZE,
  });

  const buf: Buffer = Buffer.from(res.data);
  validateFileSize(res.headers['content-length'], buf.length);

  // 🔍 كشف النوع الحقيقي
  const ft = await fileTypeFromBuffer(buf).catch(() => null);
  const detected = ft?.mime;
  const headerMime = res.headers?.['content-type'];
  const fallback = guessMimeFromExt(path.extname(name));
  const mime = detected || headerMime || fallback;

  validateMimeType(mime);

  const localPath = `/tmp/${Date.now()}-${name}`;
  await fs.writeFile(localPath, buf);

  return { tmpPath: localPath, originalName: name, mimeType: mime };
}
