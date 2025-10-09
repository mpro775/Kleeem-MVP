import { getModelToken } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';

import { BotPromptMongoRepository } from '../repositories/bot-prompt.mongo.repository';
import { BotPrompt } from '../schemas/botPrompt.schema';

import type { Model } from 'mongoose';

describe('BotPromptMongoRepository', () => {
  let repository: BotPromptMongoRepository;
  let model: jest.Mocked<Model<BotPrompt>>;

  const mockPrompt = {
    _id: '507f1f77bcf86cd799439011',
    type: 'system',
    content: 'أنت مساعد ذكي يساعد المستخدمين',
    name: 'البرومبت الأساسي',
    tags: ['افتراضي', 'دعم فني'],
    active: true,
    version: 1,
    locale: 'ar',
    channel: 'landing',
    variables: {},
    goal: 'convince',
    archived: false,
  };

  beforeEach(async () => {
    const mockModel = {
      create: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
      findOne: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      updateMany: jest.fn(),
      deleteOne: jest.fn(),
      sort: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BotPromptMongoRepository,
        {
          provide: getModelToken(BotPrompt.name),
          useValue: mockModel,
        },
      ],
    }).compile();

    repository = module.get<BotPromptMongoRepository>(BotPromptMongoRepository);
    model = module.get(getModelToken(BotPrompt.name));
  });

  describe('create', () => {
    it('should create a new prompt successfully', async () => {
      const promptData = {
        type: 'system',
        content: 'أنت مساعد ذكي يساعد المستخدمين',
        active: false,
      };

      const createdPrompt = { ...mockPrompt, ...promptData };
      model.create.mockResolvedValue(createdPrompt as any);

      const result = await repository.create(
        promptData as unknown as BotPrompt,
      );

      expect(model.create).toHaveBeenCalledWith(promptData);
      expect(result).toEqual(createdPrompt);
    });

    it('should handle creation errors', async () => {
      model.create.mockRejectedValue(new Error('Creation failed'));

      await expect(
        repository.create({ type: 'system', content: 'test' }),
      ).rejects.toThrow('Creation failed');
    });
  });

  describe('findAll', () => {
    it('should return all non-archived prompts by default', async () => {
      const prompts = [mockPrompt];
      model.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(prompts),
          }),
        }),
      } as any);

      const result = await repository.findAll();

      expect(model.find).toHaveBeenCalledWith({ archived: { $ne: true } });
      expect(result).toEqual(prompts);
    });

    it('should filter by type when provided', async () => {
      const prompts = [mockPrompt];
      model.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(prompts),
          }),
        }),
      } as any);

      const result = await repository.findAll({ type: 'system' });

      expect(model.find).toHaveBeenCalledWith({
        type: 'system',
        archived: { $ne: true },
      });
      expect(result).toEqual(prompts);
    });

    it('should include archived prompts when requested', async () => {
      const prompts = [mockPrompt];
      model.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(prompts),
          }),
        }),
      } as any);

      const result = await repository.findAll({ includeArchived: true });

      expect(model.find).toHaveBeenCalledWith({});
      expect(result).toEqual(prompts);
    });

    it('should sort by updatedAt descending', async () => {
      const sortMock = jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
      });

      model.find.mockReturnValue({
        sort: sortMock,
      } as any);

      await repository.findAll();

      expect(sortMock).toHaveBeenCalledWith({ updatedAt: -1 });
    });

    it('should handle database errors', async () => {
      model.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockRejectedValue(new Error('Database error')),
          }),
        }),
      } as any);

      await expect(repository.findAll()).rejects.toThrow('Database error');
    });
  });

  describe('findById', () => {
    it('should return prompt by id', async () => {
      model.findById.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockPrompt),
        }),
      } as any);

      const result = await repository.findById('507f1f77bcf86cd799439011');

      expect(model.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(result).toEqual(mockPrompt);
    });

    it('should return null when prompt not found', async () => {
      model.findById.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      } as any);

      const result = await repository.findById('507f1f77bcf86cd799439011');

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      model.findById.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockRejectedValue(new Error('Database error')),
        }),
      } as any);

      await expect(
        repository.findById('507f1f77bcf86cd799439011'),
      ).rejects.toThrow('Database error');
    });
  });

  describe('findOne', () => {
    it('should find one prompt with filter', async () => {
      const filter = { type: 'system', active: true };
      model.findOne.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockPrompt),
          }),
        }),
      } as any);

      const result = await repository.findOne(filter);

      expect(model.findOne).toHaveBeenCalledWith(filter);
      expect(result).toEqual(mockPrompt);
    });

    it('should apply sorting when provided', async () => {
      const filter = { type: 'system' };
      const sort = { updatedAt: -1 };
      const sortMock = jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockPrompt),
        }),
      });

      model.findOne.mockReturnValue({
        sort: sortMock,
      } as unknown as any);

      await repository.findOne(
        filter,
        sort as unknown as Record<string, 1 | -1>,
      );

      expect(sortMock).toHaveBeenCalledWith(sort);
    });

    it('should return null when no prompt matches filter', async () => {
      model.findOne.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(null),
          }),
        }),
      } as any);

      const result = await repository.findOne({ type: 'system' });

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      model.findOne.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockRejectedValue(new Error('Database error')),
          }),
        }),
      } as any);

      await expect(repository.findOne({ type: 'system' })).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('updateById', () => {
    it('should update prompt by id', async () => {
      const patch = { content: 'محتوى محدث', active: false };
      const updatedPrompt = { ...mockPrompt, ...patch };

      model.findByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(updatedPrompt),
        }),
      } as any);

      const result = await repository.updateById(
        '507f1f77bcf86cd799439011',
        patch,
      );

      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        patch,
        { new: true },
      );
      expect(result).toEqual(updatedPrompt);
    });

    it('should return null when prompt not found for update', async () => {
      model.findByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      } as any);

      const result = await repository.updateById('507f1f77bcf86cd799439011', {
        content: 'محتوى محدث',
      });

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      model.findByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockRejectedValue(new Error('Database error')),
        }),
      } as any);

      await expect(
        repository.updateById('507f1f77bcf86cd799439011', {
          content: 'محتوى محدث',
        }),
      ).rejects.toThrow('Database error');
    });
  });

  describe('updateMany', () => {
    it('should update multiple prompts', async () => {
      const filter = { type: 'system' };
      const patch = { active: false };

      model.updateMany.mockResolvedValue({ modifiedCount: 2 } as any);

      await repository.updateMany(filter, patch);

      expect(model.updateMany).toHaveBeenCalledWith(filter, { $set: patch });
    });

    it('should handle update errors', async () => {
      model.updateMany.mockRejectedValue(new Error('Update failed'));

      await expect(
        repository.updateMany({ type: 'system' }, { active: false }),
      ).rejects.toThrow('Update failed');
    });

    it('should handle empty filter', async () => {
      model.updateMany.mockResolvedValue({ modifiedCount: 0 } as any);

      await repository.updateMany({}, { active: false });

      expect(model.updateMany).toHaveBeenCalledWith(
        {},
        { $set: { active: false } },
      );
    });
  });

  describe('deleteById', () => {
    it('should delete prompt by id successfully', async () => {
      model.deleteOne.mockResolvedValue({ deletedCount: 1 } as any);

      const result = await repository.deleteById('507f1f77bcf86cd799439011');

      expect(model.deleteOne).toHaveBeenCalledWith({
        _id: '507f1f77bcf86cd799439011',
      });
      expect(result).toEqual({ deleted: true });
    });

    it('should return false when prompt not found for deletion', async () => {
      model.deleteOne.mockResolvedValue({ deletedCount: 0 } as any);

      const result = await repository.deleteById('507f1f77bcf86cd799439011');

      expect(result).toEqual({ deleted: false });
    });

    it('should handle database errors', async () => {
      model.deleteOne.mockRejectedValue(new Error('Delete failed'));

      await expect(
        repository.deleteById('507f1f77bcf86cd799439011'),
      ).rejects.toThrow('Delete failed');
    });

    it('should handle invalid ObjectId', async () => {
      model.deleteOne.mockRejectedValue(new Error('Invalid ObjectId'));

      await expect(repository.deleteById('invalid-id')).rejects.toThrow(
        'Invalid ObjectId',
      );
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complex filter combinations', async () => {
      const complexFilter = {
        type: 'system',
        active: true,
        archived: { $ne: true },
      };
      model.findOne.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockPrompt),
          }),
        }),
      } as any);

      await repository.findOne(complexFilter, { updatedAt: -1 });

      expect(model.findOne).toHaveBeenCalledWith(complexFilter);
    });

    it('should handle concurrent operations', async () => {
      // Test that multiple operations can be called without interference
      model.findById.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockPrompt),
        }),
      } as any);

      const [result1, result2] = await Promise.all([
        repository.findById('507f1f77bcf86cd799439011'),
        repository.findById('507f1f77bcf86cd799439012'),
      ]);

      expect(result1).toEqual(mockPrompt);
      expect(result2).toEqual(mockPrompt);
      expect(model.findById).toHaveBeenCalledTimes(2);
    });

    it('should handle large dataset queries', async () => {
      const largePrompts = Array(1000).fill(mockPrompt);
      model.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(largePrompts),
          }),
        }),
      } as any);

      const result = await repository.findAll();

      expect(result).toHaveLength(1000);
      expect(model.find).toHaveBeenCalledWith({ archived: { $ne: true } });
    });
  });

  describe('Error handling', () => {
    it('should handle MongoDB connection errors', async () => {
      model.findById.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockRejectedValue(new Error('MongoNetworkError')),
        }),
      } as any);

      await expect(
        repository.findById('507f1f77bcf86cd799439011'),
      ).rejects.toThrow('MongoNetworkError');
    });

    it('should handle validation errors', async () => {
      model.create.mockRejectedValue(new Error('ValidationError'));

      await expect(
        repository.create({
          type: 'invalid_type' as unknown as 'system' | 'user',
          content: 'test',
        }),
      ).rejects.toThrow('ValidationError');
    });

    it('should handle timeout errors', async () => {
      model.findOne.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockRejectedValue(new Error('Operation timed out')),
          }),
        }),
      } as any);

      await expect(repository.findOne({ type: 'system' })).rejects.toThrow(
        'Operation timed out',
      );
    });
  });
});
