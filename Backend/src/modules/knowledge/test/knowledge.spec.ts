// src/modules/knowledge/knowledge.spec.ts
// يغطي KnowledgeService (addUrls/processUrlsInBackground/getUrlsStatus/getUrls) و KnowledgeController
// بدون أي I/O (لا Playwright، لا DB حقيقي). Arrange–Act–Assert.

import { faker } from '@faker-js/faker';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { Model } from 'mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';

import { KnowledgeService } from '../knowledge.service';
import { KnowledgeController } from '../knowledge.controller';
import { SourceUrl } from '../schemas/source-url.schema';
import { VectorService } from '../../vector/vector.service';

describe('KnowledgeService', () => {
  let model: DeepMockProxy<Model<SourceUrl>>;
  let vector: DeepMockProxy<VectorService>;
  let service: KnowledgeService;

  beforeEach(() => {
    model = mockDeep<Model<SourceUrl>>();
    vector = mockDeep<VectorService>();
    service = new KnowledgeService(model as unknown as Model<SourceUrl>, vector);
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('addUrls', () => {
    it('يحفظ الروابط كـ pending ويستدعي المعالجة الخلفية ثم يعيد ردًا فوريًا (happy path)', async () => {
      const merchantId = `m_${faker.string.numeric(6)}`;
      const urls = [faker.internet.url(), faker.internet.url()];
      const records = urls.map((url, i) => ({ _id: `id_${i + 1}`, url, status: 'pending' }));

      model.insertMany.mockResolvedValue(records as any);
      const bgSpy = jest
        .spyOn<any, any>(service as any, 'processUrlsInBackground')
        .mockResolvedValue({ success: true, count: records.length });

      const res = await service.addUrls(merchantId, urls);

      expect(model.insertMany).toHaveBeenCalledWith(
        urls.map((url) => ({ merchantId, url, status: 'pending' })),
      );
      expect(bgSpy).toHaveBeenCalledWith(merchantId, records);
      expect(res).toEqual({
        success: true,
        count: records.length,
        message: 'URLs queued for processing',
      });
    });

    it('إن فشلت المعالجة الخلفية: يتم تسجيل الخطأ لكن يبقى رد create ناجحًا', async () => {
      const merchantId = `m_${faker.string.numeric(6)}`;
      const urls = [faker.internet.url()];
      const records = [{ _id: 'rec1', url: urls[0], status: 'pending' }];

      model.insertMany.mockResolvedValue(records as any);
      jest
        .spyOn<any, any>(service as any, 'processUrlsInBackground')
        .mockRejectedValue(new Error('bg exploded'));
      const logSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();

      const res = await service.addUrls(merchantId, urls);
      // انتظر دورة microtask حتى يعمل .catch()
      await Promise.resolve();

      expect(res.success).toBe(true);
      expect(logSpy).toHaveBeenCalled();
      expect(logSpy.mock.calls[0][0]).toContain('Background processing failed');
    });
  });

  describe('processUrlsInBackground (سلوك المعالجة والتجزئة)', () => {
    it('يعالج النص: يتجاوز المقاطع القصيرة، ويُدمج المفيدة فقط، ويُحدّث الحالة إلى completed', async () => {
      const merchantId = `m_${faker.string.numeric(6)}`;
      const rec1 = { _id: 'r1', url: 'https://example.com/a' };
      const rec2 = { _id: 'r2', url: 'https://example.com/b' };
      const records = [rec1, rec2] as any[];

      // نص عربي طويل (>= 30 chars ولديه >= 3 أحرف عربية) → يُعتبر مفيدًا
      const longArabic =
        'هذا نص عربي طويل يحتوي على معلومات مفيدة جدًا حول المنتج والسياسات المختلفة';
      // نص قصير جدًا → يُتجاوز
      const tooShort = 'قصير';

      // ملاحظة: الدالة تستدعي extractTextFromUrl مرتين لكل record (قبل try وداخل try)
      const extractSpy = jest
        .spyOn<any, any>(service as any, 'extractTextFromUrl')
        .mockResolvedValueOnce({ text: longArabic }) // rec1 قبل try
        .mockResolvedValueOnce({ text: longArabic }) // rec1 داخل try
        .mockResolvedValueOnce({ text: tooShort })   // rec2 قبل try
        .mockResolvedValueOnce({ text: tooShort });  // rec2 داخل try

      const vec = [0.11, 0.22, 0.33];
      vector.embed.mockResolvedValue(vec as any);
      vector.generateWebKnowledgeId.mockReturnValue('wk_1');
      vector.upsertWebKnowledge.mockResolvedValue(undefined as any);

      model.updateOne.mockResolvedValue({ acknowledged: true } as any);

      const out = await (service as any).processUrlsInBackground(merchantId, records);

      // rec1: تم embedding لقطعة واحدة (chunk index = 0) لأنها مفيدة
      expect(vector.embed).toHaveBeenCalledTimes(1);
      expect(vector.embed).toHaveBeenCalledWith(longArabic);

      expect(vector.generateWebKnowledgeId).toHaveBeenCalledWith(merchantId, `${rec1.url}#0`);
      expect(vector.upsertWebKnowledge).toHaveBeenCalledTimes(1);
      expect(vector.upsertWebKnowledge).toHaveBeenCalledWith([
        {
          id: 'wk_1',
          vector: vec,
          payload: {
            merchantId,
            url: rec1.url,
            text: longArabic,
            type: 'url',
            source: 'web',
          },
        },
      ]);

      // rec1 + rec2: كلاهما يُحدّثان إلى completed مع textExtracted
      expect(model.updateOne).toHaveBeenCalledWith(
        { _id: rec1._id },
        { status: 'completed', textExtracted: longArabic },
      );
      expect(model.updateOne).toHaveBeenCalledWith(
        { _id: rec2._id },
        { status: 'completed', textExtracted: tooShort },
      );

      expect(out).toEqual({ success: true, count: records.length });
      expect(extractSpy).toHaveBeenCalledTimes(4);
    });

    it('عند فشل الاستخراج داخل try لعنصر ما: يُسجّل الخطأ وتُعلّم الحالة failed مع errorMessage', async () => {
      const merchantId = `m_${faker.string.numeric(6)}`;
      const rec1 = { _id: 'r1', url: 'https://ok.com' };
      const rec2 = { _id: 'r2', url: 'https://bad.com' };
      const records = [rec1, rec2] as any[];

      const longArabic =
        'هذا نص عربي كافٍ للاختبار يحوي الكثير من الأحرف العربية والمعلومات المفيدة';

      // rec1: success (مرتين)
      // rec2: قبل try نجاح (حتى لا ينفجر خارج try)، داخل try يفشل
      jest
        .spyOn<any, any>(service as any, 'extractTextFromUrl')
        .mockResolvedValueOnce({ text: longArabic }) // rec1 قبل try
        .mockResolvedValueOnce({ text: longArabic }) // rec1 داخل try
        .mockResolvedValueOnce({ text: 'placeholder' }) // rec2 قبل try
        .mockRejectedValueOnce(new Error('boom')); // rec2 داخل try → catch

      vector.embed.mockResolvedValue([0.1] as any);
      vector.generateWebKnowledgeId.mockReturnValue('wk_ok');
      vector.upsertWebKnowledge.mockResolvedValue(undefined as any);

      const logSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
      model.updateOne.mockResolvedValue({} as any);

      await (service as any).processUrlsInBackground(merchantId, records);

      // rec2 تم تعليمها failed
      expect(model.updateOne).toHaveBeenCalledWith(
        { _id: rec2._id },
        { status: 'failed', errorMessage: 'boom' },
      );
      expect(logSpy).toHaveBeenCalled();
    });
  });

  describe('getUrlsStatus', () => {
    it('يحسب المجاميع ويعيد تفاصيل كل URL', async () => {
      const merchantId = `m_${faker.string.numeric(6)}`;
      const docs = [
        { url: 'a', status: 'pending', textExtracted: '' },
        { url: 'b', status: 'completed', textExtracted: 'x'.repeat(42) },
        { url: 'c', status: 'failed', errorMessage: 'err', textExtracted: '' },
      ];
      model.find.mockResolvedValue(docs as any);

      const res = await service.getUrlsStatus(merchantId);

      expect(model.find).toHaveBeenCalledWith({ merchantId });
      expect(res).toEqual({
        total: 3,
        pending: 1,
        completed: 1,
        failed: 1,
        urls: [
          { url: 'a', status: 'pending', errorMessage: undefined, textLength: 0 },
          { url: 'b', status: 'completed', errorMessage: undefined, textLength: 42 },
          { url: 'c', status: 'failed', errorMessage: 'err', textLength: 0 },
        ],
      });
    });
  });

  describe('getUrls', () => {
    it('يعيد find(...).lean()', async () => {
      const merchantId = `m_${faker.string.numeric(6)}`;
      const rows = [{ url: 'a' }];
      const chain = { lean: jest.fn().mockResolvedValue(rows) };
      (model.find as any).mockReturnValue(chain as any);

      const res = await service.getUrls(merchantId);

      expect(model.find).toHaveBeenCalledWith({ merchantId });
      expect(chain.lean).toHaveBeenCalled();
      expect(res).toBe(rows);
    });
  });
});

describe('KnowledgeController', () => {
  let moduleRef: TestingModule;
  let controller: KnowledgeController;
  let svc: DeepMockProxy<KnowledgeService>;

  beforeEach(async () => {
    svc = mockDeep<KnowledgeService>();
    moduleRef = await Test.createTestingModule({
      controllers: [KnowledgeController],
      providers: [{ provide: KnowledgeService, useValue: svc }],
    }).compile();

    controller = moduleRef.get(KnowledgeController);
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await moduleRef?.close();
    jest.restoreAllMocks();
  });

  it('POST uploadUrls → يمرر merchantId و urls إلى الخدمة', async () => {
    const merchantId = `m_${faker.string.numeric(6)}`;
    const urls = [faker.internet.url(), faker.internet.url()];
    const out = { success: true, count: urls.length, message: 'URLs queued for processing' };
    svc.addUrls.mockResolvedValue(out as any);

    const res = await controller.uploadUrls(merchantId, urls);

    expect(svc.addUrls).toHaveBeenCalledWith(merchantId, urls);
    expect(res).toBe(out);
  });

  it('GET status → يستدعي getUrlsStatus بالقيمة الصحيحة', async () => {
    const merchantId = `m_${faker.string.numeric(6)}`;
    const status = { total: 0, pending: 0, completed: 0, failed: 0, urls: [] };
    svc.getUrlsStatus.mockResolvedValue(status as any);

    const res = await controller.getUrlsStatus(merchantId);

    expect(svc.getUrlsStatus).toHaveBeenCalledWith(merchantId);
    expect(res).toBe(status);
  });

  it('GET → يستدعي getUrls بالقيمة الصحيحة', async () => {
    const merchantId = `m_${faker.string.numeric(6)}`;
    const list = [{ url: 'a' }];
    svc.getUrls.mockResolvedValue(list as any);

    const res = await controller.getUrls(merchantId);

    expect(svc.getUrls).toHaveBeenCalledWith(merchantId);
    expect(res).toBe(list);
  });
});
