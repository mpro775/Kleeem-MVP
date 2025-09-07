// src/analytics/analytics.controller.spec.ts
// اختبارات وحدة لِـ AnalyticsController: تتحقق من تمرير القيم للـ AnalyticsService بشكل صحيح،
// القيم الافتراضية للـ query params، وتحويل limit إلى رقم، وشكل المخرجات من كل ميثود.
// Arrange–Act–Assert

import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsController } from './analytics.controller';
import {
  AnalyticsService,
  Overview,
  KeywordCount,
  TopProduct,
} from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { Request } from 'express';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { faker } from '@faker-js/faker';

describe('AnalyticsController', () => {
  let controller: AnalyticsController;
  let service: DeepMockProxy<AnalyticsService>;

  const merchantId = faker.string.uuid();

  // helper لإنشاء Request stub مع user.merchantId
  const makeReq = (): Request & { user: { merchantId: string } } =>
    ({ user: { merchantId } }) as any;

  beforeEach(async () => {
    service = mockDeep<AnalyticsService>();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [{ provide: AnalyticsService, useValue: service }],
    })
      // guard bypass (لن يُستخدم فعليًا عند استدعاء الدوال مباشرة، لكن نُثبّت السلوك)
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get<AnalyticsController>(AnalyticsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('overview', () => {
    it('يمرر merchantId و period للخدمة ويعيد النتيجة (happy path)', async () => {
      const req = makeReq();
      const period: 'week' | 'month' | 'quarter' = 'month';
      const overview: Overview = {
        sessions: { count: 100, changePercent: 10 },
        messages: 200,
        topKeywords: [{ keyword: 'تجربة', count: 5 }],
        topProducts: [{ productId: 'p1', name: 'Prod', views: 12 } as any],
        channels: {
          total: 2,
          breakdown: [{ channel: 'whatsapp', count: 50 }] as any,
        },
      } as any;

      service.getOverview.mockResolvedValueOnce(overview);

      const out = await controller.overview(req, period);
      expect(service.getOverview).toHaveBeenCalledWith(merchantId, 'month');
      expect(out).toBe(overview);
    });

    it('يستخدم القيمة الافتراضية period=week عند عدم التحديد', async () => {
      const req = makeReq();
      service.getOverview.mockResolvedValueOnce({} as any);
      await controller.overview(req, undefined!);
      expect(service.getOverview).toHaveBeenCalledWith(merchantId, 'week');
    });
  });

  describe('topKeywords', () => {
    it('يمرر merchantId و period و limit (مع تحويل limit إلى رقم)', async () => {
      const req = makeReq();
      const period: 'week' | 'month' | 'quarter' = 'quarter';
      const limitStr = '7';
      const expected: KeywordCount[] = [
        { keyword: 'شراء', count: 10 },
        { keyword: 'خصم', count: 8 },
      ];
      service.getTopKeywords.mockResolvedValueOnce(expected);

      const out = await controller.topKeywords(req, period, limitStr);
      expect(service.getTopKeywords).toHaveBeenCalledWith(
        merchantId,
        'quarter',
        7,
      );
      expect(out).toBe(expected);
    });

    it('يستخدم limit الافتراضي "10" ← يُحوَّل إلى 10 عند عدم التحديد', async () => {
      const req = makeReq();
      service.getTopKeywords.mockResolvedValueOnce([] as any);
      await controller.topKeywords(req, 'week', undefined!);
      expect(service.getTopKeywords).toHaveBeenCalledWith(
        merchantId,
        'week',
        10,
      );
    });
  });

  describe('messagesTimeline', () => {
    it('يمرر merchantId و period و groupBy للخدمة', async () => {
      const req = makeReq();
      const period: 'week' | 'month' | 'quarter' = 'week';
      const groupBy: 'day' | 'hour' = 'hour';
      const timeline = [{ date: '2024-01-15T10:00:00Z', count: 42 }];
      service.getMessagesTimeline.mockResolvedValueOnce(timeline as any);

      const out = await controller.messagesTimeline(req, period, groupBy);
      expect(service.getMessagesTimeline).toHaveBeenCalledWith(
        merchantId,
        'week',
        'hour',
      );
      expect(out).toBe(timeline);
    });

    it('يستخدم القيم الافتراضية period=week و groupBy=day عند عدم التحديد', async () => {
      const req = makeReq();
      service.getMessagesTimeline.mockResolvedValueOnce([] as any);

      await controller.messagesTimeline(req, undefined!, undefined!);
      expect(service.getMessagesTimeline).toHaveBeenCalledWith(
        merchantId,
        'week',
        'day',
      );
    });
  });

  describe('productsCount', () => {
    it('يعيد كائن { total } بعد استدعاء الخدمة بالقيمة الصحيحة', async () => {
      const req = makeReq();
      service.getProductsCount.mockResolvedValueOnce(156);

      const out = await controller.productsCount(req);
      expect(service.getProductsCount).toHaveBeenCalledWith(merchantId);
      expect(out).toEqual({ total: 156 });
    });
  });

  describe('webhook', () => {
    it('ينشئ المستند من الحمولة ويعيد success و id', async () => {
      const dto: any = {
        event: 'product_view',
        data: {
          productId: 'prod_123',
          userId: 'user_456',
          timestamp: '2024-01-15T10:30:00Z',
        },
        source: 'webhook',
      };
      const fakeId = faker.string.alphanumeric(24);
      service.createFromWebhook.mockResolvedValueOnce({ _id: fakeId } as any);

      const out = await controller.webhook(dto);
      expect(service.createFromWebhook).toHaveBeenCalledWith(dto);
      expect(out).toEqual({ success: true, id: fakeId });
    });

    it('يمرر الخطأ للأعلى عند فشل الخدمة (error path)', async () => {
      const dto: any = { event: 'x', data: {}, source: 'webhook' };
      service.createFromWebhook.mockRejectedValueOnce(new Error('bad payload'));
      await expect(controller.webhook(dto)).rejects.toThrow('bad payload');
    });
  });

  describe('topProducts', () => {
    it('يمرر merchantId و period و limit (مع تحويل limit إلى رقم) ويعيد النتيجة', async () => {
      const req = makeReq();
      const res: TopProduct[] = [
        {
          productId: 'prod_1',
          name: 'A',
          views: 10,
          interactions: 20,
          conversionRate: 0.1,
        } as any,
      ];
      service.getTopProducts.mockResolvedValueOnce(res);

      const out = await controller.topProducts(req, 'month', '3');
      expect(service.getTopProducts).toHaveBeenCalledWith(
        merchantId,
        'month',
        3,
      );
      expect(out).toBe(res);
    });

    it('limit الافتراضي "5" ← يُحوَّل إلى 5 عند عدم التحديد', async () => {
      const req = makeReq();
      service.getTopProducts.mockResolvedValueOnce([] as any);

      await controller.topProducts(req, 'week', undefined!);
      expect(service.getTopProducts).toHaveBeenCalledWith(
        merchantId,
        'week',
        5,
      );
    });
  });
});
