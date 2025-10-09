import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, type TestingModule } from '@nestjs/testing';
import axios from 'axios';

import { VectorService } from '../../../vector/vector.service';
import { BotChatsService } from '../../botChats/botChats.service';
import { BotPromptService } from '../../botPrompt/botPrompt.service';
import { CtaService } from '../../cta/cta.service';
import { IntentService } from '../../intent/intent.service';
import { SettingsService } from '../../settings/settings.service';
import { KleemChatService } from '../kleem-chat.service';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('KleemChatService', () => {
  let service: KleemChatService;
  let chatsService: jest.Mocked<BotChatsService>;
  let promptsService: jest.Mocked<BotPromptService>;
  let settingsService: jest.Mocked<SettingsService>;
  let intentService: jest.Mocked<IntentService>;
  let ctaService: jest.Mocked<CtaService>;
  let vectorService: jest.Mocked<VectorService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockSystemPrompt = 'أنت مساعد ذكي يساعد المستخدمين في {LAUNCH_DATE}';
  const mockSettings = {
    launchDate: '2024-01-01',
    applyUrl: 'https://example.com/apply',
    integrationsNow: 'متاحة الآن',
    trialOffer: 'تجربة مجانية',
    yemenNext: 'قريباً',
    yemenPositioning: 'الأفضل في اليمن',
  };

  beforeEach(async () => {
    const mockChatsService = {
      createOrAppend: jest.fn(),
    };

    const mockPromptsService = {
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

    const mockEventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KleemChatService,
        {
          provide: BotChatsService,
          useValue: mockChatsService,
        },
        {
          provide: BotPromptService,
          useValue: mockPromptsService,
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
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
        {
          provide: 'ConfigService',
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                'vars.chat.n8nEndpoint': '/webhook/kleem/chat',
                'vars.chat.botName': 'كليم',
                'vars.chat.defaultChannel': 'web',
                'vars.chat.typing.stopDelayMs': 1000,
              };
              return config[key as keyof typeof config];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<KleemChatService>(KleemChatService);
    chatsService = module.get(BotChatsService);
    promptsService = module.get(BotPromptService);
    settingsService = module.get(SettingsService);
    intentService = module.get(IntentService);
    ctaService = module.get(CtaService);
    vectorService = module.get(VectorService);
    eventEmitter = module.get(EventEmitter2);

    // Setup default mocks
    promptsService.getActiveSystemPrompt.mockResolvedValue(mockSystemPrompt);
    settingsService.get.mockResolvedValue(mockSettings as any);
    intentService.highIntent.mockReturnValue(true);
    ctaService.allow.mockReturnValue(true);
    vectorService.searchBotFaqs.mockResolvedValue([
      {
        question: 'كيف أشترك؟',
        answer: 'يمكنك الاشتراك من خلال الموقع',
        score: 0.9,
        id: '1',
      },
      {
        id: '2',
        question: 'ما هي المزايا؟',
        answer: 'لدينا مزايا متعددة',
        score: 0.8,
      },
    ]);

    // Mock axios
    (mockedAxios.create as jest.Mock).mockReturnValue({
      post: jest.fn(),
    } as any);

    const mockAxiosInstance = mockedAxios.create();
    mockAxiosInstance.post = jest.fn().mockResolvedValue({
      data: { status: 'success' },
    });
  });

  describe('constructor', () => {
    it('should initialize with correct configuration', () => {
      expect(service).toBeDefined();
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'http://n8n:5678',
        timeout: 15000,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    it('should use custom N8N_BASE_URL when provided', () => {
      process.env.N8N_BASE_URL = 'https://custom-n8n.com';
      // Need to recreate service for env change to take effect
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://custom-n8n.com',
        }),
      );
    });
  });

  describe('buildSystemPrompt', () => {
    it('should build system prompt with variables and knowledge', async () => {
      const userText = 'كيف أشترك في الخدمة؟';

      const result = await service['buildSystemPrompt'](userText);

      expect(promptsService.getActiveSystemPrompt).toHaveBeenCalled();
      expect(settingsService.get).toHaveBeenCalled();
      expect(vectorService.searchBotFaqs).toHaveBeenCalledWith(userText, 5);

      expect(result).toContain('2024-01-01');
      expect(result).toContain('https://example.com/apply');
      expect(result).toContain('متاحة الآن');
      expect(result).toContain('تجربة مجانية');
      expect(result).toContain('قريباً');
      expect(result).toContain('الأفضل في اليمن');
      expect(result).toContain('Knowledge (use if relevant)');
      expect(result).toContain('كيف أشترك؟');
      expect(result).toContain('يمكنك الاشتراك من خلال الموقع');
    });

    it('should handle knowledge search errors gracefully', async () => {
      vectorService.searchBotFaqs.mockRejectedValue(
        new Error('Vector search failed'),
      );

      const result = await service['buildSystemPrompt']('test message');

      expect(result).toContain('2024-01-01');
      expect(result).not.toContain('Knowledge (use if relevant)');
    });

    it('should handle empty knowledge results', async () => {
      vectorService.searchBotFaqs.mockResolvedValue([]);

      const result = await service['buildSystemPrompt']('test message');

      expect(result).toContain('2024-01-01');
      expect(result).not.toContain('Knowledge (use if relevant)');
    });

    it('should handle null knowledge results', async () => {
      vectorService.searchBotFaqs.mockResolvedValue(null as any);

      const result = await service['buildSystemPrompt']('test message');

      expect(result).toContain('2024-01-01');
      expect(result).not.toContain('Knowledge (use if relevant)');
    });
  });

  describe('Typing Management', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    describe('startTyping', () => {
      it('should start typing indicator immediately', () => {
        service['startTyping']('session-123');

        expect(eventEmitter.emit).toHaveBeenCalledWith('kleem.typing', {
          sessionId: 'session-123',
          role: 'bot',
        });
      });

      it('should set up interval for typing pulses', () => {
        service['startTyping']('session-123');

        // Fast-forward 1.5 seconds
        jest.advanceTimersByTime(1500);

        expect(eventEmitter.emit).toHaveBeenCalledTimes(2); // Initial + 1 pulse
        expect(eventEmitter.emit).toHaveBeenCalledWith('kleem.typing', {
          sessionId: 'session-123',
          role: 'bot',
        });
      });

      it('should not start multiple intervals for same session', () => {
        service['startTyping']('session-123');
        service['startTyping']('session-123');

        // Should only have one interval
        expect(eventEmitter.emit).toHaveBeenCalledTimes(1);
      });

      it('should handle multiple sessions independently', () => {
        service['startTyping']('session-123');
        service['startTyping']('session-456');

        jest.advanceTimersByTime(1500);

        expect(eventEmitter.emit).toHaveBeenCalledTimes(4); // 2 initial + 2 pulses
      });
    });

    describe('stopTyping', () => {
      it('should stop typing for specific session', () => {
        service['startTyping']('session-123');
        jest.advanceTimersByTime(1500);

        service['stopTyping']('session-123');

        // Should not emit more typing events after stopping
        jest.advanceTimersByTime(1500);
        const callCount = eventEmitter.emit.mock.calls.filter(
          (call) => call[0] === 'kleem.typing',
        ).length;
        expect(callCount).toBe(2); // Only initial + 1 pulse
      });

      it('should handle stopping non-existent session', () => {
        expect(() => service.stopTyping('non-existent')).not.toThrow();
      });

      it('should clean up intervals map', () => {
        service['startTyping']('session-123');
        expect(service['typingIntervals'].has('session-123')).toBe(true);

        service['stopTyping']('session-123');
        expect(service['typingIntervals'].has('session-123')).toBe(false);
      });
    });
  });

  describe('handleUserMessage', () => {
    it('should handle user message successfully', async () => {
      const sessionId = 'session-123';
      const text = 'مرحباً، كيف حالك؟';
      const metadata = { platform: 'web' };

      chatsService.createOrAppend.mockResolvedValue(undefined as any);
      promptsService.getActiveSystemPrompt.mockResolvedValue(mockSystemPrompt);
      settingsService.get.mockResolvedValue(mockSettings as any);

      const result = await service.handleUserMessage(sessionId, text, metadata);

      expect(chatsService.createOrAppend).toHaveBeenCalledWith(sessionId, [
        { role: 'user', text, metadata },
      ]);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'kleem.admin_new_message',
        {
          sessionId,
          message: { role: 'user', text },
        },
      );

      expect(eventEmitter.emit).toHaveBeenCalledWith('kleem.typing', {
        sessionId,
        role: 'bot',
      });

      // Should call N8N
      expect(mockedAxios.create().post).toHaveBeenCalledWith(
        '/webhook/kleem/chat',
        {
          bot: 'كليم',
          sessionId,
          channel: 'web',
          text,
          prompt: expect.stringContaining('2024-01-01'),
          policy: {
            allowCTA: true,
          },
          meta: metadata,
        },
      );

      expect(result).toEqual({ status: 'queued' });
    });

    it('should handle message without metadata', async () => {
      const sessionId = 'session-123';
      const text = 'مرحباً';

      chatsService.createOrAppend.mockResolvedValue(undefined as any);

      await service.handleUserMessage(sessionId, text);

      expect(chatsService.createOrAppend).toHaveBeenCalledWith(sessionId, [
        { role: 'user', text, metadata: {} },
      ]);
    });

    it('should handle N8N errors gracefully', async () => {
      const sessionId = 'session-123';
      const text = 'مرحباً';

      chatsService.createOrAppend.mockResolvedValue(undefined as any);

      // Mock N8N error
      const mockAxiosInstance = mockedAxios.create();
      mockAxiosInstance.post = jest
        .fn()
        .mockRejectedValue(new Error('N8N Error'));

      // Wait for timeout
      jest.useFakeTimers();
      const resultPromise = service.handleUserMessage(sessionId, text);

      // Fast-forward past the timeout
      jest.advanceTimersByTime(1000);

      const result = await resultPromise;

      expect(result).toEqual({ status: 'queued' });
      jest.useRealTimers();
    });

    it('should use correct CTA policy based on intent', async () => {
      const sessionId = 'session-123';
      const text = 'أريد شراء الخدمة';

      intentService.highIntent.mockReturnValue(true);
      ctaService.allow.mockReturnValue(false);

      chatsService.createOrAppend.mockResolvedValue(undefined as any);

      await service.handleUserMessage(sessionId, text);

      expect(ctaService.allow).toHaveBeenCalledWith(sessionId, true);
      expect(mockedAxios.create().post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          policy: {
            allowCTA: false,
          },
        }),
      );
    });

    it('should handle low intent correctly', async () => {
      const sessionId = 'session-123';
      const text = 'مرحباً فقط';

      intentService.highIntent.mockReturnValue(false);
      ctaService.allow.mockReturnValue(true);

      chatsService.createOrAppend.mockResolvedValue(undefined as any);

      await service.handleUserMessage(sessionId, text);

      expect(ctaService.allow).toHaveBeenCalledWith(sessionId, false);
      expect(mockedAxios.create().post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          policy: {
            allowCTA: true,
          },
        }),
      );
    });

    it('should handle chats service errors', async () => {
      const sessionId = 'session-123';
      const text = 'مرحباً';

      chatsService.createOrAppend.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.handleUserMessage(sessionId, text)).rejects.toThrow(
        'Database error',
      );
    });

    it('should handle prompts service errors', async () => {
      const sessionId = 'session-123';
      const text = 'مرحباً';

      promptsService.getActiveSystemPrompt.mockRejectedValue(
        new Error('Prompt service error'),
      );

      await expect(service.handleUserMessage(sessionId, text)).rejects.toThrow(
        'Prompt service error',
      );
    });

    it('should handle settings service errors', async () => {
      const sessionId = 'session-123';
      const text = 'مرحباً';

      settingsService.get.mockRejectedValue(new Error('Settings error'));

      await expect(service.handleUserMessage(sessionId, text)).rejects.toThrow(
        'Settings error',
      );
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete conversation flow', async () => {
      const sessionId = 'session-123';
      const messages = ['مرحباً', 'كيف أشترك؟', 'ما هي الأسعار؟'];

      for (const message of messages) {
        chatsService.createOrAppend.mockResolvedValue(undefined as any);
        await service.handleUserMessage(sessionId, message);
      }

      expect(chatsService.createOrAppend).toHaveBeenCalledTimes(3);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'kleem.admin_new_message',
        expect.objectContaining({
          sessionId,
          message: expect.objectContaining({
            role: 'user',
          }),
        }),
      );
    });

    it('should handle concurrent sessions', async () => {
      const session1 = 'session-1';
      const session2 = 'session-2';

      chatsService.createOrAppend.mockResolvedValue(undefined as any);

      // Start typing for both sessions
      service['startTyping'](session1);
      service['startTyping'](session2);

      // Send messages concurrently
      await Promise.all([
        service.handleUserMessage(session1, 'مرحباً من الجلسة الأولى'),
        service.handleUserMessage(session2, 'مرحباً من الجلسة الثانية'),
      ]);

      expect(chatsService.createOrAppend).toHaveBeenCalledTimes(2);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'kleem.typing',
        expect.objectContaining({ sessionId: session1, role: 'bot' }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'kleem.typing',
        expect.objectContaining({ sessionId: session2, role: 'bot' }),
      );
    });
  });

  describe('Error handling', () => {
    it('should handle all service failures gracefully', async () => {
      const sessionId = 'session-123';
      const text = 'مرحباً';

      chatsService.createOrAppend.mockRejectedValue(new Error('Chats error'));
      promptsService.getActiveSystemPrompt.mockRejectedValue(
        new Error('Prompts error'),
      );
      settingsService.get.mockRejectedValue(new Error('Settings error'));
      intentService.highIntent.mockImplementation(() => {
        throw new Error('Intent error');
      });
      ctaService.allow.mockImplementation(() => {
        throw new Error('CTA error');
      });
      vectorService.searchBotFaqs.mockRejectedValue(new Error('Vector error'));

      await expect(
        service.handleUserMessage(sessionId, text),
      ).rejects.toThrow();
    });

    it('should handle malformed N8N responses', async () => {
      const sessionId = 'session-123';
      const text = 'مرحباً';

      chatsService.createOrAppend.mockResolvedValue(undefined as any);

      // Mock N8N response without data
      const mockAxiosInstance = mockedAxios.create();
      mockAxiosInstance.post = jest.fn().mockResolvedValue({});

      const result = await service.handleUserMessage(sessionId, text);

      expect(result).toEqual({ status: 'queued' });
    });
  });

  describe('Configuration handling', () => {
    it('should use environment variables for N8N configuration', () => {
      process.env.N8N_BASE_URL = 'https://custom-n8n.example.com';
      process.env.N8N_API_URL = 'https://api-n8n.example.com';

      // Recreate service to pick up env changes
      const newService = new KleemChatService(
        chatsService,
        promptsService,
        settingsService,
        intentService,
        ctaService,
        {
          get: jest.fn((key: string) => {
            if (key === 'vars.chat.n8nEndpoint') return '/webhook/kleem/chat';
            if (key === 'vars.chat.botName') return 'كليم';
            if (key === 'vars.chat.defaultChannel') return 'web';
            if (key === 'vars.chat.typing.stopDelayMs') return 1000;
            return undefined;
          }),
        } as any,
        vectorService,
        eventEmitter,
      );

      (newService as any)['n8n'] = mockedAxios.create();
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://custom-n8n.example.com',
        }),
      );
    });

    it('should handle missing configuration gracefully', () => {
      const configService = {
        get: jest.fn().mockReturnValue(undefined),
      };

      expect(() => {
        new KleemChatService(
          chatsService,
          promptsService,
          settingsService,
          intentService,
          ctaService,
          configService as any,
          vectorService,
          eventEmitter,
        );
      }).not.toThrow();
    });
  });

  describe('Memory management', () => {
    it('should clean up typing intervals on service destruction', () => {
      service['startTyping']('session-1');
      service['startTyping']('session-2');

      expect(service['typingIntervals'].size).toBe(2);

      // Simulate service cleanup
      service.stopTyping('session-1');
      service.stopTyping('session-2');

      expect(service['typingIntervals'].size).toBe(0);
    });

    it('should handle rapid start/stop cycles', () => {
      const sessionId = 'rapid-session';

      for (let i = 0; i < 10; i++) {
        service['startTyping'](sessionId);
        service.stopTyping(sessionId);
      }

      expect(service['typingIntervals'].has(sessionId)).toBe(false);
    });
  });

  describe('Event emission', () => {
    it('should emit correct events for message handling', async () => {
      const sessionId = 'test-session';
      const text = 'test message';

      chatsService.createOrAppend.mockResolvedValue(undefined as any);

      await service.handleUserMessage(sessionId, text);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'kleem.admin_new_message',
        {
          sessionId,
          message: { role: 'user', text },
        },
      );

      expect(eventEmitter.emit).toHaveBeenCalledWith('kleem.typing', {
        sessionId,
        role: 'bot',
      });
    });

    it('should emit typing events at correct intervals', () => {
      jest.useFakeTimers();
      const sessionId = 'interval-test';

      service['startTyping'](sessionId);

      // Check initial emission
      expect(eventEmitter.emit).toHaveBeenCalledWith('kleem.typing', {
        sessionId,
        role: 'bot',
      });

      // Fast-forward 1.5 seconds
      jest.advanceTimersByTime(1500);

      expect(eventEmitter.emit).toHaveBeenCalledTimes(2);

      jest.useRealTimers();
    });
  });
});
