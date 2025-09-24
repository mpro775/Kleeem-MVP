import { Test, type TestingModule } from '@nestjs/testing';

import { BotPromptService } from '../botPrompt.service';
import { BOT_PROMPT_REPOSITORY } from '../tokens';

import type { BotPromptRepository } from '../repositories/bot-prompt.repository';

describe('BotPromptService', () => {
  let service: BotPromptService;

  const repo: jest.Mocked<BotPromptRepository> = {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    updateById: jest.fn(),
    updateMany: jest.fn(),
    deleteById: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BotPromptService,
        { provide: BOT_PROMPT_REPOSITORY, useValue: repo },
      ],
    }).compile();
    service = module.get(BotPromptService);
  });

  it('create system active disables others then creates', async () => {
    repo.create.mockResolvedValue({
      _id: '1',
      type: 'system',
      active: true,
    } as any);
    const res = await service.create({
      type: 'system',
      content: 'x',
      active: true,
    } as any);
    expect(repo.updateMany.bind(repo)).toHaveBeenCalledWith(
      { type: 'system' },
      { active: false },
    );
    expect(res._id).toBe('1');
  });

  it('publish bumps version and activates', async () => {
    repo.findById.mockResolvedValue({
      _id: 'a',
      type: 'system',
      version: 1,
    } as any);
    repo.findOne.mockResolvedValue({
      _id: 'b',
      type: 'system',
      version: 3,
    } as any); // last version
    repo.updateById.mockResolvedValue({
      _id: 'a',
      type: 'system',
      version: 4,
      active: true,
    } as any);
    const out = await service.publish('a');
    expect(repo.updateMany.bind(repo)).toHaveBeenCalled();
    expect(out.version).toBe(4);
    expect(out.active).toBe(true);
  });

  it('getActiveSystemPromptOrDefault returns fallback when none', async () => {
    repo.findOne.mockResolvedValue(null);
    const s = await service.getActiveSystemPrompt();
    expect(typeof s).toBe('string');
    expect(s.length).toBeGreaterThan(10);
  });

  it('remove delegates to repo', async () => {
    repo.deleteById.mockResolvedValue({ deleted: true });
    const r = await service.remove('x');
    expect(r.deleted).toBe(true);
  });
});
