import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Types } from 'mongoose';

import { SupportAdminController } from '../support.admin.controller';
import { SupportService } from '../support.service';
import { QueryAdminSupportDto } from '../dto/query-admin-support.dto';
import { UpdateSupportAdminDto } from '../dto/update-support-admin.dto';

describe('SupportAdminController', () => {
  let controller: SupportAdminController;
  let service: jest.Mocked<SupportService>;

  const mockTicket = {
    _id: new Types.ObjectId(),
    ticketNumber: 'KT-ABC-123',
    name: 'Test User',
    email: 'test@example.com',
    topic: 'support',
    subject: 'Help',
    message: 'Message',
    status: 'open',
    source: 'landing',
    attachments: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockService = {
    listAllAdmin: jest.fn(),
    findOne: jest.fn(),
    updateAdmin: jest.fn(),
    getStatsAdmin: jest.fn(),
    addReplyAdmin: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      controllers: [SupportAdminController],
      providers: [{ provide: SupportService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SupportAdminController>(SupportAdminController);
    service = module.get(SupportService);
  });

  describe('GET admin/support (list)', () => {
    it('should return paginated tickets with default query', async () => {
      const query = new QueryAdminSupportDto();
      query.limit = 30;
      query.page = 1;
      const expected = { items: [mockTicket], total: 1 };
      mockService.listAllAdmin.mockResolvedValue(expected);

      const result = await controller.list(query);

      expect(service.listAllAdmin).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 30, page: 1 }),
      );
      expect(result).toEqual(expected);
    });

    it('should pass status filter', async () => {
      const query = new QueryAdminSupportDto();
      query.status = 'resolved';
      query.limit = 20;
      query.page = 2;
      mockService.listAllAdmin.mockResolvedValue({ items: [], total: 0 });

      await controller.list(query);

      expect(service.listAllAdmin).toHaveBeenCalledWith({
        limit: 20,
        page: 2,
        status: 'resolved',
      });
    });
  });

  describe('GET admin/support/:id (getOne)', () => {
    it('should return ticket when found', async () => {
      mockService.findOne.mockResolvedValue(mockTicket as any);

      const result = await controller.getOne(mockTicket._id.toString());

      expect(service.findOne).toHaveBeenCalledWith(mockTicket._id.toString());
      expect(result).toEqual(mockTicket);
    });

    it('should throw BadRequestException when id is invalid', async () => {
      await expect(controller.getOne('invalid-id')).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.getOne('invalid-id')).rejects.toThrow(
        'معرف التذكرة غير صالح',
      );
      expect(service.findOne).not.toHaveBeenCalled();
    });

    it('should throw when ticket not found', async () => {
      mockService.findOne.mockRejectedValue(
        new NotFoundException('التذكرة غير موجودة'),
      );

      await expect(
        controller.getOne('507f1f77bcf86cd799439011'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('PATCH admin/support/:id', () => {
    it('should update and return ticket', async () => {
      const dto: UpdateSupportAdminDto = { status: 'resolved' };
      mockService.updateAdmin.mockResolvedValue({
        ...mockTicket,
        status: 'resolved',
      } as any);

      const result = await controller.update(
        mockTicket._id.toString(),
        dto,
      );

      expect(service.updateAdmin).toHaveBeenCalledWith(
        mockTicket._id.toString(),
        dto,
      );
      expect(result.status).toBe('resolved');
    });

    it('should throw BadRequestException when id is invalid', async () => {
      await expect(
        controller.update('invalid', { status: 'closed' }),
      ).rejects.toThrow(BadRequestException);
      expect(service.updateAdmin).not.toHaveBeenCalled();
    });
  });

  describe('GET admin/support/stats', () => {
    it('should return stats', async () => {
      const stats = {
        byStatus: { open: 5, pending: 3, resolved: 10, closed: 2 },
        total: 20,
        avgResolutionHours: 24.5,
      };
      mockService.getStatsAdmin.mockResolvedValue(stats);

      const result = await controller.getStats();

      expect(service.getStatsAdmin).toHaveBeenCalledTimes(1);
      expect(result).toEqual(stats);
    });
  });

  describe('POST admin/support/:id/replies', () => {
    it('should add reply and return ticket', async () => {
      const dto = { body: 'رد من الدعم', isInternal: false };
      const updated = { ...mockTicket, replies: [{ authorId: 'admin', body: dto.body }] };
      mockService.addReplyAdmin.mockResolvedValue(updated as any);

      const result = await controller.addReply(
        mockTicket._id.toString(),
        dto,
        { userId: 'admin-id' },
      );

      expect(service.addReplyAdmin).toHaveBeenCalledWith(
        mockTicket._id.toString(),
        dto.body,
        'admin-id',
        false,
      );
      expect(result).toEqual(updated);
    });

    it('should throw BadRequestException when id is invalid', async () => {
      await expect(
        controller.addReply('invalid', { body: 'test' }, { userId: 'x' }),
      ).rejects.toThrow(BadRequestException);
      expect(service.addReplyAdmin).not.toHaveBeenCalled();
    });
  });
});
