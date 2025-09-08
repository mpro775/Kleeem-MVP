import axios from 'axios';
import * as fs from 'fs/promises';
import * as path from 'path';

// ✅ B6: إعدادات الأمان لتحميل الملفات
const SECURITY_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_MIME_TYPES: [
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
  ],
  TIMEOUT: 30000, // 30 seconds
};

/**
 * التحقق من أن الرابط آمن (HTTPS فقط)
 */
function validateSecureUrl(url: string): void {
  const parsedUrl = new URL(url);
  if (parsedUrl.protocol !== 'https:') {
    throw new Error('Only HTTPS URLs are allowed for file download');
  }
}

/**
 * التحقق من نوع MIME المسموح
 */
function validateMimeType(mimeType: string): void {
  if (!SECURITY_CONFIG.ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase())) {
    throw new Error(`File type '${mimeType}' is not allowed`);
  }
}

/**
 * التحقق من حجم الملف
 */
function validateFileSize(
  contentLength: string | undefined,
  actualSize?: number,
): void {
  const size = actualSize || (contentLength ? parseInt(contentLength) : 0);
  if (size > SECURITY_CONFIG.MAX_FILE_SIZE) {
    throw new Error(
      `File size ${size} bytes exceeds maximum allowed size of ${SECURITY_CONFIG.MAX_FILE_SIZE} bytes`,
    );
  }
}

export async function downloadTelegramFile(
  fileId: string,
  telegramToken: string,
): Promise<{ tmpPath: string; originalName: string; mimeType?: string }> {
  // 1) احصل على مسار الملف
  const fileRes = await axios.get(
    `https://api.telegram.org/bot${telegramToken}/getFile?file_id=${fileId}`,
    { timeout: SECURITY_CONFIG.TIMEOUT },
  );
  const filePath = fileRes.data?.result?.file_path;
  if (!filePath) throw new Error('Telegram getFile: missing file_path');

  const downloadUrl = `https://api.telegram.org/file/bot${telegramToken}/${filePath}`;

  // ✅ B6: التحقق من أن الرابط آمن (HTTPS فقط)
  validateSecureUrl(downloadUrl);

  const fileName = path.basename(filePath);

  // 2) نزّل الملف مع فحص الحجم والنوع
  const response = await axios.get(downloadUrl, {
    responseType: 'arraybuffer',
    timeout: SECURITY_CONFIG.TIMEOUT,
    maxContentLength: SECURITY_CONFIG.MAX_FILE_SIZE,
    maxBodyLength: SECURITY_CONFIG.MAX_FILE_SIZE,
  });

  // ✅ B6: التحقق من حجم الملف
  validateFileSize(response.headers['content-length'], response.data?.length);

  // 3) حاول استنتاج الـ mime من الرؤوس أو الامتداد
  const mime =
    response.headers?.['content-type'] ||
    guessMimeFromExt(path.extname(fileName));

  // ✅ B6: التحقق من نوع MIME المسموح
  if (mime) {
    validateMimeType(mime);
  }

  const localPath = `/tmp/${Date.now()}-${fileName}`;
  await fs.writeFile(localPath, response.data);

  return { tmpPath: localPath, originalName: fileName, mimeType: mime };
}

export async function downloadRemoteFile(
  fileUrl: string,
  fileName?: string,
): Promise<{ tmpPath: string; originalName: string; mimeType?: string }> {
  // ✅ B6: التحقق من أن الرابط آمن (HTTPS فقط)
  validateSecureUrl(fileUrl);

  const name = fileName || path.basename(fileUrl.split('?')[0] || 'file');

  const response = await axios.get(fileUrl, {
    responseType: 'arraybuffer',
    timeout: SECURITY_CONFIG.TIMEOUT,
    maxContentLength: SECURITY_CONFIG.MAX_FILE_SIZE,
    maxBodyLength: SECURITY_CONFIG.MAX_FILE_SIZE,
  });

  // ✅ B6: التحقق من حجم الملف
  validateFileSize(response.headers['content-length'], response.data?.length);

  const mime =
    response.headers?.['content-type'] || guessMimeFromExt(path.extname(name));

  // ✅ B6: التحقق من نوع MIME المسموح
  if (mime) {
    validateMimeType(mime);
  }

  const localPath = `/tmp/${Date.now()}-${name}`;
  await fs.writeFile(localPath, response.data);

  return { tmpPath: localPath, originalName: name, mimeType: mime };
}

// -------- helpers --------
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
