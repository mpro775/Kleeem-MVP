// src/modules/documents/__tests__/documents.service.spec.ts
// يغطي DocumentsService: uploadFile / list / getPresignedUrl / delete (مسارات النجاح والأخطاء)
// Arrange–Act–Assert

import { NotFoundException } from '@nestjs/common';
import { mock } from 'jest-mock-extended';
import type { Model } from 'mongoose';
import type { Queue } from 'bull';
import { faker } from '@faker-js/faker';
import { DocumentsService } from '../documents.service';
import type { DocumentDocument } from '../schemas/document.schema';

// موك unlink (يُستورد في الخدمة من node:fs/promises)
jest.mock('node:fs/promises', () => ({
  unlink: jest.fn().mockResolvedValue(undefined),
}));
import { unlink } from 'node:fs/promises';

describe('DocumentsService', () => {
  const MINIO_BUCKET = 'test-bucket';
  let svc: DocumentsService;
  const docModel = mock<Model<DocumentDocument>>();
  const queue = mock<Queue>();

  const minioMock = {
    fPutObject: jest.fn(),
    presignedUrl: jest.fn(),
    removeObject: jest.fn(),
  };

  const fixedNow = 1712345678901;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(fixedNow);
    jest.spyOn(Date, 'now').mockReturnValue(fixedNow);

    process.env.MINIO_BUCKET = MINIO_BUCKET;
    process.env.MINIO_ENDPOINT = 'localhost';
    process.env.MINIO_PORT = '9000';
    process.env.MINIO_USE_SSL = 'false';
    process.env.MINIO_ACCESS_KEY = 'ak';
    process.env.MINIO_SECRET_KEY = 'sk';

    // إنشاء الخدمة ثم استبدال عميل MinIO بموك
    // ملاحظة: المُنشئ يقرأ env فقط؛ لا يوجد I/O فعلي.
    svc = new DocumentsService(docModel as any, queue as any);
    (svc as any).minio = minioMock;
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  function buildFile(
    overrides: Partial<Express.Multer.File> = {},
  ): Express.Multer.File & { key?: string } {
    return {
      fieldname: 'file',
      originalname: overrides.originalname ?? 'file.pdf',
      encoding: '7bit',
      mimetype: overrides.mimetype ?? 'application/pdf',
      size: 123,
      destination: '/tmp',
      filename: 'upload.tmp',
      path: overrides['path' as any] ?? '/tmp/upload.tmp',
      stream: undefined as any,
      buffer: Buffer.alloc(0),
    } as any;
  }

  test('uploadFile: يرفع إلى MinIO، يُنشئ وثيقة، يضيف مهمتين، ويحذف الملف المؤقت دائمًا', async () => {
    const merchantId = faker.string.uuid();
    const file = buildFile();

    const createdId = faker.string.uuid();
    const createdDoc = {
      id: createdId,
      toObject: () => ({
        _id: createdId,
        merchantId,
        filename: file.originalname,
        fileType: file.mimetype,
        storageKey: `${fixedNow}-${file.originalname}`,
        status: 'pending',
      }),
    };

    minioMock.fPutObject.mockResolvedValue(undefined);
    (docModel.create as any).mockResolvedValue(createdDoc);
    queue.add.mockResolvedValue(undefined as any);

    const result = await svc.uploadFile(merchantId, file);

    // MinIO upload
    expect(minioMock.fPutObject).toHaveBeenCalledWith(
      MINIO_BUCKET,
      `${fixedNow}-${file.originalname}`,
      file.path,
      { 'Content-Type': file.mimetype },
    );

    // Mongo create
    expect(docModel.create).toHaveBeenCalledWith({
      merchantId,
      filename: file.originalname,
      fileType: file.mimetype,
      storageKey: `${fixedNow}-${file.originalname}`,
      status: 'pending',
    });

    // Bull queue added مرتين
    expect(queue.add).toHaveBeenCalledTimes(2);
    expect(queue.add).toHaveBeenNthCalledWith(1, 'process', {
      docId: createdId,
      merchantId,
    });
    expect(queue.add).toHaveBeenNthCalledWith(2, 'process', {
      docId: createdId,
      merchantId,
    });

    // النتيجة
    expect(result).toMatchObject({
      _id: createdId,
      merchantId,
      filename: file.originalname,
    });

    // حذف الملف المؤقت
    expect(unlink).toHaveBeenCalledWith(file.path);
  });

  test('uploadFile: عند فشل رفع MinIO يرمي الخطأ ومع ذلك يحاول حذف الملف المؤقت', async () => {
    const merchantId = faker.string.uuid();
    const file = buildFile();

    const err = new Error('minio failed');
    minioMock.fPutObject.mockRejectedValue(err);

    await expect(svc.uploadFile(merchantId, file)).rejects.toThrow(err);

    expect(docModel.create).not.toHaveBeenCalled();
    expect(queue.add).not.toHaveBeenCalled();
    expect(unlink).toHaveBeenCalledWith(file.path);
  });

  test('list: يعيد نتائج مرتبة تنازليًا حسب createdAt', async () => {
    const merchantId = faker.string.uuid();
    const lean = jest.fn().mockResolvedValue([{ _id: 'd1' }, { _id: 'd2' }]);
    const sort = jest.fn().mockReturnValue({ lean });
    (docModel.find as any).mockReturnValue({ sort });

    const data = await svc.list(merchantId);
    expect(docModel.find).toHaveBeenCalledWith({ merchantId });
    expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(lean).toHaveBeenCalled();
    expect(data).toHaveLength(2);
  });

  test('getPresignedUrl: يعيد رابط موقّت لمدة 86400 ثانية ويقرأ الوثيقة', async () => {
    const merchantId = faker.string.uuid();
    const docId = faker.string.uuid();
    const storageKey = 'k1';
    const url = 'https://minio/presigned';

    const lean = jest.fn().mockResolvedValue({
      _id: docId,
      merchantId,
      storageKey,
    });
    (docModel.findOne as any).mockReturnValue({ lean });
    minioMock.presignedUrl.mockResolvedValue(url);

    const result = await svc.getPresignedUrl(merchantId, docId);

    expect(docModel.findOne).toHaveBeenCalledWith({ _id: docId, merchantId });
    expect(minioMock.presignedUrl).toHaveBeenCalledWith(
      'GET',
      MINIO_BUCKET,
      storageKey,
      24 * 60 * 60,
    );
    expect(result).toBe(url);
  });

  test('getPresignedUrl: يرمي NotFoundException إن لم توجد الوثيقة', async () => {
    const merchantId = faker.string.uuid();
    const docId = faker.string.uuid();

    const lean = jest.fn().mockResolvedValue(null);
    (docModel.findOne as any).mockReturnValue({ lean });

    await expect(svc.getPresignedUrl(merchantId, docId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(minioMock.presignedUrl).not.toHaveBeenCalled();
  });

  test('delete: يحذف من MinIO ثم من MongoDB', async () => {
    const merchantId = faker.string.uuid();
    const docId = faker.string.uuid();
    const storageKey = 'key-123';

    const findLean = jest
      .fn()
      .mockResolvedValue({ _id: docId, merchantId, storageKey });
    (docModel.findOne as any).mockReturnValue({ lean: findLean });
    (docModel.deleteOne as any).mockReturnValue({
      exec: jest.fn().mockResolvedValue({ deletedCount: 1 }),
    });

    await svc.delete(merchantId, docId);

    expect(minioMock.removeObject).toHaveBeenCalledWith(
      MINIO_BUCKET,
      storageKey,
    );
    expect(docModel.deleteOne).toHaveBeenCalledWith({ _id: docId });
  });

  test('delete: يرمي NotFoundException إن لم توجد الوثيقة', async () => {
    (docModel.findOne as any).mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
    });

    await expect(
      svc.delete(faker.string.uuid(), faker.string.uuid()),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(minioMock.removeObject).not.toHaveBeenCalled();
    expect(docModel.deleteOne).not.toHaveBeenCalled();
  });
});
