import { NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { BotPromptController } from '../botPrompt.controller';
import { BotPromptService } from '../botPrompt.service';

import type { CreateBotPromptDto } from '../dto/create-botPrompt.dto';
import type { SetActiveKaleemDto } from '../dto/set-active.dto';
import type { UpdateBotPromptDto } from '../dto/update-botPrompt.dto';
import type { BotPromptLean } from '../repositories/bot-prompt.repository';
import type { INestApplication } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';

// Mock TranslationService
jest.mock('../../../common/services/translation.service');

describe('BotPromptController', () => {
  let app: INestApplication;
  let _controller: BotPromptController;
  let service: jest.Mocked<BotPromptService>;
  let _jwtService: jest.Mocked<JwtService>;

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
    const mockService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      setActive: jest.fn(),
      archive: jest.fn(),
      remove: jest.fn(),
      getActiveSystemPrompt: jest.fn(),
      getActiveSystemPromptOrDefault: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BotPromptController],
      providers: [
        {
          provide: BotPromptService,
          useValue: mockService,
        },
        {
          provide: 'TranslationService',
          useValue: {
            translate: jest.fn().mockReturnValue('Translated text'),
          },
        },
      ],
    }).compile();

    _controller = module.get<BotPromptController>(BotPromptController);
    service = module.get(BotPromptService);

    app = module.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /admin/kleem/bot-prompts', () => {
    it('should create a new bot prompt', async () => {
      const createDto: CreateBotPromptDto = {
        type: 'system',
        content: 'أنت مساعد ذكي يساعد المستخدمين',
        name: 'البرومبت الأساسي',
        tags: ['افتراضي'],
        active: false,
      };

      service.create.mockResolvedValue(mockPrompt as unknown as BotPromptLean);

      const response = await request(app.getHttpServer())
        .post('/admin/kleem/bot-prompts')
        .send(createDto)
        .expect(201);

      expect(service.create).toHaveBeenCalledWith(createDto);
      expect(response.body).toEqual(mockPrompt);
    });
  });

  describe('GET /admin/kleem/bot-prompts/ping', () => {
    it('should return ping response', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/kleem/bot-prompts/ping')
        .expect(200);

      expect(response.body).toEqual({
        ok: true,
        who: 'bot-prompts',
      });
    });
  });

  describe('GET /admin/kleem/bot-prompts', () => {
    it('should return all prompts', async () => {
      const prompts = [mockPrompt as unknown as BotPromptLean];
      service.findAll.mockResolvedValue(prompts);

      const response = await request(app.getHttpServer())
        .get('/admin/kleem/bot-prompts')
        .expect(200);

      expect(service.findAll).toHaveBeenCalledWith({});
      expect(response.body).toEqual(prompts);
    });

    it('should filter by type', async () => {
      const prompts = [mockPrompt as unknown as BotPromptLean];
      service.findAll.mockResolvedValue(prompts);

      const response = await request(app.getHttpServer())
        .get('/admin/kleem/bot-prompts?type=system')
        .expect(200);

      expect(service.findAll).toHaveBeenCalledWith({ type: 'system' });
      expect(response.body).toEqual(prompts);
    });

    it('should include archived prompts when requested', async () => {
      const prompts = [mockPrompt as unknown as BotPromptLean];
      service.findAll.mockResolvedValue(prompts);

      const response = await request(app.getHttpServer())
        .get('/admin/kleem/bot-prompts?includeArchived=true')
        .expect(200);

      expect(service.findAll).toHaveBeenCalledWith({ includeArchived: true });
      expect(response.body).toEqual(prompts);
    });
  });

  describe('GET /admin/kleem/bot-prompts/:id', () => {
    it('should return prompt by id', async () => {
      service.findById.mockResolvedValue(
        mockPrompt as unknown as BotPromptLean,
      );

      const response = await request(app.getHttpServer())
        .get(`/admin/kleem/bot-prompts/${mockPrompt._id}`)
        .expect(200);

      expect(service.findById).toHaveBeenCalledWith(mockPrompt._id);
      expect(response.body).toEqual(mockPrompt);
    });

    it('should return 404 when prompt not found', async () => {
      service.findById.mockRejectedValue(
        new NotFoundException('Prompt not found'),
      );

      const response = await request(app.getHttpServer())
        .get(`/admin/kleem/bot-prompts/${mockPrompt._id}`)
        .expect(404);

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /admin/kleem/bot-prompts/:id', () => {
    it('should update prompt successfully', async () => {
      const updateDto: UpdateBotPromptDto = {
        content: 'محتوى محدث',
        name: 'البرومبت المحدث',
      };

      const updatedPrompt = {
        ...mockPrompt,
        ...updateDto,
      } as unknown as BotPromptLean;
      service.update.mockResolvedValue(updatedPrompt);

      const response = await request(app.getHttpServer())
        .patch(`/admin/kleem/bot-prompts/${mockPrompt._id}`)
        .send(updateDto)
        .expect(200);

      expect(service.update).toHaveBeenCalledWith(mockPrompt._id, updateDto);
      expect(response.body).toEqual(updatedPrompt);
    });

    it('should return 404 when updating non-existent prompt', async () => {
      service.update.mockRejectedValue(
        new NotFoundException('Prompt not found'),
      );

      const response = await request(app.getHttpServer())
        .patch(`/admin/kleem/bot-prompts/${mockPrompt._id}`)
        .send({ content: 'محتوى محدث' })
        .expect(404);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /admin/kleem/bot-prompts/:id/active', () => {
    it('should set prompt active status', async () => {
      const setActiveDto: SetActiveKaleemDto = { active: true };
      const activatedPrompt = {
        ...mockPrompt,
        active: true,
      } as unknown as BotPromptLean;
      service.setActive.mockResolvedValue(activatedPrompt);

      const response = await request(app.getHttpServer())
        .post(`/admin/kleem/bot-prompts/${mockPrompt._id}/active`)
        .send(setActiveDto)
        .expect(200);

      expect(service.setActive).toHaveBeenCalledWith(mockPrompt._id, true);
      expect(response.body).toEqual(activatedPrompt);
    });

    it('should return 404 when prompt not found', async () => {
      service.setActive.mockRejectedValue(
        new NotFoundException('Prompt not found'),
      );

      const response = await request(app.getHttpServer())
        .post(`/admin/kleem/bot-prompts/${mockPrompt._id}/active`)
        .send({ active: true })
        .expect(404);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /admin/kleem/bot-prompts/:id/archive', () => {
    it('should archive prompt successfully', async () => {
      const archivedPrompt = {
        ...mockPrompt,
        archived: true,
        active: false,
      } as unknown as BotPromptLean;
      service.archive.mockResolvedValue(archivedPrompt);

      const response = await request(app.getHttpServer())
        .post(`/admin/kleem/bot-prompts/${mockPrompt._id}/archive`)
        .expect(200);

      expect(service.archive).toHaveBeenCalledWith(mockPrompt._id);
      expect(response.body).toEqual(archivedPrompt);
    });

    it('should return 404 when prompt not found', async () => {
      service.archive.mockRejectedValue(
        new NotFoundException('Prompt not found'),
      );

      const response = await request(app.getHttpServer())
        .post(`/admin/kleem/bot-prompts/${mockPrompt._id}/archive`)
        .expect(404);

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /admin/kleem/bot-prompts/:id', () => {
    it('should delete prompt successfully', async () => {
      service.remove.mockResolvedValue({ deleted: true });

      await request(app.getHttpServer())
        .delete(`/admin/kleem/bot-prompts/${mockPrompt._id}`)
        .expect(204);

      expect(service.remove).toHaveBeenCalledWith(mockPrompt._id);
    });
  });

  describe('GET /admin/kleem/bot-prompts/system/active', () => {
    it('should return active system prompt', async () => {
      const activePromptContent = 'محتوى البرومبت النشط';
      service.getActiveSystemPrompt.mockResolvedValue(activePromptContent);

      const response = await request(app.getHttpServer())
        .get('/admin/kleem/bot-prompts/system/active')
        .expect(200);

      expect(service.getActiveSystemPrompt).toHaveBeenCalled();
      expect(response.text).toBe(activePromptContent);
    });
  });

  describe('GET /admin/kleem/bot-prompts/system/active/content', () => {
    it('should return active system prompt content object', async () => {
      const activePromptContent = 'محتوى البرومبت النشط';
      service.getActiveSystemPromptOrDefault.mockResolvedValue(
        activePromptContent,
      );

      const response = await request(app.getHttpServer())
        .get('/admin/kleem/bot-prompts/system/active/content')
        .expect(200);

      expect(service.getActiveSystemPromptOrDefault).toHaveBeenCalled();
      expect(response.body).toEqual({ content: activePromptContent });
    });
  });

  describe('Error handling', () => {
    it('should handle service errors properly', async () => {
      service.create.mockRejectedValue(new Error('Service error'));

      const response = await request(app.getHttpServer())
        .post('/admin/kleem/bot-prompts')
        .send({
          type: 'system',
          content: 'test content',
        })
        .expect(500);

      expect(response.status).toBe(500);
    });
  });
});
