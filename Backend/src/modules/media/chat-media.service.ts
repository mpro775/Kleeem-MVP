// src/media/chat-media.service.ts
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Client as MinioClient } from 'minio';
import { unlink } from 'node:fs/promises';
function cdnBase() {
  return (process.env.ASSETS_CDN_BASE_URL || process.env.MINIO_PUBLIC_URL || '').replace(/\/+$/, '');
}
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

  private async ensureBucket(bucket: string) {
    const exists = await this.minio.bucketExists(bucket).catch(() => false);
    if (!exists) {
      await this.minio.makeBucket(bucket, process.env.MINIO_REGION || 'us-east-1');
    }
  }
  
  private publicUrlFor(bucket: string, key: string) {
    const base = cdnBase();
    return base ? `${base}/${bucket}/${key}` : '';
  }

  private async buildPublicOrSignedUrl(
    bucket: string,
    key: string,
  ): Promise<string> {
    const cdnBase = (process.env.ASSETS_CDN_BASE_URL || '').replace(/\/+$/, '');
    const minioPublic = (process.env.MINIO_PUBLIC_URL || '').replace(
      /\/+$/,
      '',
    );

    // إن كان لديك CDN/Proxy (مثل cdn.kaleem-ai.com) استخدم رابطًا ثابتًا
    if (cdnBase) return `${cdnBase}/${bucket}/${key}`;
    if (minioPublic) return `${minioPublic}/${bucket}/${key}`;

    // وإلا ارجع رابطًا موقّعًا قصير الأجل (ساعة)
    // ملاحظة: مع minio-js استخدم presignedGetObject وليس presignedUrl
    return await this.minio.presignedGetObject(bucket, key, 3600);
  }

  async uploadChatMedia(merchantId: string, filePath: string, originalName: string, mimeType: string) {
    const bucket = process.env.MINIO_BUCKET!;
    await this.ensureBucket(bucket);
  
    const safeName = originalName.replace(/[^\w.\-]+/g, '_');
    const storageKey = `chat-media/${merchantId}/${Date.now()}-${safeName}`;
  
    await this.minio.fPutObject(bucket, storageKey, filePath, {
      'Content-Type': mimeType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    });
  
    await unlink(filePath).catch(() => null);
  
    // إن كان عندك CDN مفعّل: ارجع رابط https عام
    const publicUrl = this.publicUrlFor(bucket, storageKey);
    if (publicUrl) {
      return { storageKey, url: publicUrl };
    }
  
    // وإلا: presigned (fallback)
    const presignedUrl = await this.minio.presignedUrl('GET', bucket, storageKey, 7 * 24 * 60 * 60);
    return { storageKey, presignedUrl };
  }
}
