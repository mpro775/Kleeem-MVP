// src/modules/vector/test/vector.spec.ts
// اختبارات شاملة لوحدة Vector: Controller + Service + Reranking
// تغطي البحث المتجه، الفهرسة، وإعادة الترتيب بالذكاء الاصطناعي
/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import axios from 'axios';

import { VectorController } from '../vector.controller';
import { VectorService } from '../vector.service';
import { GeminiRerank } from '../geminiRerank';
import {
  VectorSearchRequest,
  VectorSearchResponse,
  VectorDocument,
  SimilarityMetric,
} from '../types';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock external services
const mockConfigService = mockDeep<ConfigService>();
const mockGeminiRerank = mockDeep<GeminiRerank>();

describe('VectorService', () => {
  let service: VectorService;
  let configService: DeepMockProxy<ConfigService>;
  let geminiRerank: DeepMockProxy<GeminiRerank>;

  const mockEmbeddingServiceUrl = 'http://localhost:8001';
  const mockApiKey = 'test-api-key';

  const mockDocument: VectorDocument = {
    id: 'doc-123',
    content: 'هذا نص تجريبي للبحث المتجه',
    metadata: {
      title: 'وثيقة تجريبية',
      category: 'تقنية',
      merchantId: 'merchant-123',
      timestamp: new Date('2023-01-01T12:00:00.000Z'),
      tags: ['بحث', 'متجه', 'ذكاء اصطناعي'],
      author: 'مطور تجريبي',
    },
    vector: [0.1, 0.2, 0.3, 0.4, 0.5], // embedding vector
    score: 0.85, // similarity score
  };

  const mockSearchRequest: VectorSearchRequest = {
    query: 'البحث عن المنتجات',
    merchantId: 'merchant-123',
    topK: 10,
    threshold: 0.7,
    filters: {
      category: 'منتجات',
      dateRange: {
        start: '2023-01-01',
        end: '2023-12-31',
      },
    },
    includeMetadata: true,
    rerank: true,
    similarityMetric: SimilarityMetric.COSINE,
  };

  beforeEach(async () => {
    configService = mockDeep<ConfigService>();
    geminiRerank = mockDeep<GeminiRerank>();

    // Setup config service mocks
    configService.get
      .calledWith('EMBEDDING_SERVICE_URL')
      .mockReturnValue(mockEmbeddingServiceUrl);
    configService.get.calledWith('VECTOR_API_KEY').mockReturnValue(mockApiKey);
    configService.get.calledWith('VECTOR_DB_URL').mockReturnValue('http://localhost:6333');
    configService.get.calledWith('DEFAULT_COLLECTION').mockReturnValue('documents');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VectorService,
        { provide: ConfigService, useValue: configService },
        { provide: GeminiRerank, useValue: geminiRerank },
      ],
    }).compile();

    service = module.get<VectorService>(VectorService);
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('generateEmbedding', () => {
    it('ينشئ embedding للنص بنجاح', async () => {
      const text = 'نص تجريبي للتحويل';
      const mockEmbedding = [0.1, 0.2, 0.3, 0.4, 0.5];

      mockedAxios.post.mockResolvedValue({
        data: { embedding: mockEmbedding },
      });

      const result = await service.generateEmbedding(text);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        `${mockEmbeddingServiceUrl}/embed`,
        { text },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockApiKey}`,
          },
          timeout: 30000,
        },
      );
      expect(result).toEqual(mockEmbedding);
    });

    it('يرمي خطأ عند فشل خدمة التضمين', async () => {
      const text = 'نص فاشل';
      mockedAxios.post.mockRejectedValue(new Error('Service unavailable'));

      await expect(service.generateEmbedding(text)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('يتعامل مع النص الفارغ', async () => {
      await expect(service.generateEmbedding('')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('ينشئ embeddings متعددة', async () => {
      const texts = ['نص أول', 'نص ثاني', 'نص ثالث'];
      const mockEmbeddings = [
        [0.1, 0.2, 0.3],
        [0.4, 0.5, 0.6],
        [0.7, 0.8, 0.9],
      ];

      mockedAxios.post.mockResolvedValue({
        data: { embeddings: mockEmbeddings },
      });

      const result = await service.generateBatchEmbeddings(texts);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        `${mockEmbeddingServiceUrl}/embed-batch`,
        { texts },
        expect.any(Object),
      );
      expect(result).toEqual(mockEmbeddings);
    });
  });

  describe('indexDocument', () => {
    it('يفهرس وثيقة جديدة بنجاح', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3, 0.4, 0.5];

      mockedAxios.post
        .mockResolvedValueOnce({ data: { embedding: mockEmbedding } }) // generate embedding
        .mockResolvedValueOnce({ data: { success: true, id: 'doc-123' } }); // index document

      const result = await service.indexDocument(mockDocument);

      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        success: true,
        documentId: 'doc-123',
        indexed: true,
      });
    });

    it('يحدث وثيقة موجودة', async () => {
      const updateDocument = { ...mockDocument, content: 'محتوى محدث' };
      const mockEmbedding = [0.2, 0.3, 0.4, 0.5, 0.6];

      mockedAxios.post
        .mockResolvedValueOnce({ data: { embedding: mockEmbedding } })
        .mockResolvedValueOnce({ data: { success: true, updated: true } });

      const result = await service.updateDocument(updateDocument);

      expect(result.updated).toBe(true);
    });

    it('يتعامل مع الوثائق بدون محتوى', async () => {
      const emptyDocument = { ...mockDocument, content: '' };

      await expect(service.indexDocument(emptyDocument)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('يفهرس وثائق متعددة', async () => {
      const documents = [
        mockDocument,
        { ...mockDocument, id: 'doc-456', content: 'محتوى آخر' },
      ];

      const mockEmbeddings = [
        [0.1, 0.2, 0.3],
        [0.4, 0.5, 0.6],
      ];

      mockedAxios.post
        .mockResolvedValueOnce({ data: { embeddings: mockEmbeddings } })
        .mockResolvedValueOnce({
          data: { success: true, indexed: documents.length },
        });

      const result = await service.indexBatchDocuments(documents);

      expect(result.indexed).toBe(documents.length);
      expect(result.failed).toBe(0);
    });
  });

  describe('searchSimilar', () => {
    it('يبحث في الوثائق المشابهة بنجاح', async () => {
      const mockQueryEmbedding = [0.3, 0.4, 0.5, 0.6, 0.7];
      const mockSearchResults = [
        mockDocument,
        { ...mockDocument, id: 'doc-456', score: 0.75 },
      ];

      mockedAxios.post
        .mockResolvedValueOnce({ data: { embedding: mockQueryEmbedding } }) // query embedding
        .mockResolvedValueOnce({
          data: {
            results: mockSearchResults,
            total: 2,
            executionTime: 150,
          },
        }); // search results

      const result = await service.searchSimilar(mockSearchRequest);

      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
      expect(result.results).toEqual(mockSearchResults);
      expect(result.total).toBe(2);
      expect(result.executionTime).toBe(150);
    });

    it('يطبق فلاتر البحث بشكل صحيح', async () => {
      const filteredRequest = {
        ...mockSearchRequest,
        filters: {
          category: 'تقنية',
          merchantId: 'merchant-123',
          tags: ['ذكاء اصطناعي'],
        },
      };

      const mockQueryEmbedding = [0.1, 0.2, 0.3];
      mockedAxios.post
        .mockResolvedValueOnce({ data: { embedding: mockQueryEmbedding } })
        .mockResolvedValueOnce({
          data: { results: [mockDocument], total: 1 },
        });

      const result = await service.searchSimilar(filteredRequest);

      // التحقق من إرسال الفلاتر مع طلب البحث
      const searchCall = mockedAxios.post.mock.calls[1];
      expect(searchCall[1]).toMatchObject({
        vector: mockQueryEmbedding,
        limit: filteredRequest.topK,
        filters: filteredRequest.filters,
      });

      expect(result.results).toHaveLength(1);
    });

    it('يعيد نتائج فارغة عند عدم وجود تطابقات', async () => {
      const mockQueryEmbedding = [0.9, 0.8, 0.7];
      mockedAxios.post
        .mockResolvedValueOnce({ data: { embedding: mockQueryEmbedding } })
        .mockResolvedValueOnce({ data: { results: [], total: 0 } });

      const result = await service.searchSimilar(mockSearchRequest);

      expect(result.results).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('يطبق reranking عند الطلب', async () => {
      const rerankedRequest = { ...mockSearchRequest, rerank: true };
      const mockQueryEmbedding = [0.1, 0.2, 0.3];
      const initialResults = [
        { ...mockDocument, score: 0.7 },
        { ...mockDocument, id: 'doc-456', score: 0.6 },
      ];
      const rerankedResults = [
        { ...mockDocument, id: 'doc-456', score: 0.9 },
        { ...mockDocument, score: 0.8 },
      ];

      mockedAxios.post
        .mockResolvedValueOnce({ data: { embedding: mockQueryEmbedding } })
        .mockResolvedValueOnce({
          data: { results: initialResults, total: 2 },
        });

      geminiRerank.rerank.mockResolvedValue(rerankedResults);

      const result = await service.searchSimilar(rerankedRequest);

      expect(geminiRerank.rerank).toHaveBeenCalledWith(
        rerankedRequest.query,
        initialResults,
      );
      expect(result.results).toEqual(rerankedResults);
      expect(result.reranked).toBe(true);
    });
  });

  describe('deleteDocument', () => {
    it('يحذف وثيقة بنجاح', async () => {
      const documentId = 'doc-123';
      mockedAxios.delete.mockResolvedValue({
        data: { success: true, deleted: true },
      });

      const result = await service.deleteDocument(documentId);

      expect(mockedAxios.delete).toHaveBeenCalledWith(
        expect.stringContaining(`/documents/${documentId}`),
        expect.any(Object),
      );
      expect(result.deleted).toBe(true);
    });

    it('يتعامل مع محاولة حذف وثيقة غير موجودة', async () => {
      const documentId = 'non-existent';
      mockedAxios.delete.mockResolvedValue({
        data: { success: false, message: 'Document not found' },
      });

      const result = await service.deleteDocument(documentId);

      expect(result.deleted).toBe(false);
    });
  });

  describe('getCollectionInfo', () => {
    it('يعيد معلومات المجموعة', async () => {
      const collectionInfo = {
        name: 'documents',
        vectorSize: 512,
        documentsCount: 1500,
        indexedAt: new Date('2023-01-01T12:00:00.000Z'),
        status: 'ready',
      };

      mockedAxios.get.mockResolvedValue({ data: collectionInfo });

      const result = await service.getCollectionInfo('documents');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/collections/documents'),
        expect.any(Object),
      );
      expect(result).toEqual(collectionInfo);
    });
  });

  describe('createCollection', () => {
    it('ينشئ مجموعة جديدة', async () => {
      const collectionConfig = {
        name: 'new-collection',
        vectorSize: 768,
        distance: 'cosine' as const,
      };

      mockedAxios.post.mockResolvedValue({
        data: { success: true, created: true },
      });

      const result = await service.createCollection(collectionConfig);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/collections'),
        collectionConfig,
        expect.any(Object),
      );
      expect(result.created).toBe(true);
    });
  });

  describe('calculateSimilarity', () => {
    it('يحسب التشابه بطريقة cosine', () => {
      const vector1 = [1, 0, 0];
      const vector2 = [0, 1, 0];

      const similarity = service.calculateSimilarity(
        vector1,
        vector2,
        SimilarityMetric.COSINE,
      );

      expect(similarity).toBe(0); // orthogonal vectors
    });

    it('يحسب التشابه بطريقة euclidean', () => {
      const vector1 = [1, 1];
      const vector2 = [1, 1];

      const similarity = service.calculateSimilarity(
        vector1,
        vector2,
        SimilarityMetric.EUCLIDEAN,
      );

      expect(similarity).toBe(1); // identical vectors
    });

    it('يحسب التشابه بطريقة dot product', () => {
      const vector1 = [2, 3];
      const vector2 = [1, 4];

      const similarity = service.calculateSimilarity(
        vector1,
        vector2,
        SimilarityMetric.DOT_PRODUCT,
      );

      expect(similarity).toBe(14); // 2*1 + 3*4
    });
  });

  describe('getAnalytics', () => {
    it('يعيد إحصائيات شاملة', async () => {
      const analytics = {
        totalDocuments: 5000,
        totalCollections: 5,
        averageQueryTime: 120,
        popularQueries: [
          { query: 'منتجات', count: 150 },
          { query: 'خدمات', count: 120 },
        ],
        queryDistribution: {
          today: 450,
          thisWeek: 2800,
          thisMonth: 12000,
        },
        vectorDimensions: 768,
        storageUsed: '2.5 GB',
      };

      mockedAxios.get.mockResolvedValue({ data: analytics });

      const result = await service.getAnalytics('merchant-123');

      expect(result).toEqual(analytics);
    });
  });
});

describe('VectorController', () => {
  let controller: VectorController;
  let service: DeepMockProxy<VectorService>;
  let moduleRef: TestingModule;

  beforeEach(async () => {
    service = mockDeep<VectorService>();

    moduleRef = await Test.createTestingModule({
      controllers: [VectorController],
      providers: [{ provide: VectorService, useValue: service }],
    }).compile();

    controller = moduleRef.get<VectorController>(VectorController);
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await moduleRef?.close();
    jest.restoreAllMocks();
  });

  describe('generateEmbedding', () => {
    it('ينشئ embedding للنص عبر API', async () => {
      const text = 'نص للتحويل';
      const mockEmbedding = [0.1, 0.2, 0.3, 0.4, 0.5];

      service.generateEmbedding.mockResolvedValue(mockEmbedding);

      const result = await controller.generateEmbedding({ text });

      expect(service.generateEmbedding).toHaveBeenCalledWith(text);
      expect(result).toEqual({ embedding: mockEmbedding, dimensions: 5 });
    });
  });

  describe('indexDocument', () => {
    it('يفهرس وثيقة جديدة عبر API', async () => {
      const document = {
        id: 'api-doc-123',
        content: 'محتوى وثيقة API',
        metadata: { category: 'api-test' },
      };

      const indexResult = {
        success: true,
        documentId: 'api-doc-123',
        indexed: true,
      };

      service.indexDocument.mockResolvedValue(indexResult);

      const result = await controller.indexDocument(document);

      expect(service.indexDocument).toHaveBeenCalledWith(document);
      expect(result).toEqual(indexResult);
    });
  });

  describe('searchSimilar', () => {
    it('يبحث في الوثائق المشابهة عبر API', async () => {
      const searchRequest = {
        query: 'بحث API',
        merchantId: 'merchant-api',
        topK: 5,
        threshold: 0.8,
      };

      const searchResponse: VectorSearchResponse = {
        results: [
          {
            id: 'result-1',
            content: 'نتيجة البحث الأولى',
            metadata: { category: 'api' },
            score: 0.9,
            vector: [0.1, 0.2, 0.3],
          },
        ],
        total: 1,
        executionTime: 95,
        query: searchRequest.query,
        reranked: false,
      };

      service.searchSimilar.mockResolvedValue(searchResponse);

      const result = await controller.searchSimilar(searchRequest);

      expect(service.searchSimilar).toHaveBeenCalledWith(searchRequest);
      expect(result).toEqual(searchResponse);
    });
  });

  describe('deleteDocument', () => {
    it('يحذف وثيقة عبر API', async () => {
      const documentId = 'api-doc-delete';
      const deleteResult = { success: true, deleted: true };

      service.deleteDocument.mockResolvedValue(deleteResult);

      const result = await controller.deleteDocument(documentId);

      expect(service.deleteDocument).toHaveBeenCalledWith(documentId);
      expect(result).toEqual(deleteResult);
    });
  });

  describe('batchIndex', () => {
    it('يفهرس وثائق متعددة عبر API', async () => {
      const documents = [
        { id: 'batch-1', content: 'وثيقة 1', metadata: {} },
        { id: 'batch-2', content: 'وثيقة 2', metadata: {} },
      ];

      const batchResult = {
        success: true,
        indexed: 2,
        failed: 0,
        errors: [],
      };

      service.indexBatchDocuments.mockResolvedValue(batchResult);

      const result = await controller.batchIndex({ documents });

      expect(service.indexBatchDocuments).toHaveBeenCalledWith(documents);
      expect(result).toEqual(batchResult);
    });
  });

  describe('getCollectionInfo', () => {
    it('يعيد معلومات المجموعة عبر API', async () => {
      const collectionName = 'test-collection';
      const collectionInfo = {
        name: collectionName,
        vectorSize: 768,
        documentsCount: 100,
        status: 'ready',
      };

      service.getCollectionInfo.mockResolvedValue(collectionInfo as any);

      const result = await controller.getCollectionInfo(collectionName);

      expect(service.getCollectionInfo).toHaveBeenCalledWith(collectionName);
      expect(result).toEqual(collectionInfo);
    });
  });

  describe('createCollection', () => {
    it('ينشئ مجموعة جديدة عبر API', async () => {
      const collectionConfig = {
        name: 'api-collection',
        vectorSize: 512,
        distance: 'cosine' as const,
      };

      const createResult = { success: true, created: true };

      service.createCollection.mockResolvedValue(createResult);

      const result = await controller.createCollection(collectionConfig);

      expect(service.createCollection).toHaveBeenCalledWith(collectionConfig);
      expect(result).toEqual(createResult);
    });
  });

  describe('getAnalytics', () => {
    it('يعيد تحليلات البحث المتجه', async () => {
      const merchantId = 'analytics-merchant';
      const analytics = {
        totalDocuments: 1000,
        totalQueries: 5000,
        averageQueryTime: 150,
        popularQueries: [],
      };

      service.getAnalytics.mockResolvedValue(analytics as any);

      const result = await controller.getAnalytics(merchantId);

      expect(service.getAnalytics).toHaveBeenCalledWith(merchantId);
      expect(result).toEqual(analytics);
    });
  });

  describe('Integration Tests', () => {
    it('يختبر تدفق كامل: إنشاء مجموعة → فهرسة → بحث → حذف', async () => {
      // 1. إنشاء مجموعة
      const collectionConfig = {
        name: 'integration-test',
        vectorSize: 768,
        distance: 'cosine' as const,
      };

      service.createCollection.mockResolvedValue({
        success: true,
        created: true,
      });

      const createResult = await controller.createCollection(collectionConfig);
      expect(createResult.created).toBe(true);

      // 2. فهرسة وثيقة
      const document = {
        id: 'integration-doc',
        content: 'وثيقة تكاملية للاختبار',
        metadata: { test: true },
      };

      service.indexDocument.mockResolvedValue({
        success: true,
        documentId: 'integration-doc',
        indexed: true,
      });

      const indexResult = await controller.indexDocument(document);
      expect(indexResult.indexed).toBe(true);

      // 3. البحث
      const searchRequest = {
        query: 'وثيقة تكاملية',
        merchantId: 'test-merchant',
        topK: 5,
      };

      service.searchSimilar.mockResolvedValue({
        results: [{ ...document, score: 0.95, vector: [0.1, 0.2] }],
        total: 1,
        executionTime: 100,
        query: searchRequest.query,
        reranked: false,
      });

      const searchResult = await controller.searchSimilar(searchRequest);
      expect(searchResult.results).toHaveLength(1);
      expect(searchResult.results[0].score).toBe(0.95);

      // 4. حذف الوثيقة
      service.deleteDocument.mockResolvedValue({
        success: true,
        deleted: true,
      });

      const deleteResult = await controller.deleteDocument('integration-doc');
      expect(deleteResult.deleted).toBe(true);

      // التحقق من ترتيب العمليات
      expect(service.createCollection).toHaveBeenCalledBefore(
        service.indexDocument,
      );
      expect(service.indexDocument).toHaveBeenCalledBefore(
        service.searchSimilar,
      );
      expect(service.searchSimilar).toHaveBeenCalledBefore(
        service.deleteDocument,
      );
    });

    it('يختبر البحث مع إعادة الترتيب', async () => {
      const searchRequest = {
        query: 'منتجات تقنية',
        merchantId: 'rerank-merchant',
        topK: 10,
        rerank: true,
      };

      // نتائج البحث الأولية
      const initialResults = [
        {
          id: 'doc-1',
          content: 'منتج تقني متقدم',
          score: 0.7,
          vector: [0.1, 0.2],
          metadata: {},
        },
        {
          id: 'doc-2',
          content: 'تقنية حديثة للمنتجات',
          score: 0.65,
          vector: [0.3, 0.4],
          metadata: {},
        },
      ];

      // نتائج بعد إعادة الترتيب
      const rerankedResults = [
        { ...initialResults[1], score: 0.9 },
        { ...initialResults[0], score: 0.85 },
      ];

      service.searchSimilar.mockResolvedValue({
        results: rerankedResults,
        total: 2,
        executionTime: 200,
        query: searchRequest.query,
        reranked: true,
      });

      const result = await controller.searchSimilar(searchRequest);

      expect(result.reranked).toBe(true);
      expect(result.results[0].score).toBeGreaterThan(
        result.results[1].score,
      );
      expect(result.results[0].id).toBe('doc-2'); // أعيد ترتيبها
    });
  });
});

describe('GeminiRerank', () => {
  let geminiRerank: GeminiRerank;
  let configService: DeepMockProxy<ConfigService>;

  beforeEach(async () => {
    configService = mockDeep<ConfigService>();
    configService.get.calledWith('GEMINI_API_KEY').mockReturnValue('test-key');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeminiRerank,
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    geminiRerank = module.get<GeminiRerank>(GeminiRerank);
    jest.clearAllMocks();
  });

  describe('rerank', () => {
    it('يعيد ترتيب النتائج باستخدام Gemini', async () => {
      const query = 'أفضل منتج تقني';
      const documents = [
        {
          id: 'doc-1',
          content: 'منتج تقني عادي',
          score: 0.7,
          metadata: {},
          vector: [0.1, 0.2],
        },
        {
          id: 'doc-2',
          content: 'أفضل منتج تقني متطور جداً',
          score: 0.6,
          metadata: {},
          vector: [0.3, 0.4],
        },
      ];

      // محاكاة استجابة Gemini
      const mockGeminiResponse = {
        rerankedResults: [
          { id: 'doc-2', relevanceScore: 0.95 },
          { id: 'doc-1', relevanceScore: 0.75 },
        ],
      };

      // Mock API call to Gemini
      jest.spyOn(geminiRerank as any, 'callGeminiAPI').mockResolvedValue(
        mockGeminiResponse,
      );

      const result = await geminiRerank.rerank(query, documents);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('doc-2'); // أعلى relevance
      expect(result[0].score).toBe(0.95);
      expect(result[1].id).toBe('doc-1');
      expect(result[1].score).toBe(0.75);
    });

    it('يتعامل مع أخطاء Gemini API', async () => {
      const query = 'استعلام فاشل';
      const documents = [
        {
          id: 'doc-1',
          content: 'محتوى',
          score: 0.5,
          metadata: {},
          vector: [0.1],
        },
      ];

      jest
        .spyOn(geminiRerank as any, 'callGeminiAPI')
        .mockRejectedValue(new Error('API Error'));

      // يجب أن يعيد النتائج الأصلية عند فشل إعادة الترتيب
      const result = await geminiRerank.rerank(query, documents);

      expect(result).toEqual(documents);
    });

    it('يعيد النتائج الأصلية للقوائم الفارغة', async () => {
      const query = 'استعلام فارغ';
      const documents: VectorDocument[] = [];

      const result = await geminiRerank.rerank(query, documents);

      expect(result).toEqual([]);
    });
  });
});
