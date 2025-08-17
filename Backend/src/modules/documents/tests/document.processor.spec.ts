// src/modules/documents/__tests__/document.processor.spec.ts
// يغطي DocumentProcessor.process: مسار PDF (سعيد) + أخطاء (لا وثيقة / فشل embedding / نوع غير مدعوم)
// Arrange–Act–Assert

import { Readable } from 'stream';
import { mock } from 'jest-mock-extended';
import type { Model } from 'mongoose';
import { faker } from '@faker-js/faker';
import type { Job } from 'bull';
import { DocumentProcessor } from '../processors/document.processor';
import type { DocumentsService } from '../documents.service';
import type { VectorService } from '../../vector/vector.service';
import type { DocumentSchemaClass } from '../schemas/document.schema';

// موك لوحدة fs: readFileSync و promises.writeFile/unlink
jest.mock('fs', () => ({
  readFileSync: jest.fn(() => Buffer.from('PDFDATA')),
  promises: {
    writeFile: jest.fn().mockResolvedValue(undefined),
    unlink: jest.fn().mockResolvedValue(undefined),
  },
}));
import { readFileSync } from 'fs';
import { promises as fs } from 'fs';

// موك pdf/mammoth/XLSX
jest.mock('pdf-parse', () => jest.fn());
import pdfParse from 'pdf-parse';

jest.mock('mammoth', () => ({ extractRawText: jest.fn() }));
import mammoth from 'mammoth';

jest.mock('xlsx', () => ({ readFile: jest.fn(), utils: { sheet_to_csv: jest.fn() } }));
import * as XLSX from 'xlsx';

describe('DocumentProcessor', () => {
  const fixedNow = 1712345678901;

  const minio = {
    getObject: jest.fn(),
  };

  const docsSvc = { minio } as unknown as DocumentsService;
  const docModel = mock<Model<DocumentSchemaClass>>();
  const vectorService = {
    embed: jest.fn(),
    upsertDocumentChunks: jest.fn(),
  } as unknown as VectorService;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(fixedNow);
    jest.spyOn(Date, 'now').mockReturnValue(fixedNow);

    process.env.MINIO_BUCKET = 'test-bucket';

    minio.getObject.mockReset();
    (readFileSync as jest.Mock).mockReturnValue(Buffer.from('PDFDATA'));
    (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
    (fs.unlink as jest.Mock).mockResolvedValue(undefined);
    (pdfParse as jest.Mock).mockReset();
    (mammoth as any).extractRawText.mockReset();
    (XLSX.readFile as jest.Mock).mockReset();
    (XLSX.utils.sheet_to_csv as jest.Mock).mockReset();

    (vectorService.embed as any).mockReset().mockResolvedValue([0.1, 0.2, 0.3]);
    (vectorService.upsertDocumentChunks as any).mockReset().mockResolvedValue(undefined);

    (docModel.findByIdAndUpdate as any).mockReset().mockReturnValue({
      exec: jest.fn().mockResolvedValue(undefined),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  function buildJob(docId = faker.string.uuid()): Job<any> {
    return { id: 'j1', data: { docId, merchantId: faker.string.uuid() } } as any;
  }

  test('مسار PDF سعيد: استخراج → تقسيم → embed → upsert → تحديث الحالة إلى completed وحذف الملف المؤقت', async () => {
    const docId = 'doc-pdf-1';
    const job = buildJob(docId);

    // وثيقة PDF
    const doc = {
      _id: docId,
      merchantId: 'm1',
      fileType: 'application/pdf',
      storageKey: 's1',
    };
    (docModel.findById as any).mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) });

    // تنزيل من MinIO
    minio.getObject.mockResolvedValue(Readable.from([Buffer.from('file-bytes')]));

    // نص طويل لعمل 3 قطع (maxChunkSize=500)
    (pdfParse as jest.Mock).mockResolvedValue({ text: 'a'.repeat(1201) });

    const processor = new DocumentProcessor(docsSvc, docModel as any, vectorService as any);

    await processor.process(job);

    // تحديثات الحالة
    expect(docModel.findByIdAndUpdate).toHaveBeenNthCalledWith(1, docId, { status: 'processing' });
    expect(docModel.findByIdAndUpdate).toHaveBeenNthCalledWith(2, docId, { status: 'completed' });

    // تم استدعاء embed لعدد القطع
    expect((vectorService.embed as any).mock.calls.length).toBe(3);

    // upsert تم لعدد القطع
    expect(vectorService.upsertDocumentChunks).toHaveBeenCalledTimes(1);
    const upsertArg = (vectorService.upsertDocumentChunks as any).mock.calls[0][0];
    expect(Array.isArray(upsertArg)).toBe(true);
    expect(upsertArg).toHaveLength(3);

    // حذف الملف المؤقت
    expect(fs.unlink).toHaveBeenCalled();
  });

  test('عند عدم العثور على الوثيقة في MongoDB → تحديث الحالة إلى failed وعدم استدعاء upsert', async () => {
    const job = buildJob('doc-missing');
    (docModel.findById as any).mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
    minio.getObject.mockResolvedValue(Readable.from([Buffer.from('x')]));

    const processor = new DocumentProcessor(docsSvc, docModel as any, vectorService as any);
    await processor.process(job);

    expect(docModel.findByIdAndUpdate).toHaveBeenCalledWith(job.data.docId, { status: 'failed', errorMessage: 'Document not found in MongoDB' });
    expect(vectorService.upsertDocumentChunks).not.toHaveBeenCalled();
    // لم يُنشأ ملف مؤقت لذا قد لا يُستدعى unlink — لا إلزام هنا.
  });

  test('عند فشل embed لقطعة ما → تحديث الحالة إلى failed وعدم استدعاء upsert', async () => {
    const docId = 'doc-embed-fail';
    const job = buildJob(docId);

    (docModel.findById as any).mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: docId,
        merchantId: 'm1',
        fileType: 'application/pdf',
        storageKey: 's1',
      }),
    });
    minio.getObject.mockResolvedValue(Readable.from([Buffer.from('file')]));
    (pdfParse as jest.Mock).mockResolvedValue({ text: 'b'.repeat(900) }); // قطعتان

    // أول embed ينجح، الثاني يفشل
    (vectorService.embed as any)
      .mockResolvedValueOnce([0.1])
      .mockRejectedValueOnce(new Error('embedding service down'));

    const processor = new DocumentProcessor(docsSvc, docModel as any, vectorService as any);
    await processor.process(job);

    expect(vectorService.upsertDocumentChunks).not.toHaveBeenCalled();
    // الحالة failed
    const lastCall = (docModel.findByIdAndUpdate as any).mock.calls.pop();
    expect(lastCall[0]).toBe(docId);
    expect(lastCall[1].status).toBe('failed');
    expect(typeof lastCall[1].errorMessage).toBe('string');
    expect(fs.unlink).toHaveBeenCalled(); // تنظيف الملف المؤقت
  });

  test('نوع غير مدعوم → failed', async () => {
    const docId = 'doc-unsupported';
    const job = buildJob(docId);

    (docModel.findById as any).mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: docId,
        merchantId: 'm1',
        fileType: 'text/plain',
        storageKey: 's2',
      }),
    });
    minio.getObject.mockResolvedValue(Readable.from([Buffer.from('x')]));

    const processor = new DocumentProcessor(docsSvc, docModel as any, vectorService as any);
    await processor.process(job);

    // لم يتم upsert
    expect(vectorService.upsertDocumentChunks).not.toHaveBeenCalled();
    // الحالة failed
    expect(docModel.findByIdAndUpdate).toHaveBeenCalledWith(docId, expect.objectContaining({ status: 'failed' }));
    expect(fs.unlink).toHaveBeenCalled();
  });

  test('مسار DOCX يستخدم mammoth.extractRawText', async () => {
    const docId = 'doc-docx';
    const job = buildJob(docId);

    (docModel.findById as any).mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: docId,
        merchantId: 'm1',
        fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        storageKey: 's3',
      }),
    });
    minio.getObject.mockResolvedValue(Readable.from([Buffer.from('x')]));
    (mammoth as any).extractRawText.mockResolvedValue({ value: 'Hello DOCX' });

    const processor = new DocumentProcessor(docsSvc, docModel as any, vectorService as any);
    await processor.process(job);

    expect((mammoth as any).extractRawText).toHaveBeenCalledWith(expect.objectContaining({ path: expect.any(String) }));
    expect(vectorService.embed).toHaveBeenCalled();
    expect(vectorService.upsertDocumentChunks).toHaveBeenCalled();
    expect(docModel.findByIdAndUpdate).toHaveBeenCalledWith(docId, { status: 'completed' });
  });
});
