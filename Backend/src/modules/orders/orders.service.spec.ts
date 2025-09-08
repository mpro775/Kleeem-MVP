import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { OrdersService } from './orders.service';
import { LeadsService } from '../leads/leads.service';
import { Order } from './schemas/order.schema';
import { CreateOrderDto } from './dto/create-order.dto';

describe('OrdersService', () => {
  let service: OrdersService;
  let orderModel: jest.Mocked<any>;
  let leadsService: jest.Mocked<LeadsService>;

  const mockOrder = {
    _id: 'order123',
    merchantId: 'merchant456',
    sessionId: 'session789',
    customer: {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+966501234567',
      phoneNormalized: '966501234567',
    },
    products: [
      {
        product: 'product123',
        name: 'Test Product',
        price: 100,
        quantity: 2,
      },
    ],
    status: 'pending',
    source: 'storefront',
    createdAt: new Date(),
    updatedAt: new Date(),
    toObject: jest.fn(),
  };

  beforeEach(async () => {
    const mockOrderModel = {
      create: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findOne: jest.fn(),
      countDocuments: jest.fn(),
      sort: jest.fn(),
      limit: jest.fn(),
      skip: jest.fn(),
      exec: jest.fn(),
    };

    const mockLeadsService = {
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getModelToken(Order.name), useValue: mockOrderModel },
        { provide: LeadsService, useValue: mockLeadsService },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    orderModel = module.get(getModelToken(Order.name));
    leadsService = module.get(LeadsService);

    jest.clearAllMocks();
    mockOrder.toObject.mockReturnValue(mockOrder);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createOrderDto: CreateOrderDto = {
      merchantId: 'merchant456',
      sessionId: 'session789',
      customer: {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+966501234567',
      },
      products: [
        {
          product: 'product123',
          name: 'Test Product',
          price: 100,
          quantity: 2,
        },
      ],
      source: 'storefront',
    };

    it('should create an order successfully', async () => {
      orderModel.create.mockResolvedValue(mockOrder);
      leadsService.create.mockResolvedValue({});

      const result = await service.create(createOrderDto);

      expect(orderModel.create).toHaveBeenCalledWith({
        ...createOrderDto,
        products: createOrderDto.products.map((p) => ({
          ...p,
          product: p.product,
        })),
        customer: {
          ...createOrderDto.customer,
          phoneNormalized: '966501234567',
        },
      });
      expect(leadsService.create).toHaveBeenCalledWith(
        createOrderDto.merchantId,
        {
          sessionId: createOrderDto.sessionId,
          data: createOrderDto.customer,
          source: 'order',
        },
      );
      expect(result).toEqual(mockOrder);
    });

    it('should handle invalid product IDs gracefully', async () => {
      const dtoWithInvalidProduct = {
        ...createOrderDto,
        products: [
          {
            product: 'invalid-id',
            name: 'Test Product',
            price: 100,
            quantity: 2,
          },
        ],
      };

      orderModel.create.mockResolvedValue(mockOrder);

      await service.create(dtoWithInvalidProduct);

      expect(orderModel.create).toHaveBeenCalledWith({
        ...dtoWithInvalidProduct,
        products: [
          {
            product: undefined, // Invalid ID should be set to undefined
            name: 'Test Product',
            price: 100,
            quantity: 2,
          },
        ],
        customer: {
          ...dtoWithInvalidProduct.customer,
          phoneNormalized: '966501234567',
        },
      });
    });

    it('should continue even if lead creation fails', async () => {
      orderModel.create.mockResolvedValue(mockOrder);
      leadsService.create.mockRejectedValue(new Error('Lead creation failed'));

      const result = await service.create(createOrderDto);

      expect(result).toEqual(mockOrder);
      expect(orderModel.create).toHaveBeenCalled();
    });

    it('should set default source if not provided', async () => {
      const dtoWithoutSource = { ...createOrderDto };
      delete dtoWithoutSource.source;

      orderModel.create.mockResolvedValue(mockOrder);

      await service.create(dtoWithoutSource);

      expect(orderModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'storefront',
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return all orders sorted by creation date', async () => {
      const mockOrders = [mockOrder, { ...mockOrder, _id: 'order456' }];

      orderModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockOrders),
        }),
      });

      const result = await service.findAll();

      expect(orderModel.find).toHaveBeenCalled();
      expect(orderModel.find().sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result).toEqual(mockOrders);
    });
  });

  describe('findByMerchant', () => {
    it('should return orders for specific merchant with pagination', async () => {
      const merchantId = 'merchant456';
      const page = 1;
      const limit = 10;
      const mockOrders = [mockOrder];

      orderModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue(mockOrders),
            }),
          }),
        }),
      });

      orderModel.countDocuments.mockResolvedValue(1);

      const result = await service.findByMerchant(merchantId, page, limit);

      expect(orderModel.find).toHaveBeenCalledWith({ merchantId });
      expect(orderModel.countDocuments).toHaveBeenCalledWith({ merchantId });
      expect(result).toEqual({
        orders: mockOrders,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should handle empty results', async () => {
      const merchantId = 'merchant456';

      orderModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });

      orderModel.countDocuments.mockResolvedValue(0);

      const result = await service.findByMerchant(merchantId);

      expect(result.orders).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('findOne', () => {
    it('should return a single order by ID', async () => {
      const orderId = 'order123';

      orderModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockOrder),
      });

      const result = await service.findOne(orderId);

      expect(orderModel.findById).toHaveBeenCalledWith(orderId);
      expect(result).toEqual(mockOrder);
    });

    it('should return null for non-existent order', async () => {
      const orderId = 'nonexistent';

      orderModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.findOne(orderId);

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update order status successfully', async () => {
      const orderId = 'order123';
      const updateData = { status: 'paid' };
      const updatedOrder = { ...mockOrder, status: 'paid' };

      orderModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedOrder),
      });

      const result = await service.update(orderId, updateData);

      expect(orderModel.findByIdAndUpdate).toHaveBeenCalledWith(
        orderId,
        updateData,
        { new: true },
      );
      expect(result).toEqual(updatedOrder);
    });
  });

  describe('findBySession', () => {
    it('should find orders by session ID', async () => {
      const sessionId = 'session789';
      const mockOrders = [mockOrder];

      orderModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockOrders),
        }),
      });

      const result = await service.findBySession(sessionId);

      expect(orderModel.find).toHaveBeenCalledWith({ sessionId });
      expect(result).toEqual(mockOrders);
    });
  });

  describe('getOrderStats', () => {
    it('should return order statistics for merchant', async () => {
      const merchantId = 'merchant456';
      const mockStats = [
        { _id: 'pending', count: 5, total: 500 },
        { _id: 'paid', count: 10, total: 1000 },
      ];

      // Mock the aggregate method
      orderModel.aggregate = jest.fn().mockResolvedValue(mockStats);

      const result = await service.getOrderStats(merchantId);

      expect(orderModel.aggregate).toHaveBeenCalledWith([
        { $match: { merchantId } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            total: { $sum: { $sum: '$products.price' } },
          },
        },
      ]);
      expect(result).toEqual(mockStats);
    });
  });
});
