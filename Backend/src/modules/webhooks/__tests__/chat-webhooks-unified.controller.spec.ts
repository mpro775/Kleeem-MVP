import { Test } from '@nestjs/testing';

import { SlugResolverService } from '../../public/slug-resolver.service';
import { ChatWebhooksUnifiedController } from '../chat-webhooks-unified.controller';
import { WebhooksController } from '../webhooks.controller';

import type { TestingModule } from '@nestjs/testing';

describe('ChatWebhooksUnifiedController', () => {
  let controller: ChatWebhooksUnifiedController;
  let slugResolver: jest.Mocked<SlugResolverService>;
  let webhooksController: jest.Mocked<WebhooksController>;

  beforeEach(async () => {
    const mockSlugResolver = {
      resolve: jest.fn(),
    };
    const mockWebhooksController = {
      handleIncoming: jest.fn(),
      handleBotReply: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatWebhooksUnifiedController],
      providers: [
        {
          provide: SlugResolverService,
          useValue: mockSlugResolver,
        },
        {
          provide: WebhooksController,
          useValue: mockWebhooksController,
        },
      ],
    }).compile();

    controller = module.get<ChatWebhooksUnifiedController>(
      ChatWebhooksUnifiedController,
    );
    slugResolver = module.get(SlugResolverService);
    webhooksController = module.get(WebhooksController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('incomingBySlug', () => {
    it('should handle incoming message with valid slug', async () => {
      const mockSlugResolve = {
        merchantId: 'merchant123',
        webchatChannelId: undefined,
      };
      slugResolver.resolve.mockResolvedValue(mockSlugResolve);

      const body = {
        sessionId: 'session123',
        text: 'Hello from webchat',
        user: { id: 'user1', name: 'John Doe' },
        embedMode: 'bubble',
        payload: { customData: 'test' },
      };

      const req = { headers: {} } as any;

      webhooksController.handleIncoming.mockResolvedValue({ ok: true });

      await controller.incomingBySlug('test-slug', body, req);

      expect(slugResolver.resolve).toHaveBeenCalledWith('test-slug');
      expect(webhooksController.handleIncoming).toHaveBeenCalledWith(
        'merchant123',
        {
          merchantId: 'merchant123',
          channel: 'webchat',
          provider: 'webchat',
          channelId: 'slug:test-slug',
          sessionId: 'session123',
          user: { id: 'user1', name: 'John Doe' },
          text: 'Hello from webchat',
          payload: { customData: 'test' },
          raw: body,
          metadata: {
            embedMode: 'bubble',
            source: 'slug-endpoint',
          },
        },
        req,
      );
    });

    it('should handle incoming message with string channel override', async () => {
      const mockSlugResolve = {
        merchantId: 'merchant123',
        webchatChannelId: undefined,
      };
      slugResolver.resolve.mockResolvedValue(mockSlugResolve);

      const body = {
        sessionId: 'session123',
        text: 'Hello',
        channel: 'custom_channel',
        user: { id: 'user1' },
      };

      const req = { headers: {} } as any;

      webhooksController.handleIncoming.mockResolvedValue({ ok: true });

      await controller.incomingBySlug('test-slug', body, req);

      expect(webhooksController.handleIncoming).toHaveBeenCalledWith(
        'merchant123',
        {
          merchantId: 'merchant123',
          channel: 'custom_channel',
          provider: 'webchat',
          channelId: 'slug:test-slug',
          sessionId: 'session123',
          user: { id: 'user1' },
          text: 'Hello',
          payload: undefined,
          raw: body,
          metadata: {
            embedMode: 'bubble',
            source: 'slug-endpoint',
          },
        },
        req,
      );
    });

    it('should handle incoming message with undefined sessionId and text', async () => {
      const mockSlugResolve = {
        merchantId: 'merchant123',
        webchatChannelId: undefined,
      };
      slugResolver.resolve.mockResolvedValue(mockSlugResolve);

      const body = {
        user: { id: 'user1', name: 'John' },
        embedMode: 'iframe',
      };

      const req = { headers: {} } as any;

      webhooksController.handleIncoming.mockResolvedValue({ ok: true });

      await controller.incomingBySlug('test-slug', body, req);

      expect(webhooksController.handleIncoming).toHaveBeenCalledWith(
        'merchant123',
        {
          merchantId: 'merchant123',
          channel: 'webchat',
          provider: 'webchat',
          channelId: 'slug:test-slug',
          sessionId: undefined,
          user: { id: 'user1', name: 'John' },
          text: undefined,
          payload: undefined,
          raw: body,
          metadata: {
            embedMode: 'iframe',
            source: 'slug-endpoint',
          },
        },
        req,
      );
    });

    it('should handle incoming message with undefined embedMode', async () => {
      const mockSlugResolve = {
        merchantId: 'merchant123',
        webchatChannelId: undefined,
      };
      slugResolver.resolve.mockResolvedValue(mockSlugResolve);

      const body = {
        sessionId: 'session123',
        text: 'Hello',
        user: { id: 'user1' },
      };

      const req = { headers: {} } as any;

      webhooksController.handleIncoming.mockResolvedValue({ ok: true });

      await controller.incomingBySlug('test-slug', body, req);

      expect(webhooksController.handleIncoming).toHaveBeenCalledWith(
        'merchant123',
        expect.objectContaining({
          metadata: {
            embedMode: 'bubble', // default value
            source: 'slug-endpoint',
          },
        }),
        req,
      );
    });
  });

  describe('replyBySlug', () => {
    it('should handle bot reply via slug', async () => {
      const mockSlugResolve = {
        merchantId: 'merchant456',
        webchatChannelId: undefined,
      };
      slugResolver.resolve.mockResolvedValue(mockSlugResolve);

      const body = {
        sessionId: 'session456',
        text: 'مرحبا بك في متجرنا',
        metadata: { embedMode: 'conversational' },
      };

      webhooksController.handleBotReply.mockResolvedValue({
        sessionId: 'session456',
        status: 'ok',
      });

      await controller.replyBySlug('store-slug', body);

      expect(slugResolver.resolve).toHaveBeenCalledWith('store-slug');
      expect(webhooksController.handleBotReply).toHaveBeenCalledWith(
        'merchant456',
        {
          sessionId: 'session456',
          text: 'مرحبا بك في متجرنا',
          channel: 'webchat',
          metadata: { embedMode: 'conversational', via: 'slug-endpoint' },
        },
      );
    });

    it('should handle reply with minimal body', async () => {
      const mockSlugResolve = {
        merchantId: 'merchant789',
        webchatChannelId: undefined,
      };
      slugResolver.resolve.mockResolvedValue(mockSlugResolve);

      const body = {
        sessionId: 'session789',
        text: 'Thank you',
      };

      webhooksController.handleBotReply.mockResolvedValue({
        sessionId: 'session789',
        status: 'ok',
      });

      await controller.replyBySlug('another-slug', body);

      expect(webhooksController.handleBotReply).toHaveBeenCalledWith(
        'merchant789',
        {
          sessionId: 'session789',
          text: 'Thank you',
          channel: 'webchat',
          metadata: { via: 'slug-endpoint' },
        },
      );
    });

    it('should handle reply with undefined metadata', async () => {
      const mockSlugResolve = {
        merchantId: 'merchant999',
        webchatChannelId: undefined,
      };
      slugResolver.resolve.mockResolvedValue(mockSlugResolve);

      const body = {
        sessionId: 'session999',
        text: 'Hello',
        // no metadata
      };

      webhooksController.handleBotReply.mockResolvedValue({
        sessionId: 'session999',
        status: 'ok',
      });

      await controller.replyBySlug('no-meta-slug', body);

      expect(webhooksController.handleBotReply).toHaveBeenCalledWith(
        'merchant999',
        {
          sessionId: 'session999',
          text: 'Hello',
          channel: 'webchat',
          metadata: { via: 'slug-endpoint' },
        },
      );
    });
  });

  describe('ping', () => {
    it('should return ok true when slug resolves successfully', async () => {
      const mockSlugResolve = {
        merchantId: 'merchant123',
        webchatChannelId: undefined,
      };
      slugResolver.resolve.mockResolvedValue(mockSlugResolve);

      const result = await controller.ping('valid-slug');

      expect(result).toEqual({ ok: true });
      expect(slugResolver.resolve).toHaveBeenCalledWith('valid-slug');
    });

    it('should still return ok true even if slug resolver throws (ping just validates)', async () => {
      slugResolver.resolve.mockRejectedValue(new Error('Slug not found'));

      const result = await controller.ping('invalid-slug');

      expect(result).toEqual({ ok: true });
      expect(slugResolver.resolve).toHaveBeenCalledWith('invalid-slug');
    });
  });
});
