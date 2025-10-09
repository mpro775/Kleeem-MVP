import { Types } from 'mongoose';

import { AnalyticsService } from '../analytics.service';

describe('AnalyticsService (focused)', () => {
  const makeRepo = () =>
    ({
      countSessions: jest.fn().mockResolvedValue(10),
      aggregateTotalMessages: jest.fn().mockResolvedValue(42),
      countOrders: jest.fn().mockResolvedValue(2),
      aggregateOrdersByStatus: jest.fn().mockResolvedValue({ completed: 2 }),
      sumNonCanceledSales: jest.fn().mockResolvedValue(100),
      topKeywords: jest.fn().mockResolvedValue([{ keyword: 'k', count: 3 }]),
      topProducts: jest
        .fn()
        .mockResolvedValue([{ productId: 'p', name: 'P', count: 1 }]),
      getEnabledLogicalChannels: jest
        .fn()
        .mockResolvedValue(new Set(['telegram', 'whatsapp'])),
      channelsUsage: jest
        .fn()
        .mockResolvedValue([{ channel: 'telegram', count: 5 }]),
      getCsat: jest.fn().mockResolvedValue(4.5),
      getFirstResponseTimeSec: jest.fn().mockResolvedValue(30),
      countMissingOpen: jest.fn().mockResolvedValue(1),
      countPaidOrders: jest.fn().mockResolvedValue(2),
      messagesTimeline: jest
        .fn()
        .mockResolvedValue([{ _id: '2025-10-01', count: 5 }]),
      getTopKeywords: jest.fn().mockResolvedValue([{ keyword: 'k', count: 3 }]),
      countProducts: jest.fn().mockResolvedValue(7),
      createMissingFromWebhook: jest
        .fn()
        .mockResolvedValue({ _id: new Types.ObjectId() }),
      listMissingResponses: jest
        .fn()
        .mockResolvedValue({ items: [], total: 0 }),
      statsMissing: jest.fn().mockResolvedValue([]),
      markMissingResolved: jest.fn().mockResolvedValue(undefined),
      listKleemMissing: jest.fn().mockResolvedValue({ items: [], total: 0 }),
      updateKleemMissing: jest.fn().mockResolvedValue({ _id: 'k1' }),
      bulkResolveKleem: jest.fn().mockResolvedValue({ updated: 2 }),
      stats: jest.fn().mockResolvedValue([]),
      topProductsAlt: jest.fn(),
    }) as any;

  const makeSvc = () => {
    const repo = makeRepo();
    const faqService = {
      createMany: jest.fn().mockResolvedValue([{ _id: new Types.ObjectId() }]),
    } as any;
    const notifications = {
      notifyUser: jest.fn().mockResolvedValue(undefined),
    } as any;
    const svc = new AnalyticsService(repo, faqService, notifications);
    return { svc, repo, faqService, notifications };
  };

  it('getOverview aggregates metrics', async () => {
    const { svc } = makeSvc();
    const out = await svc.getOverview(new Types.ObjectId().toString(), 'week');
    expect(out.messages).toBe(42);
    expect(out.channels.total).toBeGreaterThan(0);
    expect(out.orders.totalSales).toBe(100);
  });

  it('listMissingResponses builds filters and paginates', async () => {
    const { svc, repo } = makeSvc();
    await svc.listMissingResponses({
      merchantId: new Types.ObjectId().toString(),
      resolved: 'false',
      channel: 'telegram',
      type: 'missing_response',
      search: 'hi',
      from: '2025-10-01',
      to: '2025-10-02',
      page: 2,
      limit: 10,
    });
    expect(repo.listMissingResponses).toHaveBeenCalled();
  });

  it('notifyMissingStatsToUser composes and sends notification', async () => {
    const { svc, notifications } = makeSvc();
    const res = await svc.notifyMissingStatsToUser({
      merchantId: 'm',
      userId: 'u',
      days: 7,
    });
    expect(res.sent).toBe(true);
    expect(notifications.notifyUser).toHaveBeenCalled();
  });
});
