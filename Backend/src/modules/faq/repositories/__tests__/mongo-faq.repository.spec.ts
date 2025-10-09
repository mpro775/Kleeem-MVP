import { getModelToken } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';

import { Faq } from '../../schemas/faq.schema';
import { MongoFaqRepository } from '../mongo-faq.repository';

import type { Model } from 'mongoose';

describe('MongoFaqRepository', () => {
  let repository: MongoFaqRepository;
  let model: jest.Mocked<Model<Faq>>;

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

    repository = module.get<MongoFaqRepository>(MongoFaqRepository);
    model = module.get(getModelToken(Faq.name));
  });

  describe('Basic functionality', () => {
    it('should be instantiable', () => {
      expect(repository).toBeInstanceOf(MongoFaqRepository);
      expect(repository).toBeDefined();
    });

    it('should have all required methods', () => {
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

    it('should have correct class name and structure', () => {
      expect(repository.constructor.name).toBe('MongoFaqRepository');
      expect(repository).toHaveProperty('faqModel');
    });
  });

  describe('Basic method availability', () => {
    it('should have insertManyPending method', () => {
      expect(typeof repository.insertManyPending).toBe('function');
      expect(repository.insertManyPending.length).toBe(2);
    });

    it('should have findByIdForMerchant method', () => {
      expect(typeof repository.findByIdForMerchant).toBe('function');
      expect(repository.findByIdForMerchant.length).toBe(2);
    });

    it('should have updateFieldsById method', () => {
      expect(typeof repository.updateFieldsById).toBe('function');
      expect(repository.updateFieldsById.length).toBe(2);
    });

    it('should have listByMerchant method', () => {
      expect(typeof repository.listByMerchant).toBe('function');
      expect(repository.listByMerchant.length).toBeGreaterThanOrEqual(1);
      expect(repository.listByMerchant.length).toBeLessThanOrEqual(2);
    });

    it('should have getStatusCounts method', () => {
      expect(typeof repository.getStatusCounts).toBe('function');
      expect(repository.getStatusCounts.length).toBe(1);
    });

    it('should have softDeleteById method', () => {
      expect(typeof repository.softDeleteById).toBe('function');
      expect(repository.softDeleteById.length).toBe(2);
    });

    it('should have hardDeleteById method', () => {
      expect(typeof repository.hardDeleteById).toBe('function');
      expect(repository.hardDeleteById.length).toBe(2);
    });

    it('should have softDeleteAll method', () => {
      expect(typeof repository.softDeleteAll).toBe('function');
      expect(repository.softDeleteAll.length).toBe(1);
    });

    it('should have hardDeleteAll method', () => {
      expect(typeof repository.hardDeleteAll).toBe('function');
      expect(repository.hardDeleteAll.length).toBe(1);
    });
  });

  describe('Basic functionality tests', () => {
    it('should handle insertManyPending with empty array', async () => {
      model.insertMany.mockResolvedValue([]);

      const result = await repository.insertManyPending(
        '507f1f77bcf86cd799439011',
        [],
      );
      expect(result).toEqual([]);
      expect(model.insertMany).toHaveBeenCalledWith([]);
    });

    it('should handle findByIdForMerchant with non-existent ID', async () => {
      model.findOne.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      const result = await repository.findByIdForMerchant(
        '507f1f77bcf86cd799439011',
        '507f1f77bcf86cd799439011',
      );
      expect(result).toBeNull();
    });

    it('should handle updateFieldsById with empty object', async () => {
      model.updateOne.mockResolvedValue({ matchedCount: 0 } as any);

      await repository.updateFieldsById('507f1f77bcf86cd799439011', {});
      expect(model.updateOne).toHaveBeenCalledWith(
        { _id: new Types.ObjectId('507f1f77bcf86cd799439011') },
        { $set: {} },
      );
    });

    it('should handle listByMerchant with empty results', async () => {
      model.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      } as any);

      const result = await repository.listByMerchant(
        '507f1f77bcf86cd799439011',
      );
      expect(result).toEqual([]);
    });

    it('should handle getStatusCounts with no data', async () => {
      model.aggregate.mockResolvedValue([] as any);

      const result = await repository.getStatusCounts(
        '507f1f77bcf86cd799439011',
      );
      expect(result).toEqual({
        total: 0,
        pending: 0,
        completed: 0,
        failed: 0,
        deleted: 0,
      });
    });

    it('should handle softDeleteById for non-existent FAQ', async () => {
      model.updateOne.mockResolvedValue({ matchedCount: 0 } as any);

      const result = await repository.softDeleteById(
        '507f1f77bcf86cd799439011',
        '507f1f77bcf86cd799439011',
      );
      expect(result).toBe(false);
    });

    it('should handle hardDeleteById for non-existent FAQ', async () => {
      model.deleteOne.mockResolvedValue({ deletedCount: 0 } as any);

      const result = await repository.hardDeleteById(
        '507f1f77bcf86cd799439011',
        '507f1f77bcf86cd799439011',
      );
      expect(result).toBe(false);
    });

    it('should handle softDeleteAll with no FAQs', async () => {
      model.updateMany.mockResolvedValue({ modifiedCount: 0 } as any);

      const result = await repository.softDeleteAll('507f1f77bcf86cd799439011');
      expect(result).toBe(0);
    });

    it('should handle hardDeleteAll with no FAQs', async () => {
      model.deleteMany.mockResolvedValue({ deletedCount: 0 } as any);

      const result = await repository.hardDeleteAll('507f1f77bcf86cd799439011');
      expect(result).toBe(0);
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      model.findOne.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('Database error')),
      } as any);

      await expect(
        repository.findByIdForMerchant(
          '507f1f77bcf86cd799439011',
          '507f1f77bcf86cd799439011',
        ),
      ).rejects.toThrow('Database error');

      model.insertMany.mockRejectedValue(new Error('Insert error'));
      await expect(
        repository.insertManyPending('507f1f77bcf86cd799439011', [
          { question: 'test', answer: 'test' },
        ]),
      ).rejects.toThrow('Insert error');

      model.updateOne.mockReturnValue({
        exec: jest.fn().mockRejectedValue(new Error('Update error')),
      } as any);
      await expect(
        repository.updateFieldsById('507f1f77bcf86cd799439011', {
          status: 'completed',
        }),
      ).rejects.toThrow('Update error');
    });
  });
});
