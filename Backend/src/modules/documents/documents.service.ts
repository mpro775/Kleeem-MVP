import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { Client as MinioClient } from 'minio';
import { unlink } from 'node:fs/promises'; // ✅ استخدم هذا

import {
  DocumentDocument,
  DocumentSchemaClass,
} from './schemas/document.schema';

@Injectable()
export class DocumentsService {
  public minio: MinioClient;
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    @InjectModel(DocumentSchemaClass.name)
    private readonly docModel: Model<DocumentDocument>,
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
  ) {
    const storageKey = `${Date.now()}-${file.originalname}`;
    this.logger.log('=== رفع ملف جديد ===');
    this.logger.log('بيانات الملف:', file);
    try {
      // 1. ارفع الملف إلى MinIO
      this.logger.log(`جاري رفع الملف إلى MinIO باسم: ${storageKey}`);

      await this.minio.fPutObject(
        process.env.MINIO_BUCKET!,
        storageKey,
        file.path,
        { 'Content-Type': file.mimetype },
      );
      this.logger.log('✅ تم رفع الملف بنجاح إلى MinIO.');

      // 2. احفظ البيانات في MongoDB
      const doc = await this.docModel.create({
        merchantId,
        filename: file.originalname,
        fileType: file.mimetype,
        storageKey,
        status: 'pending',
      });
      await this.queue.add('process', { docId: doc.id.toString(), merchantId });
      this.logger.log('✅ تم إنشاء السجل في MongoDB:', doc.id);

      await this.queue.add('process', { docId: doc.id.toString(), merchantId });
      this.logger.log('✅ تم إضافة المهمة للـ Queue.');
      return doc.toObject();
    } catch (error) {
      this.logger.error('رفع الملف إلى MinIO فشل:', error);
      throw error;
    } finally {
      // 3. حذف الملف المحلي دائماً بعد أي محاولة رفع
      try {
        await unlink(file.path); // هنا لا تحتاج fs.unlink فقط unlink مباشرة
        this.logger.log('تم حذف الملف المؤقت:', file.path);
      } catch {
        this.logger.warn('لم يتم حذف الملف المؤقت أو غير موجود:', file.path);
      }
    }
  }
  async list(merchantId: string) {
    return this.docModel.find({ merchantId }).sort({ createdAt: -1 }).lean();
  }

  async getPresignedUrl(merchantId: string, docId: string) {
    const doc = await this.docModel.findOne({ _id: docId, merchantId }).lean();
    if (!doc) throw new NotFoundException('Document not found');
    const expires = 24 * 60 * 60; // ساعة واحدة
    return this.minio.presignedUrl(
      'GET',
      process.env.MINIO_BUCKET!,
      doc.storageKey,
      expires,
    );
  }

  async delete(merchantId: string, docId: string) {
    const doc = await this.docModel.findOne({ _id: docId, merchantId });
    if (!doc) throw new NotFoundException('Document not found');
    // حذف من MinIO
    await this.minio.removeObject(process.env.MINIO_BUCKET!, doc.storageKey);
    await this.docModel.deleteOne({ _id: docId }).exec();
  }
}
