import { Test, type TestingModule } from '@nestjs/testing';

import { SettingsService } from '../settings.service';
import { SETTINGS_REPOSITORY } from '../tokens';

import type { SettingsRepository } from '../repositories/settings.repository';

describe('SettingsService', () => {
  let service: SettingsService;

  const repo: jest.Mocked<SettingsRepository> = {
    findOneLean: jest.fn(),
    create: jest.fn(),
    findOneAndUpdate: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        { provide: SETTINGS_REPOSITORY, useValue: repo },
      ],
    }).compile();

    service = module.get(SettingsService);
  });

  it('get uses cache after first call', async () => {
    repo.findOneLean.mockResolvedValueOnce({ launchDate: '2024-01-01' } as any);
    const a = await service.get();
    const b = await service.get();
    expect(a.launchDate).toBe('2024-01-01');
    expect(repo.findOneLean.bind(repo)).toHaveBeenCalledTimes(1);
    expect(b.launchDate).toBe('2024-01-01');
  });

  it('update creates when none exists', async () => {
    repo.findOneLean.mockResolvedValueOnce(null);
    repo.create.mockResolvedValue({ applyUrl: 'x' } as any);
    const out = await service.update({ applyUrl: 'x' } as any);
    expect(repo.create.bind(repo)).toHaveBeenCalledWith({ applyUrl: 'x' });
    expect(out.applyUrl).toBe('x');
  });

  it('update modifies existing', async () => {
    repo.findOneLean.mockResolvedValueOnce({ trialOffer: 'old' } as any);
    repo.findOneAndUpdate.mockResolvedValue({ trialOffer: 'new' } as any);
    const out = await service.update({ trialOffer: 'new' } as any);
    expect(repo.findOneAndUpdate.bind(repo)).toHaveBeenCalledWith({
      trialOffer: 'new',
    });
    expect(out.trialOffer).toBe('new');
  });
});
