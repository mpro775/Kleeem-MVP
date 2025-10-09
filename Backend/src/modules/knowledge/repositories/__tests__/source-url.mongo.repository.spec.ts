import { getModelToken } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';

import { SourceUrl } from '../../schemas/source-url.schema';
import { SourceUrlMongoRepository } from '../source-url.mongo.repository';

import type { Model } from 'mongoose';

describe('SourceUrlMongoRepository', () => {
  let repository: SourceUrlMongoRepository;
  let model: jest.Mocked<Model<SourceUrl>>;

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

    repository = module.get<SourceUrlMongoRepository>(SourceUrlMongoRepository);
    model = module.get(getModelToken(SourceUrl.name));
  });

  describe('Basic functionality', () => {
    it('should be instantiable', () => {
      expect(repository).toBeInstanceOf(SourceUrlMongoRepository);
      expect(repository).toBeDefined();
    });

    it('should have all required methods', () => {
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

    it('should have correct class name and structure', () => {
      expect(repository.constructor.name).toBe('SourceUrlMongoRepository');
      expect(repository).toHaveProperty('model');
    });
  });

  describe('Basic functionality tests', () => {
    it('should handle createMany with empty array', async () => {
      model.insertMany.mockResolvedValue([]);

      const result = await repository.createMany([]);
      expect(result).toEqual([]);
      expect(model.insertMany).toHaveBeenCalledWith([], { ordered: false });
    });

    it('should handle markCompleted with valid parameters', async () => {
      model.updateOne.mockResolvedValue({ matchedCount: 1 } as any);

      await repository.markCompleted('507f1f77bcf86cd799439011', 'test text');
      expect(model.updateOne).toHaveBeenCalledWith(
        { _id: '507f1f77bcf86cd799439011' },
        { status: 'completed', textExtracted: 'test text' },
      );
    });

    it('should handle markFailed with valid parameters', async () => {
      model.updateOne.mockResolvedValue({ matchedCount: 1 } as any);

      await repository.markFailed('507f1f77bcf86cd799439011', 'test error');
      expect(model.updateOne).toHaveBeenCalledWith(
        { _id: '507f1f77bcf86cd799439011' },
        { status: 'failed', errorMessage: 'test error' },
      );
    });

    it('should handle findByMerchant with empty results', async () => {
      model.find.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      } as any);

      const result = await repository.findByMerchant(
        '507f1f77bcf86cd799439011',
      );
      expect(result).toEqual([]);
    });

    it('should handle findListByMerchant with empty results', async () => {
      model.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      } as any);

      const result = await repository.findListByMerchant(
        '507f1f77bcf86cd799439011',
      );
      expect(result).toEqual([]);
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

    it('should handle findByUrlForMerchant with non-existent URL', async () => {
      model.findOne.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      const result = await repository.findByUrlForMerchant(
        'https://example.com/non-existent',
        '507f1f77bcf86cd799439011',
      );
      expect(result).toBeNull();
    });

    it('should handle deleteByIdForMerchant for non-existent source URL', async () => {
      model.deleteOne.mockResolvedValue({ deletedCount: 0 } as any);

      const result = await repository.deleteByIdForMerchant(
        '507f1f77bcf86cd799439011',
        '507f1f77bcf86cd799439011',
      );
      expect(result).toBe(0);
    });

    it('should handle deleteByMerchant with no source URLs', async () => {
      model.deleteMany.mockResolvedValue({ deletedCount: 0 } as any);

      const result = await repository.deleteByMerchant(
        '507f1f77bcf86cd799439011',
      );
      expect(result).toBe(0);
    });

    it('should handle paginateByMerchant with no data', async () => {
      model.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      } as any);

      model.countDocuments.mockResolvedValue(0);

      const result = await repository.paginateByMerchant(
        '507f1f77bcf86cd799439011',
        {
          page: 1,
          limit: 10,
        },
      );

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
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
        repository.createMany([
          {
            merchantId: '507f1f77bcf86cd799439011',
            url: 'https://example.com',
          },
        ]),
      ).rejects.toThrow('Insert error');

      model.updateOne.mockRejectedValue(new Error('Update error'));
      await expect(
        repository.markCompleted('507f1f77bcf86cd799439011', 'test text'),
      ).rejects.toThrow('Update error');
    });
  });
});
