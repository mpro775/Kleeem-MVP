import { Test } from '@nestjs/testing';
import { AnalyticsService } from '../analytics.service';
import { AnalyticsRepository } from '../repositories/analytics.repository';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let repo: jest.Mocked<AnalyticsRepository>;

  beforeEach(async () => {
    repo = {
      countSessions: jest.fn(),
      aggregateTotalMessages: jest.fn(),
      countOrders: jest.fn(),
      aggregateOrdersByStatus: jest.fn(),
      sumNonCanceledSales: jest.fn(),
      topKeywords: jest.fn(),
      topProducts: jest.fn(),
      getEnabledLogicalChannels: jest.fn(),
      channelsUsage: jest.fn(),
      getCsat: jest.fn(),
      getFirstResponseTimeSec: jest.fn(),
      countMissingOpen: jest.fn(),
      createMissingFromWebhook: jest.fn(),
      listMissingResponses: jest.fn(),
      markMissingResolved: jest.fn(),
      bulkResolveMissing: jest.fn(),
      statsMissing: jest.fn(),
      countPaidOrders: jest.fn(),
      countProducts: jest.fn(),
      messagesTimeline: jest.fn(),
      getTopKeywords: jest.fn(),
      createKleemFromWebhook: jest.fn(),
      listKleemMissing: jest.fn(),
      updateKleemMissing: jest.fn(),
      bulkResolveKleem: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: 'AnalyticsRepository', useValue: repo },
        {
          provide: 'FaqService',
          useValue: {
            createMany: jest.fn().mockResolvedValue([{ _id: 'faq1' }]),
          },
        },
        {
          provide: 'NotificationsService',
          useValue: { notifyUser: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(AnalyticsService);
  });

  it('should compute overview', async () => {
    repo.countSessions.mockResolvedValueOnce(10).mockResolvedValueOnce(5);
    repo.aggregateTotalMessages.mockResolvedValue(100);
    repo.countOrders.mockResolvedValueOnce(4).mockResolvedValueOnce(2);
    repo.aggregateOrdersByStatus.mockResolvedValue({ paid: 2, pending: 2 });
    repo.sumNonCanceledSales.mockResolvedValue(500);
    repo.topKeywords.mockResolvedValue([{ keyword: 'test', count: 3 }]);
    repo.topProducts.mockResolvedValue([
      { productId: 'p1', name: 'Prod', count: 5 },
    ]);
    repo.getEnabledLogicalChannels.mockResolvedValue(
      new Set(['telegram', 'whatsapp']),
    );
    repo.channelsUsage.mockResolvedValue([
      { channel: 'telegram', count: 7 },
      { channel: 'whatsapp', count: 3 },
    ]);
    repo.getCsat.mockResolvedValue(0.8);
    repo.getFirstResponseTimeSec.mockResolvedValue(12.3);
    repo.countMissingOpen.mockResolvedValue(2);
    repo.countPaidOrders.mockResolvedValue(2);
    // revenue for aov
    repo.sumNonCanceledSales.mockResolvedValue(500);

    const res = await service.getOverview('m1', 'week');
    expect(res.sessions.count).toBe(10);
    expect(res.sessions.changePercent).toBe(100);
    expect(res.orders.count).toBe(4);
    expect(res.topKeywords.length).toBe(1);
    expect(res.channels.total).toBe(2);
  });
});
