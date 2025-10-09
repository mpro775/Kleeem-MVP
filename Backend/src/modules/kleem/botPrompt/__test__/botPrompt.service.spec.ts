import { NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';

import { BotPromptService } from '../botPrompt.service';
import { BOT_PROMPT_REPOSITORY } from '../tokens';

import type { CreateBotPromptDto } from '../dto/create-botPrompt.dto';
import type { UpdateBotPromptDto } from '../dto/update-botPrompt.dto';
import type { BotPromptRepository } from '../repositories/bot-prompt.repository';
import type { BotPromptLean } from '../repositories/bot-prompt.repository';

describe('BotPromptService', () => {
  let service: BotPromptService;

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
  } as unknown as BotPromptLean;

  const repo: jest.Mocked<BotPromptRepository> = {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    updateById: jest.fn(),
    updateMany: jest.fn(),
    deleteById: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BotPromptService,
        { provide: BOT_PROMPT_REPOSITORY, useValue: repo },
      ],
    }).compile();
    service = module.get(BotPromptService);
  });

  describe('create', () => {
    it('should create a new prompt successfully', async () => {
      const createDto: CreateBotPromptDto = {
        type: 'system',
        content: 'أنت مساعد ذكي يساعد المستخدمين',
        name: 'البرومبت الأساسي',
        tags: ['افتراضي'],
        active: false,
      };

      repo.create.mockResolvedValue({
        _id: '507f1f77bcf86cd799439011',
        ...createDto,
        active: false,
        version: undefined,
        archived: false,
      } as unknown as BotPromptLean);

      const result = await service.create(createDto);

      expect(repo.create).toHaveBeenCalledWith({
        ...createDto,
        active: false,
      });
      expect(result).toBeDefined();
      expect(result.type).toBe('system');
    });

    it('should disable other system prompts when creating active system prompt', async () => {
      const createDto: CreateBotPromptDto = {
        type: 'system',
        content: 'أنت مساعد ذكي يساعد المستخدمين',
        active: true,
      };

      repo.create.mockResolvedValue({
        _id: '507f1f77bcf86cd799439011',
        ...createDto,
        active: true,
      } as BotPromptLean);

      await service.create(createDto);

      expect(repo.updateMany).toHaveBeenCalledWith(
        { type: 'system' },
        { active: false },
      );
      expect(repo.create).toHaveBeenCalledWith({
        ...createDto,
        active: true,
      });
    });

    it('should not disable other prompts when creating user prompt', async () => {
      const createDto: CreateBotPromptDto = {
        type: 'user',
        content: 'أنت مساعد ذكي يساعد المستخدمين',
        active: true,
      };

      repo.create.mockResolvedValue({
        _id: '507f1f77bcf86cd799439011',
        ...createDto,
        active: true,
      } as BotPromptLean);

      await service.create(createDto);

      expect(repo.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all prompts', async () => {
      const prompts = [mockPrompt];
      repo.findAll.mockResolvedValue(prompts);

      const result = await service.findAll();

      expect(repo.findAll).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(prompts);
    });

    it('should filter by type', async () => {
      const prompts = [mockPrompt];
      repo.findAll.mockResolvedValue(prompts);

      const result = await service.findAll({ type: 'system' });

      expect(repo.findAll).toHaveBeenCalledWith({ type: 'system' });
      expect(result).toEqual(prompts);
    });

    it('should include archived prompts when requested', async () => {
      const prompts = [mockPrompt];
      repo.findAll.mockResolvedValue(prompts);

      const result = await service.findAll({ includeArchived: true });

      expect(repo.findAll).toHaveBeenCalledWith({ includeArchived: true });
      expect(result).toEqual(prompts);
    });
  });

  describe('findById', () => {
    it('should return prompt by id', async () => {
      repo.findById.mockResolvedValue(mockPrompt);

      const result = await service.findById('507f1f77bcf86cd799439011');

      expect(repo.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(result).toEqual(mockPrompt);
    });

    it('should throw NotFoundException when prompt not found', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(
        service.findById('507f1f77bcf86cd799439011'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update prompt successfully', async () => {
      const updateDto: UpdateBotPromptDto = {
        content: 'محتوى محدث',
        name: 'البرومبت المحدث',
      };

      const updatedPrompt = { ...mockPrompt, ...updateDto };
      repo.updateById.mockResolvedValue(
        updatedPrompt as unknown as BotPromptLean,
      );

      const result = await service.update(
        '507f1f77bcf86cd799439011',
        updateDto,
      );

      expect(repo.updateById).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        updateDto,
      );
      expect(result).toEqual(updatedPrompt);
    });

    it('should throw NotFoundException when updating non-existent prompt', async () => {
      repo.updateById.mockResolvedValue(null);

      await expect(
        service.update('507f1f77bcf86cd799439011', { content: 'محتوى محدث' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should disable other system prompts when activating system prompt', async () => {
      const updateDto: UpdateBotPromptDto = {
        active: true,
      };

      const updatedPrompt = { ...mockPrompt, active: true };
      repo.updateById.mockResolvedValue(
        updatedPrompt as unknown as BotPromptLean,
      );

      await service.update('507f1f77bcf86cd799439011', updateDto);

      expect(repo.updateMany).toHaveBeenCalledWith(
        {
          _id: { $ne: '507f1f77bcf86cd799439011' },
          type: 'system',
        },
        { active: false },
      );
    });

    it('should not disable other prompts when activating user prompt', async () => {
      const userPrompt = { ...mockPrompt, type: 'user' as const };
      const updateDto: UpdateBotPromptDto = {
        active: true,
      };

      repo.updateById.mockResolvedValue({
        ...userPrompt,
        active: true,
      } as unknown as BotPromptLean);

      await service.update('507f1f77bcf86cd799439011', updateDto);

      expect(repo.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('publish', () => {
    it('should publish system prompt successfully', async () => {
      const systemPrompt = { ...mockPrompt, type: 'system', version: 1 };
      repo.findById.mockResolvedValue(systemPrompt as unknown as BotPromptLean);

      const lastPrompt = { ...mockPrompt, version: 3 };
      repo.findOne.mockResolvedValue(lastPrompt as unknown as BotPromptLean);

      const publishedPrompt = {
        ...systemPrompt,
        version: 4,
        active: true,
      };
      repo.updateById.mockResolvedValue(
        publishedPrompt as unknown as BotPromptLean,
      );

      const result = await service.publish('507f1f77bcf86cd799439011');

      expect(repo.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(repo.findOne).toHaveBeenCalledWith(
        { type: 'system', archived: { $ne: true } },
        { version: -1 },
      );
      expect(repo.updateMany).toHaveBeenCalledWith(
        { type: 'system' },
        { active: false },
      );
      expect(repo.updateById).toHaveBeenCalledWith('507f1f77bcf86cd799439011', {
        version: 4,
        active: true,
      });
      expect(result).toEqual(publishedPrompt);
    });

    it('should throw NotFoundException when prompt not found', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.publish('507f1f77bcf86cd799439011')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when prompt is not system type', async () => {
      const userPrompt = { ...mockPrompt, type: 'user' as const };
      repo.findById.mockResolvedValue(userPrompt as unknown as BotPromptLean);

      await expect(service.publish('507f1f77bcf86cd799439011')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should start version from 1 when no previous versions exist', async () => {
      const systemPrompt = { ...mockPrompt, type: 'system', version: 1 };
      repo.findById.mockResolvedValue(systemPrompt as unknown as BotPromptLean);
      repo.findOne.mockResolvedValue(null);

      const publishedPrompt = {
        ...systemPrompt,
        version: 1,
        active: true,
      };
      repo.updateById.mockResolvedValue(
        publishedPrompt as unknown as BotPromptLean,
      );

      const result = await service.publish('507f1f77bcf86cd799439011');

      expect(repo.updateById).toHaveBeenCalledWith('507f1f77bcf86cd799439011', {
        version: 1,
        active: true,
      });
      expect(result.version).toBe(1);
    });
  });

  describe('getActiveSystemPrompt', () => {
    it('should return active system prompt content', async () => {
      const activePrompt = { ...mockPrompt, content: 'محتوى البرومبت النشط' };
      repo.findOne.mockResolvedValue(activePrompt as unknown as BotPromptLean);

      const result = await service.getActiveSystemPrompt();

      expect(repo.findOne).toHaveBeenCalledWith(
        { type: 'system', active: true, archived: { $ne: true } },
        { updatedAt: -1 },
      );
      expect(result).toBe('محتوى البرومبت النشط');
    });

    it('should return default prompt when no active system prompt exists', async () => {
      repo.findOne.mockResolvedValue(null);

      const result = await service.getActiveSystemPrompt();

      expect(result).toContain('كليم');
      expect(result).toContain('مساعد افتراضي');
      expect(result.length).toBeGreaterThan(10);
    });
  });

  describe('setActive', () => {
    it('should activate prompt successfully', async () => {
      const activatedPrompt = { ...mockPrompt, active: true };
      repo.findById.mockResolvedValue(mockPrompt as unknown as BotPromptLean);
      repo.updateById.mockResolvedValue(
        activatedPrompt as unknown as BotPromptLean,
      );

      const result = await service.setActive('507f1f77bcf86cd799439011', true);

      expect(repo.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(repo.updateMany).toHaveBeenCalledWith(
        { type: 'system' },
        { active: false },
      );
      expect(repo.updateById).toHaveBeenCalledWith('507f1f77bcf86cd799439011', {
        active: true,
      });
      expect(result).toEqual(activatedPrompt);
    });

    it('should throw NotFoundException when prompt not found', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(
        service.setActive('507f1f77bcf86cd799439011', true),
      ).rejects.toThrow(NotFoundException);
    });

    it('should not disable other prompts when activating user prompt', async () => {
      const userPrompt = { ...mockPrompt, type: 'user' as const };
      repo.findById.mockResolvedValue(userPrompt as unknown as BotPromptLean);
      repo.updateById.mockResolvedValue({
        ...userPrompt,
        active: true,
      } as unknown as BotPromptLean);

      await service.setActive('507f1f77bcf86cd799439011', true);

      expect(repo.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('archive', () => {
    it('should archive prompt successfully', async () => {
      const archivedPrompt = { ...mockPrompt, archived: true, active: false };
      repo.updateById.mockResolvedValue(
        archivedPrompt as unknown as BotPromptLean,
      );

      const result = await service.archive('507f1f77bcf86cd799439011');

      expect(repo.updateById).toHaveBeenCalledWith('507f1f77bcf86cd799439011', {
        archived: true,
        active: false,
      });
      expect(result).toEqual(archivedPrompt);
    });

    it('should throw NotFoundException when prompt not found', async () => {
      repo.updateById.mockResolvedValue(null);

      await expect(service.archive('507f1f77bcf86cd799439011')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should remove prompt successfully', async () => {
      const deleteResult = { deleted: true };
      repo.deleteById.mockResolvedValue(deleteResult);

      const result = await service.remove('507f1f77bcf86cd799439011');

      expect(repo.deleteById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(result).toEqual(deleteResult);
    });
  });

  describe('getActiveSystemPromptOrDefault', () => {
    it('should return active system prompt content', async () => {
      const activePrompt = { ...mockPrompt, content: 'محتوى البرومبت النشط' };
      repo.findOne.mockResolvedValue(activePrompt as unknown as BotPromptLean);

      const result = await service.getActiveSystemPromptOrDefault();

      expect(result).toBe('محتوى البرومبت النشط');
    });

    it('should return default prompt when no active system prompt exists', async () => {
      repo.findOne.mockResolvedValue(null);

      const result = await service.getActiveSystemPromptOrDefault();

      expect(result).toContain('كليم');
      expect(result).toContain('مساعد افتراضي');
      expect(result.length).toBeGreaterThan(10);
    });
  });
});
