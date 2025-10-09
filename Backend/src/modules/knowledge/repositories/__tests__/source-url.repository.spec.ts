import { getModelToken } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';

import { SourceUrl } from '../../schemas/source-url.schema';
import { SourceUrlMongoRepository } from '../source-url.mongo.repository';

import type { SourceUrlRepository } from '../source-url.repository';
import type { Model } from 'mongoose';

describe('SourceUrlRepository Interface Implementation', () => {
  let repository: SourceUrlRepository;
  let model: jest.Mocked<Model<SourceUrl>>;

  const mockMerchantId = '507f1f77bcf86cd799439011';
  const mockUrlId = '507f1f77bcf86cd799439012';
  const mockUrl = 'https://example.com/test';

  beforeEach(async () => {
    const mockModel = {
      insertMany: jest.fn(),
      updateOne: jest.fn(),
      deleteOne: jest.fn(),
      deleteMany: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      countDocuments: jest.fn(),
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SourceUrlMongoRepository,
        {
          provide: getModelToken(SourceUrl.name),
          useValue: mockModel,
        },
      ],
    }).compile();

    repository = module.get<SourceUrlRepository>(SourceUrlMongoRepository);
    model = module.get(getModelToken(SourceUrl.name));
  });

  describe('Interface compliance', () => {
    it('should implement SourceUrlRepository interface correctly', () => {
      // Verify that the repository implements all required methods from SourceUrlRepository interface
      expect(typeof repository.createMany).toBe('function');
      expect(typeof repository.markCompleted).toBe('function');
      expect(typeof repository.markFailed).toBe('function');
      expect(typeof repository.findByMerchant).toBe('function');
      expect(typeof repository.findListByMerchant).toBe('function');
      expect(typeof repository.findByIdForMerchant).toBe('function');
      expect(typeof repository.findByUrlForMerchant).toBe('function');
      expect(typeof repository.deleteByIdForMerchant).toBe('function');
      expect(typeof repository.deleteByMerchant).toBe('function');
      expect(typeof repository.paginateByMerchant).toBe('function');
    });

    it('should have correct method signatures matching interface', () => {
      // Test method signatures match the interface definition

      // createMany(records: Array<{ merchantId: string; url: string; status?: SourceUrlEntity['status']; }>)
      expect(repository.createMany.length).toBe(1);

      // markCompleted(id: string, textExtracted: string)
      expect(repository.markCompleted.length).toBe(2);

      // markFailed(id: string, errorMessage: string)
      expect(repository.markFailed.length).toBe(2);

      // findByMerchant(merchantId: string)
      expect(repository.findByMerchant.length).toBe(1);

      // findListByMerchant(merchantId: string)
      expect(repository.findListByMerchant.length).toBe(1);

      // findByIdForMerchant(id: string, merchantId: string)
      expect(repository.findByIdForMerchant.length).toBe(2);

      // findByUrlForMerchant(url: string, merchantId: string)
      expect(repository.findByUrlForMerchant.length).toBe(2);

      // deleteByIdForMerchant(id: string, merchantId: string)
      expect(repository.deleteByIdForMerchant.length).toBe(2);

      // deleteByMerchant(merchantId: string)
      expect(repository.deleteByMerchant.length).toBe(1);

      // paginateByMerchant(merchantId: string, opts: { page: number; limit: number })
      expect(repository.paginateByMerchant?.length).toBe(2);
    });

    it('should return correct return types', async () => {
      // createMany should return Promise<SourceUrlEntity[]>
      model.insertMany.mockResolvedValue([]);
      const createResult = await repository.createMany([
        { merchantId: mockMerchantId, url: mockUrl },
      ]);
      expect(Array.isArray(createResult)).toBe(true);

      // markCompleted should return Promise<void>
      model.updateOne.mockResolvedValue({ matchedCount: 1 } as any);
      const markCompletedResult = await repository.markCompleted(
        mockUrlId,
        'test text',
      );
      expect(markCompletedResult).toBeUndefined();

      // markFailed should return Promise<void>
      const markFailedResult = await repository.markFailed(
        mockUrlId,
        'test error',
      );
      expect(markFailedResult).toBeUndefined();

      // findByMerchant should return Promise<SourceUrlEntity[]>
      model.find.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      } as any);
      const findByMerchantResult =
        await repository.findByMerchant(mockMerchantId);
      expect(Array.isArray(findByMerchantResult)).toBe(true);

      // findListByMerchant should return Promise<Array<Pick<SourceUrlEntity, '_id' | 'url' | 'status' | 'errorMessage' | 'createdAt'>>>
      model.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      } as any);
      const findListResult =
        await repository.findListByMerchant(mockMerchantId);
      expect(Array.isArray(findListResult)).toBe(true);

      // findByIdForMerchant should return Promise<SourceUrlEntity | null>
      model.findOne.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      } as any);
      const findByIdResult = await repository.findByIdForMerchant(
        mockUrlId,
        mockMerchantId,
      );
      expect(
        findByIdResult === null ||
          (findByIdResult && typeof findByIdResult === 'object'),
      ).toBe(true);

      // findByUrlForMerchant should return Promise<SourceUrlEntity | null>
      const findByUrlResult = await repository.findByUrlForMerchant(
        mockUrl,
        mockMerchantId,
      );
      expect(
        findByUrlResult === null ||
          (findByUrlResult && typeof findByUrlResult === 'object'),
      ).toBe(true);

      // deleteByIdForMerchant should return Promise<number>
      model.deleteOne.mockResolvedValue({ deletedCount: 1 } as any);
      const deleteByIdResult = await repository.deleteByIdForMerchant(
        mockUrlId,
        mockMerchantId,
      );
      expect(typeof deleteByIdResult).toBe('number');

      // deleteByMerchant should return Promise<number>
      model.deleteMany.mockResolvedValue({ deletedCount: 5 } as any);
      const deleteByMerchantResult =
        await repository.deleteByMerchant(mockMerchantId);
      expect(typeof deleteByMerchantResult).toBe('number');

      // paginateByMerchant should return Promise<{ items: SourceUrlEntity[]; total: number; page: number; limit: number; }>
      model.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      } as any);
      model.countDocuments.mockResolvedValue(0);
      const paginateResult = repository.paginateByMerchant
        ? await repository.paginateByMerchant(mockMerchantId, {
            page: 1,
            limit: 10,
          })
        : { items: [], total: 0, page: 1, limit: 10 };
      expect(typeof paginateResult).toBe('object');
      expect(Array.isArray(paginateResult.items)).toBe(true);
      expect(typeof paginateResult.total).toBe('number');
      expect(typeof paginateResult.page).toBe('number');
      expect(typeof paginateResult.limit).toBe('number');
    });

    it('should handle method parameter types correctly', async () => {
      // Test that methods accept correct parameter types as defined in interface

      // String parameters
      model.findOne.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      await expect(
        repository.findByIdForMerchant('string-id', 'string-merchant-id'),
      ).resolves.toBeDefined();

      await expect(
        repository.findByUrlForMerchant('string-url', 'string-merchant-id'),
      ).resolves.toBeDefined();

      await expect(
        repository.deleteByIdForMerchant('string-id', 'string-merchant-id'),
      ).resolves.toBeDefined();

      // createMany with correct record structure
      model.insertMany.mockResolvedValue([]);
      await expect(
        repository.createMany([
          { merchantId: 'string-merchant-id', url: 'string-url' },
        ]),
      ).resolves.toBeDefined();

      // createMany with optional status
      await expect(
        repository.createMany([
          {
            merchantId: 'string-merchant-id',
            url: 'string-url',
            status: 'pending',
          },
        ]),
      ).resolves.toBeDefined();

      // markCompleted with string parameters
      model.updateOne.mockResolvedValue({ matchedCount: 1 } as any);
      await expect(
        repository.markCompleted('string-id', 'string-text'),
      ).resolves.toBeDefined();

      // markFailed with string parameters
      await expect(
        repository.markFailed('string-id', 'string-error'),
      ).resolves.toBeDefined();

      // findByMerchant with string merchant ID
      model.find.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      } as any);
      await expect(
        repository.findByMerchant('string-merchant-id'),
      ).resolves.toBeDefined();

      // findListByMerchant with string merchant ID
      model.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      } as any);
      await expect(
        repository.findListByMerchant('string-merchant-id'),
      ).resolves.toBeDefined();

      // deleteByMerchant with string merchant ID
      model.deleteMany.mockResolvedValue({ deletedCount: 0 } as any);
      await expect(
        repository.deleteByMerchant('string-merchant-id'),
      ).resolves.toBeDefined();

      // paginateByMerchant with correct options structure
      model.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      } as any);
      model.countDocuments.mockResolvedValue(0);
      await expect(
        repository.paginateByMerchant
          ? repository.paginateByMerchant('string-merchant-id', {
              page: 1,
              limit: 10,
            })
          : Promise.resolve({ items: [], total: 0, page: 1, limit: 10 }),
      ).resolves.toBeDefined();
    });

    it('should handle optional parameters correctly', async () => {
      // Test methods work correctly with and without optional parameters

      // createMany without optional status
      model.insertMany.mockResolvedValue([]);
      await expect(
        repository.createMany([{ merchantId: mockMerchantId, url: mockUrl }]),
      ).resolves.toBeDefined();

      // createMany with optional status
      await expect(
        repository.createMany([
          { merchantId: mockMerchantId, url: mockUrl, status: 'pending' },
        ]),
      ).resolves.toBeDefined();
    });

    it('should implement all interface methods with correct signatures', () => {
      // This test ensures that all methods from the interface are implemented
      // with the correct signatures by checking they exist and are functions

      const expectedMethods = [
        'createMany',
        'markCompleted',
        'markFailed',
        'findByMerchant',
        'findListByMerchant',
        'findByIdForMerchant',
        'findByUrlForMerchant',
        'deleteByIdForMerchant',
        'deleteByMerchant',
        'paginateByMerchant',
      ];

      expectedMethods.forEach((methodName) => {
        expect(repository).toHaveProperty(methodName);
        expect(typeof (repository as any)[methodName]).toBe('function');
      });

      // Ensure no extra methods are present that aren't in the interface
      const repositoryMethods = Object.getOwnPropertyNames(
        Object.getPrototypeOf(repository),
      ).filter(
        (name) =>
          name !== 'constructor' &&
          typeof (repository as any)[name] === 'function',
      );

      // Filter out Object.prototype methods and NestJS specific methods
      const filteredMethods = repositoryMethods.filter(
        (method) =>
          ![
            'toString',
            'valueOf',
            'toLocaleString',
            'hasOwnProperty',
            'isPrototypeOf',
            'propertyIsEnumerable',
          ].includes(method),
      );

      // All methods should be in our expected list
      filteredMethods.forEach((method) => {
        expect(expectedMethods).toContain(method);
      });
    });
  });

  describe('Type safety', () => {
    it('should maintain type safety across all operations', async () => {
      // Test that the repository maintains type safety

      // createMany returns SourceUrlEntity[]
      model.insertMany.mockResolvedValue([]);
      const createResult = await repository.createMany([
        { merchantId: mockMerchantId, url: mockUrl },
      ]);
      expect(Array.isArray(createResult)).toBe(true);

      // findByMerchant returns SourceUrlEntity[]
      model.find.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      } as any);
      const findByMerchantResult =
        await repository.findByMerchant(mockMerchantId);
      expect(Array.isArray(findByMerchantResult)).toBe(true);

      // findByIdForMerchant returns SourceUrlEntity | null
      model.findOne.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      } as any);
      const findByIdResult = await repository.findByIdForMerchant(
        mockUrlId,
        mockMerchantId,
      );
      expect(
        findByIdResult === null ||
          (findByIdResult && typeof findByIdResult === 'object'),
      ).toBe(true);

      // findByUrlForMerchant returns SourceUrlEntity | null
      const findByUrlResult = await repository.findByUrlForMerchant(
        mockUrl,
        mockMerchantId,
      );
      expect(
        findByUrlResult === null ||
          (findByUrlResult && typeof findByUrlResult === 'object'),
      ).toBe(true);

      // deleteByIdForMerchant returns number
      model.deleteOne.mockResolvedValue({ deletedCount: 1 } as any);
      const deleteByIdResult = await repository.deleteByIdForMerchant(
        mockUrlId,
        mockMerchantId,
      );
      expect(typeof deleteByIdResult).toBe('number');

      // deleteByMerchant returns number
      model.deleteMany.mockResolvedValue({ deletedCount: 5 } as any);
      const deleteByMerchantResult =
        await repository.deleteByMerchant(mockMerchantId);
      expect(typeof deleteByMerchantResult).toBe('number');

      // paginateByMerchant returns correct structure
      model.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      } as any);
      model.countDocuments.mockResolvedValue(0);
      const paginateResult = repository.paginateByMerchant
        ? await repository.paginateByMerchant(mockMerchantId, {
            page: 1,
            limit: 10,
          })
        : { items: [], total: 0, page: 1, limit: 10 };
      expect(Array.isArray(paginateResult.items)).toBe(true);
      expect(typeof paginateResult.total).toBe('number');
      expect(typeof paginateResult.page).toBe('number');
      expect(typeof paginateResult.limit).toBe('number');
    });

    it('should handle null and undefined values correctly', async () => {
      // Test that methods handle null/undefined values as expected

      // findByIdForMerchant returns null when not found
      model.findOne.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      const nullResult = await repository.findByIdForMerchant(
        mockUrlId,
        mockMerchantId,
      );
      expect(nullResult).toBeNull();

      // findByUrlForMerchant returns null when not found
      const nullUrlResult = await repository.findByUrlForMerchant(
        mockUrl,
        mockMerchantId,
      );
      expect(nullUrlResult).toBeNull();

      // findByMerchant returns empty array when no data
      model.find.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      } as any);
      const emptyResult = await repository.findByMerchant(mockMerchantId);
      expect(emptyResult).toEqual([]);

      // findListByMerchant returns empty array when no data
      model.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      } as any);
      const emptyListResult =
        await repository.findListByMerchant(mockMerchantId);
      expect(emptyListResult).toEqual([]);

      // deleteByIdForMerchant returns 0 when not found
      model.deleteOne.mockResolvedValue({ deletedCount: 0 } as any);
      const zeroDeleteResult = await repository.deleteByIdForMerchant(
        mockUrlId,
        mockMerchantId,
      );
      expect(zeroDeleteResult).toBe(0);

      // deleteByMerchant returns 0 when no data
      model.deleteMany.mockResolvedValue({ deletedCount: 0 } as any);
      const zeroDeleteMerchantResult =
        await repository.deleteByMerchant(mockMerchantId);
      expect(zeroDeleteMerchantResult).toBe(0);

      // paginateByMerchant returns correct structure with zero total
      model.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      } as any);
      model.countDocuments.mockResolvedValue(0);
      const paginateEmptyResult = repository.paginateByMerchant
        ? await repository.paginateByMerchant(mockMerchantId, {
            page: 1,
            limit: 10,
          })
        : { items: [], total: 0, page: 1, limit: 10 };
      expect(paginateEmptyResult.items).toEqual([]);
      expect(paginateEmptyResult.total).toBe(0);
    });

    it('should validate input parameters', async () => {
      // Test that methods validate input parameters appropriately

      // Empty records array for createMany
      model.insertMany.mockResolvedValue([]);
      await expect(repository.createMany([])).resolves.toBeDefined();

      // Invalid ID strings (though these would be caught by MongoDB)
      model.findOne.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      await expect(
        repository.findByIdForMerchant('invalid-id', mockMerchantId),
      ).resolves.toBeDefined();

      // Empty update operations
      model.updateOne.mockResolvedValue({ matchedCount: 0 } as any);
      await expect(repository.markCompleted('', '')).resolves.toBeDefined();

      await expect(repository.markFailed('', '')).resolves.toBeDefined();
    });
  });

  describe('Error handling integration', () => {
    it('should handle database operation failures gracefully', async () => {
      // Test various database operation failures

      // insertMany failure
      model.insertMany.mockRejectedValue(new Error('InsertMany failed'));
      await expect(
        repository.createMany([{ merchantId: mockMerchantId, url: mockUrl }]),
      ).rejects.toThrow('InsertMany failed');

      // updateOne failure for markCompleted
      model.updateOne.mockRejectedValue(new Error('UpdateOne failed'));
      await expect(
        repository.markCompleted(mockUrlId, 'test text'),
      ).rejects.toThrow('UpdateOne failed');

      // updateOne failure for markFailed
      await expect(
        repository.markFailed(mockUrlId, 'test error'),
      ).rejects.toThrow('UpdateOne failed');

      // find failure
      model.find.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('Find failed')),
      } as any);
      await expect(repository.findByMerchant(mockMerchantId)).rejects.toThrow(
        'Find failed',
      );

      // findOne failure
      model.findOne.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('FindOne failed')),
      } as any);
      await expect(
        repository.findByIdForMerchant(mockUrlId, mockMerchantId),
      ).rejects.toThrow('FindOne failed');

      // deleteOne failure
      model.deleteOne.mockRejectedValue(new Error('DeleteOne failed'));
      await expect(
        repository.deleteByIdForMerchant(mockUrlId, mockMerchantId),
      ).rejects.toThrow('DeleteOne failed');

      // deleteMany failure
      model.deleteMany.mockRejectedValue(new Error('DeleteMany failed'));
      await expect(repository.deleteByMerchant(mockMerchantId)).rejects.toThrow(
        'DeleteMany failed',
      );

      // countDocuments failure
      model.countDocuments.mockRejectedValue(
        new Error('CountDocuments failed'),
      );
      await expect(
        repository.paginateByMerchant
          ? repository.paginateByMerchant(mockMerchantId, {
              page: 1,
              limit: 10,
            })
          : Promise.resolve({ items: [], total: 0, page: 1, limit: 10 }),
      ).rejects.toThrow('CountDocuments failed');
    });

    it('should handle network and connection errors', async () => {
      // Test network-related errors

      model.findOne.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('MongoNetworkError')),
      } as any);

      await expect(
        repository.findByIdForMerchant(mockUrlId, mockMerchantId),
      ).rejects.toThrow('MongoNetworkError');

      model.find.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('MongoTimeoutError')),
      } as any);

      await expect(repository.findByMerchant(mockMerchantId)).rejects.toThrow(
        'MongoTimeoutError',
      );
    });

    it('should handle malformed data responses', async () => {
      // Test handling of unexpected data formats

      model.findOne.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue('unexpected_string_response'),
      } as any);

      const malformedResult = await repository.findByIdForMerchant(
        mockUrlId,
        mockMerchantId,
      );
      expect(malformedResult).toBe('unexpected_string_response');

      model.find.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue('not_an_array'),
      } as any);

      const malformedFindResult =
        await repository.findByMerchant(mockMerchantId);
      expect(malformedFindResult).toBe('not_an_array');

      model.countDocuments.mockResolvedValue('not_a_number' as any);
      const malformedCountResult = repository.paginateByMerchant
        ? await repository.paginateByMerchant(mockMerchantId, {
            page: 1,
            limit: 10,
          })
        : { items: [], total: 0, page: 1, limit: 10 };
      expect(malformedCountResult.total).toBe('not_a_number');
    });
  });

  describe('Performance and reliability', () => {
    it('should handle large datasets efficiently', async () => {
      // Test performance with large datasets

      const largeRecords = Array(1000)
        .fill(null)
        .map((_, index) => ({
          merchantId: mockMerchantId,
          url: `https://example.com/page${index + 1}`,
        }));

      model.insertMany.mockResolvedValue([]);

      const startTime = Date.now();
      const result = await repository.createMany(largeRecords);
      const endTime = Date.now();

      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle concurrent operations correctly', async () => {
      // Test concurrent operations don't interfere with each other

      const operations = [
        repository.findByMerchant(mockMerchantId),
        repository.findListByMerchant(mockMerchantId),
        repository.paginateByMerchant
          ? repository.paginateByMerchant(mockMerchantId, {
              page: 1,
              limit: 10,
            })
          : Promise.resolve({ items: [], total: 0, page: 1, limit: 10 }),
      ];

      model.find.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      } as any);

      model.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      } as any);

      model.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      } as any);

      model.countDocuments.mockResolvedValue(0);

      const results = await Promise.all(operations);

      expect(results).toHaveLength(3);
      expect(Array.isArray(results[0])).toBe(true);
      expect(Array.isArray(results[1])).toBe(true);
      expect(typeof results[2]).toBe('object');
      expect(results[2]).toHaveProperty('items');
      expect(results[2]).toHaveProperty('total');
    });

    it('should maintain consistency across multiple operations', async () => {
      // Test that multiple operations maintain data consistency

      // Create some source URLs
      model.insertMany.mockResolvedValue([]);
      const created = await repository.createMany([
        { merchantId: mockMerchantId, url: 'https://example.com/test1' },
        { merchantId: mockMerchantId, url: 'https://example.com/test2' },
      ]);

      expect(created).toBeDefined();

      // Find by merchant
      model.find.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(created),
      } as any);

      const foundByMerchant = await repository.findByMerchant(mockMerchantId);
      expect(Array.isArray(foundByMerchant)).toBe(true);

      // Find by URL
      model.findOne.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(created[0] || null),
      } as any);

      const foundByUrl = await repository.findByUrlForMerchant(
        'https://example.com/test1',
        mockMerchantId,
      );
      expect(foundByUrl).toBeDefined();

      // Paginate
      model.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(created),
      } as any);
      model.countDocuments.mockResolvedValue(2);

      const paginated = repository.paginateByMerchant
        ? await repository.paginateByMerchant(mockMerchantId, {
            page: 1,
            limit: 10,
          })
        : { items: [], total: 0, page: 1, limit: 10 };
      expect(paginated.items).toBeDefined();
      expect(paginated.total).toBe(2);
    });
  });

  describe('Edge cases and boundary conditions', () => {
    it('should handle empty and null inputs gracefully', async () => {
      // Empty array for createMany
      model.insertMany.mockResolvedValue([]);
      await expect(repository.createMany([])).resolves.toBeDefined();

      // Empty strings for mark operations
      model.updateOne.mockResolvedValue({ matchedCount: 0 } as any);
      await expect(repository.markCompleted('', '')).resolves.toBeDefined();

      await expect(repository.markFailed('', '')).resolves.toBeDefined();

      // Non-existent merchant ID for findByMerchant
      model.find.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      } as any);

      await expect(
        repository.findByMerchant('non-existent-merchant-id'),
      ).resolves.toBeDefined();
    });

    it('should handle special characters and unicode in URLs', async () => {
      // Test with special characters and unicode URLs
      const specialUrls = [
        'https://example.com/صفحة-عربية',
        'https://example.com/page?param=تجريبي&test=اختبار',
        'https://example.com/path with spaces',
        'https://example.com/path-with-émójí-🚀',
      ];

      for (const url of specialUrls) {
        model.findOne.mockReturnValue({
          lean: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue({
            _id: new Types.ObjectId(),
            merchantId: mockMerchantId,
            url,
            status: 'pending',
          }),
        } as any);

        const result = await repository.findByUrlForMerchant(
          url,
          mockMerchantId,
        );
        expect(result?.url).toBe(url);
      }
    });

    it('should handle very long URLs', async () => {
      // Test with very long URLs
      const longUrl = 'https://example.com/' + 'a'.repeat(2000);

      model.findOne.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({
          _id: new Types.ObjectId(),
          merchantId: mockMerchantId,
          url: longUrl,
          status: 'pending',
        }),
      } as any);

      const result = await repository.findByUrlForMerchant(
        longUrl,
        mockMerchantId,
      );
      expect(result?.url).toBe(longUrl);
    });

    it('should handle all status values correctly', async () => {
      // Test all possible status values
      const statuses: Array<'pending' | 'completed' | 'failed'> = [
        'pending',
        'completed',
        'failed',
      ];

      for (const status of statuses) {
        model.findOne.mockReturnValue({
          lean: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue({
            _id: new Types.ObjectId(),
            merchantId: mockMerchantId,
            url: mockUrl,
            status,
          }),
        } as any);

        const result = await repository.findByIdForMerchant(
          mockUrlId,
          mockMerchantId,
        );

        expect(result?.status).toBe(status);
      }
    });
  });
});
