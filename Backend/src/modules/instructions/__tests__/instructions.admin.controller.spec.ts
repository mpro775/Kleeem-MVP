import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Types } from 'mongoose';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';

import { QueryAdminInstructionsDto } from '../dto/query-admin-instructions.dto';
import { InstructionsAdminController } from '../instructions.admin.controller';
import { InstructionsService } from '../instructions.service';

import type { BulkIdsDto } from '../dto/bulk-ids.dto';

describe('InstructionsAdminController', () => {
  let controller: InstructionsAdminController;
  let service: jest.Mocked<InstructionsService>;

  const mockInstruction = {
    _id: new Types.ObjectId(),
    instruction: 'توجيه تجريبي',
    merchantId: new Types.ObjectId(),
    relatedReplies: [] as string[],
    type: 'manual' as const,
    active: true,
  };

  const mockService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    activate: jest.fn(),
    deactivate: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      controllers: [InstructionsAdminController],
      providers: [
        {
          provide: InstructionsService,
          useValue: mockService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<InstructionsAdminController>(
      InstructionsAdminController,
    );
    service = module.get(InstructionsService);
  });

  describe('GET admin/instructions (list)', () => {
    it('should return paginated instructions', async () => {
      const query = new QueryAdminInstructionsDto();
      query.limit = 10;
      query.page = 1;
      const expected = { items: [mockInstruction], total: 1 };
      mockService.findAll.mockResolvedValue(expected);

      const result = await controller.list(query);

      expect(service.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 10, page: 1 }),
      );
      expect(result).toEqual(expected);
    });

    it('should pass merchantId, active, type filters', async () => {
      const query = new QueryAdminInstructionsDto();
      query.merchantId = '507f1f77bcf86cd799439011';
      query.active = 'true';
      query.type = 'auto';
      query.limit = 20;
      query.page = 2;
      mockService.findAll.mockResolvedValue({ items: [], total: 0 });

      await controller.list(query);

      expect(service.findAll).toHaveBeenCalledWith({
        merchantId: '507f1f77bcf86cd799439011',
        active: true,
        type: 'auto',
        limit: 20,
        page: 2,
      });
    });
  });

  describe('GET admin/instructions/:id (getOne)', () => {
    it('should return instruction when found', async () => {
      mockService.findOne.mockResolvedValue(mockInstruction);

      const result = await controller.getOne(mockInstruction._id.toString());

      expect(result).toEqual(mockInstruction);
      expect(service.findOne).toHaveBeenCalledWith(
        mockInstruction._id.toString(),
      );
    });

    it('should throw NotFoundException when instruction not found', async () => {
      mockService.findOne.mockResolvedValue(null);

      await expect(
        controller.getOne('507f1f77bcf86cd799439011'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('PATCH admin/instructions/:id', () => {
    it('should update and return instruction', async () => {
      const updated = { ...mockInstruction, instruction: 'محدّث' };
      mockService.findOne.mockResolvedValue(mockInstruction);
      mockService.update.mockResolvedValue(updated);

      const result = await controller.update(mockInstruction._id.toString(), {
        instruction: 'محدّث',
      });

      expect(service.update).toHaveBeenCalledWith(
        mockInstruction._id.toString(),
        { instruction: 'محدّث' },
      );
      expect(result).toEqual(updated);
    });

    it('should throw NotFoundException when instruction not found', async () => {
      mockService.findOne.mockResolvedValue(null);

      await expect(
        controller.update('507f1f77bcf86cd799439011', { active: false }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('DELETE admin/instructions/:id', () => {
    it('should remove and return instruction', async () => {
      mockService.findOne.mockResolvedValue(mockInstruction);
      mockService.remove.mockResolvedValue(mockInstruction);

      const result = await controller.remove(mockInstruction._id.toString());

      expect(service.remove).toHaveBeenCalledWith(
        mockInstruction._id.toString(),
      );
      expect(result).toEqual(mockInstruction);
    });

    it('should throw NotFoundException when instruction not found', async () => {
      mockService.findOne.mockResolvedValue(null);

      await expect(
        controller.remove('507f1f77bcf86cd799439011'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('POST admin/instructions/bulk-activate', () => {
    it('should activate multiple instructions and return updated count', async () => {
      const dto: BulkIdsDto = {
        ids: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
      };
      mockService.activate
        .mockResolvedValueOnce(mockInstruction)
        .mockResolvedValueOnce(null);

      const result = await controller.bulkActivate(dto);

      expect(result).toEqual({ updated: 1 });
      expect(service.activate).toHaveBeenCalledTimes(2);
    });
  });

  describe('POST admin/instructions/bulk-deactivate', () => {
    it('should deactivate multiple instructions and return updated count', async () => {
      const dto: BulkIdsDto = {
        ids: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
      };
      mockService.deactivate
        .mockResolvedValueOnce(mockInstruction)
        .mockResolvedValueOnce(mockInstruction);

      const result = await controller.bulkDeactivate(dto);

      expect(result).toEqual({ updated: 2 });
      expect(service.deactivate).toHaveBeenCalledTimes(2);
    });
  });
});
