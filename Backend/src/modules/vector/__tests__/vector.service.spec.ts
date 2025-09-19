import { Test } from '@nestjs/testing';
import { VectorService } from '../vector.service';
import { QdrantWrapper } from '../utils/qdrant.client';
import { EmbeddingsClient } from '../utils/embeddings.client';
import { ConfigService } from '@nestjs/config';
import { Collections } from '../utils/collections';

// ⚠️ موك لدالة إعادة الترتيب
jest.mock('../geminiRerank', () => ({
  geminiRerankTopN: jest.fn().mockResolvedValue([2, 0, 1]), // يرجّع فهارس مرتبة
}));

import { geminiRerankTopN } from '../utils/geminiRerank';

describe('VectorService', () => {
  let service: VectorService;

  // مكوّنات موقّة
  const qdrant = {
    init: jest.fn(),
    ensureCollection: jest.fn(),
    upsert: jest.fn(),
    search: jest.fn(),
    delete: jest.fn(),
    getCollections: jest.fn(),
  } as unknown as jest.Mocked<QdrantWrapper>;

  const embeddings = {
    embed: jest.fn(),
  } as unknown as jest.Mocked<EmbeddingsClient>;

  const config = {
    get: jest.fn((k: string) => {
      switch (k) {
        case 'QDRANT_URL':
          return 'http://qdrant:6333';
        case 'EMBEDDING_BASE_URL':
          return 'http://embedder:8000';
        case 'EMBEDDING_DIM':
          return '384';
        case 'VECTOR_UPSERT_BATCH_PRODUCTS':
          return '2'; // نختبر batching بوضوح
        case 'VECTOR_UPSERT_BATCH_WEB':
          return '10';
        case 'VECTOR_UPSERT_BATCH_DOCS':
          return '2';
        case 'VECTOR_MIN_SCORE':
          return '0.1';
        case 'EMBED_MAX_CHARS':
          return '3000';
        default:
          return undefined;
      }
    }),
  } as unknown as jest.Mocked<ConfigService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const modRef = await Test.createTestingModule({
      providers: [
        VectorService,
        { provide: QdrantWrapper, useValue: qdrant },
        { provide: EmbeddingsClient, useValue: embeddings },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = modRef.get(VectorService);
  });

  describe('onModuleInit', () => {
    it('initializes qdrant and ensures collections', async () => {
      await service.onModuleInit();
      expect(qdrant.init).toHaveBeenCalledWith('http://qdrant:6333');
      expect(qdrant.ensureCollection).toHaveBeenCalledTimes(6);
      expect(qdrant.ensureCollection).toHaveBeenCalledWith(
        Collections.Products,
        384,
      );
      expect(qdrant.ensureCollection).toHaveBeenCalledWith(
        Collections.Offers,
        384,
      );
      expect(qdrant.ensureCollection).toHaveBeenCalledWith(
        Collections.FAQs,
        384,
      );
      expect(qdrant.ensureCollection).toHaveBeenCalledWith(
        Collections.Documents,
        384,
      );
      expect(qdrant.ensureCollection).toHaveBeenCalledWith(
        Collections.Web,
        384,
      );
      expect(qdrant.ensureCollection).toHaveBeenCalledWith(
        Collections.BotFAQs,
        384,
      );
    });
  });

  describe('upsertProducts', () => {
    it('batches upserts, deletes old points by mongoId, and embeds text', async () => {
      await service.onModuleInit();

      // متجه ثابت
      embeddings.embed.mockResolvedValue(new Array(384).fill(0.01));

      const products = [
        {
          id: 'p1',
          merchantId: 'm1',
          name: 'Prod 1',
          description: 'D1',
          price: 10,
        },
        {
          id: 'p2',
          merchantId: 'm1',
          name: 'Prod 2',
          description: 'D2',
          price: 20,
        },
        {
          id: 'p3',
          merchantId: 'm1',
          name: 'Prod 3',
          description: 'D3',
          price: 30,
        },
      ] as any[];

      await service.upsertProducts(products);

      // delete لكل عنصر قبل upsert
      expect(qdrant.delete).toHaveBeenCalledTimes(products.length);
      products.forEach((p) => {
        expect(qdrant.delete).toHaveBeenCalledWith(Collections.Products, {
          filter: { must: [{ key: 'mongoId', match: { value: p.id } }] },
        });
      });

      // بسبب batchSize=2: استدعاء upsert مرتين (2 + 1)
      expect(qdrant.upsert).toHaveBeenCalledTimes(2);
      expect(embeddings.embed).toHaveBeenCalledTimes(products.length);
    });

    it('no-op when products array is empty', async () => {
      await service.onModuleInit();
      await service.upsertProducts([]);
      expect(qdrant.upsert).not.toHaveBeenCalled();
      expect(qdrant.delete).not.toHaveBeenCalled();
    });
  });

  describe('querySimilarProducts', () => {
    it('returns topK after rerank with score filter', async () => {
      await service.onModuleInit();

      // المتجه للبحث
      embeddings.embed.mockResolvedValue(new Array(384).fill(0.02));

      // نتائج Qdrant خام (limit = topK*4 = 20 افتراضياً، سنختصر)
      qdrant.search.mockResolvedValue([
        {
          payload: {
            mongoId: 'a',
            name: 'A',
            price: 50,
            storefrontSlug: 's1',
            slug: 'a',
          },
          score: 0.15,
        },
        {
          payload: {
            mongoId: 'b',
            name: 'B',
            price: 60,
            storefrontSlug: 's1',
            slug: 'b',
          },
          score: 0.05,
        }, // تحت minScore=0.1 → يُستبعد
        {
          payload: {
            mongoId: 'c',
            name: 'C',
            price: 70,
            storefrontSlug: 's1',
            slug: 'c',
          },
          score: 0.2,
        },
      ]);

      const res = await service.querySimilarProducts('عباية سوداء', 'm1', 2);
      // mock rerankTopN يعيد [2,0,1] على المرشحين؛ بعد فلترة minScore تصبح عناصر (0 و 2) فقط
      // إذن بعد rerank → نحاول التقاط فهارس rerank ضمن الطول الجديد
      expect(embeddings.embed).toHaveBeenCalledTimes(1);
      expect(qdrant.search).toHaveBeenCalledTimes(1);
      expect((geminiRerankTopN as jest.Mock).mock.calls[0][0]).toMatchObject({
        query: 'عباية سوداء',
        topN: 2,
      });

      expect(res.length).toBe(2);
      // ترتيب نهائي مبني على rerank indices المتاحة: (قد تختلف بحسب الماب) المهم نضمن حقول الخرج
      res.forEach((item) => {
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('name');
        expect(item).toHaveProperty('price');
        expect(item).toHaveProperty('url');
        expect(typeof item.score).toBe('number');
      });
      // استُبعدت b بسبب score < minScore
      expect(res.find((x) => x.id === 'b')).toBeUndefined();
    });

    it('falls back to qdrant order if rerank fails', async () => {
      await service.onModuleInit();

      embeddings.embed.mockResolvedValue(new Array(384).fill(0.02));
      (geminiRerankTopN as jest.Mock).mockRejectedValueOnce(
        new Error('Rerank down'),
      );

      qdrant.search.mockResolvedValue([
        {
          payload: {
            mongoId: 'x',
            name: 'X',
            price: 10,
            storefrontSlug: 's1',
            slug: 'x',
          },
          score: 0.5,
        },
        {
          payload: {
            mongoId: 'y',
            name: 'Y',
            price: 20,
            storefrontSlug: 's1',
            slug: 'y',
          },
          score: 0.3,
        },
      ]);

      const res = await service.querySimilarProducts('سؤال', 'm1', 1);
      expect(res.length).toBe(1);
      expect(res[0].id).toBe('x'); // أول عنصر حسب ترتيب Qdrant
    });
  });

  describe('unifiedSemanticSearch', () => {
    it('searches FAQs, Documents, Web, filters by score, then reranks', async () => {
      await service.onModuleInit();

      embeddings.embed.mockResolvedValue(new Array(384).fill(0.03));

      // نحاكي استدعاءات متعددة (FAQ/Doc/Web). سنعيد نتائج مختلفة في كل مرة يُستدعى search
      const resultsFAQ = [
        {
          id: 'f1',
          payload: { question: 'س: سياسة الشحن؟', answer: 'ج: 3 أيام' },
          score: 0.3,
        },
        {
          id: 'f2',
          payload: { question: 'س: طريقة الدفع؟', answer: 'ج: تحويل' },
          score: 0.05,
        }, // تحت minScore
      ];
      const resultsDoc = [
        { id: 'd1', payload: { text: 'مستند يشرح شروط الضمان' }, score: 0.2 },
      ];
      const resultsWeb = [
        {
          id: 'w1',
          payload: { text: 'صفحة من الموقع فيها الأسئلة الشائعة' },
          score: 0.15,
        },
      ];

      (qdrant.search as jest.Mock)
        .mockResolvedValueOnce(resultsFAQ) // FAQs
        .mockResolvedValueOnce(resultsDoc) // Documents
        .mockResolvedValueOnce(resultsWeb); // Web

      const res = await service.unifiedSemanticSearch(
        'ما هي سياسة الشحن؟',
        'm1',
        2,
      );

      // تم استبعاد f2 (score منخفض)
      // تم جمع f1 + d1 + w1 ثم إعادة ترتيبهم
      expect(res.length).toBe(2);
      res.forEach((r) => {
        expect(['faq', 'document', 'web']).toContain(r.type);
        expect(typeof r.score).toBe('number');
        expect(r).toHaveProperty('data');
      });

      expect(embeddings.embed).toHaveBeenCalledTimes(1);
      expect(qdrant.search).toHaveBeenCalledTimes(3);
      expect(geminiRerankTopN).toHaveBeenCalledTimes(1);
    });

    it('returns [] if all sources empty or below min score', async () => {
      await service.onModuleInit();
      embeddings.embed.mockResolvedValue(new Array(384).fill(0.03));
      (qdrant.search as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      const res = await service.unifiedSemanticSearch('سؤال', 'm1', 3);
      expect(res).toEqual([]);
    });
  });
});
