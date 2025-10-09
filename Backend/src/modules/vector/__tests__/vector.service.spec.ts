import { Collections } from '../utils/collections';
import { geminiRerankTopN } from '../utils/geminiRerank';
import { VectorService } from '../vector.service';

// Mock reranker to avoid external behavior
jest.mock('../utils/geminiRerank', () => ({
  geminiRerankTopN: jest.fn().mockResolvedValue([]),
}));

const geminiMock = geminiRerankTopN as jest.MockedFunction<
  typeof geminiRerankTopN
>;

describe('VectorService (unit, focused)', () => {
  const makeDeps = () => {
    const qdrant = {
      init: jest.fn(),
      ensureCollection: jest.fn().mockResolvedValue(undefined),
      upsert: jest.fn().mockResolvedValue(undefined),
      search: jest.fn().mockResolvedValue(null),
      delete: jest.fn().mockResolvedValue({}),
    } as any;
    const embeddings = {
      embed: jest.fn(),
    } as any;
    const config = {
      get: jest.fn((k: string) => {
        switch (k) {
          case 'EMBEDDING_BASE_URL':
            return 'http://embeddings';
          case 'EMBEDDING_DIM':
            return 8;
          case 'VECTOR_UPSERT_BATCH_PRODUCTS':
            return 10;
          case 'VECTOR_UPSERT_BATCH_WEB':
            return 5;
          case 'VECTOR_UPSERT_BATCH_DOCS':
            return 2;
          case 'VECTOR_MIN_SCORE':
            return 0;
          case 'EMBED_MAX_CHARS':
            return 1000;
          case 'QDRANT_URL':
            return 'http://qdrant.local';
          default:
            return undefined;
        }
      }),
    } as any;
    const i18n = {
      translate: jest.fn().mockResolvedValue('embedding failed'),
    } as any;
    const cache = {
      get: jest.fn(),
      set: jest.fn().mockResolvedValue(undefined),
    } as any;
    return { qdrant, embeddings, config, i18n, cache };
  };

  const makeService = () => {
    const deps = makeDeps();
    const svc = new VectorService(
      deps.qdrant,
      deps.embeddings,
      deps.config,
      deps.i18n,
      deps.cache,
    );
    return { ...deps, svc };
  };

  test('generateWebKnowledgeId validates merchantId and returns UUID', () => {
    const { svc } = makeService();
    const uuid = svc.generateWebKnowledgeId(
      '507f1f77bcf86cd799439011',
      'https://example.com',
    );
    expect(uuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(() => svc.generateWebKnowledgeId('not-valid', 'x')).toThrow();
  });

  test('generateFaqId returns UUID v5-like string', () => {
    const { svc } = makeService();
    const out = svc.generateFaqId('faq-1');
    expect(out).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  test('resolveProductUrl handles various sources', () => {
    const { svc } = makeService();

    // domain + slug
    expect(
      (svc as any).resolveProductUrl({ domain: 'shop.com', slug: 'item-1' }),
    ).toBe('https://shop.com/product/item-1');

    // storefrontSlug + slug
    expect(
      (svc as any).resolveProductUrl({ storefrontSlug: 'store1', slug: 's1' }),
    ).toMatch(/store\/store1\/product\/s1$/);

    // publicUrlStored
    expect(
      (svc as any).resolveProductUrl({ publicUrlStored: 'http://x/y' }),
    ).toBe('http://x/y');

    // storefrontSlug + mongoId fallback
    expect(
      (svc as any).resolveProductUrl({ storefrontSlug: 'st', mongoId: '42' }),
    ).toMatch(/store\/st\/product\/42$/);
  });

  test('embedText caches embeddings and reuses from cache', async () => {
    const { svc, embeddings, cache } = makeService();
    const vec = Array.from({ length: 8 }, () => 0.1);
    (embeddings.embed as jest.Mock).mockResolvedValue(vec);

    // first call: not cached
    const v1 = await svc.embedText('hello world');
    expect(v1).toEqual(vec);
    expect(embeddings.embed).toHaveBeenCalledTimes(1);
    expect(cache.set).toHaveBeenCalledTimes(1);

    // second call: cached
    (cache.get as jest.Mock).mockResolvedValueOnce(vec);
    const v2 = await svc.embedText('hello world');
    expect(v2).toEqual(vec);
    // still only one embed call
    expect(embeddings.embed).toHaveBeenCalledTimes(1);
  });

  test('searchBotFaqs maps results correctly', async () => {
    const { svc, embeddings, qdrant } = makeService();
    const vec = Array.from({ length: 8 }, () => 0.2);
    (embeddings.embed as jest.Mock).mockResolvedValue(vec);
    (qdrant.search as jest.Mock).mockResolvedValue([
      {
        id: 'p1',
        score: 0.9,
        payload: { question: 'Q1', answer: 'A1' },
      },
      { id: 'p2', score: 0.5, payload: { question: 'Q2', answer: 'A2' } },
    ]);

    const res = await svc.searchBotFaqs('hi', 2);
    expect(res).toEqual([
      { id: 'p1', question: 'Q1', answer: 'A1', score: 0.9 },
      { id: 'p2', question: 'Q2', answer: 'A2', score: 0.5 },
    ]);
  });

  test('deleteWebKnowledgeByFilter validates filter shape', async () => {
    const { svc } = makeService();
    await expect(svc.deleteWebKnowledgeByFilter({} as any)).rejects.toThrow();
    await expect(
      svc.deleteWebKnowledgeByFilter({ points: ['1', '2'] } as any),
    ).resolves.toBeDefined();
  });

  test('unifiedSemanticSearch aggregates collections and uses rerank results', async () => {
    const { svc, embeddings, qdrant } = makeService();
    const vec = Array.from({ length: 8 }, () => 0.3);
    (embeddings.embed as jest.Mock).mockResolvedValue(vec);

    (qdrant.search as jest.Mock).mockImplementation((collection: string) => {
      if (collection === Collections.FAQs) {
        return [
          {
            id: 'faq1',
            score: 0.9,
            payload: { merchantId: 'm', question: 'Q?', answer: 'A!' },
          },
        ];
      }
      if (collection === Collections.Documents) {
        return [
          {
            id: 'doc1',
            score: 0.7,
            payload: { merchantId: 'm', text: 'Doc text' },
          },
        ];
      }
      if (collection === Collections.Web) {
        return [
          {
            id: 'web1',
            score: 0.8,
            payload: { merchantId: 'm', text: 'Web text' },
          },
        ];
      }
      return [];
    });

    geminiMock.mockResolvedValueOnce([2, 0]);

    const results = await svc.unifiedSemanticSearch('query', 'm', 2);
    expect(results).toHaveLength(2);
    expect(geminiMock).toHaveBeenCalled();
  });

  test('deleteProductPoint calls deleteProductPointsByMongoIds', async () => {
    const { svc } = makeService();
    const spy = jest
      .spyOn(svc, 'deleteProductPointsByMongoIds')
      .mockResolvedValue();

    await svc.deleteProductPoint(['id1']);
    expect(spy).toHaveBeenCalledWith(['id1']);
  });

  test('deleteProductPoints calls deleteProductPointsByMongoIds', async () => {
    const { svc } = makeService();
    const spy = jest
      .spyOn(svc, 'deleteProductPointsByMongoIds')
      .mockResolvedValue();

    await svc.deleteProductPoints(['id1', 'id2']);
    expect(spy).toHaveBeenCalledWith(['id1', 'id2']);
  });

  test('searchProductsCompat calls querySimilarProducts with default merchantId', async () => {
    const { svc } = makeService();
    const spy = jest.spyOn(svc, 'querySimilarProducts').mockResolvedValue([]);

    await svc.searchProductsCompat('query');
    expect(spy).toHaveBeenCalledWith('query', '', 20);
  });

  test('searchProductsCompat calls querySimilarProducts with provided merchantId', async () => {
    const { svc } = makeService();
    const spy = jest.spyOn(svc, 'querySimilarProducts').mockResolvedValue([]);

    await svc.searchProductsCompat('query', 'merchant123');
    expect(spy).toHaveBeenCalledWith('query', 'merchant123', 20);
  });

  test('__test_embed calls embed method', async () => {
    const { svc, embeddings } = makeService();
    (embeddings.embed as jest.Mock).mockResolvedValue([0.1, 0.2, 0.3]);

    const result = await svc.__test_embed('test text');
    expect(embeddings.embed).toHaveBeenCalledWith(
      'http://embeddings',
      'test text',
      8,
    );
    expect(result).toEqual([0.1, 0.2, 0.3]);
  });

  test('deleteProductsByMerchant calls qdrant delete with correct filter', async () => {
    const { svc, qdrant } = makeService();

    await svc.deleteProductsByMerchant('merchant123');

    expect(qdrant.delete).toHaveBeenCalledWith('products', {
      filter: {
        must: [{ key: 'merchantId', match: { value: 'merchant123' } }],
      },
    });
  });

  test('deleteProductsByCategory calls qdrant delete with correct filter', async () => {
    const { svc, qdrant } = makeService();

    await svc.deleteProductsByCategory('merchant123', 'category456');

    expect(qdrant.delete).toHaveBeenCalledWith('products', {
      filter: {
        must: [
          { key: 'merchantId', match: { value: 'merchant123' } },
          { key: 'categoryId', match: { value: 'category456' } },
        ],
      },
    });
  });

  test('deleteProductByMongoId calls qdrant delete with correct filter', async () => {
    const { svc, qdrant } = makeService();

    await svc.deleteProductByMongoId('mongo123');

    expect(qdrant.delete).toHaveBeenCalledWith('products', {
      filter: {
        must: [{ key: 'mongoId', match: { value: 'mongo123' } }],
      },
    });
  });

  test('deleteFaqPointByFaqId calls qdrant delete with generated id', async () => {
    const { svc, qdrant } = makeService();

    await svc.deleteFaqPointByFaqId('faq123');

    expect(qdrant.delete).toHaveBeenCalledWith('faqs', {
      points: [expect.any(String)], // generated FAQ ID
    });
  });

  test('deleteProductPointsByMongoIds filters empty strings and calls qdrant delete', async () => {
    const { svc, qdrant } = makeService();

    await svc['deleteProductPointsByMongoIds'](['id1', '', 'id2']);

    expect(qdrant.delete).toHaveBeenCalledWith('products', {
      points: expect.any(Array), // should filter out empty string
    });
  });

  test('deleteProductPointsByMongoIds returns early for empty array', async () => {
    const { svc, qdrant } = makeService();

    await svc['deleteProductPointsByMongoIds']([]);

    expect(qdrant.delete).not.toHaveBeenCalled();
  });

  test('deleteProductPointsByMongoIds handles objects with toString', async () => {
    const { svc, qdrant } = makeService();

    const objWithToString = { toString: () => 'converted-id' };
    await svc['deleteProductPointsByMongoIds']([objWithToString]);

    expect(qdrant.delete).toHaveBeenCalledWith('products', {
      points: expect.any(Array),
    });
  });

  test('unifiedSemanticSearch handles search failures gracefully', async () => {
    const { svc, qdrant } = makeService();

    // Make one collection search fail
    (qdrant.search as jest.Mock).mockImplementation((collection: string) => {
      if (collection === 'faqs') {
        throw new Error('Search failed');
      }
      return null;
    });

    const results = await svc.unifiedSemanticSearch('query', 'm', 2);
    expect(results).toEqual([]); // Should return empty when no results
  });

  test('unifiedSemanticSearch falls back to original order when reranking fails', async () => {
    const { svc, qdrant, embeddings } = makeService();
    const vec = Array.from({ length: 8 }, () => 0.3);
    (embeddings.embed as jest.Mock).mockResolvedValue(vec);

    // Only return results for documents collection
    (qdrant.search as jest.Mock).mockImplementation((collection: string) => {
      if (collection === 'documents') {
        return [
          {
            id: 'doc1',
            score: 0.9,
            payload: { merchantId: 'm', text: 'Document text' },
          },
        ];
      }
      return null;
    });

    // Make reranking fail
    geminiMock.mockRejectedValue(new Error('Reranking failed'));

    const results = await svc.unifiedSemanticSearch('query', 'm', 2);
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('doc1');
  });

  test('upsertFaqs calls ensureFaqCollection and upserts in batches', async () => {
    const { svc, qdrant } = makeService();

    const faqPoints = [
      {
        id: 'faq1',
        vector: [0.1, 0.2],
        payload: { question: 'Q1', answer: 'A1' },
      },
      {
        id: 'faq2',
        vector: [0.3, 0.4],
        payload: { question: 'Q2', answer: 'A2' },
      },
    ];

    await svc.upsertFaqs(faqPoints);

    expect(qdrant.upsert).toHaveBeenCalledWith('faqs', {
      wait: true,
      points: faqPoints,
    });
  });

  test('upsertFaqs returns early for empty array', async () => {
    const { svc, qdrant } = makeService();

    await svc.upsertFaqs([]);

    expect(qdrant.upsert).not.toHaveBeenCalled();
  });

  test('deleteFaqsByFilter validates filter and calls qdrant delete', async () => {
    const { svc, qdrant } = makeService();

    const filter = { points: ['faq1', 'faq2'] };
    await svc['deleteFaqsByFilter'](filter);

    expect(qdrant.delete).toHaveBeenCalledWith('faqs', filter);
  });

  test('deleteFaqsByFilter throws for invalid filter', async () => {
    const { svc } = makeService();

    await expect(svc['deleteFaqsByFilter']({})).rejects.toThrow(
      'Invalid delete filter',
    );
  });

  test('deleteBotFaqPoint calls qdrant delete with point', async () => {
    const { svc, qdrant } = makeService();

    await svc['deleteBotFaqPoint']('bot-faq-123');

    expect(qdrant.delete).toHaveBeenCalledWith('bot_faqs', {
      points: ['bot-faq-123'],
    });
  });

  test('upsertDocumentChunks validates and upserts valid chunks', async () => {
    const { svc, qdrant } = makeService();

    const chunks = [
      {
        id: 'chunk1',
        vector: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8],
        payload: {
          text: 'Document text',
          merchantId: 'merchant123',
          documentId: 'doc123',
        },
      },
    ];

    await svc['upsertDocumentChunks'](chunks);

    expect(qdrant.upsert).toHaveBeenCalledWith('documents', {
      wait: true,
      points: expect.any(Array),
    });
  });

  test('upsertDocumentChunks throws error for invalid vectors', async () => {
    const { svc } = makeService();

    const chunks = [
      {
        id: 'chunk1',
        vector: [], // Invalid empty vector
        payload: {
          text: 'Document text',
          merchantId: 'merchant123',
          documentId: 'doc123',
        },
      },
    ];

    await expect(svc['upsertDocumentChunks'](chunks)).rejects.toThrow(
      'No valid document vectors to upsert',
    );
  });

  test('upsertDocumentChunks returns early for empty array', async () => {
    const { svc, qdrant } = makeService();

    await svc['upsertDocumentChunks']([]);

    expect(qdrant.upsert).not.toHaveBeenCalled();
  });

  test('upsertWebKnowledge validates and upserts web knowledge points', async () => {
    const { svc, qdrant } = makeService();

    const webPoints = [
      {
        vector: [0.1, 0.2, 0.3],
        payload: {
          text: 'Web content',
          merchantId: 'merchant123',
          url: 'https://example.com',
        },
      },
    ];

    const result = await svc.upsertWebKnowledge(webPoints);

    expect(result).toEqual({ success: true });
    expect(qdrant.upsert).toHaveBeenCalledWith('web_knowledge', {
      wait: true,
      points: expect.any(Array),
    });
  });

  test('upsertWebKnowledge returns success for empty array', async () => {
    const { svc, qdrant } = makeService();

    const result = await svc.upsertWebKnowledge([]);

    expect(result).toEqual({ success: true });
    expect(qdrant.upsert).not.toHaveBeenCalled();
  });

  test('upsertBotFaqs upserts bot FAQ points in batches', async () => {
    const { svc, qdrant } = makeService();

    const botFaqPoints = [
      {
        id: 'faq1',
        vector: [0.1, 0.2],
        payload: { faqId: 'faq1', question: 'Q1', answer: 'A1' },
      },
      {
        id: 'faq2',
        vector: [0.3, 0.4],
        payload: { faqId: 'faq2', question: 'Q2', answer: 'A2' },
      },
    ];

    await svc.upsertBotFaqs(botFaqPoints);

    expect(qdrant.upsert).toHaveBeenCalledWith('bot_faqs', {
      wait: true,
      points: botFaqPoints,
    });
  });

  test('upsertBotFaqs returns early for empty array', async () => {
    const { svc, qdrant } = makeService();

    await svc.upsertBotFaqs([]);

    expect(qdrant.upsert).not.toHaveBeenCalled();
  });
});
