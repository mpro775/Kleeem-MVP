import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Types } from 'mongoose';

import { TelegramAdapter } from '../adapters/telegram.adapter';
import { WebchatAdapter } from '../adapters/webchat.adapter';
import { WhatsAppCloudAdapter } from '../adapters/whatsapp-cloud.adapter';
import { WhatsAppQrAdapter } from '../adapters/whatsapp-qr.adapter';
import { ChannelsService } from '../channels.service';
import { ChannelProvider, ChannelStatus } from '../schemas/channel.schema';

import type { ConnectResult } from '../adapters/channel-adapter';
import type { CreateChannelDto } from '../dto/create-channel.dto';
import type { UpdateChannelDto } from '../dto/update-channel.dto';
import type { ChannelsRepository } from '../repositories/channels.repository';
import type { TestingModule } from '@nestjs/testing';

// Mock the adapters
jest.mock('../adapters/telegram.adapter');
jest.mock('../adapters/whatsapp-cloud.adapter');
jest.mock('../adapters/whatsapp-qr.adapter');
jest.mock('../adapters/webchat.adapter');

describe('ChannelsService', () => {
  let service: ChannelsService;
  let mockRepo: jest.Mocked<ChannelsRepository>;
  let mockTelegramAdapter: jest.Mocked<TelegramAdapter>;
  let mockWhatsAppCloudAdapter: jest.Mocked<WhatsAppCloudAdapter>;
  let mockWhatsAppQrAdapter: jest.Mocked<WhatsAppQrAdapter>;
  let mockWebchatAdapter: jest.Mocked<WebchatAdapter>;

  const mockChannel = {
    _id: new Types.ObjectId(),
    merchantId: new Types.ObjectId(),
    provider: ChannelProvider.TELEGRAM,
    enabled: true,
    status: ChannelStatus.CONNECTED,
    accountLabel: 'Test Channel',
    isDefault: false,
  } as any;

  beforeEach(async () => {
    // Create mock repository
    mockRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findLeanById: jest.fn(),
      deleteOneById: jest.fn(),
      findByIdWithSecrets: jest.fn(),
      listByMerchant: jest.fn(),
      unsetDefaults: jest.fn(),
      findDefault: jest.fn(),
      findByWebhookUrl: jest.fn(),
      updateOne: jest.fn(),
      findAll: jest.fn(),
    } as any;

    // Create mock adapters
    mockTelegramAdapter = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      refresh: jest.fn(),
      getStatus: jest.fn(),
      sendMessage: jest.fn(),
    } as any;

    mockWhatsAppCloudAdapter = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      refresh: jest.fn(),
      getStatus: jest.fn(),
      sendMessage: jest.fn(),
    } as any;

    mockWhatsAppQrAdapter = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      refresh: jest.fn(),
      getStatus: jest.fn(),
      sendMessage: jest.fn(),
    } as any;

    mockWebchatAdapter = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      refresh: jest.fn(),
      getStatus: jest.fn(),
      sendMessage: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChannelsService,
        {
          provide: 'ChannelsRepository',
          useValue: mockRepo,
        },
        {
          provide: TelegramAdapter,
          useValue: mockTelegramAdapter,
        },
        {
          provide: WhatsAppCloudAdapter,
          useValue: mockWhatsAppCloudAdapter,
        },
        {
          provide: WhatsAppQrAdapter,
          useValue: mockWhatsAppQrAdapter,
        },
        {
          provide: WebchatAdapter,
          useValue: mockWebchatAdapter,
        },
      ],
    }).compile();

    service = module.get<ChannelsService>(ChannelsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new channel successfully', async () => {
      // Arrange
      const createDto: CreateChannelDto = {
        provider: 'telegram' as any,
        merchantId: '507f1f77bcf86cd799439011',
        accountLabel: 'Test Channel',
        isDefault: true,
      };

      const expectedChannel = {
        ...mockChannel,
        merchantId: new Types.ObjectId(createDto.merchantId),
        provider: ChannelProvider.TELEGRAM,
        accountLabel: createDto.accountLabel,
        isDefault: true,
        enabled: false,
        status: ChannelStatus.DISCONNECTED,
      };

      mockRepo.create.mockResolvedValue(expectedChannel);
      mockRepo.unsetDefaults.mockResolvedValue();

      // Act
      const result = await service.create(createDto);

      // Assert
      expect(mockRepo.create).toHaveBeenCalledWith({
        merchantId: new Types.ObjectId(createDto.merchantId),
        provider: ChannelProvider.TELEGRAM,
        isDefault: true,
        enabled: false,
        status: ChannelStatus.DISCONNECTED,
        accountLabel: createDto.accountLabel,
      });
      expect(mockRepo.unsetDefaults).toHaveBeenCalledWith(
        new Types.ObjectId(createDto.merchantId),
        ChannelProvider.TELEGRAM,
        expectedChannel._id,
      );
      expect(result).toEqual(expectedChannel);
    });

    it('should create channel without account label', async () => {
      // Arrange
      const createDto: CreateChannelDto = {
        provider: 'whatsapp_cloud' as any,
        merchantId: '507f1f77bcf86cd799439011',
        isDefault: false,
      };

      const expectedChannel = {
        ...mockChannel,
        merchantId: new Types.ObjectId(createDto.merchantId),
        provider: ChannelProvider.WHATSAPP_CLOUD,
        isDefault: false,
        enabled: false,
        status: ChannelStatus.DISCONNECTED,
      };

      mockRepo.create.mockResolvedValue(expectedChannel);

      // Act
      const result = await service.create(createDto);

      // Assert
      expect(mockRepo.create).toHaveBeenCalledWith({
        merchantId: new Types.ObjectId(createDto.merchantId),
        provider: ChannelProvider.WHATSAPP_CLOUD,
        isDefault: false,
        enabled: false,
        status: ChannelStatus.DISCONNECTED,
      });
      expect(mockRepo.unsetDefaults).not.toHaveBeenCalled();
      expect(result).toEqual(expectedChannel);
    });
  });

  describe('list', () => {
    it('should list channels for a merchant', async () => {
      // Arrange
      const merchantId = '507f1f77bcf86cd799439011';
      const expectedChannels = [mockChannel];

      mockRepo.listByMerchant.mockResolvedValue(expectedChannels);

      // Act
      const result = await service.list(merchantId);

      // Assert
      expect(mockRepo.listByMerchant).toHaveBeenCalledWith(
        new Types.ObjectId(merchantId),
        undefined,
      );
      expect(result).toEqual(expectedChannels);
    });

    it('should list channels for a merchant with specific provider', async () => {
      // Arrange
      const merchantId = '507f1f77bcf86cd799439011';
      const provider = ChannelProvider.TELEGRAM;
      const expectedChannels = [mockChannel];

      mockRepo.listByMerchant.mockResolvedValue(expectedChannels);

      // Act
      const result = await service.list(merchantId, provider);

      // Assert
      expect(mockRepo.listByMerchant).toHaveBeenCalledWith(
        new Types.ObjectId(merchantId),
        provider,
      );
      expect(result).toEqual(expectedChannels);
    });
  });

  describe('get', () => {
    it('should get a channel by id', async () => {
      // Arrange
      const channelId = '507f1f77bcf86cd799439011';
      mockRepo.findById.mockResolvedValue(mockChannel);

      // Act
      const result = await service.get(channelId);

      // Assert
      expect(mockRepo.findById).toHaveBeenCalledWith(channelId);
      expect(result).toEqual(mockChannel);
    });

    it('should throw NotFoundException when channel not found', async () => {
      // Arrange
      const channelId = '507f1f77bcf86cd799439011';
      mockRepo.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.get(channelId)).rejects.toThrow(NotFoundException);
      expect(mockRepo.findById).toHaveBeenCalledWith(channelId);
    });
  });

  describe('update', () => {
    it('should update channel successfully', async () => {
      // Arrange
      const channelId = '507f1f77bcf86cd799439011';
      const updateDto: UpdateChannelDto = {
        accountLabel: 'Updated Channel',
        enabled: true,
      };

      const existingChannel = {
        ...mockChannel,
        accountLabel: 'Original Channel',
        enabled: false,
        save: jest.fn().mockResolvedValue({
          ...mockChannel,
          accountLabel: 'Updated Channel',
          enabled: true,
        }),
      };

      mockRepo.findById.mockResolvedValue(existingChannel);

      // Act
      const result = await service.update(channelId, updateDto);

      // Assert
      expect(existingChannel.accountLabel).toBe('Updated Channel');
      expect(existingChannel.enabled).toBe(true);
      expect(existingChannel.save).toHaveBeenCalled();
      expect(result.accountLabel).toBe('Updated Channel');
      expect(result.enabled).toBe(true);
    });

    it('should throw NotFoundException when updating non-existent channel', async () => {
      // Arrange
      const channelId = '507f1f77bcf86cd799439011';
      const updateDto: UpdateChannelDto = { enabled: true };

      mockRepo.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.update(channelId, updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('setDefault', () => {
    it('should set channel as default', async () => {
      // Arrange
      const channelId = '507f1f77bcf86cd799439011';

      const existingChannel = {
        ...mockChannel,
        isDefault: false,
        save: jest.fn().mockResolvedValue({
          ...mockChannel,
          isDefault: true,
        }),
      };

      mockRepo.findById.mockResolvedValue(existingChannel);
      mockRepo.unsetDefaults.mockResolvedValue();

      // Act
      const result = await service.setDefault(channelId);

      // Assert
      expect(mockRepo.unsetDefaults).toHaveBeenCalledWith(
        existingChannel.merchantId,
        existingChannel.provider,
      );
      expect(existingChannel.isDefault).toBe(true);
      expect(existingChannel.save).toHaveBeenCalled();
      expect(result.isDefault).toBe(true);
    });
  });

  describe('remove', () => {
    it('should disconnect and delete channel when mode is wipe', async () => {
      // Arrange
      const channelId = '507f1f77bcf86cd799439011';
      const mode = 'wipe' as const;

      mockRepo.findById.mockResolvedValue(mockChannel);
      mockTelegramAdapter.disconnect.mockResolvedValue();
      mockRepo.deleteOneById.mockResolvedValue();

      // Act
      const result = await service.remove(channelId, mode);

      // Assert
      expect(mockTelegramAdapter.disconnect).toHaveBeenCalledWith(
        mockChannel,
        mode,
      );
      expect(mockRepo.deleteOneById).toHaveBeenCalledWith(mockChannel._id);
      expect(result).toEqual({ deleted: true });
    });

    it('should disconnect channel when mode is disconnect', async () => {
      // Arrange
      const channelId = '507f1f77bcf86cd799439011';
      const mode = 'disconnect' as const;

      mockRepo.findById.mockResolvedValue(mockChannel);
      mockTelegramAdapter.disconnect.mockResolvedValue();

      // Act
      const result = await service.remove(channelId, mode);

      // Assert
      expect(mockTelegramAdapter.disconnect).toHaveBeenCalledWith(
        mockChannel,
        mode,
      );
      expect(mockRepo.deleteOneById).not.toHaveBeenCalled();
      expect(result).toEqual({ ok: true });
    });

    it('should throw NotFoundException when removing non-existent channel', async () => {
      // Arrange
      const channelId = '507f1f77bcf86cd799439011';
      mockRepo.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.remove(channelId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('connect', () => {
    it('should connect channel successfully', async () => {
      // Arrange
      const channelId = '507f1f77bcf86cd799439011';
      const payload = { token: 'test-token' };
      const connectResult: ConnectResult = {
        mode: 'webhook',
        webhookUrl: 'https://example.com/webhook',
      };

      mockRepo.findById.mockResolvedValue(mockChannel);
      mockTelegramAdapter.connect.mockResolvedValue(connectResult);

      // Act
      const result = await service.connect(channelId, payload);

      // Assert
      expect(mockTelegramAdapter.connect).toHaveBeenCalledWith(
        mockChannel,
        payload,
      );
      expect(result).toEqual(connectResult);
    });
  });

  describe('refresh', () => {
    it('should refresh channel successfully', async () => {
      // Arrange
      const channelId = '507f1f77bcf86cd799439011';

      mockRepo.findById.mockResolvedValue(mockChannel);
      mockTelegramAdapter.refresh.mockResolvedValue();

      // Act
      const result = await service.refresh(channelId);

      // Assert
      expect(mockTelegramAdapter.refresh).toHaveBeenCalledWith(mockChannel);
      expect(result).toEqual({ ok: true });
    });
  });

  describe('status', () => {
    it('should get channel status successfully', async () => {
      // Arrange
      const channelId = '507f1f77bcf86cd799439011';
      const statusResult = { connected: true, status: 'connected' };

      mockRepo.findById.mockResolvedValue(mockChannel);
      mockTelegramAdapter.getStatus.mockResolvedValue(statusResult as any);

      // Act
      const result = await service.status(channelId);

      // Assert
      expect(mockTelegramAdapter.getStatus).toHaveBeenCalledWith(mockChannel);
      expect(result).toEqual(statusResult);
    });
  });

  describe('send', () => {
    it('should send message successfully', async () => {
      // Arrange
      const channelId = '507f1f77bcf86cd799439011';
      const to = '123456789';
      const text = 'Hello, world!';

      mockRepo.findById.mockResolvedValue(mockChannel);
      mockTelegramAdapter.sendMessage.mockResolvedValue();

      // Act
      const result = await service.send(channelId, to, text);

      // Assert
      expect(mockTelegramAdapter.sendMessage).toHaveBeenCalledWith(
        mockChannel,
        to,
        text,
      );
      expect(result).toEqual({ ok: true });
    });
  });

  describe('pickAdapter', () => {
    it('should return correct adapter for each provider', async () => {
      // Test private method through reflection or by testing the public methods that use it
      // We'll test this indirectly through the public methods

      const telegramChannel = {
        ...mockChannel,
        provider: ChannelProvider.TELEGRAM,
      };
      const whatsappCloudChannel = {
        ...mockChannel,
        provider: ChannelProvider.WHATSAPP_CLOUD,
      };
      const whatsappQrChannel = {
        ...mockChannel,
        provider: ChannelProvider.WHATSAPP_QR,
      };
      const webchatChannel = {
        ...mockChannel,
        provider: ChannelProvider.WEBCHAT,
      };

      mockRepo.findById
        .mockResolvedValueOnce(telegramChannel)
        .mockResolvedValueOnce(whatsappCloudChannel)
        .mockResolvedValueOnce(whatsappQrChannel)
        .mockResolvedValueOnce(webchatChannel);

      // Mock status results
      const statusResult = { status: 'connected' };
      mockTelegramAdapter.getStatus.mockResolvedValue(statusResult as any);
      mockWhatsAppCloudAdapter.getStatus.mockResolvedValue(statusResult as any);
      mockWhatsAppQrAdapter.getStatus.mockResolvedValue(statusResult as any);
      mockWebchatAdapter.getStatus.mockResolvedValue(statusResult as any);

      // These methods internally call pickAdapter
      const result1 = await service.status('id1');
      const result2 = await service.status('id2');
      const result3 = await service.status('id3');
      const result4 = await service.status('id4');

      expect(result1).toEqual(statusResult);
      expect(result2).toEqual(statusResult);
      expect(result3).toEqual(statusResult);
      expect(result4).toEqual(statusResult);

      expect(mockTelegramAdapter.getStatus).toHaveBeenCalled();
      expect(mockWhatsAppCloudAdapter.getStatus).toHaveBeenCalled();
      expect(mockWhatsAppQrAdapter.getStatus).toHaveBeenCalled();
      expect(mockWebchatAdapter.getStatus).toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should handle adapter errors gracefully', async () => {
      // Arrange
      const channelId = '507f1f77bcf86cd799439011';
      const error = new Error('Adapter connection failed');

      mockRepo.findById.mockResolvedValue(mockChannel);
      mockTelegramAdapter.connect.mockRejectedValue(error);

      // Act & Assert
      await expect(service.connect(channelId, {})).rejects.toThrow(
        'Adapter connection failed',
      );
    });

    it('should handle repository errors', async () => {
      // Arrange
      const channelId = '507f1f77bcf86cd799439011';
      const error = new Error('Database error');

      mockRepo.findById.mockRejectedValue(error);

      // Act & Assert
      await expect(service.get(channelId)).rejects.toThrow('Database error');
    });
  });
});
