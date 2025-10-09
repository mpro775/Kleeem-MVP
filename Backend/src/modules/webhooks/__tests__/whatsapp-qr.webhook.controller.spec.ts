import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';

import { Channel, ChannelStatus } from '../../channels/schemas/channel.schema';
import { WebhooksController } from '../webhooks.controller';
import { WhatsappQrWebhookController } from '../whatsapp-qr.webhook.controller';

import type { TestingModule } from '@nestjs/testing';

describe('WhatsappQrWebhookController', () => {
  let controller: WhatsappQrWebhookController;
  let channelModel: jest.Mocked<any>;
  let webhooksController: jest.Mocked<WebhooksController>;
  let cacheManager: jest.Mocked<any>;

  beforeEach(async () => {
    const mockChannelModel = {
      findById: jest.fn(),
      save: jest.fn(),
    };
    const mockWebhooksController = {
      handleIncoming: jest.fn(),
    };
    const mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WhatsappQrWebhookController],
      providers: [
        {
          provide: getModelToken(Channel.name),
          useValue: mockChannelModel,
        },
        {
          provide: WebhooksController,
          useValue: mockWebhooksController,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    controller = module.get<WhatsappQrWebhookController>(
      WhatsappQrWebhookController,
    );
    channelModel = module.get(getModelToken(Channel.name));
    webhooksController = module.get(WebhooksController);
    cacheManager = module.get(CACHE_MANAGER);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('incoming', () => {
    it('should handle incoming message successfully', async () => {
      const channelId = 'channel123';
      const req = {
        merchantId: 'merchant123',
        channel: { id: channelId },
      } as any;
      const body = {
        messages: [{ id: 'msg123', key: { id: 'msg123' } }],
      };

      // Mock idempotency check - message not seen before
      const mockPreventDuplicates = jest.fn().mockResolvedValue(false);
      jest.doMock('../../../common/utils/idempotency.util', () => ({
        preventDuplicates: mockPreventDuplicates,
      }));

      webhooksController.handleIncoming.mockResolvedValue({ ok: true });

      await controller.incoming(channelId, req, body);

      expect(mockPreventDuplicates).toHaveBeenCalledWith(
        cacheManager,
        expect.stringContaining('whatsapp_qr'),
      );
      expect(webhooksController.handleIncoming).toHaveBeenCalledWith(
        'merchant123',
        {
          provider: 'whatsapp_qr',
          channelId: 'channel123',
          event: undefined,
          ...body,
        },
        req,
      );
    });

    it('should skip duplicate messages', async () => {
      const channelId = 'channel123';
      const req = {
        merchantId: 'merchant123',
        channel: { id: channelId },
      } as any;
      const body = {
        messages: [{ id: 'msg123', key: { id: 'msg123' } }],
      };

      // Mock idempotency check - message already seen
      const mockPreventDuplicates = jest.fn().mockResolvedValue(true);
      jest.doMock('../../../common/utils/idempotency.util', () => ({
        preventDuplicates: mockPreventDuplicates,
      }));

      await controller.incoming(channelId, req, body);

      expect(mockPreventDuplicates).toHaveBeenCalledWith(
        cacheManager,
        expect.stringContaining('whatsapp_qr'),
      );
      expect(webhooksController.handleIncoming).not.toHaveBeenCalled();
    });
  });

  describe('incomingEvent', () => {
    it('should handle incoming event successfully', async () => {
      const channelId = 'channel123';
      const req = {
        merchantId: 'merchant456',
        channel: { id: channelId },
      } as any;
      const body = {
        event: { type: 'status_update' },
      };

      // Mock idempotency check
      const mockPreventDuplicates = jest.fn().mockResolvedValue(false);
      jest.doMock('../../../common/utils/idempotency.util', () => ({
        preventDuplicates: mockPreventDuplicates,
      }));

      webhooksController.handleIncoming.mockResolvedValue({ ok: true });

      await controller.incomingEvent(channelId, req, body);

      expect(webhooksController.handleIncoming).toHaveBeenCalledWith(
        'merchant456',
        {
          provider: 'whatsapp_qr',
          channelId: 'channel123',
          event: body.event,
        },
        req,
      );
    });
  });

  describe('incomingAny', () => {
    it('should handle incoming message with custom event type', async () => {
      const channelId = 'channel123';
      const evt = 'custom_event';
      const req = {
        merchantId: 'merchant789',
        channel: { id: channelId },
      } as any;
      const body = {
        data: { messages: [] },
      };

      // Mock idempotency check
      const mockPreventDuplicates = jest.fn().mockResolvedValue(false);
      jest.doMock('../../../common/utils/idempotency.util', () => ({
        preventDuplicates: mockPreventDuplicates,
      }));

      webhooksController.handleIncoming.mockResolvedValue({ ok: true });

      await controller.incomingAny(channelId, evt, req, body);

      expect(webhooksController.handleIncoming).toHaveBeenCalledWith(
        'merchant789',
        {
          provider: 'whatsapp_qr',
          channelId: 'channel123',
          event: 'custom_event',
          ...body,
        },
        req,
      );
    });
  });

  describe('handleAny', () => {
    beforeEach(() => {
      // Mock the private method calls
      jest
        .spyOn(controller as any, 'extractEvoState')
        .mockReturnValue('connected');
      jest
        .spyOn(controller as any, 'updateChannelStatus')
        .mockResolvedValue(undefined);
      jest
        .spyOn(controller as any, 'getEffectiveBody')
        .mockReturnValue({ messages: [] });
      jest
        .spyOn(controller as any, 'checkMessageIdempotency')
        .mockResolvedValue(false);
    });

    it('should process message when merchantId is resolved', async () => {
      const channelId = 'channel123';
      const req = {
        merchantId: 'merchant123',
        channel: { id: channelId },
      } as any;
      const body = { messages: [] };
      const evt = 'message';

      webhooksController.handleIncoming.mockResolvedValue({ ok: true });

      await (controller as any).handleAny(channelId, req, body, evt);

      expect((controller as any).extractEvoState).toHaveBeenCalledWith(body);
      expect((controller as any).updateChannelStatus).toHaveBeenCalledWith(
        channelId,
        'connected',
      );
      expect((controller as any).getEffectiveBody).toHaveBeenCalledWith(body);
      expect(webhooksController.handleIncoming).toHaveBeenCalled();
    });

    it('should throw NotFoundException when merchantId is not resolved', async () => {
      const channelId = 'channel123';
      const req = {
        merchantId: '',
        channel: { id: channelId },
      } as any;
      const body = { messages: [] };

      await expect(
        (controller as any).handleAny(channelId, req, body),
      ).rejects.toThrow('Merchant not resolved');
    });

    it('should skip processing when message is duplicate', async () => {
      const channelId = 'channel123';
      const req = {
        merchantId: 'merchant123',
        channel: { id: channelId },
      } as any;
      const body = { messages: [] };

      jest
        .spyOn(controller as any, 'checkMessageIdempotency')
        .mockResolvedValue(true);

      await (controller as any).handleAny(channelId, req, body);

      expect(webhooksController.handleIncoming).not.toHaveBeenCalled();
    });
  });

  describe('extractEvoState', () => {
    it('should extract state from status field', () => {
      const body = { status: 'connected' };
      const result = (controller as any).extractEvoState(body);
      expect(result).toBe('connected');
    });

    it('should extract state from instance.status field', () => {
      const body = { instance: { status: 'connecting' } };
      const result = (controller as any).extractEvoState(body);
      expect(result).toBe('connecting');
    });

    it('should extract state from connection field', () => {
      const body = { connection: 'open' };
      const result = (controller as any).extractEvoState(body);
      expect(result).toBe('open');
    });

    it('should extract state from event.status field', () => {
      const body = { event: { status: 'disconnected' } };
      const result = (controller as any).extractEvoState(body);
      expect(result).toBe('disconnected');
    });

    it('should return undefined when no state found', () => {
      const body = { otherField: 'value' };
      const result = (controller as any).extractEvoState(body);
      expect(result).toBeUndefined();
    });
  });

  describe('updateChannelStatus', () => {
    it('should update channel status when evoState is provided and channel exists', async () => {
      const mockChannel = {
        status: ChannelStatus.DISCONNECTED,
        qr: 'old_qr',
        save: jest.fn(),
      };
      channelModel.findById.mockResolvedValue(mockChannel);

      const mockMapEvoStatus = jest
        .fn()
        .mockReturnValue(ChannelStatus.CONNECTED);
      jest.doMock('../../channels/utils/evo-status.util', () => ({
        mapEvoStatus: mockMapEvoStatus,
      }));

      await (controller as any).updateChannelStatus('channel123', 'connected');

      expect(channelModel.findById).toHaveBeenCalledWith('channel123');
      expect(mockMapEvoStatus).toHaveBeenCalledWith({ connected: true });
      expect(mockChannel.status).toBe(ChannelStatus.CONNECTED);
      expect(mockChannel.qr).toBe('');
      expect(mockChannel.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when channel not found', async () => {
      channelModel.findById.mockResolvedValue(null);

      await expect(
        (controller as any).updateChannelStatus('invalidChannel', 'connected'),
      ).rejects.toThrow('channel not found');
    });

    it('should not update when evoState is undefined', async () => {
      await (controller as any).updateChannelStatus('channel123', undefined);

      expect(channelModel.findById).not.toHaveBeenCalled();
    });

    it('should not update when mapped status is undefined', async () => {
      const mockChannel = {
        status: ChannelStatus.DISCONNECTED,
        save: jest.fn(),
      };
      channelModel.findById.mockResolvedValue(mockChannel);

      const mockMapEvoStatus = jest.fn().mockReturnValue(undefined);
      jest.doMock('../../channels/utils/evo-status.util', () => ({
        mapEvoStatus: mockMapEvoStatus,
      }));

      await (controller as any).updateChannelStatus('channel123', 'unknown');

      expect(mockChannel.save).not.toHaveBeenCalled();
    });
  });

  describe('getEffectiveBody', () => {
    it('should return data.messages when array is present', () => {
      const body = {
        data: {
          messages: [{ id: 'msg1' }, { id: 'msg2' }],
        },
        otherField: 'value',
      };
      const result = (controller as any).getEffectiveBody(body);
      expect(result).toEqual({ messages: [{ id: 'msg1' }, { id: 'msg2' }] });
    });

    it('should return original body when data.messages is not an array', () => {
      const body = {
        data: { otherData: 'value' },
        messages: [{ id: 'msg1' }],
      };
      const result = (controller as any).getEffectiveBody(body);
      expect(result).toBe(body);
    });

    it('should return original body when no data field', () => {
      const body = { messages: [{ id: 'msg1' }] };
      const result = (controller as any).getEffectiveBody(body);
      expect(result).toBe(body);
    });
  });

  describe('checkMessageIdempotency', () => {
    it('should return false when no messages array', async () => {
      const effective = {};
      const result = await (controller as any).checkMessageIdempotency(
        effective,
        'channel123',
        'merchant123',
      );
      expect(result).toBe(false);
    });

    it('should return false when messages array is empty', async () => {
      const effective = { messages: [] };
      const result = await (controller as any).checkMessageIdempotency(
        effective,
        'channel123',
        'merchant123',
      );
      expect(result).toBe(false);
    });

    it('should return false when message has no id', async () => {
      const effective = { messages: [{ key: {} }] };
      const result = await (controller as any).checkMessageIdempotency(
        effective,
        'channel123',
        'merchant123',
      );
      expect(result).toBe(false);
    });

    it('should check idempotency with message id from key.id', async () => {
      const effective = { messages: [{ key: { id: 'msg123' } }] };
      const mockPreventDuplicates = jest.fn().mockResolvedValue(false);
      jest.doMock('../../../common/utils/idempotency.util', () => ({
        preventDuplicates: mockPreventDuplicates,
      }));

      const result = await (controller as any).checkMessageIdempotency(
        effective,
        'channel123',
        'merchant123',
      );

      expect(mockPreventDuplicates).toHaveBeenCalledWith(
        cacheManager,
        expect.stringContaining('whatsapp_qr:channel123:merchant123:msg123'),
      );
      expect(result).toBe(false);
    });

    it('should check idempotency with message id from message.id', async () => {
      const effective = { messages: [{ id: 'msg456' }] };
      const mockPreventDuplicates = jest.fn().mockResolvedValue(true);
      jest.doMock('../../../common/utils/idempotency.util', () => ({
        preventDuplicates: mockPreventDuplicates,
      }));

      const result = await (controller as any).checkMessageIdempotency(
        effective,
        'channel123',
        'merchant123',
      );

      expect(mockPreventDuplicates).toHaveBeenCalledWith(
        cacheManager,
        expect.stringContaining('whatsapp_qr:channel123:merchant123:msg456'),
      );
      expect(result).toBe(true);
    });
  });
});
