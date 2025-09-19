// src/modules/products/services/product-media.service.ts
import * as Minio from 'minio';
import sharp from 'sharp';
import { Injectable, BadRequestException, Inject } from '@nestjs/common';

@Injectable()
export class ProductMediaService {
  constructor(@Inject('MINIO_CLIENT') private readonly minio: Minio.Client) {}

  private async ensureBucket(bucket: string) {
    const ok = await this.minio.bucketExists(bucket).catch(() => false);
    if (!ok)
      await this.minio.makeBucket(
        bucket,
        process.env.MINIO_REGION || 'us-east-1',
      );
  }

  private async publicUrl(bucket: string, key: string) {
    const cdn = (process.env.ASSETS_CDN_BASE_URL || '').replace(/\/+$/, '');
    const pub = (process.env.MINIO_PUBLIC_URL || '').replace(/\/+$/, '');
    if (cdn) return `${cdn}/${bucket}/${key}`;
    if (pub) return `${pub}/${bucket}/${key}`;
    return this.minio.presignedGetObject(bucket, key, 3600);
  }

  private async compressUnder2MB(
    filePath: string,
  ): Promise<{ buffer: Buffer; mime: string; ext: string }> {
    const img = sharp(filePath, { failOn: 'none' });
    let pipeline = img;
    const meta = await img.metadata();
    const w = meta.width ?? 0;
    const h = meta.height ?? 0;
    const total = w * h;
    const MAX = 5_000_000;
    if (w > 0 && h > 0 && total > MAX) {
      const s = Math.sqrt(MAX / total);
      pipeline = pipeline.resize(Math.floor(w * s), Math.floor(h * s), {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }
    for (const q of [85, 80, 70, 60, 50]) {
      const buf = await pipeline.webp({ quality: q }).toBuffer();
      if (buf.length <= 2 * 1024 * 1024)
        return { buffer: buf, mime: 'image/webp', ext: 'webp' };
    }
    const buf = await pipeline.jpeg({ quality: 60 }).toBuffer();
    if (buf.length <= 2 * 1024 * 1024)
      return { buffer: buf, mime: 'image/jpeg', ext: 'jpg' };
    throw new BadRequestException('صورة كبيرة؛ رجاءً استخدم صورة أصغر.');
  }

  async uploadMany(
    merchantId: string,
    productId: string,
    files: Express.Multer.File[],
    replace = false,
  ) {
    const bucket = process.env.MINIO_BUCKET!;
    await this.ensureBucket(bucket);

    const urls: string[] = [];
    let i = 0;
    for (const f of files) {
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(f.mimetype))
        continue;
      const out = await this.compressUnder2MB(f.path);
      const key = `merchants/${merchantId}/products/${productId}/image-${Date.now()}-${i++}.${out.ext}`;
      await this.minio.putObject(bucket, key, out.buffer, out.buffer.length, {
        'Content-Type': out.mime,
        'Cache-Control': 'public, max-age=31536000, immutable',
      });
      urls.push(await this.publicUrl(bucket, key));
    }
    return urls;
  }
}
