import { unlink } from 'node:fs/promises';

import { InjectQueue } from '@nestjs/bull';
import { Injectable, NotFoundException, Logger, Inject } from '@nestjs/common';
import { Queue } from 'bull';
import { Client as MinioClient } from 'minio';

import { DocumentsRepository } from './repositories/documents.repository';
import { DocumentSchemaClass } from './schemas/document.schema';

@Injectable()
export class DocumentsService {
  public minio: MinioClient;
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    @Inject('DocumentsRepository')
    private readonly repo: DocumentsRepository,
    @InjectQueue('documents-processing-queue')
    private readonly queue: Queue,
  ) {
    this.minio = new MinioClient({
      endPoint: process.env.MINIO_ENDPOINT!,
      port: parseInt(process.env.MINIO_PORT ?? '9000', 10),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY!,
      secretKey: process.env.MINIO_SECRET_KEY!,
    });
  }

  async uploadFile(
    merchantId: string,
    file: Express.Multer.File & { key?: string },
  ): Promise<DocumentSchemaClass> {
    const storageKey = `${Date.now()}-${file.originalname}`;
    this.logger.log('=== رفع ملف جديد ===');
    this.logger.log(`رفع إلى MinIO باسم: ${storageKey}`);

    try {
      // 1) رفع الملف لـ MinIO
      await this.minio.fPutObject(
        process.env.MINIO_BUCKET!,
        storageKey,
        file.path,
        { 'Content-Type': file.mimetype },
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
    return this.minio.presignedUrl(
      'GET',
      process.env.MINIO_BUCKET!,
      doc.storageKey,
      expires,
    );
  }

  async delete(merchantId: string, docId: string): Promise<void> {
    const doc = await this.repo.findByIdForMerchant(docId, merchantId);
    if (!doc) throw new NotFoundException('Document not found');

    await this.minio.removeObject(process.env.MINIO_BUCKET!, doc.storageKey);
    await this.repo.deleteByIdForMerchant(docId, merchantId);
  }
}
