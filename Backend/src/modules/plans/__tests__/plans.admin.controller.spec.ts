import { Test } from '@nestjs/testing';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';

import { PlansAdminController } from '../plans.admin.controller';
import { PlansService } from '../plans.service';

import type { QueryPlansDto } from '../dto/query-plans.dto';

describe('PlansAdminController', () => {
  let controller: PlansAdminController;
  let service: jest.Mocked<PlansService>;

  const mockPlan = {
    _id: '507f1f77bcf86cd799439011',
    name: 'Pro',
    priceCents: 100,
    currency: 'USD',
    durationDays: 30,
    isActive: true,
  };

  const mockPaged = {
    items: [mockPlan],
    total: 1,
    page: 1,
    limit: 20,
    pages: 1,
  };

  const mockService = {
    findAllPaged: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    toggleActive: jest.fn(),
    archive: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      controllers: [PlansAdminController],
      providers: [{ provide: PlansService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PlansAdminController>(PlansAdminController);
    service = module.get(PlansService);
  });

  describe('GET admin/plans (list)', () => {
    it('should return paged plans', async () => {
      mockService.findAllPaged.mockResolvedValue(mockPaged);

      const result = await controller.findAll({} as QueryPlansDto);

      expect(service.findAllPaged).toHaveBeenCalledWith({});
      expect(result).toEqual(mockPaged);
    });
  });

  describe('GET admin/plans/:id', () => {
    it('should return one plan', async () => {
      mockService.findOne.mockResolvedValue(mockPlan as any);

      const result = await controller.findOne(mockPlan._id);

      expect(service.findOne).toHaveBeenCalledWith(mockPlan._id);
      expect(result).toEqual(mockPlan);
    });
  });
});
