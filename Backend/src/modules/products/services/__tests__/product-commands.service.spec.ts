import { Test, TestingModule } from '@nestjs/testing';
import { ProductCommandsService } from '../product-commands.service';
import { ConfigService } from '@nestjs/config';
import { ProductIndexService } from '../product-index.service';
import { ProductMediaService } from '../product-media.service';
import { CacheService } from '../../../../common/cache/cache.service';
import { StorefrontService } from '../../../storefront/storefront.service';
import { CategoriesService } from '../../../categories/categories.service';
import { TranslationService } from '../../../../common/services/translation.service';
import { OutboxService } from '../../../../common/outbox/outbox.service';

const mockSession = {
  withTransaction: jest.fn(),
  endSession: jest.fn(),
};
const repo = {
  startSession: jest.fn(),
  create: jest.fn(),
  updateById: jest.fn(),
  deleteById: jest.fn(),
  findById: jest.fn(),
  setAvailability: jest.fn(),
};
const outbox = { enqueueEvent: jest.fn() };
const indexer = { upsert: jest.fn(), removeOne: jest.fn() };
const media = { uploadMany: jest.fn() };
const cache = { invalidate: jest.fn() };
const storefronts = { findByMerchant: jest.fn() };
const categories = { findOne: jest.fn() };
const t = {
  translate: (k: string) => k,
  translateProduct: (k: string) => k,
};
const cfg = {
  get: jest.fn((k: string) => ({ 'vars.products.maxImages': 6 })[k]),
};

describe('ProductCommandsService', () => {
  let svc: ProductCommandsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductCommandsService,
        { provide: 'ProductsRepository', useValue: repo },
        { provide: ProductIndexService, useValue: indexer },
        { provide: ProductMediaService, useValue: media },
        { provide: CacheService, useValue: cache },
        { provide: StorefrontService, useValue: storefronts },
        { provide: CategoriesService, useValue: categories },
        { provide: TranslationService, useValue: t },
        { provide: OutboxService, useValue: outbox },
        { provide: ConfigService, useValue: cfg },
      ],
    }).compile();

    svc = module.get(ProductCommandsService);
    jest.resetAllMocks();
  });

  describe('create', () => {
    it('creates product and enqueues outbox + indexes', async () => {
      const storefront = { slug: 'test-store', domain: 'test.com' };
      const createdProduct = {
        _id: '507f1f77bcf86cd799439011',
        merchantId: '507f1f77bcf86cd799439012',
        name: 'Test Product',
        price: 10,
        category: '507f1f77bcf86cd799439016',
      };

      storefronts.findByMerchant.mockResolvedValue(storefront);
      repo.create.mockResolvedValue(createdProduct);
      repo.startSession.mockResolvedValue(mockSession);
      categories.findOne.mockResolvedValue({ name: 'Test Category' });

      // Mock the transaction to execute the callback
      mockSession.withTransaction.mockImplementation(async (callback) => {
        await callback();
      });

      const result = await svc.create({
        merchantId: '507f1f77bcf86cd799439012',
        name: 'Test Product',
        price: 10,
      } as any);

      expect(storefronts.findByMerchant).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439012',
      );
      expect(repo.create).toHaveBeenCalled();
      expect(outbox.enqueueEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          aggregateType: 'product',
          aggregateId: '507f1f77bcf86cd799439011',
          eventType: 'product.created',
          payload: {
            productId: '507f1f77bcf86cd799439011',
            merchantId: '507f1f77bcf86cd799439012',
          },
          dedupeKey: 'product.created:507f1f77bcf86cd799439011',
        }),
        expect.any(Object),
      );
      expect(indexer.upsert).toHaveBeenCalledWith(
        createdProduct,
        storefront,
        'Test Category',
      );
      expect(cache.invalidate).toHaveBeenCalledTimes(2);
      expect(result).toBe(createdProduct);
    });

    it('creates product without category', async () => {
      const storefront = { slug: 'test-store' };
      const createdProduct = {
        _id: '507f1f77bcf86cd799439013',
        merchantId: '507f1f77bcf86cd799439012',
        name: 'Test Product 2',
        price: 20,
      };

      storefronts.findByMerchant.mockResolvedValue(storefront);
      repo.create.mockResolvedValue(createdProduct);
      repo.startSession.mockResolvedValue(mockSession);
      categories.findOne.mockResolvedValue(null);

      // Mock the transaction to execute the callback
      mockSession.withTransaction.mockImplementation(async (callback) => {
        await callback();
      });

      await svc.create({
        merchantId: '507f1f77bcf86cd799439012',
        name: 'Test Product 2',
        price: 20,
      } as any);

      expect(indexer.upsert).toHaveBeenCalledWith(
        createdProduct,
        storefront,
        null,
      );
    });

    it('handles transaction properly', async () => {
      const storefront = { slug: 'test-store' };
      const createdProduct = {
        _id: '507f1f77bcf86cd799439014',
        merchantId: '507f1f77bcf86cd799439012',
        category: null,
      };

      storefronts.findByMerchant.mockResolvedValue(storefront);
      repo.create.mockResolvedValue(createdProduct);
      repo.startSession.mockResolvedValue(mockSession);
      categories.findOne.mockResolvedValue(null);

      // Mock the transaction to execute the callback and return the created product
      mockSession.withTransaction.mockImplementation(async (callback) => {
        const result = await callback();
        return result;
      });

      await svc.create({
        merchantId: '507f1f77bcf86cd799439012',
        name: 'Test Product',
        price: 10,
      } as any);

      expect(mockSession.withTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('updates product and enqueues event', async () => {
      const updatedProduct = {
        _id: '507f1f77bcf86cd799439011',
        merchantId: '507f1f77bcf86cd799439012',
        name: 'Updated Product',
        updatedAt: new Date(),
        category: '507f1f77bcf86cd799439015',
      };
      const storefront = { slug: 'test-store' };

      repo.updateById.mockResolvedValue(updatedProduct);
      storefronts.findByMerchant.mockResolvedValue(storefront);
      categories.findOne.mockResolvedValue({ name: 'Updated Category' });

      const result = await svc.update('507f1f77bcf86cd799439011', {
        name: 'Updated Product',
      } as any);

      expect(repo.updateById).toHaveBeenCalled();
      expect(outbox.enqueueEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          aggregateType: 'product',
          eventType: 'product.updated',
          payload: {
            productId: '507f1f77bcf86cd799439011',
            merchantId: '507f1f77bcf86cd799439012',
          },
        }),
      );
      expect(indexer.upsert).toHaveBeenCalledWith(
        updatedProduct,
        storefront,
        'Updated Category',
      );
      expect(result).toBe(updatedProduct);
    });

    it('throws BadRequestException for invalid ObjectId', async () => {
      await expect(svc.update('invalid-id', {} as any)).rejects.toThrow(
        'validation.mongoId',
      );
    });

    it('throws NotFoundException when product not found', async () => {
      repo.updateById.mockResolvedValue(null);

      await expect(
        svc.update('507f1f77bcf86cd799439011', {} as any),
      ).rejects.toThrow('errors.notFound');
    });
  });

  describe('remove', () => {
    it('removes product and cleans up', async () => {
      const product = {
        _id: '507f1f77bcf86cd799439011',
        merchantId: '507f1f77bcf86cd799439012',
        name: 'Test Product',
      };

      repo.findById.mockResolvedValue(product);
      repo.deleteById.mockResolvedValue(true);
      repo.startSession.mockResolvedValue(mockSession);

      // Mock the transaction to execute the callback
      mockSession.withTransaction.mockImplementation(async (callback) => {
        await callback();
      });

      const result = await svc.remove('507f1f77bcf86cd799439011');

      expect(repo.findById).toHaveBeenCalled();
      expect(repo.deleteById).toHaveBeenCalled();
      expect(outbox.enqueueEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          aggregateType: 'product',
          eventType: 'product.deleted',
          payload: {
            productId: '507f1f77bcf86cd799439011',
            merchantId: '507f1f77bcf86cd799439012',
          },
        }),
        mockSession,
      );
      expect(indexer.removeOne).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
      );
      expect(cache.invalidate).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        message: 'messages.deleted',
      });
    });

    it('throws BadRequestException for invalid ObjectId', async () => {
      await expect(svc.remove('invalid-id')).rejects.toThrow(
        'validation.mongoId',
      );
    });

    it('throws NotFoundException when product not found', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(svc.remove('507f1f77bcf86cd799439011')).rejects.toThrow(
        'errors.notFound',
      );
    });
  });

  describe('setAvailability', () => {
    it('sets product availability', async () => {
      const mockResult = { success: true };
      repo.setAvailability.mockResolvedValue(mockResult);

      const result = await svc.setAvailability(
        '507f1f77bcf86cd799439011',
        true,
      );

      expect(repo.setAvailability).toHaveBeenCalledWith(
        expect.any(Object), // ObjectId
        true,
      );
      expect(result).toBe(mockResult);
    });

    it('throws BadRequestException for invalid ObjectId', async () => {
      await expect(svc.setAvailability('invalid-id', true)).rejects.toThrow(
        'validation.mongoId',
      );
    });
  });

  describe('uploadProductImagesToMinio', () => {
    it('uploads images and returns result', async () => {
      const files = [{ filename: 'test.jpg' }] as Express.Multer.File[];
      const urls = ['https://minio.example.com/test.jpg'];

      media.uploadMany.mockResolvedValue(urls);
      cfg.get.mockReturnValue(6);

      const result = await svc.uploadProductImagesToMinio(
        '507f1f77bcf86cd799439011',
        'merchant1',
        files,
      );

      expect(media.uploadMany).toHaveBeenCalledWith(
        'merchant1',
        '507f1f77bcf86cd799439011',
        files,
        false,
      );
      expect(result).toEqual({
        urls,
        count: 1,
        accepted: 1,
        remaining: 5,
      });
    });

    it('respects replace option', async () => {
      const files = [{ filename: 'test.jpg' }] as Express.Multer.File[];
      const urls = ['https://minio.example.com/test.jpg'];

      media.uploadMany.mockResolvedValue(urls);

      await svc.uploadProductImagesToMinio(
        '507f1f77bcf86cd799439011',
        'merchant1',
        files,
        { replace: true },
      );

      expect(media.uploadMany).toHaveBeenCalledWith(
        'merchant1',
        '507f1f77bcf86cd799439011',
        files,
        true,
      );
    });

    it('throws BadRequestException for invalid ObjectId', async () => {
      await expect(
        svc.uploadProductImagesToMinio('invalid-id', 'merchant1', []),
      ).rejects.toThrow('validation.mongoId');
    });
  });

  describe('uploadImages', () => {
    it('uploads images using legacy method', async () => {
      const files = [{ filename: 'test.jpg' }] as Express.Multer.File[];
      const urls = ['https://minio.example.com/test.jpg'];

      media.uploadMany.mockResolvedValue(urls);

      const result = await svc.uploadImages(
        '507f1f77bcf86cd799439011',
        'merchant1',
        files,
      );

      expect(media.uploadMany).toHaveBeenCalledWith(
        'merchant1',
        '507f1f77bcf86cd799439011',
        files,
        false,
      );
      expect(result).toEqual({ urls });
    });

    it('respects replace option in legacy method', async () => {
      const files = [{ filename: 'test.jpg' }] as Express.Multer.File[];
      const urls = ['https://minio.example.com/test.jpg'];

      media.uploadMany.mockResolvedValue(urls);

      await svc.uploadImages(
        '507f1f77bcf86cd799439011',
        'merchant1',
        files,
        true,
      );

      expect(media.uploadMany).toHaveBeenCalledWith(
        'merchant1',
        '507f1f77bcf86cd799439011',
        files,
        true,
      );
    });
  });
});
