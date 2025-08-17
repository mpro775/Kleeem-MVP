// src/modules/orders/test/orders.spec.ts
// اختبارات شاملة لوحدة Orders: Controller + Service
// تغطي إنشاء الطلبات، استرجاعها، تحديث الحالة، وتكامل ZID
/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';

import { OrdersController } from '../orders.controller';
import { OrdersService } from '../orders.service';
import { Order, OrderDocument } from '../schemas/order.schema';
import {
  Merchant,
  MerchantDocument,
} from '../../merchants/schemas/merchant.schema';
import { LeadsService } from '../../leads/leads.service';
import { CreateOrderDto } from '../dto/create-order.dto';

describe('OrdersService', () => {
  let service: OrdersService;
  let orderModel: DeepMockProxy<Model<OrderDocument>>;
  let merchantModel: DeepMockProxy<Model<MerchantDocument>>;
  let leadsService: DeepMockProxy<LeadsService>;

  const mockOrderId = new Types.ObjectId().toHexString();
  const mockMerchantId = new Types.ObjectId().toHexString();
  const mockSessionId = 'session-12345';

  const mockOrderData: CreateOrderDto = {
    merchantId: mockMerchantId,
    sessionId: mockSessionId,
    source: 'manual',
    customer: {
      name: 'محمد أحمد',
      phone: '+966501234567',
      email: 'customer@example.com',
      address: {
        street: 'شارع الملك فهد',
        city: 'الرياض',
        country: 'المملكة العربية السعودية',
      },
    },
    items: [
      {
        productId: 'prod-123',
        name: 'منتج مميز',
        quantity: 2,
        price: 100,
        notes: 'اللون: أحمر',
      },
      {
        productId: 'prod-456',
        name: 'منتج آخر',
        quantity: 1,
        price: 50,
      },
    ],
    products: [
      {
        name: 'منتج مميز',
        quantity: 2,
        price: 100,
      },
    ],
    status: 'pending',
    totalAmount: 250,
    isPaid: false,
    paymentMethod: 'credit_card',
    metadata: {
      source: 'website',
      ip: '192.168.1.1',
    },
    notes: 'توصيل بعد الساعة 5 مساءً',
  };

  const mockOrderDocument = {
    _id: mockOrderId,
    ...mockOrderData,
    createdAt: new Date('2023-01-01T12:00:00.000Z'),
    updatedAt: new Date('2023-01-01T12:00:00.000Z'),
    toObject: jest.fn().mockReturnValue({
      _id: mockOrderId,
      ...mockOrderData,
      createdAt: new Date('2023-01-01T12:00:00.000Z'),
      updatedAt: new Date('2023-01-01T12:00:00.000Z'),
    }),
  };

  const mockMerchantDocument = {
    _id: mockMerchantId,
    id: mockMerchantId,
    zidIntegration: {
      storeId: 'store-123',
    },
  };

  beforeEach(async () => {
    orderModel = mockDeep<Model<OrderDocument>>();
    merchantModel = mockDeep<Model<MerchantDocument>>();
    leadsService = mockDeep<LeadsService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getModelToken(Order.name), useValue: orderModel },
        { provide: getModelToken(Merchant.name), useValue: merchantModel },
        { provide: LeadsService, useValue: leadsService },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('create', () => {
    it('ينشئ طلب جديد بنجاح ويحفظ lead', async () => {
      orderModel.create.mockResolvedValue(mockOrderDocument as any);
      leadsService.create.mockResolvedValue({} as any);

      const result = await service.create(mockOrderData);

      expect(orderModel.create).toHaveBeenCalledWith(mockOrderData);
      expect(leadsService.create).toHaveBeenCalledWith(mockMerchantId, {
        sessionId: mockSessionId,
        data: mockOrderData.customer,
        source: 'order',
      });
      expect(mockOrderDocument.toObject).toHaveBeenCalled();
      expect(result).toEqual(mockOrderDocument.toObject());
    });

    it('يرمي خطأ عند فشل إنشاء الطلب', async () => {
      const error = new Error('Database error');
      orderModel.create.mockRejectedValue(error);

      await expect(service.create(mockOrderData)).rejects.toThrow(error);
      expect(leadsService.create).not.toHaveBeenCalled();
    });

    it('ينشئ الطلب حتى لو فشل إنشاء lead', async () => {
      orderModel.create.mockResolvedValue(mockOrderDocument as any);
      leadsService.create.mockRejectedValue(new Error('Leads service error'));

      await expect(service.create(mockOrderData)).rejects.toThrow(
        'Leads service error',
      );
      expect(orderModel.create).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('يسترجع جميع الطلبات مرتبة بالتاريخ', async () => {
      const mockOrders = [
        mockOrderDocument,
        { ...mockOrderDocument, _id: 'order2' },
      ];
      const sortMock = jest.fn().mockReturnThis();
      const execMock = jest.fn().mockResolvedValue(mockOrders);

      (orderModel.find as jest.Mock).mockReturnValue({
        sort: sortMock,
        exec: execMock,
      });

      const result = await service.findAll();

      expect(orderModel.find).toHaveBeenCalledWith();
      expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });
      expect(execMock).toHaveBeenCalled();
      expect(result).toEqual(mockOrders);
    });

    it('يعيد مصفوفة فارغة عند عدم وجود طلبات', async () => {
      const sortMock = jest.fn().mockReturnThis();
      const execMock = jest.fn().mockResolvedValue([]);

      (orderModel.find as jest.Mock).mockReturnValue({
        sort: sortMock,
        exec: execMock,
      });

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('يسترجع طلب محدد بنجاح', async () => {
      const leanOrderDoc = {
        _id: mockOrderId,
        status: 'pending',
        createdAt: new Date('2023-01-01T12:00:00.000Z'),
        customer: { name: 'محمد أحمد', phone: '+966501234567' },
        products: [{ name: 'منتج مميز', quantity: 2, price: 100 }],
      };

      const leanMock = jest.fn().mockResolvedValue(leanOrderDoc);
      (orderModel.findById as jest.Mock).mockReturnValue({ lean: leanMock });

      const result = await service.findOne(mockOrderId);

      expect(orderModel.findById).toHaveBeenCalledWith(mockOrderId);
      expect(leanMock).toHaveBeenCalled();
      expect(result).toEqual({
        _id: mockOrderId,
        status: 'pending',
        createdAt: '2023-01-01T12:00:00.000Z',
        customer: {
          name: 'محمد أحمد',
          phone: '+966501234567',
          address: undefined,
        },
        products: [{ name: 'منتج مميز', quantity: 2, price: 100 }],
      });
    });

    it('يعيد null عند عدم وجود الطلب', async () => {
      const leanMock = jest.fn().mockResolvedValue(null);
      (orderModel.findById as jest.Mock).mockReturnValue({ lean: leanMock });

      const result = await service.findOne('nonexistent-id');

      expect(result).toBeNull();
    });

    it('يتعامل مع تواريخ مختلفة الأشكال', async () => {
      const leanOrderDoc = {
        _id: mockOrderId,
        createdAt: '2023-01-01T12:00:00.000Z', // نص بدلاً من Date object
        customer: {},
        products: [],
      };

      const leanMock = jest.fn().mockResolvedValue(leanOrderDoc);
      (orderModel.findById as jest.Mock).mockReturnValue({ lean: leanMock });

      const result = await service.findOne(mockOrderId);

      expect(result?.createdAt).toBe('2023-01-01T12:00:00.000Z');
    });
  });

  describe('updateStatus', () => {
    it('يحدث حالة الطلب بنجاح', async () => {
      const updatedOrder = { ...mockOrderDocument, status: 'paid' };
      orderModel.findByIdAndUpdate.mockResolvedValue(updatedOrder as any);

      const result = await service.updateStatus(mockOrderId, 'paid');

      expect(orderModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockOrderId,
        { status: 'paid' },
        { new: true },
      );
      expect(result).toEqual(updatedOrder);
    });

    it('يعيد null عند عدم وجود الطلب', async () => {
      orderModel.findByIdAndUpdate.mockResolvedValue(null);

      const result = await service.updateStatus('nonexistent-id', 'paid');

      expect(result).toBeNull();
    });
  });

  describe('findByCustomer', () => {
    it('يسترجع طلبات العميل بناءً على رقم الهاتف', async () => {
      const customerOrders = [mockOrderDocument];
      const sortMock = jest.fn().mockResolvedValue(customerOrders);

      (orderModel.find as jest.Mock).mockReturnValue({
        sort: sortMock,
      });

      const result = await service.findByCustomer(
        mockMerchantId,
        '+966501234567',
      );

      expect(orderModel.find).toHaveBeenCalledWith({
        merchantId: mockMerchantId,
        'customer.phone': '+966501234567',
      });
      expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result).toEqual(customerOrders);
    });

    it('يعيد مصفوفة فارغة عند عدم وجود طلبات للعميل', async () => {
      const sortMock = jest.fn().mockResolvedValue([]);

      (orderModel.find as jest.Mock).mockReturnValue({
        sort: sortMock,
      });

      const result = await service.findByCustomer(
        mockMerchantId,
        'unknown-phone',
      );

      expect(result).toEqual([]);
    });
  });

  describe('findMerchantByStoreId', () => {
    it('يجد التاجر بناءً على storeId', async () => {
      merchantModel.findOne.mockResolvedValue(mockMerchantDocument as any);

      const result = await service.findMerchantByStoreId('store-123');

      expect(merchantModel.findOne).toHaveBeenCalledWith({
        'zidIntegration.storeId': 'store-123',
      });
      expect(result).toEqual(mockMerchantDocument);
    });

    it('يعيد null عند عدم وجود التاجر', async () => {
      merchantModel.findOne.mockResolvedValue(null);

      const result = await service.findMerchantByStoreId('unknown-store');

      expect(result).toBeNull();
    });
  });

  describe('upsertFromZid', () => {
    const mockZidOrder = {
      id: 'zid-order-123',
      session_id: 'zid-session-456',
      status: 'paid',
      customer: {
        name: 'عميل زد',
        phone: '+966509876543',
        address: 'عنوان العميل',
      },
      products: [
        {
          name: 'منتج من زد',
          price: 200,
          quantity: 1,
        },
      ],
      created_at: '2023-01-01T10:00:00.000Z',
    };

    it('ينشئ طلب جديد من ZID عند عدم وجود طلب سابق', async () => {
      merchantModel.findOne.mockResolvedValue(mockMerchantDocument as any);
      orderModel.findOne.mockResolvedValue(null); // لا يوجد طلب سابق
      orderModel.create.mockResolvedValue(mockOrderDocument as any);

      const result = await service.upsertFromZid('store-123', mockZidOrder);

      expect(merchantModel.findOne).toHaveBeenCalledWith({
        'zidIntegration.storeId': 'store-123',
      });
      expect(orderModel.findOne).toHaveBeenCalledWith({
        merchantId: mockMerchantId,
        externalId: 'zid-order-123',
        source: 'api',
      });
      expect(orderModel.create).toHaveBeenCalledWith({
        merchantId: mockMerchantId,
        sessionId: 'zid-session-456',
        source: 'api',
        externalId: 'zid-order-123',
        status: 'paid',
        customer: {
          name: 'عميل زد',
          phone: '+966509876543',
          address: 'عنوان العميل',
        },
        products: [
          {
            name: 'منتج من زد',
            price: 200,
            quantity: 1,
          },
        ],
        createdAt: new Date('2023-01-01T10:00:00.000Z'),
      });
      expect(result).toEqual(mockOrderDocument);
    });

    it('يحدث طلب موجود من ZID', async () => {
      const existingOrder = {
        ...mockOrderDocument,
        set: jest.fn().mockReturnThis(),
        save: jest.fn().mockResolvedValue(mockOrderDocument),
      };

      merchantModel.findOne.mockResolvedValue(mockMerchantDocument as any);
      orderModel.findOne.mockResolvedValue(existingOrder as any);

      const result = await service.upsertFromZid('store-123', mockZidOrder);

      expect(existingOrder.set).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'paid',
          externalId: 'zid-order-123',
        }),
      );
      expect(existingOrder.save).toHaveBeenCalled();
      expect(result).toEqual(mockOrderDocument);
    });

    it('يرمي خطأ عند عدم وجود التاجر', async () => {
      merchantModel.findOne.mockResolvedValue(null);

      await expect(
        service.upsertFromZid('unknown-store', mockZidOrder),
      ).rejects.toThrow('Merchant not found for this store_id');
    });

    it('يتعامل مع بيانات ZID ناقصة', async () => {
      const incompleteZidOrder = {
        id: 'zid-order-456',
        // بيانات ناقصة
      };

      merchantModel.findOne.mockResolvedValue(mockMerchantDocument as any);
      orderModel.findOne.mockResolvedValue(null);
      orderModel.create.mockResolvedValue(mockOrderDocument as any);

      const result = await service.upsertFromZid(
        'store-123',
        incompleteZidOrder,
      );

      expect(orderModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: {
            name: '',
            phone: '',
            address: '',
          },
          products: [],
        }),
      );
      expect(result).toEqual(mockOrderDocument);
    });
  });

  describe('updateOrderStatusFromZid', () => {
    it('يحدث حالة الطلب من ZID بنجاح', async () => {
      const mockZidOrder = { id: 'zid-order-123', status: 'shipped' };
      const updatedOrder = { ...mockOrderDocument, status: 'shipped' };

      merchantModel.findOne.mockResolvedValue(mockMerchantDocument as any);
      orderModel.findOneAndUpdate.mockResolvedValue(updatedOrder as any);

      const result = await service.updateOrderStatusFromZid(
        'store-123',
        mockZidOrder,
      );

      expect(merchantModel.findOne).toHaveBeenCalledWith({
        'zidIntegration.storeId': 'store-123',
      });
      expect(orderModel.findOneAndUpdate).toHaveBeenCalledWith(
        {
          merchantId: mockMerchantId,
          externalId: 'zid-order-123',
          source: 'api',
        },
        { status: 'shipped' },
        { new: true },
      );
      expect(result).toEqual(updatedOrder);
    });

    it('يعيد null عند عدم وجود الطلب', async () => {
      const mockZidOrder = { id: 'nonexistent-order', status: 'shipped' };

      merchantModel.findOne.mockResolvedValue(mockMerchantDocument as any);
      orderModel.findOneAndUpdate.mockResolvedValue(null);

      const result = await service.updateOrderStatusFromZid(
        'store-123',
        mockZidOrder,
      );

      expect(result).toBeNull();
    });

    it('يرمي خطأ عند عدم وجود التاجر', async () => {
      const mockZidOrder = { id: 'zid-order-123', status: 'shipped' };

      merchantModel.findOne.mockResolvedValue(null);

      await expect(
        service.updateOrderStatusFromZid('unknown-store', mockZidOrder),
      ).rejects.toThrow('Merchant not found for this store_id');
    });
  });
});

describe('OrdersController', () => {
  let controller: OrdersController;
  let service: DeepMockProxy<OrdersService>;
  let moduleRef: TestingModule;

  const mockOrderResponse = {
    _id: 'order-123',
    merchantId: 'merchant-123',
    sessionId: 'session-456',
    customer: {
      name: 'محمد أحمد',
      phone: '+966501234567',
    },
    products: [
      {
        name: 'منتج مميز',
        quantity: 2,
        price: 100,
      },
    ],
    status: 'pending',
    createdAt: new Date('2023-01-01T12:00:00.000Z'),
  };

  beforeEach(async () => {
    service = mockDeep<OrdersService>();

    moduleRef = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [{ provide: OrdersService, useValue: service }],
    }).compile();

    controller = moduleRef.get<OrdersController>(OrdersController);
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await moduleRef?.close();
    jest.restoreAllMocks();
  });

  describe('create', () => {
    it('ينشئ طلب جديد بنجاح', async () => {
      const createOrderDto: CreateOrderDto = {
        merchantId: 'merchant-123',
        sessionId: 'session-456',
        source: 'manual',
        customer: {
          name: 'محمد أحمد',
          phone: '+966501234567',
          email: 'customer@example.com',
        },
        items: [
          {
            productId: 'prod-123',
            name: 'منتج مميز',
            quantity: 2,
            price: 100,
          },
        ],
        products: [
          {
            name: 'منتج مميز',
            quantity: 2,
            price: 100,
          },
        ],
        status: 'pending',
      };

      service.create.mockResolvedValue(mockOrderResponse as any);

      const result = await controller.create(createOrderDto);

      expect(service.create).toHaveBeenCalledWith(createOrderDto);
      expect(result).toEqual(mockOrderResponse);
    });

    it('يمرر أخطاء الخدمة إلى المتحكم', async () => {
      const createOrderDto: CreateOrderDto = {
        merchantId: 'merchant-123',
        sessionId: 'session-456',
        source: 'manual',
        customer: {
          name: 'محمد أحمد',
          phone: '+966501234567',
        },
        items: [
          {
            productId: 'prod-123',
            name: 'منتج مميز',
            quantity: 2,
            price: 100,
          },
        ],
        products: [],
      };

      const error = new Error('Database connection failed');
      service.create.mockRejectedValue(error);

      await expect(controller.create(createOrderDto)).rejects.toThrow(error);
    });
  });

  describe('findAll', () => {
    it('يسترجع جميع الطلبات بنجاح', async () => {
      const mockOrders = [
        mockOrderResponse,
        { ...mockOrderResponse, _id: 'order-456' },
      ];

      service.findAll.mockResolvedValue(mockOrders as any);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual(mockOrders);
    });

    it('يعيد مصفوفة فارغة عند عدم وجود طلبات', async () => {
      service.findAll.mockResolvedValue([]);

      const result = await controller.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('يسترجع طلب محدد بنجاح', async () => {
      const orderId = 'order-123';
      const mockOrder = {
        _id: orderId,
        status: 'pending',
        createdAt: '2023-01-01T12:00:00.000Z',
        customer: {
          name: 'محمد أحمد',
          phone: '+966501234567',
          address: undefined,
        },
        products: [{ name: 'منتج مميز', quantity: 2, price: 100 }],
      };

      service.findOne.mockResolvedValue(mockOrder as any);

      const result = await controller.findOne(orderId);

      expect(service.findOne).toHaveBeenCalledWith(orderId);
      expect(result).toEqual(mockOrder);
    });

    it('يعيد null عند عدم وجود الطلب', async () => {
      service.findOne.mockResolvedValue(null);

      const result = await controller.findOne('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('updateStatus', () => {
    it('يحدث حالة الطلب بنجاح', async () => {
      const orderId = 'order-123';
      const newStatus = 'paid';
      const updatedOrder = { ...mockOrderResponse, status: newStatus };

      service.updateStatus.mockResolvedValue(updatedOrder as any);

      const result = await controller.updateStatus(orderId, newStatus);

      expect(service.updateStatus).toHaveBeenCalledWith(orderId, newStatus);
      expect(result).toEqual(updatedOrder);
    });

    it('يعيد null عند عدم وجود الطلب', async () => {
      service.updateStatus.mockResolvedValue(null);

      const result = await controller.updateStatus('nonexistent-id', 'paid');

      expect(result).toBeNull();
    });
  });

  describe('findByCustomer', () => {
    it('يسترجع طلبات العميل بنجاح', async () => {
      const merchantId = 'merchant-123';
      const phone = '+966501234567';
      const customerOrders = [
        mockOrderResponse,
        { ...mockOrderResponse, _id: 'order-456' },
      ];

      service.findByCustomer.mockResolvedValue(customerOrders as any);

      const result = await controller.findByCustomer(merchantId, phone);

      expect(service.findByCustomer).toHaveBeenCalledWith(merchantId, phone);
      expect(result).toEqual(customerOrders);
    });

    it('يعيد مصفوفة فارغة عند عدم وجود طلبات للعميل', async () => {
      service.findByCustomer.mockResolvedValue([]);

      const result = await controller.findByCustomer(
        'merchant-123',
        'unknown-phone',
      );

      expect(result).toEqual([]);
    });
  });

  describe('Integration Tests', () => {
    it('يختبر تدفق كامل: إنشاء → استرجاع → تحديث الحالة', async () => {
      const createOrderDto: CreateOrderDto = {
        merchantId: 'merchant-123',
        sessionId: 'session-456',
        source: 'manual',
        customer: {
          name: 'محمد أحمد',
          phone: '+966501234567',
        },
        items: [
          {
            productId: 'prod-123',
            name: 'منتج مميز',
            quantity: 2,
            price: 100,
          },
        ],
        products: [],
      };

      // 1. إنشاء طلب
      service.create.mockResolvedValue(mockOrderResponse as any);
      const createResult = await controller.create(createOrderDto);
      expect(createResult).toEqual(mockOrderResponse);

      // 2. استرجاع الطلب
      service.findOne.mockResolvedValue(mockOrderResponse as any);
      const findResult = await controller.findOne(mockOrderResponse._id);
      expect(findResult).toEqual(mockOrderResponse);

      // 3. تحديث حالة الطلب
      const updatedOrder = { ...mockOrderResponse, status: 'paid' };
      service.updateStatus.mockResolvedValue(updatedOrder as any);
      const updateResult = await controller.updateStatus(
        mockOrderResponse._id,
        'paid',
      );
      expect(updateResult).toEqual(updatedOrder);

      // 4. البحث بطلبات العميل
      service.findByCustomer.mockResolvedValue([updatedOrder] as any);
      const customerOrdersResult = await controller.findByCustomer(
        mockOrderResponse.merchantId,
        mockOrderResponse.customer.phone,
      );
      expect(customerOrdersResult).toEqual([updatedOrder]);

      // التحقق من الاستدعاءات
      expect(service.create).toHaveBeenCalled();
      expect(service.findOne).toHaveBeenCalled();
      expect(service.updateStatus).toHaveBeenCalled();
      expect(service.findByCustomer).toHaveBeenCalled();
    });

    it('يختبر سيناريو ZID integration', async () => {
      // محاكاة upsert من ZID
      const zidOrderResponse = {
        ...mockOrderResponse,
        externalId: 'zid-order-789',
        source: 'api',
        status: 'paid',
      };

      // لا نختبر upsertFromZid مباشرة من Controller لأنه غير موجود
      // لكن يمكننا محاكاة السيناريو
      service.findOne.mockResolvedValue(zidOrderResponse as any);

      const result = await controller.findOne(zidOrderResponse._id);
      expect(result).toEqual(zidOrderResponse);
    });
  });
});
