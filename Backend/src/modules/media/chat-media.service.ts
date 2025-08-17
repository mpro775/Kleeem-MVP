// src/media/chat-media.service.ts
import { Injectable } from '@nestjs/common';
import { Client as MinioClient } from 'minio';
import { unlink } from 'node:fs/promises';

@Injectable()
export class ChatMediaService {
  public minio: MinioClient;
  constructor() {
    this.minio = new MinioClient({
      endPoint: process.env.MINIO_ENDPOINT!,
      port: parseInt(process.env.MINIO_PORT ?? '9000', 10),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY!,
      secretKey: process.env.MINIO_SECRET_KEY!,
    });
  }

  async uploadChatMedia(
    merchantId: string,
    filePath: string,
    originalName: string,
    mimeType: string,
  ) {
    const storageKey = `chat-media/${merchantId}/${Date.now()}-${originalName}`;
    await this.minio.fPutObject(
      process.env.MINIO_BUCKET!,
      storageKey,
      filePath,
      { 'Content-Type': mimeType },
    );
    const presignedUrl = await this.minio.presignedUrl(
      'GET',
      process.env.MINIO_BUCKET!,
      storageKey,
      7 * 24 * 60 * 60, // 7 أيام
    );
    await unlink(filePath); // حذف الملف المؤقت
    return { storageKey, presignedUrl };
  }
}
