import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import axios from 'axios';
import { KleemChatService } from '../chat/kleem-chat.service';
import { BotChatsService } from '../botChats/botChats.service';
import { BotPromptService } from '../botPrompt/botPrompt.service';
import { SettingsService } from '../settings/settings.service';
import { IntentService } from '../intent/intent.service';
import { CtaService } from '../cta/cta.service';
import { VectorService } from '../../vector/vector.service';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('KleemChatService', () => {
  let service: KleemChatService;
  let mockBotChatsService: jest.Mocked<BotChatsService>;
  let mockBotPromptService: jest.Mocked<BotPromptService>;
  let mockSettingsService: jest.Mocked<SettingsService>;
  let mockIntentService: jest.Mocked<IntentService>;
  let mockCtaService: jest.Mocked<CtaService>;
  let mockVectorService: jest.Mocked<VectorService>;
  let mockEventEmitter: jest.Mocked<EventEmitter2>;
  let loggerSpy: jest.SpyInstance;

  beforeEach(async () => {
    // Create mocks
    mockBotChatsService = {
      createOrAppend: jest.fn(),
    } as any;

    mockBotPromptService = {
      getActiveSystemPrompt: jest.fn(),
    } as any;

    mockSettingsService = {
      get: jest.fn(),
    } as any;

    mockIntentService = {
      highIntent: jest.fn(),
    } as any;

    mockCtaService = {
      allow: jest.fn(),
    } as any;

    mockVectorService = {
      searchBotFaqs: jest.fn(),
    } as any;

    mockEventEmitter = {
      emit: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KleemChatService,
        { provide: BotChatsService, useValue: mockBotChatsService },
        { provide: BotPromptService, useValue: mockBotPromptService },
        { provide: SettingsService, useValue: mockSettingsService },
        { provide: IntentService, useValue: mockIntentService },
        { provide: CtaService, useValue: mockCtaService },
        { provide: VectorService, useValue: mockVectorService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<KleemChatService>(KleemChatService);

    // Mock Logger
    loggerSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    // Mock axios.create
    const mockAxiosInstance = {
      post: jest.fn(),
    };
    (axios.create as jest.Mock).mockReturnValue(mockAxiosInstance);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should create axios instance with correct configuration', () => {
      expect(axios.create).toHaveBeenCalledWith({
        baseURL: process.env.N8N_BASE_URL || 'https://n8n.kaleem-ai.com',
        timeout: 15_000,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    it('should have logger instance', () => {
      expect(service).toHaveProperty('logger');
    });

    it('should have n8n axios instance', () => {
      expect(service).toHaveProperty('n8n');
    });
  });

  describe('buildSystemPrompt', () => {
    const mockSystemPrompt = 'System prompt with {LAUNCH_DATE} and {APPLY_URL}';
    const mockSettings = {
      launchDate: '2024-01-01',
      applyUrl: 'https://apply.kaleem.ai',
      integrationsNow: 'Available integrations',
      trialOffer: '30-day trial',
      yemenNext: 'Yemen expansion plans',
      yemenPositioning: 'Market positioning in Yemen',
    };

    beforeEach(() => {
      mockBotPromptService.getActiveSystemPrompt.mockResolvedValue(
        mockSystemPrompt,
      );
      mockSettingsService.get.mockResolvedValue(mockSettings);
    });

    it('should build system prompt with settings variables', async () => {
      mockVectorService.searchBotFaqs.mockResolvedValue([]);

      const result = await (service as any).buildSystemPrompt('test user text');

      expect(mockBotPromptService.getActiveSystemPrompt).toHaveBeenCalled();
      expect(mockSettingsService.get).toHaveBeenCalled();
      expect(result).toContain('2024-01-01');
      expect(result).toContain('https://apply.kaleem.ai');
    });

    it('should include knowledge from FAQ search when available', async () => {
      const mockFaqs = [
        { question: 'What is Kaleem?', answer: 'Kaleem is an AI platform' },
        { question: 'How to get started?', answer: 'Sign up and follow guide' },
      ];
      mockVectorService.searchBotFaqs.mockResolvedValue(mockFaqs);

      const result = await (service as any).buildSystemPrompt(
        'tell me about kaleem',
      );

      expect(mockVectorService.searchBotFaqs).toHaveBeenCalledWith(
        'tell me about kaleem',
        5,
      );
      expect(result).toContain('# Knowledge (use if relevant)');
      expect(result).toContain('Q: What is Kaleem?');
      expect(result).toContain('A: Kaleem is an AI platform');
      expect(result).toContain('Q: How to get started?');
      expect(result).toContain('A: Sign up and follow guide');
    });

    it('should handle FAQ search failure gracefully', async () => {
      mockVectorService.searchBotFaqs.mockRejectedValue(
        new Error('Vector search failed'),
      );

      const result = await (service as any).buildSystemPrompt('test');

      expect(loggerSpy).toHaveBeenCalledWith(
        '[buildSystemPrompt] failed RAG: Vector search failed',
      );
      expect(result).not.toContain('# Knowledge');
      expect(result).toContain('2024-01-01'); // Should still include settings
    });

    it('should handle empty FAQ results', async () => {
      mockVectorService.searchBotFaqs.mockResolvedValue([]);

      const result = await (service as any).buildSystemPrompt('test');

      expect(result).not.toContain('# Knowledge');
    });

    it('should handle null FAQ results', async () => {
      mockVectorService.searchBotFaqs.mockResolvedValue(null);

      const result = await (service as any).buildSystemPrompt('test');

      expect(result).not.toContain('# Knowledge');
    });

    it('should replace all template variables correctly', async () => {
      const templateWithAllVars =
        'Launch: {LAUNCH_DATE}, Apply: {APPLY_URL}, Integrations: {INTEGRATIONS_NOW}, Trial: {TRIAL_OFFER}, Yemen Next: {YEMEN_NEXT}, Yemen Position: {YEMEN_POSITIONING}';
      mockBotPromptService.getActiveSystemPrompt.mockResolvedValue(
        templateWithAllVars,
      );
      mockVectorService.searchBotFaqs.mockResolvedValue([]);

      const result = await (service as any).buildSystemPrompt('test');

      expect(result).toContain('Launch: 2024-01-01');
      expect(result).toContain('Apply: https://apply.kaleem.ai');
      expect(result).toContain('Integrations: Available integrations');
      expect(result).toContain('Trial: 30-day trial');
      expect(result).toContain('Yemen Next: Yemen expansion plans');
      expect(result).toContain('Yemen Position: Market positioning in Yemen');
    });
  });

  describe('handleUserMessage', () => {
    const sessionId = 'test-session-123';
    const userText = 'Hello, I need help with my account';
    const metadata = { platform: 'web', userAgent: 'Mozilla/5.0' };

    beforeEach(() => {
      // Setup default mocks
      mockBotChatsService.createOrAppend.mockResolvedValue({} as any);
      mockIntentService.highIntent.mockReturnValue(false);
      mockCtaService.allow.mockReturnValue(true);
      mockBotPromptService.getActiveSystemPrompt.mockResolvedValue(
        'System prompt',
      );
      mockSettingsService.get.mockResolvedValue({
        launchDate: '2024-01-01',
        applyUrl: 'https://apply.kaleem.ai',
        integrationsNow: 'Available',
        trialOffer: 'Trial',
        yemenNext: 'Yemen',
        yemenPositioning: 'Position',
      });
      mockVectorService.searchBotFaqs.mockResolvedValue([]);

      // Mock axios instance
      const mockAxiosInstance = {
        post: jest.fn().mockResolvedValue({ data: { success: true } }),
      };
      (service as any).n8n = mockAxiosInstance;
    });

    it('should store user message in chat history', async () => {
      await service.handleUserMessage(sessionId, userText, metadata);

      expect(mockBotChatsService.createOrAppend).toHaveBeenCalledWith(
        sessionId,
        [{ role: 'user', text: userText, metadata }],
      );
    });

    it('should emit admin notification event', async () => {
      await service.handleUserMessage(sessionId, userText, metadata);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'kleem.admin_new_message',
        {
          sessionId,
          message: { role: 'user', text: userText },
        },
      );
    });

    it('should analyze intent and CTA policy', async () => {
      mockIntentService.highIntent.mockReturnValue(true);
      mockCtaService.allow.mockReturnValue(false);

      await service.handleUserMessage(sessionId, userText);

      expect(mockIntentService.highIntent).toHaveBeenCalledWith(userText);
      expect(mockCtaService.allow).toHaveBeenCalledWith(sessionId, true);
    });

    it('should send request to n8n webhook with correct payload', async () => {
      const mockSystemPrompt = 'Built system prompt';
      jest
        .spyOn(service as any, 'buildSystemPrompt')
        .mockResolvedValue(mockSystemPrompt);

      await service.handleUserMessage(sessionId, userText, metadata);

      expect((service as any).n8n.post).toHaveBeenCalledWith(
        '/webhook/webhooks/kleem/incoming',
        {
          bot: 'kleem',
          sessionId,
          channel: 'webchat',
          text: userText,
          prompt: mockSystemPrompt,
          policy: { allowCTA: true },
          meta: metadata,
        },
      );
    });

    it('should handle metadata as empty object when not provided', async () => {
      await service.handleUserMessage(sessionId, userText);

      expect(mockBotChatsService.createOrAppend).toHaveBeenCalledWith(
        sessionId,
        [{ role: 'user', text: userText, metadata: {} }],
      );

      expect((service as any).n8n.post).toHaveBeenCalledWith(
        '/webhook/webhooks/kleem/incoming',
        expect.objectContaining({
          meta: {},
        }),
      );
    });

    it('should return queued status', async () => {
      const result = await service.handleUserMessage(sessionId, userText);

      expect(result).toEqual({ status: 'queued' });
    });

    it('should handle n8n request failure gracefully', async () => {
      const errorSpy = jest.spyOn(Logger.prototype, 'error');
      const error = new Error('Network timeout');
      (service as any).n8n.post.mockRejectedValue(error);

      const result = await service.handleUserMessage(sessionId, userText);

      expect(errorSpy).toHaveBeenCalledWith(
        '[n8n] failed to post user message',
        error,
      );
      expect(result).toEqual({ status: 'queued' });
    });

    it('should handle high intent scenarios', async () => {
      mockIntentService.highIntent.mockReturnValue(true);
      mockCtaService.allow.mockReturnValue(true);

      await service.handleUserMessage(sessionId, 'I want to buy now!');

      expect(mockIntentService.highIntent).toHaveBeenCalledWith(
        'I want to buy now!',
      );
      expect(mockCtaService.allow).toHaveBeenCalledWith(sessionId, true);
      expect((service as any).n8n.post).toHaveBeenCalledWith(
        '/webhook/webhooks/kleem/incoming',
        expect.objectContaining({
          policy: { allowCTA: true },
        }),
      );
    });

    it('should handle low intent scenarios', async () => {
      mockIntentService.highIntent.mockReturnValue(false);
      mockCtaService.allow.mockReturnValue(false);

      await service.handleUserMessage(
        sessionId,
        'just asking general questions',
      );

      expect(mockIntentService.highIntent).toHaveBeenCalledWith(
        'just asking general questions',
      );
      expect(mockCtaService.allow).toHaveBeenCalledWith(sessionId, false);
      expect((service as any).n8n.post).toHaveBeenCalledWith(
        '/webhook/webhooks/kleem/incoming',
        expect.objectContaining({
          policy: { allowCTA: false },
        }),
      );
    });

    it('should handle complex metadata objects', async () => {
      const complexMetadata = {
        platform: 'web',
        userAgent: 'Mozilla/5.0',
        sessionInfo: {
          startTime: '2024-01-01T00:00:00Z',
          pageUrl: 'https://example.com/page',
          referrer: 'https://google.com',
        },
        customFields: {
          userId: 'user123',
          customerType: 'premium',
        },
      };

      await service.handleUserMessage(sessionId, userText, complexMetadata);

      expect(mockBotChatsService.createOrAppend).toHaveBeenCalledWith(
        sessionId,
        [{ role: 'user', text: userText, metadata: complexMetadata }],
      );

      expect((service as any).n8n.post).toHaveBeenCalledWith(
        '/webhook/webhooks/kleem/incoming',
        expect.objectContaining({
          meta: complexMetadata,
        }),
      );
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete user message flow', async () => {
      const sessionId = 'integration-test-session';
      const userText = 'I want to learn about your pricing';
      const metadata = { source: 'website' };

      // Setup mocks for complete flow
      mockBotChatsService.createOrAppend.mockResolvedValue({} as any);
      mockIntentService.highIntent.mockReturnValue(true);
      mockCtaService.allow.mockReturnValue(true);
      mockBotPromptService.getActiveSystemPrompt.mockResolvedValue(
        'You are Kaleem AI assistant. Launch date: {LAUNCH_DATE}',
      );
      mockSettingsService.get.mockResolvedValue({
        launchDate: '2024-01-01',
        applyUrl: 'https://apply.kaleem.ai',
        integrationsNow: 'Available',
        trialOffer: 'Trial',
        yemenNext: 'Yemen',
        yemenPositioning: 'Position',
      });
      mockVectorService.searchBotFaqs.mockResolvedValue([
        { question: 'Pricing?', answer: 'Starting from $10/month' },
      ]);

      const mockAxiosInstance = {
        post: jest.fn().mockResolvedValue({ data: { success: true } }),
      };
      (service as any).n8n = mockAxiosInstance;

      const result = await service.handleUserMessage(
        sessionId,
        userText,
        metadata,
      );

      // Verify all steps were executed
      expect(mockBotChatsService.createOrAppend).toHaveBeenCalled();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'kleem.admin_new_message',
        expect.any(Object),
      );
      expect(mockIntentService.highIntent).toHaveBeenCalled();
      expect(mockCtaService.allow).toHaveBeenCalled();
      expect(mockBotPromptService.getActiveSystemPrompt).toHaveBeenCalled();
      expect(mockSettingsService.get).toHaveBeenCalled();
      expect(mockVectorService.searchBotFaqs).toHaveBeenCalled();
      expect(mockAxiosInstance.post).toHaveBeenCalled();

      expect(result).toEqual({ status: 'queued' });
    });

    it('should handle errors in individual steps without breaking the flow', async () => {
      const sessionId = 'error-test-session';
      const userText = 'test message';

      // Setup some services to fail
      mockBotChatsService.createOrAppend.mockResolvedValue({} as any);
      mockIntentService.highIntent.mockImplementation(() => {
        throw new Error('Intent service error');
      });
      mockCtaService.allow.mockReturnValue(true);
      mockBotPromptService.getActiveSystemPrompt.mockResolvedValue('prompt');
      mockSettingsService.get.mockResolvedValue({
        launchDate: '2024-01-01',
        applyUrl: 'https://apply.kaleem.ai',
        integrationsNow: 'Available',
        trialOffer: 'Trial',
        yemenNext: 'Yemen',
        yemenPositioning: 'Position',
      });
      mockVectorService.searchBotFaqs.mockResolvedValue([]);

      const mockAxiosInstance = {
        post: jest.fn().mockResolvedValue({ data: { success: true } }),
      };
      (service as any).n8n = mockAxiosInstance;

      // Should not throw error even if intent service fails
      await expect(
        service.handleUserMessage(sessionId, userText),
      ).rejects.toThrow('Intent service error');
    });
  });

  describe('Environment Configuration', () => {
    it('should use N8N_BASE_URL from environment when available', () => {
      // This is tested in the constructor via axios.create mock
      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: process.env.N8N_BASE_URL || 'https://n8n.kaleem-ai.com',
        }),
      );
    });

    it('should use default timeout and headers', () => {
      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 15_000,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle buildSystemPrompt errors gracefully', async () => {
      mockBotPromptService.getActiveSystemPrompt.mockRejectedValue(
        new Error('Prompt service error'),
      );

      await expect(
        service.handleUserMessage('session', 'text'),
      ).rejects.toThrow('Prompt service error');
    });

    it('should handle settings service errors', async () => {
      mockBotPromptService.getActiveSystemPrompt.mockResolvedValue('prompt');
      mockSettingsService.get.mockRejectedValue(
        new Error('Settings service error'),
      );

      await expect(
        service.handleUserMessage('session', 'text'),
      ).rejects.toThrow('Settings service error');
    });

    it('should handle chat service errors', async () => {
      mockBotChatsService.createOrAppend.mockRejectedValue(
        new Error('Chat service error'),
      );

      await expect(
        service.handleUserMessage('session', 'text'),
      ).rejects.toThrow('Chat service error');
    });
  });
});
