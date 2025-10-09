import { NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';

import { PlansService } from './plans.service';
import { PLAN_REPOSITORY } from './tokens';

import type { PlanRepository } from './repositories/plan.repository';

describe('PlansService', () => {
  let service: PlansService;

  const repo: jest.Mocked<PlanRepository> = {
    create: jest.fn(),
    findOneByName: jest.fn(),
    paginate: jest.fn(),
    updateById: jest.fn(),
    archiveById: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    findByName: jest.fn(),
    deleteById: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [PlansService, { provide: PLAN_REPOSITORY, useValue: repo }],
    }).compile();

    service = module.get(PlansService);
  });

  it('create should prevent duplicate names', async () => {
    repo.findOneByName.mockResolvedValue({
      _id: new Types.ObjectId(),
      name: 'Basic',
    } as any);
    await expect(service.create({ name: 'Basic' } as any)).rejects.toThrow(
      'Plan name already exists',
    );
  });

  it('findAllPaged should map pagination and filters', async () => {
    repo.paginate.mockResolvedValue({
      items: [{ _id: new Types.ObjectId(), name: 'A' } as any],
      total: 1,
    });
    const out = await service.findAllPaged({
      page: '1',
      limit: '10',
      isActive: 'true',
      sort: 'priceAsc',
    } as any);
    expect(repo.paginate).toHaveBeenCalledWith(
      expect.objectContaining({ isActive: true, archivedNotTrue: true }),
      'priceAsc',
      1,
      10,
    );
    expect(out.pages).toBe(1);
  });

  it('toggleActive should update and return entity or 404', async () => {
    repo.updateById.mockResolvedValueOnce({ _id: '1' } as any);
    await expect(service.toggleActive('1', true)).resolves.toBeTruthy();

    repo.updateById.mockResolvedValueOnce(null);
    await expect(service.toggleActive('x', false)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('archive should set archived and return entity or 404', async () => {
    repo.archiveById.mockResolvedValueOnce({ _id: '1', archived: true } as any);
    await expect(service.archive('1')).resolves.toBeTruthy();

    repo.archiveById.mockResolvedValueOnce(null);
    await expect(service.archive('x')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('findById should 404 when missing', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.findById('x')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('findByName should 404 when missing', async () => {
    repo.findByName.mockResolvedValue(null);
    await expect(service.findByName('nope')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('update should 404 when missing', async () => {
    repo.updateById.mockResolvedValue(null);
    await expect(
      service.update('x', { name: 'Y' } as any),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('remove should 404 when missing', async () => {
    repo.deleteById.mockResolvedValue(false);
    await expect(service.remove('x')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('findAll should delegate to repo', async () => {
    repo.findAll.mockResolvedValue([
      { _id: new Types.ObjectId(), name: 'Pro' } as any,
    ]);
    const out = await service.findAll();
    expect(out.length).toBe(1);
  });
});
