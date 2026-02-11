// src/media/chat-media.service.ts
import { createReadStream } from 'fs';
import { unlink } from 'node:fs/promises';

import { Inject, Injectable } from '@nestjs/common';
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { HOUR_IN_SECONDS } from '../../common/constants/common';
import { S3_CLIENT_TOKEN } from '../../common/storage/s3-client.provider';
function cdnBase() {
  return (
    process.env.ASSETS_CDN_BASE_URL ||
    process.env.AWS_ENDPOINT ||
    process.env.MINIO_PUBLIC_URL ||
    ''
  ).replace(/\/+$/, '');
}
@Injectable()
export class ChatMediaService {
  constructor(@Inject(S3_CLIENT_TOKEN) public readonly s3: S3Client) { }

  private publicUrlFor(_bucket: string, key: string) {
    const base = cdnBase();
    // For R2 public buckets, bucket is implied by the domain
    return base ? `${base}/${key}` : '';
  }

  private async buildPublicOrSignedUrl(
    bucket: string,
    key: string,
  ): Promise<string> {
    const cdn = (process.env.ASSETS_CDN_BASE_URL || '').replace(/\/+$/, '');
    const endpoint = (
      process.env.AWS_ENDPOINT ||
      process.env.MINIO_PUBLIC_URL ||
      ''
    ).replace(/\/+$/, '');

    // إن كان لديك CDN/Proxy (مثل cdn.kaleem-ai.com) استخدم رابطًا ثابتًا
    // For R2 public buckets, bucket is implied by the domain
    if (cdn) return `${cdn}/${key}`;
    if (endpoint) return `${endpoint}/${bucket}/${key}`;

    // وإلا ارجع رابطًا موقّعًا قصير الأجل (ساعة)
    return await getSignedUrl(
      this.s3,
      new GetObjectCommand({ Bucket: bucket, Key: key }),
      { expiresIn: HOUR_IN_SECONDS },
    );
  }

  async uploadChatMedia(
    merchantId: string,
    filePath: string,
    originalName: string,
    mimeType: string,
  ): Promise<
    | { storageKey: string; url: string }
    | { storageKey: string; presignedUrl: string }
  > {
    const bucket =
      process.env.S3_BUCKET_NAME || process.env.MINIO_BUCKET || '';
    if (!bucket) {
      throw new Error('S3_BUCKET_NAME not configured');
    }

    const safeName = originalName.replace(/[^\w.-]+/g, '_');
    const storageKey = `chat-media/${merchantId}/${Date.now()}-${safeName}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: storageKey,
        Body: createReadStream(filePath),
        ContentType: mimeType,
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );

    await unlink(filePath).catch(() => null);

    // إن كان عندك CDN مفعّل: ارجع رابط https عام
    const publicUrl = this.publicUrlFor(bucket, storageKey);
    if (publicUrl) {
      return { storageKey, url: publicUrl };
    }

    // وإلا: presigned (fallback)
    const presignedUrl = await getSignedUrl(
      this.s3,
      new GetObjectCommand({ Bucket: bucket, Key: storageKey }),
      { expiresIn: 7 * 24 * 60 * 60 },
    );
    return { storageKey, presignedUrl };
  }
}
