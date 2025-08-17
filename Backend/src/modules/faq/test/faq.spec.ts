// src/modules/faq/faq.spec.ts
// اختبارات وحدة تغطي FaqService (createMany/list/delete) و FaqController (تمرير المعاملات واستدعاء الخدمة)
// Arrange–Act–Assert
import { faker } from '@faker-js/faker';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { Model } from 'mongoose';
import { Test, TestingModule } from '@nestjs/testing';

import { FaqService } from '../faq.service';
import { VectorService } from '../../vector/vector.service';
import { Faq } from '../schemas/faq.schema';
import { FaqController } from '../faq.controller';

// ===== Helpers =====
const makeFaqDoc = (over: Partial<Faq> = {}): any => {
    const doc: any = {
      _id: (over as any)._id ?? faker.string.alphanumeric(10),
      merchantId: over.merchantId ?? `m_${faker.string.numeric(6)}`,
      question: over.question ?? faker.lorem.sentence(),
      answer: over.answer ?? faker.lorem.sentences(2),
      status: (over as any).status ?? 'active',
    };
    // toObject يُعيد نسخة مسطّحة من الحقول المهمة فقط
    doc.toObject = () => ({
      _id: doc._id,
      merchantId: doc.merchantId,
      question: doc.question,
      answer: doc.answer,
      status: doc.status,
    });
    return doc;
  };

describe('FaqService', () => {
  let model: DeepMockProxy<Model<Faq>>;
  let vector: DeepMockProxy<VectorService>;
  let service: FaqService;

  beforeEach(() => {
    model = mockDeep<Model<Faq>>();
    vector = mockDeep<VectorService>();
    service = new FaqService(model as unknown as Model<Faq>, vector);
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('createMany', () => {
    it('ينشئ FAQs ثم يولّد embeddings ويستدعي upsertFaqs لكل عنصر (happy path)', async () => {
      const merchantId = `m_${faker.string.numeric(5)}`;
      const body = [
        { question: 'ما سياسة الشحن؟', answer: '3-5 أيام.' },
        { question: 'هل يوجد استرجاع؟', answer: 'خلال 14 يومًا.' },
      ];

      const createdDocs = body.map((b, i) =>
        makeFaqDoc({ merchantId, question: b.question, answer: b.answer, _id: `id_${i + 1}` }),
      );

      // insertMany يُعيد المستندات التي تم إنشاؤها
      model.insertMany.mockResolvedValue(createdDocs as any);

      // embed/ upsert / generateFaqId
      const v1 = [0.1, 0.2, 0.3];
      const v2 = [0.4, 0.5, 0.6];
      vector.embed.mockResolvedValueOnce(v1 as any).mockResolvedValueOnce(v2 as any);
      vector.generateFaqId
        .mockReturnValueOnce('faq_id_1')
        .mockReturnValueOnce('faq_id_2');
      vector.upsertFaqs.mockResolvedValue(undefined as any);

      const res = await service.createMany(merchantId, body);

      // تم تمرير البيانات الصحيحة إلى insertMany
      expect(model.insertMany).toHaveBeenCalledWith(
        body.map((f) => ({ merchantId, question: f.question, answer: f.answer })),
      );

      // embed استُدعيت بالنص المركّب لكل عنصر
      expect(vector.embed).toHaveBeenNthCalledWith(
        1,
        `${createdDocs[0].question}\n${createdDocs[0].answer}`,
      );
      expect(vector.embed).toHaveBeenNthCalledWith(
        2,
        `${createdDocs[1].question}\n${createdDocs[1].answer}`,
      );

      // generateFaqId استُدعيت بمعرّف كل مستند
      expect(vector.generateFaqId).toHaveBeenNthCalledWith(1, createdDocs[0]._id.toString());
      expect(vector.generateFaqId).toHaveBeenNthCalledWith(2, createdDocs[1]._id.toString());

      // upsertFaqs استُدعيت لكل عنصر بحمولة صحيحة
      expect(vector.upsertFaqs).toHaveBeenNthCalledWith(1, [
        {
          id: 'faq_id_1',
          vector: v1,
          payload: {
            merchantId,
            faqId: createdDocs[0]._id,
            question: createdDocs[0].question,
            answer: createdDocs[0].answer,
            type: 'faq',
            source: 'manual',
          },
        },
      ]);
      expect(vector.upsertFaqs).toHaveBeenNthCalledWith(2, [
        {
          id: 'faq_id_2',
          vector: v2,
          payload: {
            merchantId,
            faqId: createdDocs[1]._id,
            question: createdDocs[1].question,
            answer: createdDocs[1].answer,
            type: 'faq',
            source: 'manual',
          },
        },
      ]);

      expect(res).toBe(createdDocs);
    });

    it('عند مصفوفة فارغة: لا يستدعي embed/upsert ويعيد []', async () => {
      const merchantId = `m_${faker.string.numeric(5)}`;
      model.insertMany.mockResolvedValue([] as any);

      const res = await service.createMany(merchantId, []);

      expect(model.insertMany).toHaveBeenCalledWith([]);
      expect(vector.embed).not.toHaveBeenCalled();
      expect(vector.upsertFaqs).not.toHaveBeenCalled();
      expect(res).toEqual([]);
    });

    it('إذا فشل embed في عنصر ما، تُرمى الاستثناءات (error path bubble up) ويتوقف اللوب', async () => {
      const merchantId = `m_${faker.string.numeric(5)}`;
      const body = [
        { question: 'Q1', answer: 'A1' },
        { question: 'Q2', answer: 'A2' },
      ];
      const createdDocs = [
        makeFaqDoc({ merchantId, question: 'Q1', answer: 'A1', _id: 'id_1' }),
        makeFaqDoc({ merchantId, question: 'Q2', answer: 'A2', _id: 'id_2' }),
      ];
      model.insertMany.mockResolvedValue(createdDocs as any);

      vector.embed.mockResolvedValueOnce([0.1] as any).mockRejectedValueOnce(new Error('embed failed'));
      vector.generateFaqId.mockReturnValue('faq_id_1');
      vector.upsertFaqs.mockResolvedValue(undefined as any);

      await expect(service.createMany(merchantId, body)).rejects.toThrow('embed failed');

      // تم رفع upsertFaqs للعنصر الأول فقط قبل الفشل
      expect(vector.upsertFaqs).toHaveBeenCalledTimes(1);
    });
  });

  describe('list', () => {
    it('يسترجع جميع الأسئلة الفعالة للتاجر ويستخدم find().lean()', async () => {
      const merchantId = `m_${faker.string.numeric(5)}`;
      const result = [makeFaqDoc({ merchantId }), makeFaqDoc({ merchantId })];

      const findQuery = { lean: jest.fn().mockResolvedValue(result) };
      model.find.mockReturnValue(findQuery as any);

      const res = await service.list(merchantId);

      expect(model.find).toHaveBeenCalledWith({ merchantId, status: 'active' });
      expect(findQuery.lean).toHaveBeenCalled();
      expect(res).toBe(result);
    });
  });

  describe('delete', () => {
    it('يُحدّث الحالة إلى deleted باستخدام updateOne (soft delete)', async () => {
      const merchantId = `m_${faker.string.numeric(5)}`;
      const faqId = 'faq_123';
      const dbRes = { acknowledged: true, matchedCount: 1, modifiedCount: 1 };
      model.updateOne.mockResolvedValue(dbRes as any);

      const res = await service.delete(merchantId, faqId);

      expect(model.updateOne).toHaveBeenCalledWith(
        { _id: faqId, merchantId },
        { status: 'deleted' },
      );
      expect(res).toBe(dbRes);
    });
  });
});

describe('FaqController', () => {
  let moduleRef: TestingModule;
  let controller: FaqController;
  let svc: DeepMockProxy<FaqService>;

  beforeEach(async () => {
    svc = mockDeep<FaqService>();

    moduleRef = await Test.createTestingModule({
      controllers: [FaqController],
      providers: [{ provide: FaqService, useValue: svc }],
    }).compile();

    controller = moduleRef.get(FaqController);
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await moduleRef?.close();
    jest.restoreAllMocks();
  });

  it('POST /:merchantId/faqs → يمرر body إلى الخدمة createMany ويعيد نتيجتها', async () => {
    const merchantId = `m_${faker.string.numeric(5)}`;
    const body = [
      { question: 'Q1', answer: 'A1' },
      { question: 'Q2', answer: 'A2' },
    ];
    const created = [makeFaqDoc({ merchantId }), makeFaqDoc({ merchantId })];
    svc.createMany.mockResolvedValue(created as any);

    const res = await controller.uploadFaqs(merchantId, body);

    expect(svc.createMany).toHaveBeenCalledWith(merchantId, body);
    expect(res).toBe(created);
  });

  it('GET /:merchantId/faqs → يستدعي list بالقيمة الصحيحة', async () => {
    const merchantId = `m_${faker.string.numeric(5)}`;
    const list = [makeFaqDoc({ merchantId })];
    svc.list.mockResolvedValue(list as any);

    const res = await controller.list(merchantId);

    expect(svc.list).toHaveBeenCalledWith(merchantId);
    expect(res).toBe(list);
  });

  it('DELETE /:merchantId/faqs/:faqId → يستدعي delete بالقيم الصحيحة', async () => {
    const merchantId = `m_${faker.string.numeric(5)}`;
    const faqId = 'faq_999';
    const outcome = { acknowledged: true, modifiedCount: 1 };
    svc.delete.mockResolvedValue(outcome as any);

    const res = await controller.delete(merchantId, faqId);

    expect(svc.delete).toHaveBeenCalledWith(merchantId, faqId);
    expect(res).toBe(outcome);
  });
});
