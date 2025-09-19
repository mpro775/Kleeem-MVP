import { Test, TestingModule } from '@nestjs/testing';
import { LeadsService } from '../leads.service';
import { LEAD_REPOSITORY } from '../tokens';
import { LeadRepository } from '../repositories/lead.repository';

describe('LeadsService', () => {
  let service: LeadsService;
  const repo: jest.Mocked<LeadRepository> = {
    create: jest.fn(),
    findAllForMerchant: jest.fn(),
    paginateByMerchant: jest.fn(),
    updateOneForMerchant: jest.fn(),
    softDeleteById: jest.fn(),
    getPhoneBySession: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [LeadsService, { provide: LEAD_REPOSITORY, useValue: repo }],
    }).compile();

    service = module.get(LeadsService);
  });

  it('create should normalize phone and pick name', async () => {
    repo.create.mockResolvedValue({
      _id: '1' as any,
      merchantId: 'm1',
      sessionId: 's1',
      data: { phoneNumber: '+966-555 123 456', fullName: 'Ali' } as any,
      source: 'web',
      phoneNormalized: '966555123456',
      name: 'Ali',
    } as any);

    const dto: any = {
      sessionId: 's1',
      source: 'web',
      data: { phoneNumber: '+966-555 123 456', fullName: 'Ali' },
    };

    const res = await service.create('m1', dto);

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        merchantId: 'm1',
        sessionId: 's1',
        source: 'web',
        phoneNormalized: '966555123456',
        name: 'Ali',
      }),
    );
    expect(res.phoneNormalized).toBe('966555123456');
    expect(res.name).toBe('Ali');
  });

  it('findAllForMerchant should delegate to repo', async () => {
    repo.findAllForMerchant.mockResolvedValue([{ _id: 'x' as any } as any]);
    const out = await service.findAllForMerchant('m2');
    expect(repo.findAllForMerchant).toHaveBeenCalledWith('m2');
    expect(out.length).toBe(1);
  });

  it('getPhoneBySession should return phone', async () => {
    repo.getPhoneBySession.mockResolvedValue('0555123456');
    const p = await service.getPhoneBySession('m1', 's1');
    expect(repo.getPhoneBySession).toHaveBeenCalledWith('m1', 's1');
    expect(p).toBe('0555123456');
  });

  it('getPhoneBySession should return undefined when empty', async () => {
    repo.getPhoneBySession.mockResolvedValue(undefined);
    const p = await service.getPhoneBySession('m1', 's2');
    expect(p).toBeUndefined();
  });
});
