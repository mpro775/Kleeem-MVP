import { Test, type TestingModule } from '@nestjs/testing';

import { VectorService } from '../../../vector/vector.service';
import { BotFaqService } from '../botFaq.service';
import { BOT_FAQ_REPOSITORY } from '../tokens';

import type { BotFaqRepository } from '../repositories/bot-faq.repository';

describe('BotFaqService', () => {
  let service: BotFaqService;

  const repo: jest.Mocked<BotFaqRepository> = {
    create: jest.fn(),
    findById: jest.fn(),
    updateById: jest.fn(),
    softDelete: jest.fn(),
    findAllActiveSorted: jest.fn(),
    findAllActiveLean: jest.fn(),
    insertMany: jest.fn(),
    updateManyByIds: jest.fn(),
  };

  const vector: jest.Mocked<
    Pick<
      VectorService,
      'embedText' | 'upsertBotFaqs' | 'deleteBotFaqPoint' | 'searchBotFaqs'
    >
  > = {
    embedText: jest.fn(),
    upsertBotFaqs: jest.fn(),
    deleteBotFaqPoint: jest.fn(),
    searchBotFaqs: jest.fn(),
  } as any;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BotFaqService,
        { provide: BOT_FAQ_REPOSITORY, useValue: repo },
        { provide: VectorService, useValue: vector },
      ],
    }).compile();

    service = module.get(BotFaqService);
  });

  it('create embeds & upserts then marks ok', async () => {
    repo.create.mockResolvedValue({
      _id: '1',
      question: 'Q',
      answer: 'A',
    } as any);
    vector.embedText.mockResolvedValue([0.1, 0.2, 0.3] as any);
    vector.upsertBotFaqs.mockResolvedValue(undefined as any);
    repo.updateById.mockResolvedValue({ _id: '1', vectorStatus: 'ok' } as any);

    const res = await service.create(
      { question: 'Q', answer: 'A' } as any,
      'u1',
    );
    expect(vector.embedText).toHaveBeenCalled();
    expect(vector.upsertBotFaqs).toHaveBeenCalled();
    expect(repo.updateById.bind(repo)).toHaveBeenCalledWith('1', {
      vectorStatus: 'ok',
    } as any);
    expect((res as any).vectorStatus).toBe('ok');
  });

  it('update triggers reindex when fields changed', async () => {
    repo.findById.mockResolvedValue({
      _id: '1',
      question: 'Q',
      answer: 'A',
    } as any);
    repo.updateById.mockResolvedValue({
      _id: '1',
      question: 'Q2',
      answer: 'A',
    } as any);
    vector.embedText.mockResolvedValue([0.4] as any);
    vector.upsertBotFaqs.mockResolvedValue(undefined as any);

    const out = await service.update('1', { question: 'Q2' } as any);
    expect(vector.embedText).toHaveBeenCalled();
    expect(vector.upsertBotFaqs).toHaveBeenCalled();
    expect(repo.updateById.bind(repo)).toHaveBeenLastCalledWith('1', {
      vectorStatus: 'ok',
    } as any);
    expect((out as any)._id).toBe('1');
  });

  it('delete soft deletes and removes vector point', async () => {
    repo.softDelete.mockResolvedValue({ _id: '1', status: 'deleted' } as any);
    vector.deleteBotFaqPoint.mockResolvedValue(undefined as any);
    const res = await service.delete('1');
    expect(repo.softDelete.bind(repo)).toHaveBeenCalledWith('1');
    expect(vector.deleteBotFaqPoint).toHaveBeenCalled();
    expect((res as any).status).toBe('deleted');
  });

  it('semanticSearch delegates to vector service', async () => {
    vector.searchBotFaqs.mockResolvedValue([{ score: 0.9 }] as any);
    const r = await service.semanticSearch('hello', 3);
    expect(vector.searchBotFaqs).toHaveBeenCalledWith('hello', 3);
    expect(r[0].score).toBe(0.9);
  });

  it('reindexAll embeds all active and marks ok', async () => {
    repo.findAllActiveLean.mockResolvedValue([
      { _id: 'a', question: 'q1', answer: 'a1' },
      { _id: 'b', question: 'q2', answer: 'a2' },
    ] as any);
    vector.embedText
      .mockResolvedValueOnce([0.1] as any)
      .mockResolvedValueOnce([0.2] as any);
    vector.upsertBotFaqs.mockResolvedValue(undefined as any);
    repo.updateManyByIds.mockResolvedValue(undefined as any);

    const out = await service.reindexAll();
    expect(vector.embedText).toHaveBeenCalledTimes(2);
    expect(vector.upsertBotFaqs).toHaveBeenCalled();
    expect(repo.updateManyByIds.bind(repo)).toHaveBeenCalledWith(['a', 'b'], {
      vectorStatus: 'ok',
    } as any);
    expect(out.count).toBe(2);
  });
});
