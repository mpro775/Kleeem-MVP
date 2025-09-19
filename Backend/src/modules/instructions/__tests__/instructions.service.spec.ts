import { Test } from '@nestjs/testing';
import { InstructionsService } from '../instructions.service';
import { InstructionsRepository } from '../repositories/instructions.repository';

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
    expect(repo.create).toHaveBeenCalledWith(
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
    expect(repo.findAll).toHaveBeenCalledWith({
      merchantId: 'm1',
      limit: 10,
      page: 2,
    });
    expect(out).toEqual([{ _id: 'a' }]);
  });

  it('activate/deactivate → setActive', async () => {
    await service.activate('id1');
    expect(repo.setActive).toHaveBeenCalledWith('id1', true);
    await service.deactivate('id1');
    expect(repo.setActive).toHaveBeenCalledWith('id1', false);
  });

  it('getActiveInstructions → delegates', async () => {
    repo.getActiveInstructions.mockResolvedValue([
      { _id: 'x', instruction: 'rule' } as any,
    ]);
    const res = await service.getActiveInstructions('m1');
    expect(repo.getActiveInstructions).toHaveBeenCalledWith('m1');
    expect(res.length).toBe(1);
  });
});
