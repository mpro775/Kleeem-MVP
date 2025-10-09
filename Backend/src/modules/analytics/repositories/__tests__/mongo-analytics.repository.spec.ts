import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Types } from 'mongoose';

import { Channel } from '../../../channels/schemas/channel.schema';
import { MessageSession } from '../../../messaging/schemas/message.schema';
import { Order } from '../../../orders/schemas/order.schema';
import { Product } from '../../../products/schemas/product.schema';
import { KleemMissingResponse } from '../../schemas/kleem-missing-response.schema';
import { MissingResponse } from '../../schemas/missing-response.schema';
import { MongoAnalyticsRepository } from '../mongo-analytics.repository';

import type { ChannelDocument } from '../../../channels/schemas/channel.schema';
import type { MessageSessionDocument } from '../../../messaging/schemas/message.schema';
import type { OrderDocument } from '../../../orders/schemas/order.schema';
import type { ProductDocument } from '../../../products/schemas/product.schema';
import type { CreateMissingResponseDto } from '../../dto/create-missing-response.dto';
import type { KleemMissingResponseDocument } from '../../schemas/kleem-missing-response.schema';
import type { MissingResponseDocument } from '../../schemas/missing-response.schema';
import type { TestingModule } from '@nestjs/testing';
import type { Model } from 'mongoose';

// Mock models
const mockSessionModel = {
  countDocuments: jest.fn(),
  aggregate: jest.fn(),
  find: jest.fn(),
};

const mockProductModel = {
  countDocuments: jest.fn(),
  aggregate: jest.fn(),
  find: jest.fn(),
};

const mockOrderModel = {
  countDocuments: jest.fn(),
  aggregate: jest.fn(),
  find: jest.fn(),
};

const mockMissingResponseModel = {
  countDocuments: jest.fn(),
  create: jest.fn(),
  find: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  updateMany: jest.fn(),
  aggregate: jest.fn(),
};

const mockKleemMissingModel = {
  create: jest.fn(),
  find: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  updateMany: jest.fn(),
};

const mockChannelModel = {
  find: jest.fn(),
  aggregate: jest.fn(),
};

describe('MongoAnalyticsRepository', () => {
  let repository: MongoAnalyticsRepository;
  let _sessionModel: Model<MessageSessionDocument>;
  let _productModel: Model<ProductDocument>;
  let _orderModel: Model<OrderDocument>;
  let _missingResponseModel: Model<MissingResponseDocument>;
  let _kleemMissingModel: Model<KleemMissingResponseDocument>;
  let _channelModel: Model<ChannelDocument>;

  const merchantId = new Types.ObjectId();
  const startDate = new Date('2024-01-01');
  const endDate = new Date('2024-01-31');

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MongoAnalyticsRepository,
        {
          provide: getModelToken(MessageSession.name),
          useValue: mockSessionModel,
        },
        {
          provide: getModelToken(Product.name),
          useValue: mockProductModel,
        },
        {
          provide: getModelToken(Order.name),
          useValue: mockOrderModel,
        },
        {
          provide: getModelToken(MissingResponse.name),
          useValue: mockMissingResponseModel,
        },
        {
          provide: getModelToken(KleemMissingResponse.name),
          useValue: mockKleemMissingModel,
        },
        {
          provide: getModelToken(Channel.name),
          useValue: mockChannelModel,
        },
      ],
    }).compile();

    repository = module.get<MongoAnalyticsRepository>(MongoAnalyticsRepository);
    _sessionModel = module.get<Model<MessageSessionDocument>>(
      getModelToken(MessageSession.name),
    );
    _productModel = module.get<Model<ProductDocument>>(
      getModelToken(Product.name),
    );
    _orderModel = module.get<Model<OrderDocument>>(getModelToken(Order.name));
    _missingResponseModel = module.get<Model<MissingResponseDocument>>(
      getModelToken(MissingResponse.name),
    );
    _kleemMissingModel = module.get<Model<KleemMissingResponseDocument>>(
      getModelToken(KleemMissingResponse.name),
    );
    _channelModel = module.get<Model<ChannelDocument>>(
      getModelToken(Channel.name),
    );

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('countSessions', () => {
    it('should count sessions for a merchant within date range', async () => {
      // Arrange
      const expectedCount = 10;
      mockSessionModel.countDocuments.mockResolvedValue(expectedCount);

      // Act
      const result = await repository.countSessions(
        merchantId,
        startDate,
        endDate,
      );

      // Assert
      expect(mockSessionModel.countDocuments).toHaveBeenCalledWith({
        merchantId,
        createdAt: { $gte: startDate, $lte: endDate },
      });
      expect(result).toBe(expectedCount);
    });

    it('should return 0 when no sessions found', async () => {
      // Arrange
      mockSessionModel.countDocuments.mockResolvedValue(0);

      // Act
      const result = await repository.countSessions(
        merchantId,
        startDate,
        endDate,
      );

      // Assert
      expect(result).toBe(0);
    });
  });

  describe('aggregateTotalMessages', () => {
    it('should aggregate total messages from sessions', async () => {
      // Arrange
      const expectedTotal = 25;
      mockSessionModel.aggregate.mockResolvedValue([
        { _id: null, total: expectedTotal },
      ]);

      // Act
      const result = await repository.aggregateTotalMessages(
        merchantId,
        startDate,
        endDate,
      );

      // Assert
      expect(mockSessionModel.aggregate).toHaveBeenCalledWith([
        {
          $match: { merchantId, createdAt: { $gte: startDate, $lte: endDate } },
        },
        { $project: { count: { $size: '$messages' } } },
        { $group: { _id: null, total: { $sum: '$count' } } },
      ]);
      expect(result).toBe(expectedTotal);
    });

    it('should return 0 when no messages found', async () => {
      // Arrange
      mockSessionModel.aggregate.mockResolvedValue([]);

      // Act
      const result = await repository.aggregateTotalMessages(
        merchantId,
        startDate,
        endDate,
      );

      // Assert
      expect(result).toBe(0);
    });
  });

  describe('countOrders', () => {
    it('should count orders for a merchant within date range', async () => {
      // Arrange
      const expectedCount = 5;
      mockOrderModel.countDocuments.mockResolvedValue(expectedCount);

      // Act
      const result = await repository.countOrders(
        merchantId,
        startDate,
        endDate,
      );

      // Assert
      expect(mockOrderModel.countDocuments).toHaveBeenCalledWith({
        merchantId,
        createdAt: { $gte: startDate, $lte: endDate },
      });
      expect(result).toBe(expectedCount);
    });

    it('should return 0 when no orders found', async () => {
      // Arrange
      mockOrderModel.countDocuments.mockResolvedValue(0);

      // Act
      const result = await repository.countOrders(
        merchantId,
        startDate,
        endDate,
      );

      // Assert
      expect(result).toBe(0);
    });
  });

  describe('aggregateOrdersByStatus', () => {
    it('should aggregate orders by status', async () => {
      // Arrange
      const expectedResult = {
        pending: 2,
        confirmed: 3,
        delivered: 1,
      };
      mockOrderModel.aggregate.mockResolvedValue([
        { _id: 'pending', count: 2 },
        { _id: 'confirmed', count: 3 },
        { _id: 'delivered', count: 1 },
      ]);

      // Act
      const result = await repository.aggregateOrdersByStatus(
        merchantId,
        startDate,
        endDate,
      );

      // Assert
      expect(mockOrderModel.aggregate).toHaveBeenCalledWith([
        {
          $match: { merchantId, createdAt: { $gte: startDate, $lte: endDate } },
        },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]);
      expect(result).toEqual(expectedResult);
    });

    it('should return empty object when no orders found', async () => {
      // Arrange
      mockOrderModel.aggregate.mockResolvedValue([]);

      // Act
      const result = await repository.aggregateOrdersByStatus(
        merchantId,
        startDate,
        endDate,
      );

      // Assert
      expect(result).toEqual({});
    });
  });

  describe('topKeywords', () => {
    it('should call aggregate method for top keywords', async () => {
      // Arrange
      const expectedKeywords = [
        { keyword: 'product', count: 10 },
        { keyword: 'price', count: 8 },
      ];
      mockSessionModel.aggregate.mockResolvedValue(expectedKeywords);

      // Act
      const result = await repository.topKeywords(
        merchantId,
        startDate,
        endDate,
        3,
      );

      // Assert
      expect(mockSessionModel.aggregate).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('should return empty array when no keywords found', async () => {
      // Arrange
      mockSessionModel.aggregate.mockResolvedValue([]);

      // Act
      const result = await repository.topKeywords(
        merchantId,
        startDate,
        endDate,
        5,
      );

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('countMissingOpen', () => {
    it('should count open missing responses', async () => {
      // Arrange
      const expectedCount = 3;
      mockMissingResponseModel.countDocuments.mockResolvedValue(expectedCount);

      // Act
      const result = await repository.countMissingOpen(merchantId);

      // Assert
      expect(mockMissingResponseModel.countDocuments).toHaveBeenCalledWith({
        merchant: merchantId,
        resolved: false,
      });
      expect(result).toBe(expectedCount);
    });

    it('should return 0 when no open missing responses found', async () => {
      // Arrange
      mockMissingResponseModel.countDocuments.mockResolvedValue(0);

      // Act
      const result = await repository.countMissingOpen(merchantId);

      // Assert
      expect(result).toBe(0);
    });
  });

  describe('createMissingFromWebhook', () => {
    it('should create missing response from webhook', async () => {
      // Arrange
      const dto: CreateMissingResponseDto = {
        merchant: '507f1f77bcf86cd799439011',
        channel: 'whatsapp',
        question: 'What is the price?',
        botReply: 'Sorry, I did not understand',
        sessionId: 'session123',
        customerId: 'customer456',
        type: 'missing_response',
      };

      const expectedDocument = {
        _id: new Types.ObjectId(),
        merchant: new Types.ObjectId(dto.merchant),
        channel: dto.channel,
        question: dto.question,
        botReply: dto.botReply,
        sessionId: dto.sessionId,
        customerId: dto.customerId,
        type: dto.type,
        resolved: false,
      };

      mockMissingResponseModel.create.mockResolvedValue(
        expectedDocument as any,
      );

      // Act
      const result = await repository.createMissingFromWebhook(dto);

      // Assert
      expect(mockMissingResponseModel.create).toHaveBeenCalledWith({
        merchant: new Types.ObjectId(dto.merchant),
        channel: dto.channel,
        question: dto.question,
        botReply: dto.botReply,
        sessionId: dto.sessionId,
        customerId: dto.customerId,
        type: dto.type,
        resolved: false,
      });
      expect(result).toBeDefined();
    });
  });

  describe('markMissingResolved', () => {
    it('should mark missing response as resolved', async () => {
      // Arrange
      const id = '507f1f77bcf86cd799439011';
      const userId = 'user123';

      const expectedDocument = {
        _id: new Types.ObjectId(id),
        merchant: merchantId,
        question: 'Test question',
        resolved: true,
        resolvedAt: new Date(),
        resolvedBy: userId,
      };

      mockMissingResponseModel.findByIdAndUpdate.mockResolvedValue(
        expectedDocument as any,
      );

      // Act
      const result = await repository.markMissingResolved(id, userId);

      // Assert
      expect(mockMissingResponseModel.findByIdAndUpdate).toHaveBeenCalledWith(
        id,
        expect.objectContaining({
          resolved: true,
          resolvedBy: userId,
        }),
        { new: true },
      );
      expect(result).toBeDefined();
    });

    it('should mark missing response as resolved without userId', async () => {
      // Arrange
      const id = '507f1f77bcf86cd799439011';

      const expectedDocument = {
        _id: new Types.ObjectId(id),
        resolved: true,
        resolvedAt: new Date(),
      };

      mockMissingResponseModel.findByIdAndUpdate.mockResolvedValue(
        expectedDocument as any,
      );

      // Act
      const result = await repository.markMissingResolved(id);

      // Assert
      expect(mockMissingResponseModel.findByIdAndUpdate).toHaveBeenCalledWith(
        id,
        expect.objectContaining({
          resolved: true,
        }),
        { new: true },
      );
      expect(result).toBeDefined();
    });
  });

  describe('bulkResolveMissing', () => {
    it('should bulk resolve missing responses', async () => {
      // Arrange
      const ids = ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'];
      const userId = 'user123';

      const expectedResult = { updated: 2 };
      mockMissingResponseModel.updateMany.mockResolvedValue(
        expectedResult as any,
      );

      // Act
      const result = await repository.bulkResolveMissing(ids, userId);

      // Assert
      expect(mockMissingResponseModel.updateMany).toHaveBeenCalledWith(
        { _id: { $in: ids.map((id) => new Types.ObjectId(id)) } },
        {
          $set: expect.objectContaining({
            resolved: true,
            resolvedBy: userId,
          }),
        },
      );
      expect(result).toEqual(expectedResult);
    });

    it('should bulk resolve missing responses without userId', async () => {
      // Arrange
      const ids = ['507f1f77bcf86cd799439011'];

      const expectedResult = { updated: 1 };
      mockMissingResponseModel.updateMany.mockResolvedValue(
        expectedResult as any,
      );

      // Act
      const result = await repository.bulkResolveMissing(ids);

      // Assert
      expect(mockMissingResponseModel.updateMany).toHaveBeenCalledWith(
        { _id: { $in: ids.map((id) => new Types.ObjectId(id)) } },
        {
          $set: expect.objectContaining({
            resolved: true,
          }),
        },
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('countProducts', () => {
    it('should count products for merchant', async () => {
      // Arrange
      const expectedCount = 50;
      mockProductModel.countDocuments.mockResolvedValue(expectedCount);

      // Act
      const result = await repository.countProducts(merchantId);

      // Assert
      expect(mockProductModel.countDocuments).toHaveBeenCalledWith({
        merchantId,
      });
      expect(result).toBe(expectedCount);
    });

    it('should return 0 when no products found', async () => {
      // Arrange
      mockProductModel.countDocuments.mockResolvedValue(0);

      // Act
      const result = await repository.countProducts(merchantId);

      // Assert
      expect(result).toBe(0);
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      // Arrange
      const error = new Error('Database connection failed');
      mockSessionModel.countDocuments.mockRejectedValue(error);

      // Act & Assert
      await expect(
        repository.countSessions(merchantId, startDate, endDate),
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle aggregation errors gracefully', async () => {
      // Arrange
      const error = new Error('Aggregation pipeline failed');
      mockSessionModel.aggregate.mockRejectedValue(error);

      // Act & Assert
      await expect(
        repository.aggregateTotalMessages(merchantId, startDate, endDate),
      ).rejects.toThrow('Aggregation pipeline failed');
    });
  });
});
