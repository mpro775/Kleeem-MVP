import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Types } from 'mongoose';

import { ChannelsAdminController } from '../channels.admin.controller';
import { ChannelsService } from '../channels.service';
import { QueryAdminChannelsDto } from '../dto/query-admin-channels.dto';
import { UpdateChannelDto } from '../dto/update-channel.dto';
import { ChannelProvider, ChannelStatus } from '../schemas/channel.schema';

describe('ChannelsAdminController', () => {
  let controller: ChannelsAdminController;
  let service: jest.Mocked<ChannelsService>;

  const mockChannelLean = {
    _id: new Types.ObjectId(),
    merchantId: new Types.ObjectId(),
    provider: ChannelProvider.WHATSAPP_CLOUD,
    isDefault: true,
    enabled: true,
    deletedAt: null,
  };

  const mockChannelDoc = {
    _id: mockChannelLean._id,
    merchantId: mockChannelLean.merchantId,
    provider: mockChannelLean.provider,
    isDefault: true,
    enabled: true,
    status: ChannelStatus.CONNECTED,
    save: jest.fn().mockResolvedValue(undefined),
  } as any;

  const mockStats = {
    total: 10,
    byProvider: { telegram: 3, whatsapp_cloud: 5, webchat: 2 },
    byStatus: { connected: 6, disconnected: 4 },
  };

  const mockService = {
    listAllAdmin: jest.fn(),
    getStatsAdmin: jest.fn(),
    get: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      controllers: [ChannelsAdminController],
      providers: [
        {
          provide: ChannelsService,
          useValue: mockService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ChannelsAdminController>(ChannelsAdminController);
    service = module.get(ChannelsService);
  });

  describe('GET admin/channels (list)', () => {
    it('should return paginated channels with default query', async () => {
      const query = new QueryAdminChannelsDto();
      query.limit = 30;
      query.page = 1;
      const expected = { items: [mockChannelLean], total: 1 };
      mockService.listAllAdmin.mockResolvedValue(expected);

      const result = await controller.list(query);

      expect(service.listAllAdmin).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 30, page: 1 }),
      );
      expect(result).toEqual(expected);
    });

    it('should pass merchantId, provider, status filters', async () => {
      const query = new QueryAdminChannelsDto();
      query.merchantId = '507f1f77bcf86cd799439011';
      query.provider = ChannelProvider.TELEGRAM;
      query.status = ChannelStatus.CONNECTED;
      query.limit = 20;
      query.page = 2;
      mockService.listAllAdmin.mockResolvedValue({ items: [], total: 0 });

      await controller.list(query);

      expect(service.listAllAdmin).toHaveBeenCalledWith({
        merchantId: '507f1f77bcf86cd799439011',
        provider: ChannelProvider.TELEGRAM,
        status: ChannelStatus.CONNECTED,
        limit: 20,
        page: 2,
      });
    });
  });

  describe('GET admin/channels/stats', () => {
    it('should return stats from service', async () => {
      mockService.getStatsAdmin.mockResolvedValue(mockStats);

      const result = await controller.getStats();

      expect(service.getStatsAdmin).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockStats);
    });
  });

  describe('GET admin/channels/:id', () => {
    it('should return channel when found', async () => {
      mockService.get.mockResolvedValue(mockChannelDoc);

      const result = await controller.get(mockChannelLean._id.toString());

      expect(service.get).toHaveBeenCalledWith(mockChannelLean._id.toString());
      expect(result).toEqual(mockChannelDoc);
    });

    it('should throw BadRequestException when id is invalid', async () => {
      await expect(controller.get('invalid-id')).rejects.toThrow(
        'معرف القناة غير صالح',
      );
      expect(service.get).not.toHaveBeenCalled();
    });

    it('should throw when channel not found', async () => {
      mockService.get.mockRejectedValue(new NotFoundException('Channel not found'));

      await expect(
        controller.get('507f1f77bcf86cd799439011'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('PATCH admin/channels/:id', () => {
    it('should update and return channel', async () => {
      const dto: UpdateChannelDto = { accountLabel: 'قناة محدثة', enabled: false };
      mockService.update.mockResolvedValue({ ...mockChannelDoc, ...dto });

      const result = await controller.update(
        mockChannelLean._id.toString(),
        dto,
      );

      expect(service.update).toHaveBeenCalledWith(
        mockChannelLean._id.toString(),
        dto,
      );
      expect(result.accountLabel).toBe('قناة محدثة');
      expect(result.enabled).toBe(false);
    });

    it('should throw BadRequestException when id is invalid', async () => {
      await expect(
        controller.update('invalid', { enabled: true }),
      ).rejects.toThrow('معرف القناة غير صالح');
      expect(service.update).not.toHaveBeenCalled();
    });
  });

  describe('POST admin/channels/:id/actions/disconnect', () => {
    it('should call remove with disconnect mode and return result', async () => {
      mockService.remove.mockResolvedValue({ ok: true });

      const result = await controller.disconnect(mockChannelLean._id.toString());

      expect(service.remove).toHaveBeenCalledWith(
        mockChannelLean._id.toString(),
        'disconnect',
      );
      expect(result).toEqual({ ok: true });
    });

    it('should throw BadRequestException when id is invalid', async () => {
      await expect(controller.disconnect('bad')).rejects.toThrow(
        'معرف القناة غير صالح',
      );
      expect(service.remove).not.toHaveBeenCalled();
    });

    it('should throw when channel not found', async () => {
      mockService.remove.mockRejectedValue(
        new NotFoundException('Channel not found'),
      );

      await expect(
        controller.disconnect('507f1f77bcf86cd799439011'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
