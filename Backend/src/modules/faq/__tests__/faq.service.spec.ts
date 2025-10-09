import { Test } from '@nestjs/testing';

import { FaqService } from '../faq.service';

import type { FaqRepository } from '../repositories/faq.repository';

describe('FaqService', () => {
  let service: FaqService;
  let repo: jest.Mocked<FaqRepository>;
  const vec = {
    embed: jest.fn(),
    upsertFaqs: jest.fn(),
    deleteFaqPointByFaqId: jest.fn(),
    deleteFaqsByFilter: jest.fn(),
    generateFaqId: (id: string) => `faq:${id}`,
  };
  const notifications = { notifyUser: jest.fn() };
  const outbox = { enqueueEvent: jest.fn() };

  beforeEach(async () => {
    repo = {
      insertManyPending: jest.fn(),
      findByIdForMerchant: jest.fn(),
      updateFieldsById: jest.fn(),
      listByMerchant: jest.fn(),
      getStatusCounts: jest.fn(),
      softDeleteById: jest.fn(),
      hardDeleteById: jest.fn(),
      softDeleteAll: jest.fn(),
      hardDeleteAll: jest.fn(),
    } as any;

    const module = await Test.createTestingModule({
      providers: [
        FaqService,
        { provide: 'FaqRepository', useValue: repo },
        { provide: 'VectorService', useValue: vec },
        { provide: 'NotificationsService', useValue: notifications },
        { provide: 'OutboxService', useValue: outbox },
      ],
    }).compile();

    service = module.get(FaqService);
    // patch private fields since we provided string tokens:
    (service as any).vectorService = vec;
    (service as any).notifications = notifications;
    (service as any).outbox = outbox;
  });

  it('createMany -> queues and processes in background', async () => {
    repo.insertManyPending.mockResolvedValue([
      { _id: '1' } as any,
      { _id: '2' } as any,
    ]);
    const res = await service.createMany('m1', [
      { question: 'q', answer: 'a' },
    ]);
    expect(res.queued).toBe(2);
  });

  it('updateOne -> re-embeds and marks completed', async () => {
    repo.findByIdForMerchant.mockResolvedValue({
      _id: 'id1',
      question: 'q',
      answer: 'a',
    } as any);
    vec.embed.mockResolvedValue([0.1, 0.2]);
    vec.upsertFaqs.mockResolvedValue(undefined);
    const out = await service.updateOne('m1', '64b000000000000000000001', {
      question: 'q2',
    });
    expect(out.success).toBe(true);
    expect(repo.updateFieldsById).toHaveBeenCalled();
  });

  it('softDelete -> ok', async () => {
    repo.softDeleteById.mockResolvedValue(true);
    const out = await service.softDelete('m1', '64b000000000000000000001');
    expect(out.softDeleted).toBe(true);
  });
});
