// src/analytics/analytics.service.spec.ts
// اختبارات وحدة لِـ AnalyticsService: تتحقق من بناء الاستعلامات/الـ aggregation للمدى الزمني،
// حساب النسب، تفصيل القنوات، الحدود الافتراضية، وتمرير الوسائط الصحيحة.
// Arrange–Act–Assert

import { AnalyticsService, KeywordCount, TopProduct, Overview } from './analytics.service';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import type { Model } from 'mongoose';
import { Types } from 'mongoose';
import { faker } from '@faker-js/faker';
import {
  MessageSessionDocument,
} from '../messaging/schemas/message.schema';
import { MerchantDocument } from '../merchants/schemas/merchant.schema';
import { ProductDocument } from '../products/schemas/product.schema';
import { OrderDocument } from '../orders/schemas/order.schema';
import { MissingResponseDocument } from './schemas/missing-response.schema';
import { CreateMissingResponseDto } from './dto/create-missing-response.dto';

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  let sessionModel: DeepMockProxy<Model<MessageSessionDocument>>;
  let merchantModel: DeepMockProxy<Model<MerchantDocument>>;
  let productModel: DeepMockProxy<Model<ProductDocument>>;
  let orderModel: DeepMockProxy<Model<OrderDocument>>;
  let missingResponseModel: DeepMockProxy<Model<MissingResponseDocument>>;

  const merchantId = new Types.ObjectId().toHexString();

  beforeEach(() => {
    sessionModel = mockDeep<Model<MessageSessionDocument>>();
    merchantModel = mockDeep<Model<MerchantDocument>>();
    productModel = mockDeep<Model<ProductDocument>>();
    orderModel = mockDeep<Model<OrderDocument>>();
    missingResponseModel = mockDeep<Model<MissingResponseDocument>>();

    service = new AnalyticsService(
      sessionModel as any,
      merchantModel as any,
      productModel as any,
      orderModel as any,
      missingResponseModel as any,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getOverview', () => {
    it('يحسب المؤشرات ويعيد Overview كاملًا (happy path)', async () => {
      // Arrange
      // 1) عدد الجلسات الحالية والسابقة
      sessionModel.countDocuments
        .mockResolvedValueOnce(120) // current
        .mockResolvedValueOnce(100); // prev
      // 2) إجمالي عدد الرسائل (aggregate مجموع حجم messages)
      sessionModel.aggregate
        .mockResolvedValueOnce([{ _id: null, total: 3500 }]) // messagesAgg
        // 3) order counts current/prev → عبر orderModel.countDocuments (موك أدناه)
        // 4) orders by status
        .mockResolvedValueOnce([
          { _id: 'pending', count: 2 },
          { _id: 'paid', count: 5 },
        ] as any)
        // 5) salesAgg
        .mockResolvedValueOnce([{ _id: null, total: 999 }])
        // 6) topKeywords
        .mockResolvedValueOnce([
          { keyword: 'تسوق', count: 10 },
          { keyword: 'خصم', count: 7 },
        ] as any)
        // 7) topProducts
        .mockResolvedValueOnce([
          { productId: 'prod_1', name: 'A', count: 11 },
          { productId: 'prod_2', name: 'B', count: 9 },
        ] as any)
        // 8) channelsUsage
        .mockResolvedValueOnce([
          { channel: 'whatsapp', count: 80 },
          { channel: 'telegram', count: 20 },
        ] as any);

      merchantModel.findById.mockResolvedValueOnce({
        // القنوات المفعلة: telegram, whatsapp, webchat=false
        channels: {
          telegram: { enabled: true },
          whatsapp: { enabled: true },
          webchat: { enabled: false },
        },
      } as any);

      orderModel.countDocuments
        .mockResolvedValueOnce(30) // currOrders
        .mockResolvedValueOnce(20); // prevOrders

      // orderStatusAgg & salesAgg تم موكهما ضمن sessionModel.aggregate بالتسلسل أعلاه؟ لا، يجب أن تكون ضمن orderModel.aggregate
      // تعديل: ننقل هذين النداءين للـ orderModel.aggregate
      // إعادة تهيئة: clear calls وإعادة ترتيب
      jest.clearAllMocks();

      // 1) sessions count current/prev
      sessionModel.countDocuments
        .mockResolvedValueOnce(120)
        .mockResolvedValueOnce(100);

      // 2) messagesAgg (على sessionModel)
      sessionModel.aggregate
        .mockResolvedValueOnce([{ _id: null, total: 3500 }] as any)
        // topKeywords
        .mockResolvedValueOnce([
          { keyword: 'تسوق', count: 10 },
          { keyword: 'خصم', count: 7 },
        ] as any)
        // topProducts
        .mockResolvedValueOnce([
          { productId: 'prod_1', name: 'A', count: 11 },
          { productId: 'prod_2', name: 'B', count: 9 },
        ] as any)
        // channelsUsage
        .mockResolvedValueOnce([
          { channel: 'whatsapp', count: 80 },
          { channel: 'telegram', count: 20 },
        ] as any);

      // 3) orders count current/prev
      orderModel.countDocuments
        .mockResolvedValueOnce(30)
        .mockResolvedValueOnce(20);

      // 4) orderStatusAgg
      orderModel.aggregate
        .mockResolvedValueOnce([
          { _id: 'pending', count: 2 },
          { _id: 'paid', count: 5 },
        ] as any)
        // 5) salesAgg
        .mockResolvedValueOnce([{ _id: null, total: 999 }] as any);

      merchantModel.findById.mockResolvedValueOnce({
        channels: {
          telegram: { enabled: true },
          whatsapp: { enabled: true },
          webchat: { enabled: false },
        },
      } as any);

      // Act
      const out = await service.getOverview(merchantId, 'month');

      // Assert
      // sessions + changePercent ((120-100)/100)*100 = 20
      expect(sessionModel.countDocuments).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          merchantId: expect.any(Types.ObjectId),
          createdAt: { $gte: expect.any(Date), $lte: expect.any(Date) },
        }),
      );
      expect(sessionModel.countDocuments).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          merchantId: expect.any(Types.ObjectId),
          createdAt: { $gte: expect.any(Date), $lte: expect.any(Date) },
        }),
      );
      expect(out.sessions).toEqual({ count: 120, changePercent: 20 });

      // messages total
      expect(out.messages).toBe(3500);

      // orders block
      expect(orderModel.countDocuments).toHaveBeenCalledTimes(2);
      expect(out.orders.count).toBe(30);
      expect(out.orders.changePercent).toBe(50); // (30-20)/20*100 = 50
      expect(out.orders.byStatus).toEqual({ pending: 2, paid: 5 });
      expect(out.orders.totalSales).toBe(999);

      // topKeywords / topProducts pass-through
      expect(out.topKeywords).toEqual([
        { keyword: 'تسوق', count: 10 },
        { keyword: 'خصم', count: 7 },
      ]);
      expect(out.topProducts).toEqual([
        { productId: 'prod_1', name: 'A', count: 11 },
        { productId: 'prod_2', name: 'B', count: 9 },
      ]);

      // channels breakdown includes enabled telegram/whatsapp حتى لو usage=0، ويحسب total
      expect(out.channels.total).toBe(2);
      expect(out.channels.breakdown).toEqual(
        expect.arrayContaining([
          { channel: 'whatsapp', count: 80 },
          { channel: 'telegram', count: 20 },
        ]),
      );
    });

    it('يرمي خطأ عند عدم وجود التاجر', async () => {
      // Arrange
      sessionModel.countDocuments
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      sessionModel.aggregate.mockResolvedValue([] as any);
      orderModel.countDocuments
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      orderModel.aggregate.mockResolvedValue([] as any);
      merchantModel.findById.mockResolvedValueOnce(null as any);

      // Act + Assert
      await expect(service.getOverview(merchantId, 'week')).rejects.toThrow('Merchant not found');
    });
  });

  describe('getMessagesTimeline', () => {
    it('يبني التجميع بـ groupBy=hour (format %Y-%m-%d %H:00)', async () => {
      // Arrange
      const aggOut = [{ _id: '2024-01-01 10:00', count: 5 }];
      sessionModel.aggregate.mockResolvedValueOnce(aggOut as any);

      // Act
      const out = await service.getMessagesTimeline(merchantId, 'week', 'hour');

      // Assert
      expect(sessionModel.aggregate).toHaveBeenCalledTimes(1);
      const pipeline = sessionModel.aggregate.mock.calls[0][0] as any[];
      // ابحث عن مرحلة $group مع $dateToString format
      const groupStage = pipeline.find(s => s.$group)?.$group;
      expect(groupStage._id.$dateToString.format).toBe('%Y-%m-%d %H:00');
      expect(out).toBe(aggOut as any);
    });

    it('القيم الافتراضية period=week و groupBy=day (format %Y-%m-%d)', async () => {
      sessionModel.aggregate.mockResolvedValueOnce([] as any);
      await service.getMessagesTimeline(merchantId, undefined as any, undefined as any);
      const pipeline = sessionModel.aggregate.mock.calls[0][0] as any[];
      const groupStage = pipeline.find(s => s.$group)?.$group;
      expect(groupStage._id.$dateToString.format).toBe('%Y-%m-%d');
    });
  });

  describe('getTopKeywords', () => {
    it('يمرر limit الافتراضي=10 ويُرجع النتائج', async () => {
      const result: KeywordCount[] = [{ keyword: 'شراء', count: 3 }];
      sessionModel.aggregate.mockResolvedValueOnce(result as any);

      const out = await service.getTopKeywords(merchantId, 'week');
      expect(sessionModel.aggregate).toHaveBeenCalledTimes(1);
      const pipeline = sessionModel.aggregate.mock.calls[0][0] as any[];
      const limitStage = pipeline.find(s => s.$limit);
      expect(limitStage.$limit).toBe(10);
      expect(out).toEqual(result);
    });

    it('يستخدم limit الممرَّر', async () => {
      sessionModel.aggregate.mockResolvedValueOnce([] as any);
      await service.getTopKeywords(merchantId, 'month', 7);
      const pipeline = sessionModel.aggregate.mock.calls[0][0] as any[];
      const limitStage = pipeline.find(s => s.$limit);
      expect(limitStage.$limit).toBe(7);
    });
  });

  describe('getProductsCount', () => {
    it('يعيد عدد المنتجات للتاجر', async () => {
      productModel.countDocuments.mockResolvedValueOnce(156);
      const out = await service.getProductsCount(merchantId);
      expect(productModel.countDocuments).toHaveBeenCalledWith(
        expect.objectContaining({ merchantId: expect.any(Types.ObjectId) }),
      );
      expect(out).toBe(156);
    });
  });

  describe('createFromWebhook', () => {
    it('ينشئ مستند missingResponse ويعيده', async () => {
      const dto: CreateMissingResponseDto = {
        merchant: 'merchant_123',
        channel: 'whatsapp',
        question: 'هل يتوفر لديكم هذا المنتج؟',
        botReply: 'عفواً، لم أفهم السؤال.',
        sessionId: 'session_xyz',
        aiAnalysis: 'العميل يستفسر عن توفر منتج.',
        customerId: 'customer_456',
        type: 'missing_response',
        resolved: false,
      };
      const created = { _id: faker.string.alphanumeric(24), ...dto };
      missingResponseModel.create.mockResolvedValueOnce(created as any);

      const out = await service.createFromWebhook(dto);
      expect(missingResponseModel.create).toHaveBeenCalledWith(dto);
      expect(out).toBe(created as any);
    });
  });

  describe('getTopProducts', () => {
    it('يستخدم limit الافتراضي=5 ويُرجع قائمة بالمنتجات', async () => {
      const result: TopProduct[] = [
        { productId: 'prod_1', name: 'A', count: 10 },
        { productId: 'prod_2', name: 'B', count: 8 },
      ];
      sessionModel.aggregate.mockResolvedValueOnce(result as any);

      const out = await service.getTopProducts(merchantId, 'quarter');
      const pipeline = sessionModel.aggregate.mock.calls[0][0] as any[];
      const limitStage = pipeline.find(s => s.$limit);
      expect(limitStage.$limit).toBe(5);
      expect(out).toEqual(result);
    });

    it('يأخذ limit الممرر ويُطبّقه', async () => {
      sessionModel.aggregate.mockResolvedValueOnce([] as any);
      await service.getTopProducts(merchantId, 'week', 3);
      const pipeline = sessionModel.aggregate.mock.calls[0][0] as any[];
      const limitStage = pipeline.find(s => s.$limit);
      expect(limitStage.$limit).toBe(3);
    });
  });
});
