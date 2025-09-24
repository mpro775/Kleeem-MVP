// src/media/media.spec.ts
// يغطي MediaService (handleMedia + فروع الصوت/الصورة/المستند) + MediaController (upload/getFile)
// + ChatMediaService (رفع إلى MinIO) — بدون أي I/O حقيقي.
// Arrange–Act–Assert

import * as fsSync from 'fs';
import * as fsPromises from 'fs/promises';
import { unlink as unlinkNodeFs } from 'node:fs/promises';

import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import axios from 'axios';
import { type DeepMockProxy, mockDeep } from 'jest-mock-extended';
import mammoth from 'mammoth';
import * as mime from 'mime-types';
import pdfParse from 'pdf-parse';
import Tesseract from 'tesseract.js';
import * as xlsx from 'xlsx';

import { ChatMediaService } from '../chat-media.service';
import { MediaType } from '../dto/media-handler.dto';
import { MediaController } from '../media.controller';
import { MediaService } from '../media.service';

import type { MediaHandlerDto } from '../dto/media-handler.dto';
import type { Response } from 'express';

// ====== Mocks ======
jest.mock('axios', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() },
}));

jest.mock('fs/promises', () => ({
  __esModule: true,
  writeFile: jest.fn(),
  unlink: jest.fn(),
}));

jest.mock('fs', () => ({
  __esModule: true,
  readFileSync: jest.fn(),
}));

jest.mock('tesseract.js', () => ({
  __esModule: true,
  default: { recognize: jest.fn() },
}));

jest.mock('pdf-parse', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('mammoth', () => ({
  __esModule: true,
  default: { extractRawText: jest.fn() },
}));

jest.mock('xlsx', () => ({
  __esModule: true,
  readFile: jest.fn(),
  utils: { sheet_to_csv: jest.fn() },
}));

jest.mock('mime-types', () => ({
  __esModule: true,
  lookup: jest.fn(),
}));

// MinIO + unlink (node:fs/promises) لمكوّن ChatMediaService
const fPutObjectMock = jest.fn();
const presignedUrlMock = jest.fn();
jest.mock('minio', () => ({
  Client: jest.fn().mockImplementation(() => ({
    fPutObject: fPutObjectMock,
    presignedUrl: presignedUrlMock,
  })),
}));
jest.mock('node:fs/promises', () => ({
  unlink: jest.fn(),
}));

// ====== Helpers ======
const setDateNow = (value: number) => {
  jest.spyOn(Date, 'now').mockReturnValue(value);
};

describe('MediaService', () => {
  let service: MediaService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MediaService(new ConfigService());
    setDateNow(1_700_000_000_000); // ثابت لتوليد اسم الملف المؤقت
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('AUDIO/VOICE: يحوّل الصوت إلى نص عبر Deepgram ثم يحذف الملف المؤقت (happy path)', async () => {
    const dto: MediaHandlerDto = {
      type: MediaType.AUDIO,
      fileUrl: 'https://cdn.example.com/audio/file.mp3',
    };

    (axios.get as any).mockResolvedValue({ data: new Uint8Array([1, 2, 3]) });
    (fsPromises.writeFile as jest.Mock).mockResolvedValue(undefined);
    (fsSync.readFileSync as jest.Mock).mockReturnValue(Buffer.from('AUDIO'));
    (mime.lookup as jest.Mock).mockReturnValue('audio/mpeg');

    (axios.post as any).mockResolvedValue({
      data: {
        results: {
          channels: [{ alternatives: [{ transcript: 'hello world' }] }],
        },
      },
    });

    const res = await service.handleMedia(dto);

    expect(axios.get.bind(axios)).toHaveBeenCalledWith(dto.fileUrl, {
      responseType: 'arraybuffer',
    });
    expect(fsPromises.writeFile).toHaveBeenCalledWith(
      '/tmp/media-1700000000000.mp3',
      expect.any(Buffer),
    );
    // التحقق من استدعاء Deepgram برأس Authorization و Content-Type
    const postArgs = axios.post.bind(axios).mock.calls[0];
    expect(postArgs[0]).toBe('https://api.deepgram.com/v1/listen');
    expect(postArgs[2].headers.Authorization).toMatch(/^Token\s+/);
    expect(postArgs[2].headers['Content-Type']).toBe('audio/mpeg');

    expect(res.text).toBe('hello world');
    expect(fsPromises.unlink).toHaveBeenCalledWith(
      '/tmp/media-1700000000000.mp3',
    );
  });

  it('AUDIO: يعيد رسالة فشل عند عدم وجود transcript', async () => {
    const dto: MediaHandlerDto = {
      type: MediaType.VOICE,
      fileUrl: 'http://x/file.ogg',
    };
    axios.get.bind(axios).mockResolvedValue({ data: new Uint8Array([0]) });
    (fsPromises.writeFile as jest.Mock).mockResolvedValue(undefined);
    (fsSync.readFileSync as jest.Mock).mockReturnValue(Buffer.from('O'));
    (mime.lookup as jest.Mock).mockReturnValue('audio/ogg');
    axios.post.bind(axios).mockResolvedValue({
      data: { results: { channels: [{ alternatives: [{ transcript: '' }] }] } },
    });

    const res = await service.handleMedia(dto);

    expect(res.text).toBe('[فشل التحويل الصوتي]');
    expect(fsPromises.unlink).toHaveBeenCalled();
  });

  it('AUDIO: يعيد رسالة خطأ عند فشل الاتصال بـ Deepgram', async () => {
    const dto: MediaHandlerDto = {
      type: MediaType.AUDIO,
      fileUrl: 'http://x/f.mp3',
    };
    axios.get.bind(axios).mockResolvedValue({ data: new Uint8Array([1]) });
    (fsPromises.writeFile as jest.Mock).mockResolvedValue(undefined);
    (fsSync.readFileSync as jest.Mock).mockReturnValue(Buffer.from('AUDIO'));
    (mime.lookup as jest.Mock).mockReturnValue('audio/mpeg');
    axios.post.bind(axios).mockRejectedValue(new Error('dg down'));

    const res = await service.handleMedia(dto);
    expect(res.text).toBe('[خطأ في تحويل الصوت للنص]');
    expect(fsPromises.unlink).toHaveBeenCalled();
  });

  it('IMAGE/PHOTO: يستخدم Tesseract ويعيد النص المستخرج', async () => {
    const dto: MediaHandlerDto = {
      type: MediaType.IMAGE,
      fileUrl: 'http://x/img.jpg',
    };
    axios.get.bind(axios).mockResolvedValue({ data: new Uint8Array([9, 9]) });
    (fsPromises.writeFile as jest.Mock).mockResolvedValue(undefined);
    (Tesseract as any).recognize.mockResolvedValue({ data: { text: 'مرحبا' } });

    const res = await service.handleMedia(dto);

    expect((Tesseract as any).recognize.bind(Tesseract)).toHaveBeenCalledWith(
      '/tmp/media-1700000000000.jpg',
      'ara+eng',
    );
    expect(res.text).toBe('نص الصورة: مرحبا');
    expect(fsPromises.unlink).toHaveBeenCalled();
  });

  it('IMAGE: يعيد رسالة خطأ عند فشل Tesseract', async () => {
    const dto: MediaHandlerDto = {
      type: MediaType.PHOTO,
      fileUrl: 'http://x/p.png',
    };
    axios.get.bind(axios).mockResolvedValue({ data: new Uint8Array([1]) });
    (fsPromises.writeFile as jest.Mock).mockResolvedValue(undefined);
    (Tesseract as any).recognize
      .bind(Tesseract)
      .mockRejectedValue(new Error('ocr fail'));

    const res = await service.handleMedia(dto);
    expect(res.text).toBe('[خطأ في استخراج نص من الصورة]');
    expect(fsPromises.unlink).toHaveBeenCalled();
  });

  it('PDF: يستخرج النص عبر pdf-parse وإلّا يعيد رسالة خطأ', async () => {
    const dto: MediaHandlerDto = {
      type: MediaType.PDF,
      fileUrl: 'http://x/doc.pdf',
      mimeType: 'application/pdf',
    };
    axios.get.bind(axios).mockResolvedValue({ data: new Uint8Array([1]) });
    (fsPromises.writeFile as jest.Mock).mockResolvedValue(undefined);
    (fsSync.readFileSync as jest.Mock).mockReturnValue(Buffer.from('%PDF-1.7'));
    (pdfParse as jest.Mock).mockResolvedValue({ text: 'PDF TEXT' });

    const ok = await service.handleMedia(dto);
    expect(ok.text).toBe('PDF TEXT');

    // فشل pdf-parse
    (pdfParse as jest.Mock).mockRejectedValueOnce(new Error('pdf err'));
    const bad = await service.handleMedia(dto);
    expect(bad.text).toBe('[خطأ في استخراج النص من PDF]');
  });

  it('DOCX: يستخدم mammoth.extractRawText ويعيد "[لا يوجد نص]" عند غياب القيمة', async () => {
    const dto: MediaHandlerDto = {
      type: MediaType.DOCUMENT,
      fileUrl: 'http://x/doc.docx',
      mimeType:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
    axios.get.bind(axios).mockResolvedValue({ data: new Uint8Array([1]) });
    (fsPromises.writeFile as jest.Mock).mockResolvedValue(undefined);
    (mammoth as any).extractRawText.mockResolvedValueOnce({
      value: 'Hello from Word',
    });
    let res = await service.handleMedia(dto);
    expect(res.text).toBe('Hello from Word');

    (mammoth as any).extractRawText.mockResolvedValueOnce({ value: '' });
    res = await service.handleMedia(dto);
    expect(res.text).toBe('[لا يوجد نص في ملف Word]');
  });

  it('XLSX: يقرأ الورقة ويحوّلها إلى CSV مجمّع', async () => {
    const dto: MediaHandlerDto = {
      type: MediaType.DOCUMENT,
      fileUrl: 'http://x/file.xlsx',
      mimeType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
    (axios.get as any).mockResolvedValue({ data: new Uint8Array([1]) });
    (fsPromises.writeFile as jest.Mock).mockResolvedValue(undefined);
    (xlsx.readFile as jest.Mock).mockReturnValue({
      SheetNames: ['S1', 'S2'],
      Sheets: { S1: {}, S2: {} },
    });
    (xlsx.utils.sheet_to_csv as jest.Mock)
      .mockReturnValueOnce('a,b\n')
      .mockReturnValueOnce('c,d\n');

    const res = await service.handleMedia(dto);
    expect(res.text).toBe('a,b\nc,d\n');
  });

  it('نوع غير مدعوم: يُعيد رسالة "[نوع ملف غير مدعوم]"', async () => {
    const dto: MediaHandlerDto = {
      type: MediaType.TEXT,
      fileUrl: 'http://x/file.bin',
    };
    (axios.get as any).mockResolvedValue({ data: new Uint8Array([1]) });
    (fsPromises.writeFile as jest.Mock).mockResolvedValue(undefined);

    const res = await service.handleMedia(dto);
    expect(res.text).toBe('[نوع ملف غير مدعوم]');
    expect(fsPromises.unlink).toHaveBeenCalled();
  });
});

describe('MediaController', () => {
  let moduleRef: TestingModule;
  let controller: MediaController;
  let svc: DeepMockProxy<MediaService>;
  let res: Response;

  beforeEach(async () => {
    jest.clearAllMocks();
    svc = mockDeep<MediaService>();
    moduleRef = await Test.createTestingModule({
      controllers: [MediaController],
      providers: [{ provide: MediaService, useValue: svc }],
    }).compile();

    controller = moduleRef.get(MediaController);
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      sendFile: jest.fn(),
    } as any as Response;
  });

  afterAll(async () => {
    await moduleRef?.close();
    jest.restoreAllMocks();
  });

  it('POST /media/upload: يُرجع 201 مع نتيجة handleMedia عند وجود ملف', async () => {
    const dto: MediaHandlerDto = {
      type: MediaType.IMAGE,
      fileUrl: 'http://x/a.jpg',
    };
    const out = { text: 'ok' };
    svc.handleMedia.mockResolvedValue(out as any);

    await controller.uploadFile({} as any, dto, res);

    expect(svc.handleMedia.bind(svc)).toHaveBeenCalledWith(dto);
    expect(res.status.bind(res)).toHaveBeenCalledWith(201);
    expect(res.json.bind(res)).toHaveBeenCalledWith(out);
  });

  it('POST /media/upload: يرمي خطأ عند عدم وجود ملف', async () => {
    const dto: MediaHandlerDto = {
      type: MediaType.IMAGE,
      fileUrl: 'http://x/a.jpg',
    };
    await expect(
      controller.uploadFile(undefined as any, dto, res),
    ).rejects.toThrow('No file uploaded');
  });

  it('GET /media/file/:id: يستدعي sendFile بالجذر الصحيح', () => {
    controller.getFile('x.png', res);
    expect(res.sendFile.bind(res)).toHaveBeenCalledWith('x.png', {
      root: './uploads',
    });
  });
});

describe('ChatMediaService', () => {
  let service: ChatMediaService;

  const ENV = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...ENV,
      MINIO_ENDPOINT: 'minio.local',
      MINIO_PORT: '9000',
      MINIO_USE_SSL: 'false',
      MINIO_ACCESS_KEY: 'ak',
      MINIO_SECRET_KEY: 'sk',
      MINIO_BUCKET: 'bucket1',
    };
    setDateNow(1_700_000_111_000);
    service = new ChatMediaService(); // سيستخدم Minio.Client الموك
  });

  afterAll(() => {
    process.env = ENV;
    jest.restoreAllMocks();
  });

  it('يرفع الملف إلى MinIO، ينشئ مفتاح تخزين ثابت، يولد URL موقّت، ويحذف الملف المؤقت', async () => {
    presignedUrlMock.mockResolvedValue('https://signed.example.com/file');
    (unlinkNodeFs as jest.Mock).mockResolvedValue(undefined);
    fPutObjectMock.mockResolvedValue(undefined);

    const out = await service.uploadChatMedia(
      'm_1',
      '/tmp/tmp-1.png',
      'image.png',
      'image/png',
    );

    const expectedKey = `chat-media/m_1/1700000111000-image.png`;
    expect(fPutObjectMock).toHaveBeenCalledWith(
      'bucket1',
      expectedKey,
      '/tmp/tmp-1.png',
      { 'Content-Type': 'image/png' },
    );
    expect(presignedUrlMock).toHaveBeenCalledWith(
      'GET',
      'bucket1',
      expectedKey,
      7 * 24 * 60 * 60,
    );
    expect(unlinkNodeFs).toHaveBeenCalledWith('/tmp/tmp-1.png');
    expect(out).toEqual({
      storageKey: expectedKey,
      presignedUrl: 'https://signed.example.com/file',
    });
  });
});
