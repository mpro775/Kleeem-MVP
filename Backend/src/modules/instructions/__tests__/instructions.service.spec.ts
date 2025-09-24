import { Test } from '@nestjs/testing';

import { InstructionsService } from '../instructions.service';

import type { InstructionsRepository } from '../repositories/instructions.repository';

describe('InstructionsService', () => {
  let service: InstructionsService;
  let repo: jest.Mocked<InstructionsRepository>;

  beforeEach(async () => {
    repo = {
      create: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      updateById: jest.fn(),
      deleteById: jest.fn(),
      setActive: jest.fn(),
      getActiveInstructions: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        InstructionsService,
        { provide: 'InstructionsRepository', useValue: repo },
      ],
    }).compile();

    service = moduleRef.get(InstructionsService);
  });

  it('create → delegates to repo.create', async () => {
    repo.create.mockResolvedValue({
      _id: '1',
      instruction: 'do x',
      active: true,
    } as any);
    const out = await service.create({ instruction: 'do x', merchantId: 'm1' });
    const createCall = expect(repo.create.bind(repo));
    createCall.toHaveBeenCalledWith(
      expect.objectContaining({
        instruction: 'do x',
        merchantId: 'm1',
        active: true,
      }),
    );
    expect(out._id).toBe('1');
  });

  it('findAll → delegates with pagination', async () => {
    repo.findAll.mockResolvedValue([{ _id: 'a' } as any]);
    const out = await service.findAll({ merchantId: 'm1', limit: 10, page: 2 });
    const findAllCall = expect(repo.findAll.bind(repo));
    findAllCall.toHaveBeenCalledWith({
      merchantId: 'm1',
      limit: 10,
      page: 2,
    });
    expect(out).toEqual([{ _id: 'a' }]);
  });

  it('activate/deactivate → setActive', async () => {
    await service.activate('id1');
    const setActiveCall = expect(repo.setActive.bind(repo));
    setActiveCall.toHaveBeenCalledWith('id1', true);
    await service.deactivate('id1');
    setActiveCall.toHaveBeenCalledWith('id1', false);
  });

  it('getActiveInstructions → delegates', async () => {
    repo.getActiveInstructions.mockResolvedValue([
      { _id: 'x', instruction: 'rule' } as any,
    ]);
    const res = await service.getActiveInstructions('m1');
    const getActiveInstructionsCall = expect(
      repo.getActiveInstructions.bind(repo),
    );
    getActiveInstructionsCall.toHaveBeenCalledWith('m1');
    expect(res).toHaveLength(1);
  });
});
