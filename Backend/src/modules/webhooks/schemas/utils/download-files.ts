import axios from 'axios';
import * as fs from 'fs/promises';
import * as path from 'path';

export async function downloadTelegramFile(
  fileId: string,
  telegramToken: string,
): Promise<{ tmpPath: string; originalName: string; mimeType?: string }> {
  // 1. الحصول على رابط الملف من Telegram
  const fileRes = await axios.get(
    `https://api.telegram.org/bot${telegramToken}/getFile?file_id=${fileId}`,
  );
  const filePath = fileRes.data.result.file_path;
  const downloadUrl = `https://api.telegram.org/file/bot${telegramToken}/${filePath}`;
  const fileName = path.basename(filePath);

  // 2. تحميل الملف
  const localPath = `/tmp/${Date.now()}-${fileName}`;
  const response = await axios.get(downloadUrl, {
    responseType: 'arraybuffer',
  });
  await fs.writeFile(localPath, response.data);

  // 3. بإمكانك استخراج mimeType لو أحببت عبر امتداد الملف (اختياري)
  return { tmpPath: localPath, originalName: fileName };
}
export async function downloadRemoteFile(
  fileUrl: string,
  fileName?: string,
): Promise<{ tmpPath: string; originalName: string }> {
  const name = fileName || path.basename(fileUrl.split('?')[0]);
  const localPath = `/tmp/${Date.now()}-${name}`;
  const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
  await fs.writeFile(localPath, response.data);
  return { tmpPath: localPath, originalName: name };
}
