import { createReadStream } from 'fs';
import { unlink } from 'node:fs/promises';

import { InjectQueue } from '@nestjs/bull';
import { Injectable, NotFoundException, Logger, Inject } from '@nestjs/common';
import { Queue } from 'bull';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { DocumentsRepository } from './repositories/documents.repository';
import { DocumentSchemaClass } from './schemas/document.schema';
import { S3_CLIENT_TOKEN } from '../../common/storage/s3-client.provider';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    @Inject('DocumentsRepository')
    private readonly repo: DocumentsRepository,
    @InjectQueue('documents-processing-queue')
    private readonly queue: Queue,
    @Inject(S3_CLIENT_TOKEN) public readonly s3: S3Client,
  ) {}

  async uploadFile(
    merchantId: string,
    file: Express.Multer.File & { key?: string },
  ): Promise<DocumentSchemaClass> {
    const storageKey = `${Date.now()}-${file.originalname}`;
    this.logger.log('=== رفع ملف جديد ===');
    this.logger.log(`رفع إلى التخزين باسم: ${storageKey}`);

    try {
      // 1) رفع الملف إلى R2/S3
      const bucket =
        process.env.S3_BUCKET_NAME || process.env.MINIO_BUCKET || '';
      if (!bucket) {
        throw new Error('S3_BUCKET_NAME not configured');
      }
      await this.s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: storageKey,
          Body: createReadStream(file.path),
          ContentType: file.mimetype,
        }),
      );

      // 2) حفظ السجل في Mongo عبر الـ Repository
      const doc = await this.repo.create({
        merchantId,
        filename: file.originalname,
        fileType: file.mimetype,
        storageKey,
        status: 'pending',
      });

      // 3) إضافة مهمة للمعالجة
      await this.queue.add('process', { docId: String(doc._id), merchantId });

      return doc.toObject() as unknown as DocumentSchemaClass;
    } catch (error) {
      this.logger.error('فشل رفع الملف إلى MinIO', error);
      throw error;
    } finally {
      // حذف الملف المؤقت محليًا دائمًا
      try {
        await unlink(file.path);
        this.logger.log(`تم حذف الملف المؤقت: ${file.path}`);
      } catch {
        this.logger.warn(`تعذر حذف الملف المؤقت أو غير موجود: ${file.path}`);
      }
    }
  }

  async list(merchantId: string): Promise<unknown[]> {
    return this.repo.listByMerchant(merchantId);
  }

  async getPresignedUrl(merchantId: string, docId: string): Promise<string> {
    const doc = await this.repo.findByIdForMerchant(docId, merchantId);
    if (!doc) throw new NotFoundException('Document not found');

    // ملاحظة: التعليق يقول "ساعة واحدة" لكن القيمة هي 24 ساعة (ضبطناها لتساوي 24 ساعة)
    const expires = 24 * 60 * 60; // 24 ساعة بالثواني
    const bucket =
      process.env.S3_BUCKET_NAME || process.env.MINIO_BUCKET || '';
    return getSignedUrl(
      this.s3,
      new GetObjectCommand({ Bucket: bucket, Key: doc.storageKey }),
      { expiresIn: expires },
    );
  }

  async delete(merchantId: string, docId: string): Promise<void> {
    const doc = await this.repo.findByIdForMerchant(docId, merchantId);
    if (!doc) throw new NotFoundException('Document not found');

    const bucket =
      process.env.S3_BUCKET_NAME || process.env.MINIO_BUCKET || '';
    if (!bucket) {
      throw new Error('S3_BUCKET_NAME not configured');
    }

    await this.s3.send(
      new DeleteObjectCommand({ Bucket: bucket, Key: doc.storageKey }),
    );
    await this.repo.deleteByIdForMerchant(docId, merchantId);
  }
}
