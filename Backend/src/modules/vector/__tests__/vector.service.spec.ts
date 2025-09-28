import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { mockDeep } from 'jest-mock-extended';
import { I18nService } from 'nestjs-i18n';

import { VectorService } from '../vector.service';

// Mock the complex dependencies
jest.mock('../utils/qdrant.client', () => ({
  QdrantWrapper: jest.fn().mockImplementation(() => ({
    search: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
    createCollection: jest.fn(),
  })),
}));

jest.mock('../utils/embeddings.client', () => ({
  EmbeddingsClient: jest.fn().mockImplementation(() => ({
    embed: jest.fn(),
  })),
}));

describe('VectorService', () => {
  let service: VectorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VectorService,
        {
          provide: ConfigService,
          useValue: mockDeep<ConfigService>(),
        },
        {
          provide: I18nService,
          useValue: mockDeep<I18nService>(),
        },
        {
          provide: 'CACHE_MANAGER',
          useValue: mockDeep(),
        },
      ],
    }).compile();

    service = module.get<VectorService>(VectorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('embed', () => {
    it('should generate embeddings for text', async () => {
      const text = 'This is a test text';
      const mockEmbedding = [0.1, 0.2, 0.3, 0.4];

      // Mock the embeddings client
      const mockEmbeddingsClient = {
        embed: jest.fn().mockResolvedValue(mockEmbedding),
      };

      jest
        .spyOn(service as any, 'embeddingsClient' as any, 'get')
        .mockReturnValue(mockEmbeddingsClient);

      const result = await service.embedText(text);

      expect(result).toEqual(mockEmbedding);
      expect(mockEmbeddingsClient.embed).toHaveBeenCalledWith(text);
    });

    it('should handle empty text', async () => {
      const text = '';
      const mockEmbedding = [0.0, 0.0, 0.0, 0.0];

      const mockEmbeddingsClient = {
        embed: jest.fn().mockResolvedValue(mockEmbedding),
      };

      jest
        .spyOn(service as any, 'embeddingsClient' as any, 'get')
        .mockReturnValue(mockEmbeddingsClient);

      const result = await service.embedText(text);

      expect(result).toEqual(mockEmbedding);
    });
  });

  describe('searchFaqs', () => {
    it('should search FAQs and return results', async () => {
      const query = 'How to reset password?';
      const merchantId = 'merchant123';

      const mockSearchResults = [
        {
          id: 'faq1',
          score: 0.95,
          payload: {
            question: 'How to reset password?',
            answer: 'Click on forgot password link',
            merchantId: 'merchant123',
          },
        },
        {
          id: 'faq2',
          score: 0.85,
          payload: {
            question: 'Password recovery',
            answer: 'Use email recovery option',
            merchantId: 'merchant123',
          },
        },
      ];

      const mockQdrantClient = {
        search: jest.fn().mockResolvedValue(mockSearchResults),
      };

      jest
        .spyOn(service as any, 'qdrant', 'get')
        .mockReturnValue(mockQdrantClient);
      jest.spyOn(service, 'embedText').mockResolvedValue([0.1, 0.2, 0.3]);

      const result = await service.searchBotFaqs(query, parseInt(merchantId));

      expect(result).toHaveLength(2);
      expect(result[0].score).toBe(0.95);
      expect(result[0].question).toBe('How to reset password?');
    });

    it('should return empty array when no results found', async () => {
      const query = 'nonexistent query';
      const merchantId = 'merchant123';

      const mockQdrantClient = {
        search: jest.fn().mockResolvedValue([]),
      };

      jest
        .spyOn(service as any, 'qdrant', 'get')
        .mockReturnValue(mockQdrantClient);
      jest.spyOn(service, 'embedText').mockResolvedValue([0.1, 0.2, 0.3]);

      const result = await service.searchBotFaqs(query, parseInt(merchantId));

      expect(result).toHaveLength(0);
    });
  });

  describe('addFaqPoint', () => {
    it('should add FAQ point to vector database', async () => {
      const faqData = {
        id: 'faq123',
        question: 'What is your return policy?',
        answer: '30 days return policy',
        merchantId: 'merchant123',
        category: 'policies',
      };

      const mockQdrantClient = {
        upsert: jest.fn().mockResolvedValue({ status: 'completed' }),
      };

      jest
        .spyOn(service as any, 'qdrant', 'get')
        .mockReturnValue(mockQdrantClient);
      jest.spyOn(service, 'embedText').mockResolvedValue([0.1, 0.2, 0.3]);

      const result = await service.upsertBotFaqs([faqData as any]);

      expect(result).toBeDefined();
      expect(mockQdrantClient.upsert).toHaveBeenCalled();
    });
  });

  describe('deleteFaqPointByFaqId', () => {
    it('should delete FAQ point by ID', async () => {
      const faqMongoId = 'faq123';

      const mockQdrantClient = {
        delete: jest.fn().mockResolvedValue({ status: 'completed' }),
      };

      jest
        .spyOn(service as any, 'qdrant', 'get')
        .mockReturnValue(mockQdrantClient);

      const result = await service.deleteFaqPointByFaqId(faqMongoId);

      expect(result).toBeDefined();
      expect(mockQdrantClient.delete).toHaveBeenCalled();
    });
  });

  describe('unifiedSemanticSearch', () => {
    it('should perform unified search across all collections', async () => {
      const text = 'product information';
      const merchantId = 'merchant123';
      const topK = 5;

      const mockSearchResults = [
        {
          id: 'result1',
          score: 0.9,
          payload: {
            type: 'faq',
            content: 'Product FAQ',
            merchantId: 'merchant123',
          },
        },
        {
          id: 'result2',
          score: 0.8,
          payload: {
            type: 'document',
            content: 'Product manual',
            merchantId: 'merchant123',
          },
        },
      ];

      const mockQdrantClient = {
        search: jest.fn().mockResolvedValue(mockSearchResults),
      };

      jest
        .spyOn(service as any, 'qdrant', 'get')
        .mockReturnValue(mockQdrantClient);
      jest.spyOn(service, 'embedText').mockResolvedValue([0.1, 0.2, 0.3]);

      const result = await service.unifiedSemanticSearch(
        text,
        merchantId,
        topK,
      );

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('faq');
      expect(result[1].type).toBe('document');
    });

    it('should handle search errors gracefully', async () => {
      const text = 'test query';
      const merchantId = 'merchant123';
      const topK = 5;

      const mockQdrantClient = {
        search: jest
          .fn()
          .mockRejectedValueOnce(new Error('Search failed'))
          .mockResolvedValue([]),
      };

      jest
        .spyOn(service as any, 'qdrant', 'get')
        .mockReturnValue(mockQdrantClient);
      jest.spyOn(service, 'embedText').mockResolvedValue([0.1, 0.2, 0.3]);

      const result = await service.unifiedSemanticSearch(
        text,
        merchantId,
        topK,
      );

      expect(result).toHaveLength(0);
    });
  });

  describe('generateFaqId', () => {
    it('should generate consistent FAQ ID', () => {
      const faqMongoId = 'faq123';
      const result1 = service.generateFaqId(faqMongoId);
      const result2 = service.generateFaqId(faqMongoId);

      expect(result1).toBe(result2);
      expect(result1).toContain('faq');
    });
  });
});
