import { Test } from '@nestjs/testing';

import { PromptVersionService } from '../services/prompt-version.service';

import type { PromptVersionRepository } from '../repositories/prompt-version.repository';

describe('PromptVersionService', () => {
  let service: PromptVersionService;
  let repo: jest.Mocked<PromptVersionRepository>;

  beforeEach(async () => {
    repo = {
      getOrFail: jest.fn(),
      getAdvancedHistory: jest.fn(),
      appendAdvancedHistory: jest.fn(),
      setCurrentAdvancedConfig: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        PromptVersionService,
        { provide: 'PromptVersionRepository', useValue: repo },
      ],
    }).compile();

    service = module.get(PromptVersionService);
  });

  it('snapshot pushes current template to history if exists', async () => {
    repo.getOrFail.mockResolvedValue({
      currentAdvancedConfig: { template: 'T', updatedAt: new Date(), note: '' },
    } as any);

    await service.snapshot('m1', 'note');
    expect(repo.appendAdvancedHistory.bind(repo)).toHaveBeenCalled();
  });

  it('list returns history', async () => {
    repo.getAdvancedHistory.mockResolvedValue([
      { template: 'A', updatedAt: new Date() },
    ]);
    const res = await service.list('m1');
    expect(res.length).toBe(1);
  });

  it('revert switches currentAdvancedConfig from history', async () => {
    repo.getOrFail.mockResolvedValue({} as any);
    repo.getAdvancedHistory.mockResolvedValue([
      { template: 'old', updatedAt: new Date(), note: 'n' },
    ]);

    await service.revert('m1', 0);

    expect(repo.setCurrentAdvancedConfig.bind(repo)).toHaveBeenCalledWith(
      'm1',
      expect.objectContaining({
        template: 'old',
      }),
    );
  });
});
