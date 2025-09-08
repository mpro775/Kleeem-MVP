import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { VectorService } from './vector.service';
import { ProductsService } from '../products/products.service';
import { of, throwError } from 'rxjs';

describe('VectorService', () => {
  let service: VectorService;
  let httpService: jest.Mocked<HttpService>;
  let configService: jest.Mocked<ConfigService>;
  let productsService: jest.Mocked<ProductsService>;

  const mockQdrantClient = {
    upsert: jest.fn(),
    delete: jest.fn(),
    search: jest.fn(),
    getCollections: jest.fn(),
    createCollection: jest.fn(),
  };

  beforeEach(async () => {
    const mockHttpService = {
      post: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        const config = {
          QDRANT_URL: 'http://localhost:6333',
          EMBEDDING_SERVICE_URL: 'http://localhost:8000',
          VECTOR_DIMENSION: '384',
        };
        return config[key];
      }),
    };

    const mockProductsService = {
      findAll: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VectorService,
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: ProductsService, useValue: mockProductsService },
      ],
    }).compile();

    service = module.get<VectorService>(VectorService);
    httpService = module.get(HttpService);
    configService = module.get(ConfigService);
    productsService = module.get(ProductsService);

    // Mock the private qdrant client
    (service as any).qdrant = mockQdrantClient;

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('embed', () => {
    it('should generate embeddings successfully', async () => {
      const mockEmbedding = new Array(384).fill(0).map(() => Math.random());
      const mockResponse = {
        data: {
          embeddings: [mockEmbedding],
        },
      };

      httpService.post.mockReturnValue(of(mockResponse));

      const result = await service.embed('test text');

      expect(httpService.post).toHaveBeenCalledWith(
        'http://localhost:8000/embed',
        { texts: ['test text'] },
      );
      expect(result).toEqual(mockEmbedding);
      expect(result).toHaveLength(384);
    });

    it('should throw error for invalid embedding length', async () => {
      const invalidEmbedding = new Array(256).fill(0); // Wrong dimension
      const mockResponse = {
        data: {
          embeddings: [invalidEmbedding],
        },
      };

      httpService.post.mockReturnValue(of(mockResponse));

      await expect(service.embed('test text')).rejects.toThrow(
        'Invalid embedding length: 256',
      );
    });

    it('should handle HTTP errors', async () => {
      const error = {
        response: {
          data: 'Embedding service error',
        },
      };

      httpService.post.mockReturnValue(throwError(() => error));

      await expect(service.embed('test text')).rejects.toThrow(
        'Bad Request: Embedding service error',
      );
    });

    it('should handle network errors', async () => {
      const error = new Error('Network error');
      httpService.post.mockReturnValue(throwError(() => error));

      await expect(service.embed('test text')).rejects.toThrow(
        'Bad Request: Network error',
      );
    });
  });

  describe('upsertProducts', () => {
    it('should upsert products to vector database', async () => {
      const mockProducts = [
        {
          id: 'product123',
          vector: new Array(384).fill(0.1),
          payload: {
            merchantId: 'merchant456',
            name: 'Test Product',
            description: 'Test Description',
          },
        },
      ];

      mockQdrantClient.upsert.mockResolvedValue({ status: 'ok' });

      await service.upsertProducts(mockProducts);

      expect(mockQdrantClient.upsert).toHaveBeenCalledWith('products', {
        wait: true,
        points: mockProducts,
      });
    });

    it('should handle empty products array', async () => {
      await service.upsertProducts([]);

      expect(mockQdrantClient.upsert).not.toHaveBeenCalled();
    });
  });

  describe('deleteProductPoint', () => {
    it('should delete product from vector database', async () => {
      const productId = 'product123';
      mockQdrantClient.delete.mockResolvedValue({ status: 'ok' });

      await service.deleteProductPoint(productId);

      expect(mockQdrantClient.delete).toHaveBeenCalledWith('products', {
        points: [productId],
      });
    });
  });

  describe('searchProducts', () => {
    it('should search products successfully', async () => {
      const mockEmbedding = new Array(384).fill(0.1);
      const mockSearchResults = [
        {
          id: 'product123',
          score: 0.9,
          payload: {
            merchantId: 'merchant456',
            name: 'Test Product',
          },
        },
      ];

      // Mock the embed method
      jest.spyOn(service, 'embed').mockResolvedValue(mockEmbedding);
      mockQdrantClient.search.mockResolvedValue(mockSearchResults);

      const result = await service.searchProducts(
        'test query',
        'merchant456',
        10,
      );

      expect(service.embed).toHaveBeenCalledWith('test query');
      expect(mockQdrantClient.search).toHaveBeenCalledWith('products', {
        vector: mockEmbedding,
        filter: {
          must: [
            {
              key: 'merchantId',
              match: { value: 'merchant456' },
            },
          ],
        },
        limit: 10,
        with_payload: true,
      });
      expect(result).toEqual(mockSearchResults);
    });

    it('should handle search without merchant filter', async () => {
      const mockEmbedding = new Array(384).fill(0.1);

      jest.spyOn(service, 'embed').mockResolvedValue(mockEmbedding);
      mockQdrantClient.search.mockResolvedValue([]);

      await service.searchProducts('test query', null, 10);

      expect(mockQdrantClient.search).toHaveBeenCalledWith('products', {
        vector: mockEmbedding,
        filter: undefined,
        limit: 10,
        with_payload: true,
      });
    });

    it('should handle embedding errors in search', async () => {
      jest
        .spyOn(service, 'embed')
        .mockRejectedValue(new Error('Embedding failed'));

      await expect(
        service.searchProducts('test query', 'merchant456', 10),
      ).rejects.toThrow('Embedding failed');
    });
  });

  describe('upsertBotFaqs', () => {
    it('should upsert bot FAQs successfully', async () => {
      const mockFaqs = [
        {
          id: 'faq123',
          vector: new Array(384).fill(0.1),
          payload: {
            faqId: 'faq123',
            question: 'Test question?',
            answer: 'Test answer',
            type: 'faq',
          },
        },
      ];

      mockQdrantClient.upsert.mockResolvedValue({ status: 'ok' });

      await service.upsertBotFaqs(mockFaqs);

      expect(mockQdrantClient.upsert).toHaveBeenCalledWith('bot_faqs', {
        wait: true,
        points: mockFaqs,
      });
    });
  });

  describe('upsertDocumentChunks', () => {
    it('should upsert document chunks successfully', async () => {
      const mockChunks = [
        {
          id: 'doc123-chunk1',
          vector: new Array(384).fill(0.1),
          payload: {
            merchantId: 'merchant456',
            documentId: 'doc123',
            text: 'Document text chunk',
            chunkIndex: 0,
          },
        },
      ];

      mockQdrantClient.upsert.mockResolvedValue({ status: 'ok' });

      await service.upsertDocumentChunks(mockChunks);

      expect(mockQdrantClient.upsert).toHaveBeenCalledWith('documents', {
        wait: true,
        points: mockChunks,
      });
    });
  });

  describe('toStringList', () => {
    it('should convert various types to string arrays', () => {
      const toStringList = (service as any).toStringList.bind(service);

      // Test primitives
      expect(toStringList('hello')).toEqual(['hello']);
      expect(toStringList(123)).toEqual(['123']);
      expect(toStringList(true)).toEqual(['true']);
      expect(toStringList(null)).toEqual([]);
      expect(toStringList(undefined)).toEqual([]);

      // Test arrays
      expect(toStringList(['a', 'b', 'c'])).toEqual(['a', 'b', 'c']);
      expect(toStringList([1, 2, 3])).toEqual(['1', '2', '3']);

      // Test objects
      expect(toStringList({ name: 'test', value: 123 })).toEqual([
        'test',
        '123',
      ]);
    });

    it('should handle circular references', () => {
      const toStringList = (service as any).toStringList.bind(service);

      const circular: any = { name: 'test' };
      circular.self = circular;

      const result = toStringList(circular);
      expect(result).toContain('test');
    });

    it('should respect max depth', () => {
      const toStringList = (service as any).toStringList.bind(service);

      const deepObject = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: 'deep value',
              },
            },
          },
        },
      };

      const result = toStringList(deepObject);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('searchBotFaqs', () => {
    it('should search bot FAQs successfully', async () => {
      const mockEmbedding = new Array(384).fill(0.1);
      const mockSearchResults = [
        {
          id: 'faq123',
          score: 0.9,
          payload: {
            question: 'Test question?',
            answer: 'Test answer',
          },
        },
      ];

      jest.spyOn(service, 'embed').mockResolvedValue(mockEmbedding);
      mockQdrantClient.search.mockResolvedValue(mockSearchResults);

      const result = await service.searchBotFaqs('test query', 5);

      expect(service.embed).toHaveBeenCalledWith('test query');
      expect(mockQdrantClient.search).toHaveBeenCalledWith('bot_faqs', {
        vector: mockEmbedding,
        limit: 5,
        with_payload: true,
      });
      expect(result).toEqual(mockSearchResults);
    });
  });
});
