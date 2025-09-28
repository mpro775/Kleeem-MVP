import { Test, type TestingModule } from '@nestjs/testing';
import { mockDeep } from 'jest-mock-extended';

import { ProductMetrics } from '../../../metrics/product.metrics';
import { ProductsService } from '../products.service';
import { ProductCommandsService } from '../services/product-commands.service';
import { ProductPublicService } from '../services/product-public.service';
import { ProductQueriesService } from '../services/product-queries.service';
import { ProductSyncService } from '../services/product-sync.service';

describe('ProductsService', () => {
  let service: ProductsService;
  let commandsService: jest.Mocked<ProductCommandsService>;
  let syncService: jest.Mocked<ProductSyncService>;
  let queriesService: jest.Mocked<ProductQueriesService>;
  let publicService: jest.Mocked<ProductPublicService>;
  let productMetrics: jest.Mocked<ProductMetrics>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: ProductCommandsService,
          useValue: mockDeep<ProductCommandsService>(),
        },
        {
          provide: ProductSyncService,
          useValue: mockDeep<ProductSyncService>(),
        },
        {
          provide: ProductQueriesService,
          useValue: mockDeep<ProductQueriesService>(),
        },
        {
          provide: ProductPublicService,
          useValue: mockDeep<ProductPublicService>(),
        },
        {
          provide: ProductMetrics,
          useValue: mockDeep<ProductMetrics>(),
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    commandsService = module.get(ProductCommandsService);
    syncService = module.get(ProductSyncService);
    queriesService = module.get(ProductQueriesService);
    publicService = module.get(ProductPublicService);
    productMetrics = module.get(ProductMetrics);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new product and increment metrics', async () => {
      const createProductDto = {
        name: 'Test Product',
        description: 'Test Description',
        price: 100,
        category: 'electronics',
        merchantId: 'merchant123',
      };

      const mockCreatedProduct = {
        id: 'product123',
        ...createProductDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      commandsService.create.mockResolvedValue(mockCreatedProduct as any);

      const result = await service.create(createProductDto as any);

      expect(result).toEqual(mockCreatedProduct);
      expect(commandsService.create.bind(commandsService)).toHaveBeenCalledWith(
        createProductDto,
      );
      expect(
        productMetrics.incCreated.bind(productMetrics),
      ).toHaveBeenCalledWith('merchant123', 'electronics');
    });
  });

  describe('update', () => {
    it('should update product and increment metrics when product exists', async () => {
      const updateProductDto = {
        name: 'Updated Product',
        price: 150,
      };

      const mockUpdatedProduct = {
        id: 'product123',
        name: 'Updated Product',
        price: 150,
        merchantId: 'merchant123',
        category: 'electronics',
      };

      commandsService.update.mockResolvedValue(mockUpdatedProduct as any);

      const result = await service.update('product123', updateProductDto);

      expect(result).toEqual(mockUpdatedProduct);
      expect(commandsService.update.bind(commandsService)).toHaveBeenCalledWith(
        'product123',
        updateProductDto,
      );
      expect(
        productMetrics.incUpdated.bind(productMetrics),
      ).toHaveBeenCalledWith('merchant123', 'electronics');
    });

    it('should not increment metrics when product not found', async () => {
      commandsService.update.mockResolvedValue(null as any);

      const result = await service.update('nonexistent', { name: 'Test' });

      expect(result).toBeNull();
      expect(
        productMetrics.incUpdated.bind(productMetrics),
      ).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return paginated products', async () => {
      const getProductsDto = {
        page: 1,
        limit: 10,
        merchantId: 'merchant123',
      };

      const mockPaginatedResult = {
        data: [
          { id: '1', name: 'Product 1', price: 100 },
          { id: '2', name: 'Product 2', price: 200 },
        ],
        total: 2,
        page: 1,
        limit: 10,
      };

      queriesService.findAllByMerchant.mockResolvedValue(
        mockPaginatedResult as any,
      );

      const result = await service.findAllByMerchant(getProductsDto as any);

      expect(result).toEqual(mockPaginatedResult);
      expect(
        queriesService.findAllByMerchant.bind(queriesService),
      ).toHaveBeenCalledWith(getProductsDto as any);
    });
  });

  describe('findOne', () => {
    it('should return product when found', async () => {
      const mockProduct = {
        id: 'product123',
        name: 'Test Product',
        price: 100,
        merchantId: 'merchant123',
      };

      queriesService.findOne.mockResolvedValue(mockProduct as any);

      const result = await service.findOne('product123');

      expect(result).toEqual(mockProduct);
      expect(queriesService.findOne.bind(queriesService)).toHaveBeenCalledWith(
        'product123',
      );
    });

    it('should return null when product not found', async () => {
      queriesService.findOne.mockResolvedValue(null as any);

      const result = await service.findOne('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('syncFromExternal', () => {
    it('should sync products from external source', async () => {
      const externalProducts = [
        {
          externalId: 'ext1',
          title: 'External Product 1',
          price: 100,
          raw: { id: 'ext1', name: 'External Product 1', price: 100 },
        },
        {
          externalId: 'ext2',
          title: 'External Product 2',
          price: 200,
          raw: { id: 'ext2', name: 'External Product 2', price: 200 },
        },
      ];

      const mockSyncResult = {
        synced: 2,
        errors: 0,
        products: externalProducts,
      };

      syncService.upsertExternalProduct.mockResolvedValue(
        mockSyncResult as any,
      );

      const result = await service.upsertExternalProduct(
        'merchant123',
        'zid',
        externalProducts as any,
      );

      expect(result).toEqual(mockSyncResult);
      expect(
        syncService.upsertExternalProduct.bind(syncService),
      ).toHaveBeenCalledWith('merchant123', externalProducts);
    });
  });

  describe('delete', () => {
    it('should delete product and increment metrics', async () => {
      const mockDeletedProduct = {
        id: 'product123',
        name: 'Deleted Product',
        merchantId: 'merchant123',
        category: 'electronics',
      };

      commandsService.remove.mockResolvedValue(mockDeletedProduct as any);

      const result = await service.remove('product123');

      expect(result).toEqual(mockDeletedProduct);
      expect(commandsService.remove.bind(commandsService)).toHaveBeenCalledWith(
        'product123',
      );
      expect(
        productMetrics.incDeleted.bind(productMetrics),
      ).toHaveBeenCalledWith('merchant123', 'electronics');
    });

    it('should not increment metrics when product not found', async () => {
      commandsService.remove.mockResolvedValue(null as any);

      const result = await service.remove('nonexistent');

      expect(result).toBeNull();
      expect(
        productMetrics.incDeleted.bind(productMetrics),
      ).not.toHaveBeenCalled();
    });
  });

  describe('getPublicProducts', () => {
    it('should return public products for storefront', async () => {
      const mockPublicProducts = [
        { id: '1', name: 'Public Product 1', price: 100 },
        { id: '2', name: 'Public Product 2', price: 200 },
      ];

      publicService.getPublicProducts.mockResolvedValue(
        mockPublicProducts as any,
      );

      const result = await service.getPublicProducts('merchant123', {
        limit: 10,
        cursor: 'prevCursor',
      } as any);

      expect(result).toEqual(mockPublicProducts);
      expect(
        publicService.getPublicProducts.bind(publicService),
      ).toHaveBeenCalledWith('merchant123');
    });
  });
});
