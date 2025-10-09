import { Test, type TestingModule } from '@nestjs/testing';
import axios from 'axios';
import request from 'supertest';

import { VectorService } from '../../../vector/vector.service';
import { CtaService } from '../../cta/cta.service';
import { IntentService } from '../../intent/intent.service';
import { SettingsService } from '../../settings/settings.service';
import { BotPromptService } from '../botPrompt.service';
import { PromptSandboxController } from '../prompt-sandbox.controller';

import type { SandboxDto } from '../dto/sandbox.dto';
import type { INestApplication } from '@nestjs/common';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('PromptSandboxController', () => {
  let app: INestApplication;
  let _controller: PromptSandboxController;
  let botPromptService: jest.Mocked<BotPromptService>;
  let settingsService: jest.Mocked<SettingsService>;
  let intentService: jest.Mocked<IntentService>;
  let ctaService: jest.Mocked<CtaService>;
  let vectorService: jest.Mocked<VectorService>;

  const mockSystemPrompt = 'أنت مساعد ذكي يساعد المستخدمين في {LAUNCH_DATE}';

  beforeEach(async () => {
    const mockBotPromptService = {
      getActiveSystemPrompt: jest.fn(),
    };

    const mockSettingsService = {
      get: jest.fn(),
    };

    const mockIntentService = {
      highIntent: jest.fn(),
    };

    const mockCtaService = {
      allow: jest.fn(),
    };

    const mockVectorService = {
      searchBotFaqs: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PromptSandboxController],
      providers: [
        {
          provide: BotPromptService,
          useValue: mockBotPromptService,
        },
        {
          provide: SettingsService,
          useValue: mockSettingsService,
        },
        {
          provide: IntentService,
          useValue: mockIntentService,
        },
        {
          provide: CtaService,
          useValue: mockCtaService,
        },
        {
          provide: VectorService,
          useValue: mockVectorService,
        },
      ],
    }).compile();

    _controller = module.get<PromptSandboxController>(PromptSandboxController);
    botPromptService = module.get(BotPromptService);
    settingsService = module.get(SettingsService);
    intentService = module.get(IntentService);
    ctaService = module.get(CtaService);
    vectorService = module.get(VectorService);

    app = module.createNestApplication();
    await app.init();

    // Setup default mocks
    settingsService.get.mockResolvedValue({
      _id: '507f1f77bcf86cd799439011',
      ctaEvery: 1,
      highIntentKeywords: ['اشترك', 'الاشتراك'],
      launchDate: '2024-01-01',
      applyUrl: 'https://example.com/apply',
      integrationsNow: 'متاحة الآن',
      trialOffer: 'تجربة مجانية',
      yemenNext: 'قريباً',

      yemenPositioning: 'الأفضل في اليمن',
      piiKeywords: ['هاتف', 'بريد إلكتروني'],
    } as any);

    intentService.highIntent.mockReturnValue(true);
    ctaService.allow.mockReturnValue(true);
    vectorService.searchBotFaqs.mockResolvedValue([
      {
        id: '1',
        question: 'كيف أشترك؟',
        answer: 'يمكنك الاشتراك من خلال الموقع',
        score: 0.9,
      },
      {
        id: '2',
        question: 'ما هي المزايا؟',
        answer: 'لدينا مزايا متعددة',
        score: 0.8,
      },
    ]);

    // Mock axios create
    (mockedAxios.create as jest.Mock).mockReturnValue({
      post: jest.fn(),
    } as any);

    // Mock N8N response
    const mockAxiosInstance = mockedAxios.create();
    mockAxiosInstance.post = jest.fn().mockResolvedValue({
      data: { message: 'رد من N8N' },
    });
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /admin/kleem/prompts/sandbox', () => {
    const validSandboxDto: SandboxDto = {
      text: 'مرحباً، كيف يمكنني الاشتراك؟',
      attachKnowledge: true,
      topK: 5,
      dryRun: false,
    };

    it('should process sandbox request successfully', async () => {
      botPromptService.getActiveSystemPrompt.mockResolvedValue(
        mockSystemPrompt,
      );

      const response = await request(app.getHttpServer())
        .post('/admin/kleem/prompts/sandbox')
        .send(validSandboxDto)
        .expect(201);

      expect(response.body).toHaveProperty('systemPrompt');
      expect(response.body).toHaveProperty('knowledge');
      expect(response.body).toHaveProperty('highIntent');
      expect(response.body).toHaveProperty('ctaAllowed');
      expect(response.body).toHaveProperty('result');

      expect(botPromptService.getActiveSystemPrompt).toHaveBeenCalled();
      expect(settingsService.get).toHaveBeenCalled();
      expect(intentService.highIntent).toHaveBeenCalledWith(
        validSandboxDto.text,
      );
      expect(ctaService.allow).toHaveBeenCalled();
      expect(vectorService.searchBotFaqs).toHaveBeenCalledWith(
        validSandboxDto.text,
        5,
      );
    });

    it('should handle dry run mode', async () => {
      const dryRunDto: SandboxDto = { ...validSandboxDto, dryRun: true };
      botPromptService.getActiveSystemPrompt.mockResolvedValue(
        mockSystemPrompt,
      );

      const response = await request(app.getHttpServer())
        .post('/admin/kleem/prompts/sandbox')
        .send(dryRunDto)
        .expect(201);

      expect(response.body).toHaveProperty('systemPrompt');
      expect(response.body).toHaveProperty('knowledge');
      expect(response.body).toHaveProperty('highIntent');
      expect(response.body).toHaveProperty('ctaAllowed');
      expect(response.body).not.toHaveProperty('result');

      // Should not call N8N in dry run mode
      expect(mockedAxios.create().post).not.toHaveBeenCalled();
    });

    it('should skip knowledge when attachKnowledge is false', async () => {
      const noKnowledgeDto: SandboxDto = {
        ...validSandboxDto,
        attachKnowledge: false,
      };
      botPromptService.getActiveSystemPrompt.mockResolvedValue(
        mockSystemPrompt,
      );

      const response = await request(app.getHttpServer())
        .post('/admin/kleem/prompts/sandbox')
        .send(noKnowledgeDto)
        .expect(201);

      expect(vectorService.searchBotFaqs).not.toHaveBeenCalled();
      expect(response.body.knowledge).toEqual([]);
    });

    it('should use default topK when not provided', async () => {
      const noTopKDto: SandboxDto = {
        ...validSandboxDto,
        topK: undefined as any,
      };
      botPromptService.getActiveSystemPrompt.mockResolvedValue(
        mockSystemPrompt,
      );

      await request(app.getHttpServer())
        .post('/admin/kleem/prompts/sandbox')
        .send(noTopKDto)
        .expect(201);

      expect(vectorService.searchBotFaqs).toHaveBeenCalledWith(
        noTopKDto.text,
        5,
      );
    });

    it('should handle PII keywords correctly', async () => {
      botPromptService.getActiveSystemPrompt.mockResolvedValue(
        mockSystemPrompt,
      );

      // Mock N8N response with PII
      const mockAxiosInstance = mockedAxios.create();
      mockAxiosInstance.post = jest.fn().mockResolvedValue({
        data: { message: 'رد يحتوي على هاتف محمول' },
      });

      const response = await request(app.getHttpServer())
        .post('/admin/kleem/prompts/sandbox')
        .send(validSandboxDto)
        .expect(201);

      expect(response.body.result.final).toContain('حرصًا على الخصوصية');
      expect(response.body.result.final).toContain('https://example.com/apply');
    });

    it('should add CTA when allowed and no URL in response', async () => {
      ctaService.allow.mockReturnValue(true);
      botPromptService.getActiveSystemPrompt.mockResolvedValue(
        mockSystemPrompt,
      );

      // Mock N8N response without URL
      const mockAxiosInstance = mockedAxios.create();
      mockAxiosInstance.post = jest.fn().mockResolvedValue({
        data: { message: 'رد بدون رابط' },
      });

      const response = await request(app.getHttpServer())
        .post('/admin/kleem/prompts/sandbox')
        .send(validSandboxDto)
        .expect(201);

      expect(response.body.result.final).toContain('https://example.com/apply');
    });

    it('should remove CTA URLs when not allowed', async () => {
      ctaService.allow.mockReturnValue(false);
      botPromptService.getActiveSystemPrompt.mockResolvedValue(
        mockSystemPrompt,
      );

      // Mock N8N response with CTA URLs
      const mockAxiosInstance = mockedAxios.create();
      mockAxiosInstance.post = jest.fn().mockResolvedValue({
        data: {
          message:
            'رد مع صفحة التقديم: https://example.com/apply و للبدء يوم الإطلاق: https://example.com/launch',
        },
      });

      const response = await request(app.getHttpServer())
        .post('/admin/kleem/prompts/sandbox')
        .send(validSandboxDto)
        .expect(201);

      expect(response.body.result.final).not.toContain(
        'https://example.com/apply',
      );
      expect(response.body.result.final).not.toContain(
        'https://example.com/launch',
      );
    });

    it('should handle empty text input', async () => {
      const invalidDto = { ...validSandboxDto, text: '' };

      const response = await request(app.getHttpServer())
        .post('/admin/kleem/prompts/sandbox')
        .send(invalidDto)
        .expect(400);

      expect(response.status).toBe(400);
    });

    it('should handle missing text field', async () => {
      const invalidDto = { attachKnowledge: true } as any;

      const response = await request(app.getHttpServer())
        .post('/admin/kleem/prompts/sandbox')
        .send(invalidDto)
        .expect(400);

      expect(response.status).toBe(400);
    });

    it('should handle N8N errors gracefully', async () => {
      botPromptService.getActiveSystemPrompt.mockResolvedValue(
        mockSystemPrompt,
      );

      // Mock N8N error
      const mockAxiosInstance = mockedAxios.create();
      mockAxiosInstance.post = jest
        .fn()
        .mockRejectedValue(new Error('N8N Error'));

      const response = await request(app.getHttpServer())
        .post('/admin/kleem/prompts/sandbox')
        .send(validSandboxDto)
        .expect(500);

      expect(response.status).toBe(500);
    });

    it('should handle settings service errors', async () => {
      settingsService.get.mockRejectedValue(new Error('Settings Error'));

      const response = await request(app.getHttpServer())
        .post('/admin/kleem/prompts/sandbox')
        .send(validSandboxDto)
        .expect(500);

      expect(response.status).toBe(500);
    });

    it('should handle vector service errors', async () => {
      vectorService.searchBotFaqs.mockRejectedValue(new Error('Vector Error'));

      botPromptService.getActiveSystemPrompt.mockResolvedValue(
        mockSystemPrompt,
      );

      const response = await request(app.getHttpServer())
        .post('/admin/kleem/prompts/sandbox')
        .send(validSandboxDto)
        .expect(500);

      expect(response.status).toBe(500);
    });

    it('should handle malformed N8N response', async () => {
      botPromptService.getActiveSystemPrompt.mockResolvedValue(
        mockSystemPrompt,
      );

      // Mock N8N response without message or text
      const mockAxiosInstance = mockedAxios.create();
      mockAxiosInstance.post = jest.fn().mockResolvedValue({
        data: { someOtherField: 'value' },
      });

      const response = await request(app.getHttpServer())
        .post('/admin/kleem/prompts/sandbox')
        .send(validSandboxDto)
        .expect(201);

      expect(response.body.result.raw).toBe('');
    });

    it('should render system prompt with variables correctly', async () => {
      botPromptService.getActiveSystemPrompt.mockResolvedValue(
        mockSystemPrompt,
      );

      const response = await request(app.getHttpServer())
        .post('/admin/kleem/prompts/sandbox')
        .send(validSandboxDto)
        .expect(201);

      expect(response.body.systemPrompt).toContain('2024-01-01');
      expect(response.body.systemPrompt).toContain('https://example.com/apply');
      expect(response.body.systemPrompt).toContain('متاحة الآن');
      expect(response.body.systemPrompt).toContain('تجربة مجانية');
      expect(response.body.systemPrompt).toContain('قريباً');
      expect(response.body.systemPrompt).toContain('الأفضل في اليمن');
    });

    it('should handle knowledge items correctly', async () => {
      botPromptService.getActiveSystemPrompt.mockResolvedValue(
        mockSystemPrompt,
      );

      const response = await request(app.getHttpServer())
        .post('/admin/kleem/prompts/sandbox')
        .send(validSandboxDto)
        .expect(201);

      expect(response.body.knowledge).toHaveLength(2);
      expect(response.body.knowledge[0]).toHaveProperty('question');
      expect(response.body.knowledge[0]).toHaveProperty('answer');
      expect(response.body.knowledge[0]).toHaveProperty('score');

      // Check if knowledge is appended to system prompt when available
      expect(response.body.systemPrompt).toContain(
        'Knowledge (use if relevant)',
      );
    });

    it('should handle empty knowledge results', async () => {
      vectorService.searchBotFaqs.mockResolvedValue([]);
      botPromptService.getActiveSystemPrompt.mockResolvedValue(
        mockSystemPrompt,
      );

      const response = await request(app.getHttpServer())
        .post('/admin/kleem/prompts/sandbox')
        .send(validSandboxDto)
        .expect(201);

      expect(response.body.knowledge).toEqual([]);
      expect(response.body.systemPrompt).not.toContain(
        'Knowledge (use if relevant)',
      );
    });

    it('should validate topK parameter bounds', async () => {
      const invalidTopKDto: SandboxDto = { ...validSandboxDto, topK: 25 };

      const response = await request(app.getHttpServer())
        .post('/admin/kleem/prompts/sandbox')
        .send(invalidTopKDto)
        .expect(400);

      expect(response.status).toBe(400);
    });

    it('should handle minimum topK value', async () => {
      const minTopKDto: SandboxDto = { ...validSandboxDto, topK: 1 };
      botPromptService.getActiveSystemPrompt.mockResolvedValue(
        mockSystemPrompt,
      );

      await request(app.getHttpServer())
        .post('/admin/kleem/prompts/sandbox')
        .send(minTopKDto)
        .expect(201);

      expect(vectorService.searchBotFaqs).toHaveBeenCalledWith(
        minTopKDto.text,
        1,
      );
    });
  });

  describe('Error scenarios', () => {
    it('should handle all services failing gracefully', async () => {
      botPromptService.getActiveSystemPrompt.mockRejectedValue(
        new Error('BotPrompt Error'),
      );
      settingsService.get.mockRejectedValue(new Error('Settings Error'));
      intentService.highIntent.mockImplementation(() => {
        throw new Error('Intent Error');
      });
      ctaService.allow.mockImplementation(() => {
        throw new Error('CTA Error');
      });
      vectorService.searchBotFaqs.mockRejectedValue(new Error('Vector Error'));

      const response = await request(app.getHttpServer())
        .post('/admin/kleem/prompts/sandbox')
        .send({
          text: 'test',
        })
        .expect(500);

      expect(response.status).toBe(500);
    });
  });
});
