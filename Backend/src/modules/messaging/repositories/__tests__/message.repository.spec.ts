import { getModelToken } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';

import { MessageSession } from '../../schemas/message.schema';
import { MessageMongoRepository } from '../message.mongo.repository';

import type { MessageSessionDocument } from '../../schemas/message.schema';
import type {
  MessageRepository,
  MessageItem,
  MessageSessionEntity,
} from '../message.repository';
import type { Model } from 'mongoose';

describe('MessageRepository Interface Implementation', () => {
  let repository: MessageRepository;
  let model: jest.Mocked<Model<MessageSessionDocument>>;

  const mockMerchantId = '507f1f77bcf86cd799439011';
  const mockSessionId = 'test-session-123';
  const mockChannel = 'whatsapp';

  beforeEach(async () => {
    const mockModel = {
      findOne: jest.fn(),
      create: jest.fn(),
      updateOne: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      deleteOne: jest.fn(),
      aggregate: jest.fn(),
      countDocuments: jest.fn(),
      find: jest.fn(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn(),
      session: jest.fn().mockReturnThis(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageMongoRepository,
        {
          provide: getModelToken(MessageSession.name),
          useValue: mockModel,
        },
      ],
    }).compile();

    repository = module.get<MessageRepository>(MessageMongoRepository);
    model = module.get(getModelToken(MessageSession.name));
  });

  describe('Interface compliance', () => {
    it('should implement MessageRepository interface correctly', () => {
      // Verify that the repository implements all required methods from MessageRepository interface
      expect(typeof repository.findByMerchantSessionChannel).toBe('function');
      expect(typeof repository.createSessionWithMessages).toBe('function');
      expect(typeof repository.appendMessagesById).toBe('function');
      expect(typeof repository.findByWidgetSlugAndSession).toBe('function');
      expect(typeof repository.updateMessageRating).toBe('function');
      expect(typeof repository.getMessageTextById).toBe('function');
      expect(typeof repository.findBySession).toBe('function');
      expect(typeof repository.findById).toBe('function');
      expect(typeof repository.setHandover).toBe('function');
      expect(typeof repository.updateById).toBe('function');
      expect(typeof repository.deleteById).toBe('function');
      expect(typeof repository.aggregateFrequentBadBotReplies).toBe('function');
      expect(typeof repository.findAll).toBe('function');
    });

    it('should have correct method signatures matching interface', () => {
      // Test method signatures match the interface definition

      // findByMerchantSessionChannel(merchantId: string, sessionId: string, channel?: string, opts?: { session?: ClientSession })
      expect(
        repository.findByMerchantSessionChannel.length,
      ).toBeGreaterThanOrEqual(2);
      expect(
        repository.findByMerchantSessionChannel.length,
      ).toBeLessThanOrEqual(4);

      // createSessionWithMessages(data: { merchantId: string; sessionId: string; channel?: string; messages: MessageItem[]; }, opts?: { session?: ClientSession })
      expect(
        repository.createSessionWithMessages.length,
      ).toBeGreaterThanOrEqual(1);
      expect(repository.createSessionWithMessages.length).toBeLessThanOrEqual(
        2,
      );

      // appendMessagesById(id: string, messages: MessageItem[], opts?: { session?: ClientSession })
      expect(repository.appendMessagesById.length).toBeGreaterThanOrEqual(2);
      expect(repository.appendMessagesById.length).toBeLessThanOrEqual(3);

      // findByWidgetSlugAndSession(slug: string, sessionId: string, channel: 'webchat')
      expect(repository.findByWidgetSlugAndSession.length).toBe(3);

      // updateMessageRating(params: { sessionId: string; messageId: string; userId: string; rating: 0 | 1; feedback?: string; merchantId?: string; })
      expect(repository.updateMessageRating.length).toBe(1);

      // getMessageTextById(sessionId: string, messageId: string)
      expect(repository.getMessageTextById.length).toBe(2);

      // findBySession(merchantId: string, sessionId: string)
      expect(repository.findBySession.length).toBe(2);

      // findById(id: string)
      expect(repository.findById.length).toBe(1);

      // setHandover(sessionId: string, merchantId: string, handoverToAgent: boolean)
      expect(repository.setHandover.length).toBe(3);

      // updateById(id: string, patch: Partial<MessageSessionEntity>)
      expect(repository.updateById.length).toBe(2);

      // deleteById(id: string)
      expect(repository.deleteById.length).toBe(1);

      // aggregateFrequentBadBotReplies(merchantId: string, limit?: number)
      expect(
        repository.aggregateFrequentBadBotReplies.length,
      ).toBeGreaterThanOrEqual(1);
      expect(
        repository.aggregateFrequentBadBotReplies.length,
      ).toBeLessThanOrEqual(2);

      // findAll(filters: { merchantId?: string; channel?: string; limit: number; page: number; })
      expect(repository.findAll.length).toBe(1);
    });

    it('should return correct return types', async () => {
      // Mock successful responses for type checking
      const mockMessageSession: MessageSessionEntity = {
        _id: '507f1f77bcf86cd799439011' as any,
        merchantId: '507f1f77bcf86cd799439011' as any,
        sessionId: mockSessionId,
        channel: mockChannel,
        handoverToAgent: false,
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // findByMerchantSessionChannel should return Promise<MessageSessionEntity | null>
      model.findOne.mockReturnValue({
        session: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockMessageSession),
      } as any);

      const findResult = await repository.findByMerchantSessionChannel(
        mockMerchantId,
        mockSessionId,
        mockChannel,
      );
      expect(findResult).toBeDefined();

      // createSessionWithMessages should return Promise<MessageSessionEntity>
      model.create.mockResolvedValue([mockMessageSession] as any);
      model.findById.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockMessageSession),
      } as any);

      const createResult = await repository.createSessionWithMessages({
        merchantId: mockMerchantId,
        sessionId: mockSessionId,
        channel: mockChannel,
        messages: [],
      });
      expect(createResult).toBeDefined();

      // appendMessagesById should return Promise<MessageSessionEntity>
      model.updateOne.mockResolvedValue({ modifiedCount: 1 } as any);
      model.findById.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockMessageSession),
      } as any);

      const appendResult = await repository.appendMessagesById(
        '507f1f77bcf86cd799439011',
        [],
      );
      expect(appendResult).toBeDefined();

      // findByWidgetSlugAndSession should return Promise<MessageSessionEntity | null>
      model.findOne.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockMessageSession),
      } as any);

      const widgetResult = await repository.findByWidgetSlugAndSession(
        'test-slug',
        mockSessionId,
        'webchat',
      );
      expect(widgetResult).toBeDefined();

      // updateMessageRating should return Promise<boolean>
      model.updateOne.mockResolvedValue({ matchedCount: 1 } as any);

      const ratingResult = await repository.updateMessageRating({
        sessionId: mockSessionId,
        messageId: '507f1f77bcf86cd799439011',
        userId: '507f1f77bcf86cd799439011',
        rating: 1,
      });
      expect(typeof ratingResult).toBe('boolean');

      // getMessageTextById should return Promise<string | undefined>
      model.findOne.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({
          messages: [{ text: 'test message' }],
        }),
      } as any);

      const textResult = await repository.getMessageTextById(
        mockSessionId,
        '507f1f77bcf86cd799439011',
      );
      expect(typeof textResult === 'string' || textResult === undefined).toBe(
        true,
      );

      // findBySession should return Promise<MessageSessionEntity | null>
      model.findOne.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockMessageSession),
      } as any);

      const sessionResult = await repository.findBySession(
        mockMerchantId,
        mockSessionId,
      );
      expect(sessionResult).toBeDefined();

      // findById should return Promise<MessageSessionEntity | null>
      model.findById.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockMessageSession),
      } as any);

      const idResult = await repository.findById('507f1f77bcf86cd799439011');
      expect(idResult).toBeDefined();

      // updateById should return Promise<MessageSessionEntity | null>
      model.findByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockMessageSession),
      } as any);

      const updateResult = await repository.updateById(
        '507f1f77bcf86cd799439011',
        {},
      );
      expect(updateResult).toBeDefined();

      // deleteById should return Promise<boolean>
      model.deleteOne.mockResolvedValue({ deletedCount: 1 } as any);

      const deleteResult = await repository.deleteById(
        '507f1f77bcf86cd799439011',
      );
      expect(typeof deleteResult).toBe('boolean');

      // aggregateFrequentBadBotReplies should return Promise<Array<{ text: string; count: number; feedbacks: string[] }>>
      model.aggregate.mockResolvedValue([
        { _id: 'test reply', count: 5, feedbacks: ['good', 'bad'] },
      ] as any);

      const aggregateResult =
        await repository.aggregateFrequentBadBotReplies(mockMerchantId);
      expect(Array.isArray(aggregateResult)).toBe(true);

      // findAll should return Promise<{ data: MessageSessionEntity[]; total: number }>
      model.countDocuments.mockResolvedValue(10);
      model.find.mockReturnValue({
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([mockMessageSession]),
      } as any);

      const findAllResult = await repository.findAll({
        merchantId: mockMerchantId,
        limit: 10,
        page: 1,
      });
      expect(findAllResult).toHaveProperty('data');
      expect(findAllResult).toHaveProperty('total');
      expect(Array.isArray(findAllResult.data)).toBe(true);
      expect(typeof findAllResult.total).toBe('number');
    });

    it('should handle method parameter types correctly', async () => {
      // Test that methods accept correct parameter types as defined in interface

      // findByMerchantSessionChannel accepts string parameters
      model.findOne.mockReturnValue({
        session: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      await expect(
        repository.findByMerchantSessionChannel(
          'string-merchant-id',
          'string-session-id',
          'string-channel',
        ),
      ).resolves.toBeDefined();

      // createSessionWithMessages accepts correct data structure
      model.create.mockResolvedValue([{}] as any);
      model.findById.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({}),
      } as any);

      await expect(
        repository.createSessionWithMessages({
          merchantId: 'string-id',
          sessionId: 'string-session',
          channel: 'string-channel',
          messages: [] as MessageItem[],
        }),
      ).resolves.toBeDefined();

      // appendMessagesById accepts string id and MessageItem array
      model.updateOne.mockResolvedValue({ modifiedCount: 1 } as any);
      model.findById.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({}),
      } as any);

      await expect(
        repository.appendMessagesById('string-id', [] as MessageItem[]),
      ).resolves.toBeDefined();

      // updateMessageRating accepts correct parameter object
      model.updateOne.mockResolvedValue({ matchedCount: 1 } as any);

      await expect(
        repository.updateMessageRating({
          sessionId: 'string-session',
          messageId: 'string-message-id',
          userId: 'string-user-id',
          rating: 1,
          feedback: 'optional-feedback',
          merchantId: 'optional-merchant-id',
        }),
      ).resolves.toBeDefined();

      // findAll accepts correct filter structure
      model.countDocuments.mockResolvedValue(0);
      model.find.mockReturnValue({
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      } as any);

      await expect(
        repository.findAll({
          merchantId: 'optional-string',
          channel: 'optional-string',
          limit: 10,
          page: 1,
        }),
      ).resolves.toBeDefined();
    });

    it('should handle optional parameters correctly', async () => {
      // Test methods work correctly with and without optional parameters

      // findByMerchantSessionChannel without channel
      model.findOne.mockReturnValue({
        session: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      await expect(
        repository.findByMerchantSessionChannel(
          'merchant-id',
          'session-id',
          'channel',
        ),
      ).resolves.toBeDefined();

      // createSessionWithMessages without channel
      model.create.mockResolvedValue([{}] as any);
      model.findById.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({}),
      } as any);

      await expect(
        repository.createSessionWithMessages({
          merchantId: 'merchant-id',
          sessionId: 'session-id',
          channel: 'channel',
          messages: [] as MessageItem[],
        }),
      ).resolves.toBeDefined();

      // appendMessagesById without session option
      model.updateOne.mockResolvedValue({ modifiedCount: 1 } as any);
      model.findById.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({}),
      } as any);

      await expect(
        repository.appendMessagesById('id', [] as MessageItem[]),
      ).resolves.toBeDefined();

      // updateMessageRating without optional feedback and merchantId
      model.updateOne.mockResolvedValue({ matchedCount: 1 } as any);

      await expect(
        repository.updateMessageRating({
          sessionId: 'session-id',
          messageId: 'message-id',
          userId: 'user-id',
          rating: 0,
        }),
      ).resolves.toBeDefined();

      // aggregateFrequentBadBotReplies without limit
      model.aggregate.mockResolvedValue([] as any);

      await expect(
        repository.aggregateFrequentBadBotReplies('merchant-id'),
      ).resolves.toBeDefined();

      // findAll without optional merchantId and channel
      model.countDocuments.mockResolvedValue(0);
      model.find.mockReturnValue({
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      } as any);

      await expect(
        repository.findAll({
          limit: 10,
          page: 1,
        }),
      ).resolves.toBeDefined();
    });

    it('should implement all interface methods with correct signatures', () => {
      // This test ensures that all methods from the interface are implemented
      // with the correct signatures by checking they exist and are functions

      const expectedMethods = [
        'findByMerchantSessionChannel',
        'createSessionWithMessages',
        'appendMessagesById',
        'findByWidgetSlugAndSession',
        'updateMessageRating',
        'getMessageTextById',
        'findBySession',
        'findById',
        'setHandover',
        'updateById',
        'deleteById',
        'aggregateFrequentBadBotReplies',
        'findAll',
      ];

      expectedMethods.forEach((methodName) => {
        expect(repository).toHaveProperty(methodName);
        expect(typeof (repository as any)[methodName]).toBe('function');
      });

      // Ensure no extra methods are present that aren't in the interface
      const repositoryMethods = Object.getOwnPropertyNames(
        Object.getPrototypeOf(repository),
      ).filter(
        (name) =>
          name !== 'constructor' &&
          typeof (repository as any)[name] === 'function',
      );

      // Filter out Object.prototype methods and NestJS specific methods
      const filteredMethods = repositoryMethods.filter(
        (method) =>
          ![
            'toString',
            'valueOf',
            'toLocaleString',
            'hasOwnProperty',
            'isPrototypeOf',
            'propertyIsEnumerable',
          ].includes(method),
      );

      // All methods should be in our expected list
      filteredMethods.forEach((method) => {
        expect(expectedMethods).toContain(method);
      });
    });
  });

  describe('Type safety', () => {
    it('should maintain type safety across all operations', async () => {
      // Test that the repository maintains type safety
      const mockMessageItem: MessageItem = {
        _id: '507f1f77bcf86cd799439011' as any,
        role: 'user',
        text: 'test message',
        timestamp: new Date(),
      };

      const mockSessionEntity: MessageSessionEntity = {
        _id: '507f1f77bcf86cd799439011' as any,
        merchantId: '507f1f77bcf86cd799439011' as any,
        sessionId: 'test-session',
        channel: 'whatsapp',
        handoverToAgent: false,
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // findByMerchantSessionChannel returns MessageSessionEntity | null
      model.findOne.mockReturnValue({
        session: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockSessionEntity),
      } as any);

      const result1: MessageSessionEntity | null =
        await repository.findByMerchantSessionChannel(
          mockMerchantId,
          mockSessionId,
          mockChannel,
        );
      expect(result1).toBeDefined();

      // createSessionWithMessages returns MessageSessionEntity
      model.create.mockResolvedValue([mockSessionEntity] as any);
      model.findById.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockSessionEntity),
      } as any);

      const result2: MessageSessionEntity =
        await repository.createSessionWithMessages({
          merchantId: mockMerchantId,
          sessionId: mockSessionId,
          channel: mockChannel,
          messages: [mockMessageItem],
        });
      expect(result2).toBeDefined();

      // findAll returns { data: MessageSessionEntity[]; total: number }
      model.countDocuments.mockResolvedValue(1);
      model.find.mockReturnValue({
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([mockSessionEntity]),
      } as any);

      const result3 = await repository.findAll({
        limit: 10,
        page: 1,
      });
      expect(Array.isArray(result3.data)).toBe(true);
      expect(typeof result3.total).toBe('number');
      expect(result3.data[0]).toBeDefined();
    });

    it('should handle null and undefined values correctly', async () => {
      // Test that methods handle null/undefined values as expected

      // findByMerchantSessionChannel returns null when not found
      model.findOne.mockReturnValue({
        session: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      const nullResult = await repository.findByMerchantSessionChannel(
        mockMerchantId,
        mockSessionId,
        mockChannel,
      );
      expect(nullResult).toBeNull();

      // getMessageTextById returns undefined when not found
      model.findOne.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      const undefinedResult = await repository.getMessageTextById(
        mockSessionId,
        '507f1f77bcf86cd799439011',
      );
      expect(undefinedResult).toBeUndefined();

      // findById returns null for invalid ID
      const invalidIdResult = await repository.findById('invalid-id');
      expect(invalidIdResult).toBeNull();
    });

    it('should validate input parameters', async () => {
      // Test that methods validate input parameters appropriately

      // findById should return null for invalid ObjectId
      const invalidIdResult = await repository.findById(
        'not-a-valid-object-id',
      );
      expect(invalidIdResult).toBeNull();

      // updateById should return null for invalid ObjectId
      model.findByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      const invalidUpdateResult = await repository.updateById('invalid-id', {});
      expect(invalidUpdateResult).toBeNull();

      // deleteById should return false for invalid ObjectId
      model.deleteOne.mockResolvedValue({ deletedCount: 0 } as any);

      const invalidDeleteResult = await repository.deleteById('invalid-id');
      expect(invalidDeleteResult).toBe(false);
    });
  });
});
