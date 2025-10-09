import { getModelToken } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';

import { Faq } from '../../schemas/faq.schema';
import { MongoFaqRepository } from '../mongo-faq.repository';

import type { FaqRepository } from '../faq.repository';
import type { Model } from 'mongoose';

describe('FaqRepository Interface Implementation', () => {
  let repository: FaqRepository;
  let model: jest.Mocked<Model<Faq>>;

  const mockMerchantId = '507f1f77bcf86cd799439011';
  const mockFaqId = '507f1f77bcf86cd799439012';
  const mockObjectId = new Types.ObjectId();

  beforeEach(async () => {
    const mockModel = {
      insertMany: jest.fn(),
      findOne: jest.fn(),
      updateOne: jest.fn(),
      updateMany: jest.fn(),
      deleteOne: jest.fn(),
      deleteMany: jest.fn(),
      aggregate: jest.fn(),
      find: jest.fn(),
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MongoFaqRepository,
        {
          provide: getModelToken(Faq.name),
          useValue: mockModel,
        },
      ],
    }).compile();

    repository = module.get<FaqRepository>(MongoFaqRepository);
    model = module.get(getModelToken(Faq.name));
  });

  describe('Interface compliance', () => {
    it('should implement FaqRepository interface correctly', () => {
      // Verify that the repository implements all required methods from FaqRepository interface
      expect(typeof repository.insertManyPending).toBe('function');
      expect(typeof repository.findByIdForMerchant).toBe('function');
      expect(typeof repository.updateFieldsById).toBe('function');
      expect(typeof repository.listByMerchant).toBe('function');
      expect(typeof repository.getStatusCounts).toBe('function');
      expect(typeof repository.softDeleteById).toBe('function');
      expect(typeof repository.hardDeleteById).toBe('function');
      expect(typeof repository.softDeleteAll).toBe('function');
      expect(typeof repository.hardDeleteAll).toBe('function');
    });

    it('should have correct method signatures matching interface', () => {
      // Test method signatures match the interface definition

      // insertManyPending(merchantId: string | Types.ObjectId, rows: Array<{ question: string; answer: string }>)
      expect(repository.insertManyPending.length).toBe(2);

      // findByIdForMerchant(id: string | Types.ObjectId, merchantId: string | Types.ObjectId)
      expect(repository.findByIdForMerchant.length).toBe(2);

      // updateFieldsById(id: string | Types.ObjectId, set: Partial<Faq>)
      expect(repository.updateFieldsById.length).toBe(2);

      // listByMerchant(merchantId: string | Types.ObjectId, includeDeleted?: boolean)
      expect(repository.listByMerchant.length).toBeGreaterThanOrEqual(1);
      expect(repository.listByMerchant.length).toBeLessThanOrEqual(2);

      // getStatusCounts(merchantId: string | Types.ObjectId)
      expect(repository.getStatusCounts.length).toBe(1);

      // softDeleteById(merchantId: string | Types.ObjectId, id: string | Types.ObjectId)
      expect(repository.softDeleteById.length).toBe(2);

      // hardDeleteById(merchantId: string | Types.ObjectId, id: string | Types.ObjectId)
      expect(repository.hardDeleteById.length).toBe(2);

      // softDeleteAll(merchantId: string | Types.ObjectId)
      expect(repository.softDeleteAll.length).toBe(1);

      // hardDeleteAll(merchantId: string | Types.ObjectId)
      expect(repository.hardDeleteAll.length).toBe(1);
    });

    it('should return correct return types', async () => {
      // insertManyPending should return Promise<Array<{ _id: Types.ObjectId } & Faq>>
      model.insertMany.mockResolvedValue([]);
      const insertResult = await repository.insertManyPending(
        mockMerchantId,
        [],
      );
      expect(Array.isArray(insertResult)).toBe(true);

      // findByIdForMerchant should return Promise<(Faq & { _id: Types.ObjectId }) | null>
      model.findOne.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      } as any);
      const findResult = await repository.findByIdForMerchant(
        mockFaqId,
        mockMerchantId,
      );
      expect(
        findResult === null || (findResult && typeof findResult === 'object'),
      ).toBe(true);

      // updateFieldsById should return Promise<void>
      model.updateOne.mockResolvedValue({ matchedCount: 1 } as any);
      const updateResult = await repository.updateFieldsById(mockFaqId, {});
      expect(updateResult).toBeUndefined();

      // listByMerchant should return Promise<Array<Pick<Faq, 'question' | 'answer' | 'status' | 'errorMessage'> & { _id: Types.ObjectId; createdAt?: Date; }>>
      model.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      } as any);
      const listResult = await repository.listByMerchant(mockMerchantId);
      expect(Array.isArray(listResult)).toBe(true);

      // getStatusCounts should return Promise<{ total: number; pending: number; completed: number; failed: number; deleted: number; }>
      model.aggregate.mockResolvedValue([] as any);
      const countsResult = await repository.getStatusCounts(mockMerchantId);
      expect(typeof countsResult).toBe('object');
      expect(typeof countsResult.total).toBe('number');
      expect(typeof countsResult.pending).toBe('number');
      expect(typeof countsResult.completed).toBe('number');
      expect(typeof countsResult.failed).toBe('number');
      expect(typeof countsResult.deleted).toBe('number');

      // softDeleteById should return Promise<boolean>
      model.updateOne.mockResolvedValue({ matchedCount: 1 } as any);
      const softDeleteResult = await repository.softDeleteById(
        mockMerchantId,
        mockFaqId,
      );
      expect(typeof softDeleteResult).toBe('boolean');

      // hardDeleteById should return Promise<boolean>
      model.deleteOne.mockResolvedValue({ deletedCount: 1 } as any);
      const hardDeleteResult = await repository.hardDeleteById(
        mockMerchantId,
        mockFaqId,
      );
      expect(typeof hardDeleteResult).toBe('boolean');

      // softDeleteAll should return Promise<number>
      model.updateMany.mockResolvedValue({ modifiedCount: 5 } as any);
      const softDeleteAllResult =
        await repository.softDeleteAll(mockMerchantId);
      expect(typeof softDeleteAllResult).toBe('number');

      // hardDeleteAll should return Promise<number>
      model.deleteMany.mockResolvedValue({ deletedCount: 3 } as any);
      const hardDeleteAllResult =
        await repository.hardDeleteAll(mockMerchantId);
      expect(typeof hardDeleteAllResult).toBe('number');
    });

    it('should handle method parameter types correctly', async () => {
      // Test that methods accept correct parameter types as defined in interface

      // String IDs
      model.findOne.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      await expect(
        repository.findByIdForMerchant('string-id', 'string-merchant-id'),
      ).resolves.toBeDefined();

      // ObjectId IDs
      await expect(
        repository.findByIdForMerchant(mockObjectId, mockObjectId),
      ).resolves.toBeDefined();

      // Mixed types
      await expect(
        repository.findByIdForMerchant('string-id', mockObjectId),
      ).resolves.toBeDefined();

      await expect(
        repository.findByIdForMerchant(mockObjectId, 'string-merchant-id'),
      ).resolves.toBeDefined();

      // Insert rows with correct structure
      model.insertMany.mockResolvedValue([]);
      await expect(
        repository.insertManyPending(mockMerchantId, [
          { question: 'test question', answer: 'test answer' },
        ]),
      ).resolves.toBeDefined();

      // Update with partial FAQ object
      model.updateOne.mockResolvedValue({ matchedCount: 1 } as any);
      await expect(
        repository.updateFieldsById(mockFaqId, {
          status: 'completed',
          errorMessage: 'test error',
        }),
      ).resolves.toBeDefined();

      // List with optional includeDeleted parameter
      model.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      } as any);

      await expect(
        repository.listByMerchant(mockMerchantId),
      ).resolves.toBeDefined();
      await expect(
        repository.listByMerchant(mockMerchantId, true),
      ).resolves.toBeDefined();
      await expect(
        repository.listByMerchant(mockMerchantId, false),
      ).resolves.toBeDefined();
    });

    it('should handle optional parameters correctly', async () => {
      // Test methods work correctly with and without optional parameters

      // listByMerchant without includeDeleted (should default to false)
      model.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      } as any);

      await expect(
        repository.listByMerchant(mockMerchantId),
      ).resolves.toBeDefined();

      // listByMerchant with includeDeleted explicitly set
      await expect(
        repository.listByMerchant(mockMerchantId, true),
      ).resolves.toBeDefined();
      await expect(
        repository.listByMerchant(mockMerchantId, false),
      ).resolves.toBeDefined();
    });

    it('should implement all interface methods with correct signatures', () => {
      // This test ensures that all methods from the interface are implemented
      // with the correct signatures by checking they exist and are functions

      const expectedMethods = [
        'insertManyPending',
        'findByIdForMerchant',
        'updateFieldsById',
        'listByMerchant',
        'getStatusCounts',
        'softDeleteById',
        'hardDeleteById',
        'softDeleteAll',
        'hardDeleteAll',
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

      // insertManyPending with correct row structure
      model.insertMany.mockResolvedValue([]);
      const insertResult = await repository.insertManyPending(mockMerchantId, [
        { question: 'type safe question', answer: 'type safe answer' },
      ]);
      expect(Array.isArray(insertResult)).toBe(true);

      // findByIdForMerchant returns correct union type
      model.findOne.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      const findResult = await repository.findByIdForMerchant(
        mockFaqId,
        mockMerchantId,
      );
      expect(
        findResult === null || (findResult && typeof findResult === 'object'),
      ).toBe(true);

      // listByMerchant returns array with correct structure
      model.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      } as any);

      const listResult = await repository.listByMerchant(mockMerchantId);
      expect(Array.isArray(listResult)).toBe(true);

      // getStatusCounts returns object with number properties
      model.aggregate.mockResolvedValue([] as any);
      const countsResult = await repository.getStatusCounts(mockMerchantId);
      expect(typeof countsResult.total).toBe('number');
      expect(typeof countsResult.pending).toBe('number');
      expect(typeof countsResult.completed).toBe('number');
      expect(typeof countsResult.failed).toBe('number');
      expect(typeof countsResult.deleted).toBe('number');
    });

    it('should handle null and undefined values correctly', async () => {
      // Test that methods handle null/undefined values as expected

      // findByIdForMerchant returns null when not found
      model.findOne.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      const nullResult = await repository.findByIdForMerchant(
        mockFaqId,
        mockMerchantId,
      );
      expect(nullResult).toBeNull();

      // listByMerchant returns empty array when no FAQs found
      model.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      } as any);

      const emptyResult = await repository.listByMerchant(mockMerchantId);
      expect(emptyResult).toEqual([]);

      // getStatusCounts returns zero counts when no data
      model.aggregate.mockResolvedValue([] as any);
      const zeroCountsResult = await repository.getStatusCounts(mockMerchantId);
      expect(zeroCountsResult.total).toBe(0);
      expect(zeroCountsResult.pending).toBe(0);
      expect(zeroCountsResult.completed).toBe(0);
      expect(zeroCountsResult.failed).toBe(0);
      expect(zeroCountsResult.deleted).toBe(0);
    });

    it('should validate input parameters', async () => {
      // Test that methods validate input parameters appropriately

      // Empty rows array for insertManyPending
      model.insertMany.mockResolvedValue([]);
      await expect(
        repository.insertManyPending(mockMerchantId, []),
      ).resolves.toBeDefined();

      // Invalid ID strings (though these would be caught by MongoDB)
      model.findOne.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      await expect(
        repository.findByIdForMerchant('invalid-id', mockMerchantId),
      ).resolves.toBeDefined();

      // Empty update object
      model.updateOne.mockResolvedValue({ matchedCount: 0 } as any);
      await expect(
        repository.updateFieldsById(mockFaqId, {}),
      ).resolves.toBeDefined();
    });
  });

  describe('Error handling integration', () => {
    it('should handle database operation failures gracefully', async () => {
      // Test various database operation failures

      // insertMany failure
      model.insertMany.mockRejectedValue(new Error('InsertMany failed'));
      await expect(
        repository.insertManyPending(mockMerchantId, [
          { question: 'test', answer: 'test' },
        ]),
      ).rejects.toThrow('InsertMany failed');

      // findOne failure
      model.findOne.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('FindOne failed')),
      } as any);

      await expect(
        repository.findByIdForMerchant(mockFaqId, mockMerchantId),
      ).rejects.toThrow('FindOne failed');

      // updateOne failure
      model.updateOne.mockReturnValue({
        exec: jest.fn().mockRejectedValue(new Error('UpdateOne failed')),
      } as any);
      await expect(
        repository.updateFieldsById(mockFaqId, { status: 'completed' }),
      ).rejects.toThrow('UpdateOne failed');

      // updateMany failure
      model.updateMany.mockReturnValue({
        exec: jest.fn().mockRejectedValue(new Error('UpdateMany failed')),
      } as any);
      await expect(repository.softDeleteAll(mockMerchantId)).rejects.toThrow(
        'UpdateMany failed',
      );

      // deleteOne failure
      model.deleteOne.mockReturnValue({
        exec: jest.fn().mockRejectedValue(new Error('DeleteOne failed')),
      } as any);
      await expect(
        repository.hardDeleteById(mockMerchantId, mockFaqId),
      ).rejects.toThrow('DeleteOne failed');

      // deleteMany failure
      model.deleteMany.mockReturnValue({
        exec: jest.fn().mockRejectedValue(new Error('DeleteMany failed')),
      } as any);
      await expect(repository.hardDeleteAll(mockMerchantId)).rejects.toThrow(
        'DeleteMany failed',
      );

      // aggregate failure
      model.aggregate.mockRejectedValue(new Error('Aggregate failed'));
      await expect(repository.getStatusCounts(mockMerchantId)).rejects.toThrow(
        'Aggregate failed',
      );
    });

    it('should handle network and connection errors', async () => {
      // Test network-related errors

      model.findOne.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('MongoNetworkError')),
      } as any);

      await expect(
        repository.findByIdForMerchant(mockFaqId, mockMerchantId),
      ).rejects.toThrow('MongoNetworkError');

      model.aggregate.mockRejectedValue(new Error('MongoTimeoutError'));
      await expect(repository.getStatusCounts(mockMerchantId)).rejects.toThrow(
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
        mockFaqId,
        mockMerchantId,
      );
      expect(malformedResult).toBe('unexpected_string_response');

      model.aggregate.mockResolvedValue('not_an_array' as any);
      const malformedCountsResult =
        await repository.getStatusCounts(mockMerchantId);
      expect(malformedCountsResult).toBe('not_an_array');
    });
  });

  describe('Performance and reliability', () => {
    it('should handle large datasets efficiently', async () => {
      // Test performance with large datasets

      const largeRows = Array(1000)
        .fill(null)
        .map((_, index) => ({
          question: `Question ${index + 1}`,
          answer: `Answer ${index + 1}`,
        }));

      model.insertMany.mockResolvedValue([]);

      const startTime = Date.now();
      const result = await repository.insertManyPending(
        mockMerchantId,
        largeRows,
      );
      const endTime = Date.now();

      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle concurrent operations correctly', async () => {
      // Test concurrent operations don't interfere with each other

      const operations = [
        repository.listByMerchant(mockMerchantId),
        repository.getStatusCounts(mockMerchantId),
        repository.insertManyPending(mockMerchantId, [
          { question: 'Concurrent question', answer: 'Concurrent answer' },
        ]),
      ];

      model.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      } as any);

      model.aggregate.mockResolvedValue([] as any);
      model.insertMany.mockResolvedValue([]);

      const results = await Promise.all(operations);

      expect(results).toHaveLength(3);
      expect(Array.isArray(results[0])).toBe(true);
      expect(typeof results[1]).toBe('object');
      expect(Array.isArray(results[2])).toBe(true);
    });

    it('should maintain consistency across multiple operations', async () => {
      // Test that multiple operations maintain data consistency

      // Test basic functionality without complex data structures
      model.insertMany.mockResolvedValue([]);
      model.updateOne.mockResolvedValue({ matchedCount: 1 } as any);
      model.aggregate.mockResolvedValue([
        { _id: 'completed', count: 1 },
        { _id: 'pending', count: 1 },
      ] as any);

      const inserted = await repository.insertManyPending(mockMerchantId, [
        { question: 'Consistency question 1', answer: 'Consistency answer 1' },
      ]);

      expect(inserted).toBeDefined();

      await repository.updateFieldsById(mockFaqId, {
        status: 'completed',
      });

      const counts = await repository.getStatusCounts(mockMerchantId);
      expect(counts.total).toBe(2);
      expect(counts.completed).toBe(1);
      expect(counts.pending).toBe(1);
    });
  });

  describe('Edge cases and boundary conditions', () => {
    it('should handle empty and null inputs gracefully', async () => {
      // Empty array for insertManyPending
      model.insertMany.mockResolvedValue([]);
      await expect(
        repository.insertManyPending(mockMerchantId, []),
      ).resolves.toBeDefined();

      // Empty object for updateFieldsById
      model.updateOne.mockResolvedValue({ matchedCount: 0 } as any);
      await expect(
        repository.updateFieldsById(mockFaqId, {}),
      ).resolves.toBeDefined();

      // Non-existent merchant ID for listByMerchant
      model.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      } as any);

      await expect(
        repository.listByMerchant('non-existent-merchant-id'),
      ).resolves.toBeDefined();
    });

    it('should handle special characters and unicode in data', async () => {
      // Test with special characters and unicode content
      const specialContent = {
        question: 'سؤال باللغة العربية مع رموز خاصة! @#$%^&*()',
        answer: 'إجابة باللغة العربية مع رموز خاصة وإيموجي 😊🚀',
      };

      model.insertMany.mockResolvedValue([]);

      await expect(
        repository.insertManyPending(mockMerchantId, [specialContent]),
      ).resolves.toBeDefined();
    });

    it('should handle very long strings', async () => {
      // Test with very long strings
      const longQuestion = 'سؤال طويل جداً '.repeat(1000);
      const longAnswer = 'إجابة طويلة جداً '.repeat(1000);

      model.insertMany.mockResolvedValue([]);

      await expect(
        repository.insertManyPending(mockMerchantId, [
          { question: longQuestion, answer: longAnswer },
        ]),
      ).resolves.toBeDefined();
    });

    it('should handle all status values correctly', async () => {
      // Test all possible status values
      const statuses: Array<'pending' | 'completed' | 'failed' | 'deleted'> = [
        'pending',
        'completed',
        'failed',
        'deleted',
      ];

      for (const status of statuses) {
        model.findOne.mockReturnValue({
          lean: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue({
            _id: new Types.ObjectId(),
            question: `Question with ${status} status`,
            answer: `Answer with ${status} status`,
            status,
            merchantId: new Types.ObjectId(),
          }),
        } as any);

        const result = await repository.findByIdForMerchant(
          mockFaqId,
          mockMerchantId,
        );

        expect(result?.status).toBe(status);
      }
    });
  });
});
