import { Test, type TestingModule } from '@nestjs/testing';

import { BotChatsService } from '../botChats.service';
import { BOT_CHAT_REPOSITORY } from '../tokens';

import type { BotChatRepository } from '../repositories/bot-chats.repository';

describe('BotChatsService', () => {
  let service: BotChatsService;

  const repo: jest.Mocked<BotChatRepository> = {
    createOrAppend: jest.fn(),
    rateMessage: jest.fn(),
    findBySession: jest.fn(),
    findAll: jest.fn(),
    aggregate: jest.fn(),
    getFrequentBadBotReplies: jest.fn(),
    getTopQuestions: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BotChatsService,
        { provide: BOT_CHAT_REPOSITORY, useValue: repo },
      ],
    }).compile();

    service = module.get(BotChatsService);
  });

  it('createOrAppend delegates to repository', async () => {
    repo.createOrAppend.mockResolvedValue({
      sessionId: 's1',
      messages: [],
    } as any);
    const res = await service.createOrAppend('s1', [
      { role: 'user', text: 'hi' },
    ]);
    expect(repo.createOrAppend.bind(repo)).toHaveBeenCalledWith(
      's1',
      expect.any(Array),
    );
    expect(res.sessionId).toBe('s1');
  });

  it('rateMessage updates via repository', async () => {
    repo.rateMessage.mockResolvedValue();
    const out = await service.rateMessage('s1', 0, 1, 'good');
    expect(repo.rateMessage.bind(repo)).toHaveBeenCalledWith(
      's1',
      0,
      1,
      'good',
    );
    expect(out).toEqual({ status: 'ok' });
  });

  it('findAll applies filter and pagination', async () => {
    repo.findAll.mockResolvedValue({ data: [], total: 0 });
    const res = await service.findAll(1, 20, 'hello');
    expect(repo.findAll.bind(repo)).toHaveBeenCalled();
    expect(res.total).toBe(0);
  });

  it('listBotRatings aggregates and paginates', async () => {
    repo.aggregate.mockResolvedValue([
      { items: [{ id: 'x' }], meta: [{ total: 5 }] },
    ]);
    const out = await service.listBotRatings({ page: 1, limit: 10 } as any);
    expect(out.total).toBe(5);
    expect(out.items.length).toBe(1);
  });

  it('botRatingsStats returns summary, weekly, topBad', async () => {
    repo.aggregate
      .mockResolvedValueOnce([
        { totalRated: 2, thumbsUp: 1, thumbsDown: 1, upRate: 0.5 },
      ]) // summary
      .mockResolvedValueOnce([
        { _id: { y: 2024, w: 40 }, total: 2, up: 1, down: 1 },
      ]); // weekly
    repo.getFrequentBadBotReplies.mockResolvedValue([
      { text: 'bad', count: 3, feedbacks: [] },
    ]);

    const res = await service.botRatingsStats();
    expect(res.summary.totalRated).toBe(2);
    expect(res.topBad[0].text).toBe('bad');
  });

  it('top questions & bad replies delegates', async () => {
    repo.getTopQuestions.mockResolvedValue([{ question: 'Q1', count: 2 }]);
    repo.getFrequentBadBotReplies.mockResolvedValue([
      { text: 'T', count: 1, feedbacks: [] },
    ]);
    const q = await service.getTopQuestions(5);
    const b = await service.getFrequentBadBotReplies(5);
    expect(q[0].question).toBe('Q1');
    expect(b[0].text).toBe('T');
  });
});
