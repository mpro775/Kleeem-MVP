import axios from 'axios';
import * as fs from 'fs/promises';
import * as path from 'path';

export async function downloadTelegramFile(
  fileId: string,
  telegramToken: string,
): Promise<{ tmpPath: string; originalName: string; mimeType?: string }> {
  // 1) احصل على مسار الملف
  const fileRes = await axios.get(
    `https://api.telegram.org/bot${telegramToken}/getFile?file_id=${fileId}`,
    { timeout: 15000 },
  );
  const filePath = fileRes.data?.result?.file_path;
  if (!filePath) throw new Error('Telegram getFile: missing file_path');

  const downloadUrl = `https://api.telegram.org/file/bot${telegramToken}/${filePath}`;
  const fileName = path.basename(filePath);

  // 2) نزّل الملف
  const localPath = `/tmp/${Date.now()}-${fileName}`;
  const response = await axios.get(downloadUrl, {
    responseType: 'arraybuffer',
    timeout: 60000,
    // (اختياري) validateStatus: () => true,
  });
  await fs.writeFile(localPath, response.data);

  // 3) حاول استنتاج الـ mime من الرؤوس أو الامتداد
  const mime =
    response.headers?.['content-type'] ||
    guessMimeFromExt(path.extname(fileName));

  return { tmpPath: localPath, originalName: fileName, mimeType: mime };
}

export async function downloadRemoteFile(
  fileUrl: string,
  fileName?: string,
): Promise<{ tmpPath: string; originalName: string; mimeType?: string }> {
  const name = fileName || path.basename(fileUrl.split('?')[0] || 'file');
  const localPath = `/tmp/${Date.now()}-${name}`;

  const response = await axios.get(fileUrl, {
    responseType: 'arraybuffer',
    timeout: 60000,
  });

  await fs.writeFile(localPath, response.data);

  const mime =
    response.headers?.['content-type'] ||
    guessMimeFromExt(path.extname(name));

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
