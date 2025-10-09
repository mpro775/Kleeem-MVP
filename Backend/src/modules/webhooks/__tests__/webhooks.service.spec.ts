import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';

import { OutboxService } from '../../../common/outbox/outbox.service';
import { ChatGateway } from '../../chat/chat.gateway';
import { EvolutionService } from '../../integrations/evolution.service';
import { ChatMediaService } from '../../media/chat-media.service';
import { MessageService } from '../../messaging/message.service';
import { N8nForwarderService } from '../../n8n-workflow/n8n-forwarder.service';
import { WEBHOOK_REPOSITORY } from '../tokens';
import { WebhooksService } from '../webhooks.service';

import type { ChannelRepository } from '../repositories/channel.repository';
import type { WebhookRepository } from '../repositories/webhook.repository';
import type { TestingModule } from '@nestjs/testing';

describe('WebhooksService', () => {
  let service: WebhooksService;
  let messageService: jest.Mocked<MessageService>;
  let outboxService: jest.Mocked<OutboxService>;
  let webhookRepository: jest.Mocked<WebhookRepository>;
  let _ordersService: jest.Mocked<any>;
  let _n8nForwarderService: jest.Mocked<N8nForwarderService>;
  let chatMediaService: jest.Mocked<ChatMediaService>;
  let _evoService: jest.Mocked<EvolutionService>;
  let configService: jest.Mocked<ConfigService>;
  let chatGateway: jest.Mocked<ChatGateway>;
  let channelRepository: jest.Mocked<ChannelRepository>;
  let _cacheManager: jest.Mocked<any>;
  let _connection: jest.Mocked<any>;

  const mockConnection = {
    startSession: jest.fn().mockReturnValue({
      withTransaction: jest.fn().mockImplementation((fn) => fn()),
      endSession: jest.fn(),
    }),
  };

  beforeEach(async () => {
    const mockMessageService = {
      createOrAppend: jest.fn(),
    };
    const mockOutboxService = {
      enqueueEvent: jest.fn(),
    };
    const mockWebhookRepository = {
      createOne: jest.fn(),
    };
    const mockOrdersService = {
      findOne: jest.fn(),
      findByCustomer: jest.fn(),
    };
    const mockN8nForwarderService = {
      forward: jest.fn(),
    };
    const mockChatMediaService = {
      uploadChatMedia: jest.fn(),
    };
    const mockEvoService = {};
    const mockConfigService = {
      get: jest.fn(),
    };
    const mockChatGateway = {
      sendMessageToSession: jest.fn(),
    };
    const mockChannelRepository = {
      findDefaultWithSecrets: jest.fn(),
    };
    const mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhooksService,
        {
          provide: MessageService,
          useValue: mockMessageService,
        },
        {
          provide: OutboxService,
          useValue: mockOutboxService,
        },
        {
          provide: WEBHOOK_REPOSITORY,
          useValue: mockWebhookRepository,
        },
        {
          provide: 'ChannelRepository',
          useValue: mockChannelRepository,
        },
        {
          provide: getModelToken('Channel'),
          useValue: {},
        },
        {
          provide: 'OrdersService',
          useValue: mockOrdersService,
        },
        {
          provide: N8nForwarderService,
          useValue: mockN8nForwarderService,
        },
        {
          provide: ChatMediaService,
          useValue: mockChatMediaService,
        },
        {
          provide: EvolutionService,
          useValue: mockEvoService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: ChatGateway,
          useValue: mockChatGateway,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
        {
          provide: getModelToken('Connection'),
          useValue: mockConnection,
        },
      ],
    }).compile();

    service = module.get<WebhooksService>(WebhooksService);
    messageService = module.get(MessageService);
    outboxService = module.get(OutboxService);
    webhookRepository = module.get(WEBHOOK_REPOSITORY);
    _ordersService = module.get('OrdersService');
    _n8nForwarderService = module.get(N8nForwarderService);
    chatMediaService = module.get(ChatMediaService);
    configService = module.get(ConfigService);
    chatGateway = module.get(ChatGateway);
    channelRepository = module.get('ChannelRepository');
    _cacheManager = module.get(CACHE_MANAGER);
    _connection = module.get(getModelToken('Connection'));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('verifyWebhookSubscription', () => {
    it('should return bad request for invalid mode', () => {
      const result = service.verifyWebhookSubscription('merchant1', {
        'hub.mode': 'invalid',
        'hub.verify_token': 'token',
        'hub.challenge': 'challenge',
      });

      expect(result).toEqual({
        status: 400,
        body: 'Bad Request',
      });
    });

    it('should return bad request when token is missing', () => {
      const result = service.verifyWebhookSubscription('merchant1', {
        'hub.mode': 'subscribe',
        'hub.challenge': 'challenge',
      });

      expect(result).toEqual({
        status: 400,
        body: 'Bad Request',
      });
    });

    it('should return ok with challenge for valid subscription request', () => {
      const result = service.verifyWebhookSubscription('merchant1', {
        'hub.mode': 'subscribe',
        'hub.verify_token': 'valid_token',
        'hub.challenge': 'test_challenge',
      });

      expect(result).toEqual({
        status: 200,
        body: 'test_challenge',
      });
    });
  });

  describe('verifyMetaSignatureIfPresent', () => {
    let mockVerifyMetaSignature: jest.Mock;

    beforeEach(() => {
      mockVerifyMetaSignature = jest.fn();
      jest.doMock('../utils/signature.util', () => ({
        verifyMetaSignature: mockVerifyMetaSignature,
      }));
    });

    it('should skip verification when no signature header present', async () => {
      const req = { headers: {} } as any;

      await expect(
        service.verifyMetaSignatureIfPresent('merchant1', req),
      ).resolves.toBeUndefined();

      expect(mockVerifyMetaSignature).not.toHaveBeenCalled();
    });

    it('should verify signature when header is present and valid', async () => {
      mockVerifyMetaSignature.mockResolvedValue(true);
      const req = {
        headers: { 'x-hub-signature-256': 'signature' },
      } as any;

      await expect(
        service.verifyMetaSignatureIfPresent('merchant1', req),
      ).resolves.toBeUndefined();

      expect(mockVerifyMetaSignature).toHaveBeenCalledWith(
        'merchant1',
        req,
        channelRepository,
      );
    });

    it('should throw ForbiddenException when signature is invalid', async () => {
      mockVerifyMetaSignature.mockResolvedValue(false);
      const req = {
        headers: { 'x-hub-signature-256': 'invalid_signature' },
      } as any;

      await expect(
        service.verifyMetaSignatureIfPresent('merchant1', req),
      ).rejects.toThrow('Invalid signature');
    });
  });

  describe('processIncoming', () => {
    let mockNormalizeIncomingMessage: jest.Mock;
    let mockDetectOrderIntent: jest.Mock;

    beforeEach(() => {
      mockNormalizeIncomingMessage = jest.fn();
      mockDetectOrderIntent = jest.fn();
      jest.doMock('../utils/normalize-incoming', () => ({
        normalizeIncomingMessage: mockNormalizeIncomingMessage,
      }));
      jest.doMock('../utils/intents', () => ({
        detectOrderIntent: mockDetectOrderIntent,
      }));
    });

    it('should process normal incoming message without media', async () => {
      const normalizedMessage = {
        merchantId: 'merchant1',
        sessionId: 'session1',
        text: 'Hello',
        channel: 'webchat',
        role: 'customer' as const,
        timestamp: new Date(),
        metadata: {},
      };

      mockNormalizeIncomingMessage.mockReturnValue(normalizedMessage);
      mockDetectOrderIntent.mockReturnValue({ step: 'normal' });

      messageService.createOrAppend.mockResolvedValue({
        _id: 'session123' as any,
        merchantId: 'merchant1' as any,
        sessionId: 'session1',
        channel: 'webchat',
        handoverToAgent: false,
        messages: [
          {
            role: 'bot' as const,
            text: 'Hello',
            timestamp: new Date(),
            _id: '123' as any,
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      configService.get.mockReturnValue('false'); // N8N_DIRECT_CALL_FALLBACK

      const result = await service.processIncoming(
        'merchant1',
        { text: 'Hello' },
        { headers: {} } as any,
      );

      expect(result).toEqual({
        sessionId: 'session1',
        action: 'ask_ai',
        handoverToAgent: false,
        role: 'customer',
      });
    });

    it('should handle incoming message with media file', async () => {
      const normalizedMessage = {
        merchantId: 'merchant1',
        sessionId: 'session1',
        text: 'File uploaded',
        channel: 'telegram',
        role: 'customer' as const,
        timestamp: new Date(),
        fileId: 'file123',
        fileName: 'test.jpg',
        mimeType: 'image/jpeg',
        metadata: { sourceMessageId: 'msg123' },
      };

      mockNormalizeIncomingMessage.mockReturnValue(normalizedMessage);

      // Mock media download and upload
      const mockDownloadTelegramFile = jest.fn().mockResolvedValue({
        tmpPath: '/tmp/file.jpg',
        originalName: 'test.jpg',
      });
      jest.doMock('../utils/download-files', () => ({
        downloadTelegramFile: mockDownloadTelegramFile,
      }));

      chatMediaService.uploadChatMedia.mockResolvedValue({
        url: 'https://cdn.example.com/file.jpg',
        storageKey: 'file123',
      });

      const result = await service.processIncoming(
        'merchant1',
        { fileId: 'file123' },
        { headers: {} } as any,
      );

      expect(result).toEqual({
        status: 'ok',
        sessionId: 'session1',
      });
      expect(chatMediaService.uploadChatMedia).toHaveBeenCalled();
      expect(chatGateway.sendMessageToSession).toHaveBeenCalled();
    });

    it('should throw BadRequestException for missing required fields', async () => {
      const normalizedMessage = {
        merchantId: 'merchant1',
        sessionId: '',
        text: '',
        channel: '',
      };

      mockNormalizeIncomingMessage.mockReturnValue(normalizedMessage);

      await expect(
        service.processIncoming('merchant1', {}, { headers: {} } as any),
      ).rejects.toThrow('Payload missing required fields');
    });
  });

  describe('handleBotReply', () => {
    beforeEach(() => {
      process.env.DIRECT_SEND_FALLBACK = 'false';
    });

    it('should handle bot reply successfully', async () => {
      const dto = {
        merchantId: 'merchant1',
        sessionId: 'session1',
        text: 'Hello from bot',
        channel: 'webchat' as const,
        metadata: { test: true },
      };

      const result = await service.handleBotReply(dto);

      expect(result).toEqual({
        sessionId: 'session1',
        status: 'ok',
      });

      expect(messageService.createOrAppend).toHaveBeenCalledWith({
        merchantId: 'merchant1',
        sessionId: 'session1',
        channel: 'webchat',
        messages: [
          {
            role: 'bot',
            text: 'Hello from bot',
            timestamp: expect.any(Date),
            metadata: { test: true },
          },
        ],
      });

      expect(outboxService.enqueueEvent).toHaveBeenCalledWith({
        aggregateType: 'conversation',
        aggregateId: 'session1',
        eventType: 'chat.reply',
        payload: {
          merchantId: 'merchant1',
          sessionId: 'session1',
          channel: 'webchat',
          text: 'Hello from bot',
          metadata: { test: true },
        },
        exchange: 'chat.reply',
        routingKey: 'webchat',
      });
    });

    it('should throw BadRequestException for missing required fields', async () => {
      const dto = {
        merchantId: '',
        sessionId: '',
        text: '',
        channel: 'webchat' as const,
      };

      await expect(service.handleBotReply(dto)).rejects.toThrow(
        'Payload missing required fields',
      );
    });
  });

  describe('handleTestBotReply', () => {
    it('should handle test bot reply successfully', async () => {
      const dto = {
        merchantId: 'merchant1',
        sessionId: 'session1',
        text: 'Test reply',
        metadata: { testFlag: true },
      };

      const result = await service.handleTestBotReply(dto);

      expect(result).toEqual({
        sessionId: 'session1',
        status: 'ok',
        test: true,
      });

      expect(messageService.createOrAppend).toHaveBeenCalledWith({
        merchantId: 'merchant1',
        sessionId: 'session1',
        channel: 'dashboard-test',
        messages: [
          {
            role: 'bot',
            text: 'Test reply',
            timestamp: expect.any(Date),
            metadata: { testFlag: true, test: true },
          },
        ],
      });

      expect(chatGateway.sendMessageToSession).toHaveBeenCalledWith(
        'session1',
        {
          id: '',
          role: 'bot',
          text: 'Test reply',
        },
      );
    });

    it('should throw BadRequestException for missing required fields', async () => {
      const dto = {
        merchantId: '',
        sessionId: '',
        text: '',
      };

      await expect(service.handleTestBotReply(dto)).rejects.toThrow(
        'Payload missing required fields',
      );
    });
  });

  describe('handleAgentReply', () => {
    beforeEach(() => {
      process.env.DIRECT_SEND_FALLBACK = 'false';
    });

    it('should handle agent reply successfully', async () => {
      const dto = {
        merchantId: 'merchant1',
        sessionId: 'session1',
        text: 'Hello from agent',
        channel: 'webchat' as const,
        agentId: 'agent123',
        metadata: { priority: 'high' },
      };

      const result = await service.handleAgentReply(dto);

      expect(result).toEqual({
        sessionId: 'session1',
      });

      expect(messageService.createOrAppend).toHaveBeenCalledWith({
        merchantId: 'merchant1',
        sessionId: 'session1',
        channel: 'webchat',
        messages: [
          {
            role: 'agent',
            text: 'Hello from agent',
            timestamp: expect.any(Date),
            metadata: { priority: 'high', agentId: 'agent123' },
          },
        ],
      });

      expect(chatGateway.sendMessageToSession).toHaveBeenCalledWith(
        'session1',
        {
          id: '',
          role: 'agent',
          text: 'Hello from agent',
          merchantId: 'merchant1',
        },
      );
    });

    it('should throw BadRequestException for missing required fields', async () => {
      const dto = {
        merchantId: '',
        sessionId: '',
        text: '',
        channel: 'webchat' as const,
      };

      await expect(service.handleAgentReply(dto)).rejects.toThrow(
        'Payload missing required fields',
      );
    });
  });

  describe('handleEvent', () => {
    it('should handle event successfully', async () => {
      const payload = {
        merchantId: 'merchant1',
        from: 'session1',
        messageText: 'Hello',
        metadata: { source: 'api' },
      };

      const result = await service.handleEvent('test_incoming', payload);

      expect(result).toEqual({
        sessionId: 'session1',
        status: 'accepted',
      });

      expect(webhookRepository.createOne).toHaveBeenCalledWith(
        {
          eventType: 'test_incoming',
          payload: JSON.stringify(payload),
          receivedAt: expect.any(Date),
        },
        { session: expect.any(Object) },
      );

      expect(messageService.createOrAppend).toHaveBeenCalledWith(
        {
          merchantId: 'merchant1',
          sessionId: 'session1',
          channel: 'test',
          messages: [
            {
              role: 'customer',
              text: 'Hello',
              metadata: { source: 'api' },
            },
          ],
        },
        expect.any(Object),
      );
    });

    it('should throw BadRequestException for invalid payload', async () => {
      const payload = {
        merchantId: '',
        from: '',
        messageText: '',
      };

      await expect(
        service.handleEvent('test_incoming', payload),
      ).rejects.toThrow('Invalid payload');
    });
  });
});
