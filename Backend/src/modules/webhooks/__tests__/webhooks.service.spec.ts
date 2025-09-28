import { HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { mockDeep } from 'jest-mock-extended';

import { OutboxService } from '../../../common/outbox/outbox.service';
import { ChatGateway } from '../../chat/chat.gateway';
import { EvolutionService } from '../../integrations/evolution.service';
import { ChatMediaService } from '../../media/chat-media.service';
import { MessageService } from '../../messaging/message.service';
import { OrdersService } from '../../orders/orders.service';
import { WebhooksService } from '../webhooks.service';

describe('WebhooksService', () => {
  let service: WebhooksService;
  let messageService: jest.Mocked<MessageService>;
  let chatMediaService: jest.Mocked<ChatMediaService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhooksService,
        {
          provide: MessageService,
          useValue: mockDeep<MessageService>(),
        },
        {
          provide: OutboxService,
          useValue: mockDeep<OutboxService>(),
        },
        {
          provide: OrdersService,
          useValue: mockDeep<OrdersService>(),
        },
        {
          provide: ChatMediaService,
          useValue: mockDeep<ChatMediaService>(),
        },
        {
          provide: EvolutionService,
          useValue: mockDeep<EvolutionService>(),
        },
        {
          provide: ConfigService,
          useValue: mockDeep<ConfigService>(),
        },
        {
          provide: ChatGateway,
          useValue: mockDeep<ChatGateway>(),
        },
        {
          provide: 'WEBHOOK_REPOSITORY',
          useValue: mockDeep(),
        },
        {
          provide: 'ChannelsRepository',
          useValue: mockDeep(),
        },
        {
          provide: 'CACHE_MANAGER',
          useValue: mockDeep(),
        },
        {
          provide: 'Connection',
          useValue: mockDeep(),
        },
      ],
    }).compile();

    service = module.get<WebhooksService>(WebhooksService);
    messageService = module.get(MessageService);
    chatMediaService = module.get(ChatMediaService);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('verifyWebhookSubscription', () => {
    it('should verify webhook subscription with valid parameters', () => {
      const merchantId = 'merchant123';
      const query = {
        'hub.mode': 'subscribe',
        'hub.verify_token': 'valid_token',
        'hub.challenge': 'challenge_string',
      };

      configService.get.mockReturnValue('valid_token');

      const result = service.verifyWebhookSubscription(merchantId, query);

      expect(result.status).toBe(HttpStatus.OK);
      expect(result.body).toBe('challenge_string');
    });

    it('should reject webhook subscription with invalid mode', () => {
      const merchantId = 'merchant123';
      const query = {
        'hub.mode': 'invalid_mode',
        'hub.verify_token': 'valid_token',
        'hub.challenge': 'challenge_string',
      };

      const result = service.verifyWebhookSubscription(merchantId, query);

      expect(result.status).toBe(HttpStatus.FORBIDDEN);
      expect(result.body).toBe('Forbidden');
    });

    it('should reject webhook subscription with invalid token', () => {
      const merchantId = 'merchant123';
      const query = {
        'hub.mode': 'subscribe',
        'hub.verify_token': 'invalid_token',
        'hub.challenge': 'challenge_string',
      };

      configService.get.mockReturnValue('valid_token');

      const result = service.verifyWebhookSubscription(merchantId, query);

      expect(result.status).toBe(HttpStatus.FORBIDDEN);
      expect(result.body).toBe('Forbidden');
    });

    it('should reject webhook subscription with missing challenge', () => {
      const merchantId = 'merchant123';
      const query = {
        'hub.mode': 'subscribe',
        'hub.verify_token': 'valid_token',
        'hub.challenge': '',
      };

      configService.get.mockReturnValue('valid_token');

      const result = service.verifyWebhookSubscription(merchantId, query);

      expect(result.status).toBe(HttpStatus.FORBIDDEN);
      expect(result.body).toBe('Forbidden');
    });
  });

  describe('handleWebhook', () => {
    it('should handle webhook with valid signature', async () => {
      const merchantId = 'merchant123';
      const payload = {
        object: 'page',
        entry: [
          {
            id: 'page_id',
            messaging: [
              {
                sender: { id: 'user123' },
                recipient: { id: 'page_id' },
                message: {
                  text: 'Hello',
                  mid: 'message_id',
                },
                timestamp: Date.now(),
              },
            ],
          },
        ],
      };

      const mockRequest = {
        body: payload,
        headers: {
          'x-hub-signature-256': 'sha256=valid_signature',
        },
      } as any;

      // Mock the verification and processing
      jest.spyOn(service as any, 'verifyMetaSignature').mockReturnValue(true);
      jest.spyOn(service as any, 'processWebhookEntry').mockResolvedValue({
        success: true,
        processed: 1,
      });

      const result = await service.processIncoming(
        merchantId,
        mockRequest.body,
        mockRequest,
      );

      expect((result as any).success).toBe(true);
    });

    it('should reject webhook with invalid signature', async () => {
      const merchantId = 'merchant123';
      const payload = { test: 'data' };

      const mockRequest = {
        body: payload,
        headers: {
          'x-hub-signature-256': 'sha256=invalid_signature',
        },
      } as any;

      jest.spyOn(service as any, 'verifyMetaSignature').mockReturnValue(false);

      const result = await service.processIncoming(
        merchantId,
        mockRequest.body,
        mockRequest,
      );

      expect((result as any).success).toBe(false);
      expect((result as any).error).toContain('Invalid signature');
    });

    it('should handle webhook with empty payload', async () => {
      const merchantId = 'merchant123';
      const payload = {};

      const mockRequest = {
        body: payload,
        headers: {
          'x-hub-signature-256': 'sha256=valid_signature',
        },
      } as any;

      jest.spyOn(service as any, 'verifyMetaSignature').mockReturnValue(true);

      const result = await service.processIncoming(
        merchantId,
        mockRequest.body,
        mockRequest,
      );

      expect((result as any).success).toBe(true);
      expect((result as any).processed).toBe(0);
    });
  });

  describe('processIncomingMessage', () => {
    it('should process text message successfully', async () => {
      const merchantId = 'merchant123';
      const channelId = 'channel123';
      const message = {
        id: 'msg123',
        text: 'Hello, I need help',
        from: 'user123',
        timestamp: Date.now(),
        type: 'text',
      };

      const mockChannel = {
        id: channelId,
        merchantId,
        isBotEnabled: true,
        botConfig: {
          welcomeMessage: 'Welcome!',
          fallbackMessage: 'Sorry, I did not understand.',
        },
      };

      jest
        .spyOn(service as any, 'getChannelById')
        .mockResolvedValue(mockChannel);
      jest.spyOn(service as any, 'isBotEnabled').mockReturnValue(true);
      jest.spyOn(service as any, 'normalizeIncomingMessage').mockReturnValue({
        ...message,
        normalizedText: message.text,
      });

      messageService.createOrAppend.mockResolvedValue({
        sessionId: 'session123',
        message: { id: 'msg123', text: message.text },
      } as any);

      const result = await service.processIncoming(
        merchantId,
        channelId,
        message as any,
      );

      expect((result as any).success).toBe(true);
      expect(
        messageService.createOrAppend.bind(messageService),
      ).toHaveBeenCalledWith({
        sessionId: 'session123',
        message: { id: 'msg123', text: message.text },
      });
    });

    it('should handle message when bot is disabled', async () => {
      const merchantId = 'merchant123';
      const channelId = 'channel123';
      const message = {
        id: 'msg123',
        text: 'Hello',
        from: 'user123',
        timestamp: Date.now(),
        type: 'text',
      };

      const mockChannel = {
        id: channelId,
        merchantId,
        isBotEnabled: false,
      };

      jest
        .spyOn(service as any, 'getChannelById')
        .mockResolvedValue(mockChannel);
      jest.spyOn(service as any, 'isBotEnabled').mockReturnValue(false);

      const result = (await service.processIncoming(
        merchantId,
        channelId,
        message as any,
      )) as any;

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(true);
      expect(result.reason).toContain('Bot disabled');
    });

    it('should handle media message', async () => {
      const merchantId = 'merchant123';
      const channelId = 'channel123';
      const message = {
        id: 'msg123',
        type: 'image',
        media: {
          url: 'https://example.com/image.jpg',
          mimeType: 'image/jpeg',
        },
        from: 'user123',
        timestamp: Date.now(),
      };

      const mockChannel = {
        id: channelId,
        merchantId,
        isBotEnabled: true,
      };

      jest
        .spyOn(service as any, 'getChannelById')
        .mockResolvedValue(mockChannel);
      jest.spyOn(service as any, 'isBotEnabled').mockReturnValue(true);
      jest.spyOn(service as any, 'normalizeIncomingMessage').mockReturnValue({
        ...message,
        normalizedText: '[صورة]',
      });

      chatMediaService.uploadChatMedia.mockResolvedValue({
        id: 'media123',
        url: 'https://processed-image.jpg',
        text: 'Extracted text from image',
      } as any);

      messageService.createOrAppend.mockResolvedValue({
        sessionId: 'session123',
        message: { id: 'msg123' },
      } as any);

      const result = await service.processIncoming(
        merchantId,
        channelId,
        message as any,
      );

      expect((result as any).success).toBe(true);
      expect(
        chatMediaService.uploadChatMedia.bind(chatMediaService),
      ).toHaveBeenCalled();
    });
  });

  describe('detectOrderIntent', () => {
    it('should detect order intent in message', () => {
      const message = 'I want to order product X';
      const mockOrderIntent = {
        hasOrderIntent: true,
        confidence: 0.8,
        products: ['product X'],
      };

      jest
        .spyOn(service as any, 'detectOrderIntent')
        .mockReturnValue(mockOrderIntent);

      const result = (service as any).detectOrderIntent(message as any);

      expect(result.hasOrderIntent).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should not detect order intent in casual message', () => {
      const message = 'Hello, how are you?';
      const mockOrderIntent = {
        hasOrderIntent: false,
        confidence: 0.1,
        products: [],
      };

      jest
        .spyOn(service as any, 'detectOrderIntent')
        .mockReturnValue(mockOrderIntent);

      const result = (service as any).detectOrderIntent(message as any);

      expect(result.hasOrderIntent).toBe(false);
      expect(result.confidence).toBeLessThan(0.5);
    });
  });
});
