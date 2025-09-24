// src/modules/products/services/product-media.service.ts
import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import * as Minio from 'minio';
import sharp from 'sharp';

import {
  HOUR_IN_SECONDS,
  MAX_IMAGE_SIZE_BYTES,
  IMAGE_QUALITY_HIGH,
  IMAGE_QUALITY_MEDIUM_HIGH,
  IMAGE_QUALITY_MEDIUM,
  IMAGE_QUALITY_MEDIUM_LOW,
  IMAGE_QUALITY_LOW,
} from '../../../common/constants/common';

/** ثوابت لتجنّب الأرقام السحرية */
const MAX_PIXELS = 5_000_000; // حد أقصى لعدد البكسلات قبل التصغير
const DEFAULT_REGION = 'us-east-1' as const;
const ALLOWED_MIME_TYPES = new Set<string>([
  'image/png',
  'image/jpeg',
  'image/webp',
]);

/** حارس */
function isPositiveInt(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n > 0;
}

@Injectable()
export class ProductMediaService {
  constructor(@Inject('MINIO_CLIENT') private readonly minio: Minio.Client) {}

  private async ensureBucket(bucket: string): Promise<void> {
    const ok = await this.minio.bucketExists(bucket).catch(() => false);
    if (!ok) {
      const region = process.env.MINIO_REGION || DEFAULT_REGION;
      await this.minio.makeBucket(bucket, region);
    }
  }

  private async publicUrl(bucket: string, key: string): Promise<string> {
    const cdn = (process.env.ASSETS_CDN_BASE_URL || '').replace(/\/+$/, '');
    const pub = (process.env.MINIO_PUBLIC_URL || '').replace(/\/+$/, '');
    if (cdn) return `${cdn}/${bucket}/${key}`;
    if (pub) return `${pub}/${bucket}/${key}`;
    // presignedGetObject يُرجع Promise<string>
    return this.minio.presignedGetObject(bucket, key, HOUR_IN_SECONDS);
  }

  /**
   * يضغط الصورة إلى ما دون MAX_IMAGE_SIZE_BYTES بمحاولات جودة متدرجة
   * - يُصغّر الأبعاد لو كان عدد البكسلات كبيرًا
   * - يجرّب WebP بعدة مستويات ثم JPEG كحل أخير
   */
  private async compressUnder2MB(
    filePath: string,
  ): Promise<{ buffer: Buffer; mime: string; ext: 'webp' | 'jpg' }> {
    const img = sharp(filePath, { failOn: 'none' });
    let pipeline: sharp.Sharp = img;

    const meta = await img.metadata();
    const w = meta.width ?? 0;
    const h = meta.height ?? 0;
    const totalPixels = w * h;

    if (isPositiveInt(w) && isPositiveInt(h) && totalPixels > MAX_PIXELS) {
      const scale = Math.sqrt(MAX_PIXELS / totalPixels);
      const newW = Math.max(1, Math.floor(w * scale));
      const newH = Math.max(1, Math.floor(h * scale));
      pipeline = pipeline.resize(newW, newH, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    // ثبّت الأنواع: جميع القيم أرقام صريحة
    const qualities: ReadonlyArray<number> = [
      Number(IMAGE_QUALITY_HIGH),
      Number(IMAGE_QUALITY_MEDIUM_HIGH),
      Number(IMAGE_QUALITY_MEDIUM),
      Number(IMAGE_QUALITY_MEDIUM_LOW),
      Number(IMAGE_QUALITY_LOW),
    ];

    for (const q of qualities) {
      const buf = await pipeline.webp({ quality: q }).toBuffer();
      if (buf.length <= MAX_IMAGE_SIZE_BYTES) {
        return { buffer: buf, mime: 'image/webp', ext: 'webp' };
      }
    }

    const jpegBuf = await pipeline
      .jpeg({ quality: Number(IMAGE_QUALITY_MEDIUM_LOW) })
      .toBuffer();
    if (jpegBuf.length <= MAX_IMAGE_SIZE_BYTES) {
      return { buffer: jpegBuf, mime: 'image/jpeg', ext: 'jpg' };
    }

    throw new BadRequestException('صورة كبيرة؛ رجاءً استخدم صورة أصغر.');
  }

  async uploadMany(
    merchantId: string,
    productId: string,
    files: ReadonlyArray<Express.Multer.File>,
  ): Promise<string[]> {
    const bucket = String(process.env.MINIO_BUCKET ?? '').trim();
    if (!bucket) {
      throw new BadRequestException('إعداد MINIO_BUCKET مفقود.');
    }
    await this.ensureBucket(bucket);

    const urls: string[] = [];
    let i = 0;

    for (const f of files) {
      if (!ALLOWED_MIME_TYPES.has(f.mimetype)) continue;

      const out = await this.compressUnder2MB(f.path);
      const key = `merchants/${merchantId}/products/${productId}/image-${Date.now()}-${i++}.${out.ext}`;

      await this.minio.putObject(bucket, key, out.buffer, out.buffer.length, {
        'Content-Type': out.mime,
        'Cache-Control': 'public, max-age=31536000, immutable',
      });

      const url = await this.publicUrl(bucket, key);
      urls.push(url);
    }

    return urls;
  }
}
