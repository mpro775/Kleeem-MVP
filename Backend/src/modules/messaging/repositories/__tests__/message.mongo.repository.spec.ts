import { getModelToken } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';

import { MessageSession } from '../../schemas/message.schema';
import { MessageMongoRepository } from '../message.mongo.repository';

import type { MessageSessionDocument } from '../../schemas/message.schema';
import type { MessageItem, MessageSessionEntity } from '../message.repository';
import type { Model, ClientSession } from 'mongoose';

describe('MessageMongoRepository', () => {
  let repository: MessageMongoRepository;
  let model: jest.Mocked<Model<MessageSessionDocument>>;
  let mockSession: jest.Mocked<ClientSession>;

  const mockMerchantId = new Types.ObjectId();
  const mockSessionId = 'test-session-123';
  const mockChannel = 'whatsapp';
  const mockMessageId = new Types.ObjectId();
  const mockUserId = new Types.ObjectId();

  const mockMessageSession: MessageSessionEntity = {
    _id: new Types.ObjectId(),
    merchantId: mockMerchantId,
    sessionId: mockSessionId,
    channel: mockChannel,
    handoverToAgent: false,
    messages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

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

    const mockSessionInstance = {
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      abortTransaction: jest.fn(),
      endSession: jest.fn(),
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

    repository = module.get<MessageMongoRepository>(MessageMongoRepository);
    model = module.get(getModelToken(MessageSession.name));
    mockSession = mockSessionInstance as any;
  });

  describe('Basic functionality', () => {
    it('should be instantiable', () => {
      expect(repository).toBeInstanceOf(MessageMongoRepository);
      expect(repository).toBeDefined();
    });

    it('should have all required methods', () => {
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

    it('should have correct class name and structure', () => {
      expect(repository.constructor.name).toBe('MessageMongoRepository');
      expect(repository).toHaveProperty('model');
    });
  });

  describe('findByMerchantSessionChannel', () => {
    it('should return message session when found', async () => {
      model.findOne.mockReturnValue({
        session: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockMessageSession),
      } as any);

      const result = await repository.findByMerchantSessionChannel(
        mockMerchantId.toString(),
        mockSessionId,
        mockChannel,
      );

      expect(model.findOne).toHaveBeenCalledWith({
        merchantId: mockMerchantId,
        sessionId: mockSessionId,
        channel: mockChannel,
      });
      expect(result).toEqual(mockMessageSession);
    });

    it('should return null when no session found', async () => {
      model.findOne.mockReturnValue({
        session: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      const result = await repository.findByMerchantSessionChannel(
        mockMerchantId.toString(),
        mockSessionId,
        mockChannel,
      );

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      model.findOne.mockReturnValue({
        session: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest
          .fn()
          .mockRejectedValue(new Error('Database connection failed')),
      } as any);

      await expect(
        repository.findByMerchantSessionChannel(
          mockMerchantId.toString(),
          mockSessionId,
          mockChannel,
        ),
      ).rejects.toThrow('Database connection failed');
    });

    it('should use provided session when available', async () => {
      model.findOne.mockReturnValue({
        session: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockMessageSession),
      } as any);

      await repository.findByMerchantSessionChannel(
        mockMerchantId.toString(),
        mockSessionId,
        mockChannel,
        { session: mockSession },
      );

      expect(model.findOne().session).toHaveBeenCalledWith(mockSession);
    });

    it('should work without optional channel parameter', async () => {
      model.findOne.mockReturnValue({
        session: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockMessageSession),
      } as any);

      await repository.findByMerchantSessionChannel(
        mockMerchantId.toString(),
        mockSessionId,
      );

      expect(model.findOne).toHaveBeenCalledWith({
        merchantId: mockMerchantId,
        sessionId: mockSessionId,
        channel: undefined,
      });
    });
  });

  describe('createSessionWithMessages', () => {
    const createData = {
      merchantId: mockMerchantId.toString(),
      sessionId: mockSessionId,
      channel: mockChannel,
      messages: [],
    };

    it('should create session with messages successfully', async () => {
      const createdDoc = { ...mockMessageSession, _id: new Types.ObjectId() };

      model.create.mockResolvedValue([createdDoc] as any);
      model.findById.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockMessageSession),
      } as any);

      const result = await repository.createSessionWithMessages(createData);

      expect(model.create).toHaveBeenCalledWith(
        [
          {
            merchantId: mockMerchantId,
            sessionId: mockSessionId,
            channel: mockChannel,
            messages: [],
          },
        ],
        { session: undefined },
      );
      expect(model.findById).toHaveBeenCalledWith(createdDoc._id);
      expect(result).toEqual(mockMessageSession);
    });

    it('should use provided session when available', async () => {
      const createdDoc = { ...mockMessageSession, _id: new Types.ObjectId() };

      model.create.mockResolvedValue([createdDoc] as any);
      model.findById.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockMessageSession),
      } as any);

      await repository.createSessionWithMessages(createData, {
        session: mockSession,
      });

      expect(model.create).toHaveBeenCalledWith(
        [
          {
            merchantId: mockMerchantId,
            sessionId: mockSessionId,
            channel: mockChannel,
            messages: [],
          },
        ],
        { session: mockSession },
      );
    });

    it('should handle creation errors', async () => {
      model.create.mockRejectedValue(new Error('Creation failed'));

      await expect(
        repository.createSessionWithMessages(createData),
      ).rejects.toThrow('Creation failed');
    });

    it('should handle empty messages array', async () => {
      const emptyMessagesData = { ...createData, messages: [] };
      const createdDoc = {
        ...mockMessageSession,
        _id: new Types.ObjectId(),
        messages: [],
      };

      model.create.mockResolvedValue([createdDoc] as any);
      model.findById.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest
          .fn()
          .mockResolvedValue({ ...mockMessageSession, messages: [] }),
      } as any);

      const result =
        await repository.createSessionWithMessages(emptyMessagesData);

      expect(result.messages).toEqual([]);
    });

    it('should handle missing optional channel', async () => {
      const dataWithoutChannel = {
        merchantId: mockMerchantId.toString(),
        sessionId: mockSessionId,
        messages: [],
      };

      const createdDoc = { ...mockMessageSession, _id: new Types.ObjectId() };

      model.create.mockResolvedValue([createdDoc] as any);
      model.findById.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockMessageSession),
      } as any);

      await repository.createSessionWithMessages(dataWithoutChannel);

      expect(model.create).toHaveBeenCalledWith(
        [
          {
            merchantId: mockMerchantId,
            sessionId: mockSessionId,
            channel: undefined,
            messages: [],
          },
        ],
        { session: undefined },
      );
    });
  });

  describe('appendMessagesById', () => {
    const sessionId = new Types.ObjectId().toString();
    const messagesToAppend: MessageItem[] = [
      {
        _id: new Types.ObjectId(),
        role: 'bot',
        text: 'مرحبا! كيف يمكنني مساعدتك اليوم؟',
        timestamp: new Date(),
      },
      {
        _id: new Types.ObjectId(),
        role: 'user',
        text: 'أريد معلومات عن منتجاتكم',
        timestamp: new Date(),
      },
    ];

    it('should append messages successfully', async () => {
      const updatedSession = {
        ...mockMessageSession,
        messages: [...mockMessageSession.messages, ...messagesToAppend],
      };

      model.updateOne.mockResolvedValue({ modifiedCount: 1 } as any);
      model.findById.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(updatedSession),
      } as any);

      const result = await repository.appendMessagesById(
        sessionId,
        messagesToAppend,
      );

      expect(model.updateOne).toHaveBeenCalledWith(
        { _id: new Types.ObjectId(sessionId) },
        { $push: { messages: { $each: messagesToAppend } } },
        {},
      );
      expect(model.findById).toHaveBeenCalledWith(sessionId);
      expect(result.messages).toHaveLength(3); // Original + 2 new messages
    });

    it('should use provided session when available', async () => {
      const updatedSession = {
        ...mockMessageSession,
        messages: [...mockMessageSession.messages, ...messagesToAppend],
      };

      model.updateOne.mockResolvedValue({ modifiedCount: 1 } as any);
      model.findById.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(updatedSession),
      } as any);

      await repository.appendMessagesById(sessionId, messagesToAppend, {
        session: mockSession,
      });

      expect(model.updateOne).toHaveBeenCalledWith(
        { _id: new Types.ObjectId(sessionId) },
        { $push: { messages: { $each: messagesToAppend } } },
        { session: mockSession },
      );
    });

    it('should handle append errors', async () => {
      model.updateOne.mockRejectedValue(new Error('Update failed'));

      await expect(
        repository.appendMessagesById(sessionId, messagesToAppend),
      ).rejects.toThrow('Update failed');
    });

    it('should handle empty messages array', async () => {
      const updatedSession = { ...mockMessageSession };

      model.updateOne.mockResolvedValue({ modifiedCount: 0 } as any);
      model.findById.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(updatedSession),
      } as any);

      const result = await repository.appendMessagesById(sessionId, []);

      expect(model.updateOne).toHaveBeenCalledWith(
        { _id: new Types.ObjectId(sessionId) },
        { $push: { messages: { $each: [] } } },
        {},
      );
      expect(result).toEqual(updatedSession);
    });
  });

  describe('findByWidgetSlugAndSession', () => {
    const mockSlug = 'test-widget-slug';
    const mockWidgetModel = {
      findOne: jest.fn(),
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
    };

    beforeEach(() => {
      // Mock the ChatWidgetSettings model
      (repository as any).model.db = {
        model: jest.fn().mockReturnValue(mockWidgetModel),
      };
    });

    it('should find session by widget slug successfully', async () => {
      const mockWidget = {
        merchantId: mockMerchantId.toString(),
      };

      mockWidgetModel.findOne.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockWidget),
      } as any);

      model.findOne.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockMessageSession),
      } as any);

      const result = await repository.findByWidgetSlugAndSession(
        mockSlug,
        mockSessionId,
        'webchat',
      );

      expect(mockWidgetModel.findOne).toHaveBeenCalledWith({
        $or: [{ widgetSlug: mockSlug }, { publicSlug: mockSlug }],
      });
      expect(model.findOne).toHaveBeenCalledWith({
        merchantId: new Types.ObjectId(mockMerchantId.toString()),
        sessionId: mockSessionId,
        channel: 'webchat',
      });
      expect(result).toEqual(mockMessageSession);
    });

    it('should return null when widget not found', async () => {
      mockWidgetModel.findOne.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      const result = await repository.findByWidgetSlugAndSession(
        mockSlug,
        mockSessionId,
        'webchat',
      );

      expect(result).toBeNull();
      expect(model.findOne).not.toHaveBeenCalled();
    });

    it('should return null when session not found', async () => {
      const mockWidget = {
        merchantId: mockMerchantId.toString(),
      };

      mockWidgetModel.findOne.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockWidget),
      } as any);

      model.findOne.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      const result = await repository.findByWidgetSlugAndSession(
        mockSlug,
        mockSessionId,
        'webchat',
      );

      expect(result).toBeNull();
    });

    it('should handle widget query errors', async () => {
      mockWidgetModel.findOne.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('Widget query failed')),
      } as any);

      await expect(
        repository.findByWidgetSlugAndSession(
          mockSlug,
          mockSessionId,
          'webchat',
        ),
      ).rejects.toThrow('Widget query failed');
    });
  });

  describe('updateMessageRating', () => {
    const updateParams = {
      sessionId: mockSessionId,
      messageId: mockMessageId.toString(),
      userId: mockUserId.toString(),
      rating: 1 as const,
      feedback: 'ممتاز، إجابة مفيدة جداً',
      merchantId: mockMerchantId.toString(),
    };

    it('should update message rating successfully', async () => {
      model.updateOne.mockResolvedValue({ matchedCount: 1 } as any);

      const result = await repository.updateMessageRating(updateParams);

      expect(model.updateOne).toHaveBeenCalledWith(
        {
          sessionId: mockSessionId,
          'messages._id': mockMessageId,
        },
        {
          $set: {
            'messages.$.rating': 1,
            'messages.$.feedback': 'ممتاز، إجابة مفيدة جداً',
            'messages.$.ratedBy': mockUserId,
            'messages.$.ratedAt': expect.any(Date),
            merchantId: mockMerchantId,
          },
        },
      );
      expect(result).toBe(true);
    });

    it('should return false when message not found', async () => {
      model.updateOne.mockResolvedValue({ matchedCount: 0 } as any);

      const result = await repository.updateMessageRating(updateParams);

      expect(result).toBe(false);
    });

    it('should handle rating 0 (negative feedback)', async () => {
      const negativeParams = {
        ...updateParams,
        rating: 0 as 0 | 1,
        feedback: 'غير مفيد',
      };

      model.updateOne.mockResolvedValue({ matchedCount: 1 } as any);

      await repository.updateMessageRating(negativeParams);

      expect(model.updateOne).toHaveBeenCalledWith(expect.any(Object), {
        $set: {
          'messages.$.rating': 0,
          'messages.$.feedback': 'غير مفيد',
          'messages.$.ratedBy': mockUserId,
          'messages.$.ratedAt': expect.any(Date),
          merchantId: mockMerchantId,
        },
      });
    });

    it('should handle update without optional feedback', async () => {
      const paramsWithoutFeedback = {
        sessionId: mockSessionId,
        messageId: mockMessageId.toString(),
        userId: mockUserId.toString(),
        rating: 1 as const,
      };

      model.updateOne.mockResolvedValue({ matchedCount: 1 } as any);

      await repository.updateMessageRating(paramsWithoutFeedback);

      expect(model.updateOne).toHaveBeenCalledWith(expect.any(Object), {
        $set: {
          'messages.$.rating': 1,
          'messages.$.feedback': null,
          'messages.$.ratedBy': mockUserId,
          'messages.$.ratedAt': expect.any(Date),
          merchantId: undefined,
        },
      });
    });

    it('should handle update errors', async () => {
      model.updateOne.mockRejectedValue(new Error('Update failed'));

      await expect(
        repository.updateMessageRating(updateParams),
      ).rejects.toThrow('Update failed');
    });
  });

  describe('getMessageTextById', () => {
    it('should return message text when found', async () => {
      const mockMessage = {
        text: 'مرحبا، كيف يمكنك مساعدتي؟',
      };

      model.findOne.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({
          messages: [mockMessage],
        }),
      } as any);

      const result = await repository.getMessageTextById(
        mockSessionId,
        mockMessageId.toString(),
      );

      expect(model.findOne).toHaveBeenCalledWith(
        {
          sessionId: mockSessionId,
          'messages._id': mockMessageId,
        },
        {
          messages: { $elemMatch: { _id: mockMessageId } },
        },
      );
      expect(result).toBe('مرحبا، كيف يمكنك مساعدتي؟');
    });

    it('should return undefined when message not found', async () => {
      model.findOne.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      const result = await repository.getMessageTextById(
        mockSessionId,
        mockMessageId.toString(),
      );

      expect(result).toBeUndefined();
    });

    it('should return undefined when session not found', async () => {
      model.findOne.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({ messages: [] }),
      } as any);

      const result = await repository.getMessageTextById(
        mockSessionId,
        mockMessageId.toString(),
      );

      expect(result).toBeUndefined();
    });

    it('should handle database errors', async () => {
      model.findOne.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('Database error')),
      } as any);

      await expect(
        repository.getMessageTextById(mockSessionId, mockMessageId.toString()),
      ).rejects.toThrow('Database error');
    });
  });

  describe('findBySession', () => {
    it('should return message session when found', async () => {
      model.findOne.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockMessageSession),
      } as any);

      const result = await repository.findBySession(
        mockMerchantId.toString(),
        mockSessionId,
      );

      expect(model.findOne).toHaveBeenCalledWith({
        merchantId: mockMerchantId,
        sessionId: mockSessionId,
      });
      expect(result).toEqual(mockMessageSession);
    });

    it('should return null when session not found', async () => {
      model.findOne.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      const result = await repository.findBySession(
        mockMerchantId.toString(),
        mockSessionId,
      );

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      model.findOne.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('Database error')),
      } as any);

      await expect(
        repository.findBySession(mockMerchantId.toString(), mockSessionId),
      ).rejects.toThrow('Database error');
    });
  });

  describe('findById', () => {
    const validId = new Types.ObjectId().toString();
    const invalidId = 'invalid-id';

    it('should return message session when found', async () => {
      model.findById.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockMessageSession),
      } as any);

      const result = await repository.findById(validId);

      expect(model.findById).toHaveBeenCalledWith(validId);
      expect(result).toEqual(mockMessageSession);
    });

    it('should return null for invalid ObjectId', async () => {
      const result = await repository.findById(invalidId);

      expect(result).toBeNull();
      expect(model.findById).not.toHaveBeenCalled();
    });

    it('should return null when session not found', async () => {
      model.findById.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      const result = await repository.findById(validId);

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      model.findById.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('Database error')),
      } as any);

      await expect(repository.findById(validId)).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('setHandover', () => {
    it('should set handover to agent successfully', async () => {
      model.updateOne.mockResolvedValue({ modifiedCount: 1 } as any);

      await repository.setHandover(
        mockSessionId,
        mockMerchantId.toString(),
        true,
      );

      expect(model.updateOne).toHaveBeenCalledWith(
        {
          sessionId: mockSessionId,
          merchantId: mockMerchantId,
        },
        {
          $set: { handoverToAgent: true },
        },
      );
    });

    it('should set handover to agent as false', async () => {
      model.updateOne.mockResolvedValue({ modifiedCount: 1 } as any);

      await repository.setHandover(
        mockSessionId,
        mockMerchantId.toString(),
        false,
      );

      expect(model.updateOne).toHaveBeenCalledWith(
        {
          sessionId: mockSessionId,
          merchantId: mockMerchantId,
        },
        {
          $set: { handoverToAgent: false },
        },
      );
    });

    it('should handle update errors', async () => {
      model.updateOne.mockRejectedValue(new Error('Update failed'));

      await expect(
        repository.setHandover(mockSessionId, mockMerchantId.toString(), true),
      ).rejects.toThrow('Update failed');
    });
  });

  describe('updateById', () => {
    const validId = new Types.ObjectId().toString();
    const invalidId = 'invalid-id';
    const updateData = {
      handoverToAgent: true,
      channel: 'telegram' as const,
    };

    it('should update session successfully', async () => {
      const updatedSession = { ...mockMessageSession, ...updateData };

      model.findByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(updatedSession),
      } as any);

      const result = await repository.updateById(validId, updateData);

      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
        validId,
        updateData,
        { new: true },
      );
      expect(result).toEqual(updatedSession);
    });

    it('should return null for invalid ObjectId', async () => {
      const result = await repository.updateById(invalidId, updateData);

      expect(result).toBeNull();
      expect(model.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('should return null when session not found', async () => {
      model.findByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      const result = await repository.updateById(validId, updateData);

      expect(result).toBeNull();
    });

    it('should handle empty update data', async () => {
      const updatedSession = { ...mockMessageSession };

      model.findByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(updatedSession),
      } as any);

      const result = await repository.updateById(validId, {});

      expect(result).toEqual(updatedSession);
    });

    it('should handle update errors', async () => {
      model.findByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('Update failed')),
      } as any);

      await expect(repository.updateById(validId, updateData)).rejects.toThrow(
        'Update failed',
      );
    });
  });

  describe('deleteById', () => {
    const validId = new Types.ObjectId().toString();
    const invalidId = 'invalid-id';

    it('should delete session successfully', async () => {
      model.deleteOne.mockResolvedValue({ deletedCount: 1 } as any);

      const result = await repository.deleteById(validId);

      expect(model.deleteOne).toHaveBeenCalledWith({
        _id: new Types.ObjectId(validId),
      });
      expect(result).toBe(true);
    });

    it('should return false for invalid ObjectId', async () => {
      const result = await repository.deleteById(invalidId);

      expect(result).toBe(false);
      expect(model.deleteOne).not.toHaveBeenCalled();
    });

    it('should return false when session not found', async () => {
      model.deleteOne.mockResolvedValue({ deletedCount: 0 } as any);

      const result = await repository.deleteById(validId);

      expect(result).toBe(false);
    });

    it('should handle delete errors', async () => {
      model.deleteOne.mockRejectedValue(new Error('Delete failed'));

      await expect(repository.deleteById(validId)).rejects.toThrow(
        'Delete failed',
      );
    });
  });

  describe('aggregateFrequentBadBotReplies', () => {
    it('should return frequent bad bot replies', async () => {
      const aggregationResult = [
        {
          _id: 'رد غير مفيد',
          count: 5,
          feedbacks: ['غير مفيد', 'خطأ', null, 'غير صحيح'],
        },
        {
          _id: 'لا أفهم السؤال',
          count: 3,
          feedbacks: ['غير مفهوم', 'معقد جداً'],
        },
      ];

      model.aggregate.mockResolvedValue(aggregationResult as any);

      const result = await repository.aggregateFrequentBadBotReplies(
        mockMerchantId.toString(),
        10,
      );

      expect(model.aggregate).toHaveBeenCalledWith([
        { $match: { merchantId: mockMerchantId } },
        { $unwind: '$messages' },
        { $match: { 'messages.role': 'bot', 'messages.rating': 0 } },
        {
          $group: {
            _id: '$messages.text',
            count: { $sum: 1 },
            feedbacks: { $push: '$messages.feedback' },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]);

      expect(result).toEqual([
        {
          text: 'رد غير مفيد',
          count: 5,
          feedbacks: ['غير مفيد', 'خطأ', 'غير صحيح'],
        },
        {
          text: 'لا أفهم السؤال',
          count: 3,
          feedbacks: ['غير مفهوم', 'معقد جداً'],
        },
      ]);
    });

    it('should use default limit when not provided', async () => {
      const aggregationResult = [
        {
          _id: 'رد افتراضي',
          count: 2,
          feedbacks: ['افتراضي'],
        },
      ];

      model.aggregate.mockResolvedValue(aggregationResult as any);

      await repository.aggregateFrequentBadBotReplies(
        mockMerchantId.toString(),
      );

      expect(model.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ $limit: 10 }), // Default limit
        ]),
      );
    });

    it('should handle empty results', async () => {
      model.aggregate.mockResolvedValue([]);

      const result = await repository.aggregateFrequentBadBotReplies(
        mockMerchantId.toString(),
        5,
      );

      expect(result).toEqual([]);
    });

    it('should handle aggregation errors', async () => {
      model.aggregate.mockRejectedValue(new Error('Aggregation failed'));

      await expect(
        repository.aggregateFrequentBadBotReplies(mockMerchantId.toString()),
      ).rejects.toThrow('Aggregation failed');
    });

    it('should filter out null and empty feedbacks', async () => {
      const aggregationResult = [
        {
          _id: 'رد مع تعليقات مختلطة',
          count: 3,
          feedbacks: ['جيد', null, '', 'ممتاز', undefined],
        },
      ];

      model.aggregate.mockResolvedValue(aggregationResult as any);

      const result = await repository.aggregateFrequentBadBotReplies(
        mockMerchantId.toString(),
      );

      expect(result[0].feedbacks).toEqual(['جيد', 'ممتاز']);
    });
  });

  describe('findAll', () => {
    const filters = {
      merchantId: mockMerchantId.toString(),
      channel: 'whatsapp' as const,
      limit: 10,
      page: 1,
    };

    it('should return paginated results', async () => {
      const mockResults = [
        mockMessageSession,
        { ...mockMessageSession, _id: new Types.ObjectId() },
      ];
      const totalCount = 25;

      model.countDocuments.mockResolvedValue(totalCount);
      model.find.mockReturnValue({
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockResults),
      } as any);

      const result = await repository.findAll(filters);

      expect(model.countDocuments).toHaveBeenCalledWith({
        merchantId: mockMerchantId,
        channel: 'whatsapp',
      });
      expect(model.find).toHaveBeenCalledWith({
        merchantId: mockMerchantId,
        channel: 'whatsapp',
      });
      expect(model.find().skip).toHaveBeenCalledWith(0); // (page-1) * limit = 0
      expect(model.find().limit).toHaveBeenCalledWith(10);
      expect(model.find().sort).toHaveBeenCalledWith({ updatedAt: -1 });

      expect(result).toEqual({
        data: mockResults,
        total: totalCount,
      });
    });

    it('should handle filters without merchantId', async () => {
      const filtersWithoutMerchant = {
        channel: 'telegram' as const,
        limit: 5,
        page: 2,
      };

      const mockResults = [mockMessageSession];
      const totalCount = 8;

      model.countDocuments.mockResolvedValue(totalCount);
      model.find.mockReturnValue({
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockResults),
      } as any);

      const result = await repository.findAll(filtersWithoutMerchant);

      expect(model.countDocuments).toHaveBeenCalledWith({
        channel: 'telegram',
      });
      expect(result.data).toEqual(mockResults);
      expect(result.total).toBe(totalCount);
    });

    it('should handle filters without channel', async () => {
      const filtersWithoutChannel = {
        merchantId: mockMerchantId.toString(),
        limit: 15,
        page: 1,
      };

      const mockResults = [mockMessageSession];
      const totalCount = 12;

      model.countDocuments.mockResolvedValue(totalCount);
      model.find.mockReturnValue({
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockResults),
      } as any);

      const result = await repository.findAll(filtersWithoutChannel);

      expect(model.countDocuments).toHaveBeenCalledWith({
        merchantId: mockMerchantId,
      });
      expect(result.total).toBe(totalCount);
    });

    it('should handle second page correctly', async () => {
      const secondPageFilters = {
        ...filters,
        page: 2,
      };

      const mockResults = [mockMessageSession];
      const totalCount = 25;

      model.countDocuments.mockResolvedValue(totalCount);
      model.find.mockReturnValue({
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockResults),
      } as any);

      await repository.findAll(secondPageFilters);

      expect(model.find().skip).toHaveBeenCalledWith(10); // (2-1) * 10 = 10
    });

    it('should handle empty results', async () => {
      model.countDocuments.mockResolvedValue(0);
      model.find.mockReturnValue({
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      } as any);

      const result = await repository.findAll(filters);

      expect(result).toEqual({
        data: [],
        total: 0,
      });
    });

    it('should handle database errors in count', async () => {
      model.countDocuments.mockRejectedValue(new Error('Count failed'));

      await expect(repository.findAll(filters)).rejects.toThrow('Count failed');
    });

    it('should handle database errors in find', async () => {
      model.countDocuments.mockResolvedValue(10);
      model.find.mockReturnValue({
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('Find failed')),
      } as any);

      await expect(repository.findAll(filters)).rejects.toThrow('Find failed');
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete message session lifecycle', async () => {
      // Create session
      const createdDoc = { ...mockMessageSession, _id: new Types.ObjectId() };
      model.create.mockResolvedValue([createdDoc] as any);
      model.findById.mockReturnValueOnce({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockMessageSession),
      } as any);

      const created = await repository.createSessionWithMessages({
        merchantId: mockMerchantId.toString(),
        sessionId: mockSessionId,
        channel: mockChannel,
        messages: [],
      });

      expect(created.sessionId).toBe(mockSessionId);

      // Append messages
      const newMessage: MessageItem = {
        _id: new Types.ObjectId(),
        role: 'bot',
        text: 'مرحبا! كيف يمكنني مساعدتك؟',
        timestamp: new Date(),
      };

      const updatedSession = {
        ...mockMessageSession,
        messages: [...mockMessageSession.messages, newMessage],
      };

      model.updateOne.mockResolvedValue({ modifiedCount: 1 } as any);
      model.findById.mockReturnValueOnce({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(updatedSession),
      } as any);

      const appended = await repository.appendMessagesById(
        created._id.toString(),
        [newMessage],
      );

      expect(appended.messages).toHaveLength(2);

      // Update rating
      model.updateOne.mockResolvedValue({ matchedCount: 1 } as any);

      const ratingUpdated = await repository.updateMessageRating({
        sessionId: mockSessionId,
        messageId: newMessage._id.toString(),
        userId: mockUserId.toString(),
        rating: 1 as 0 | 1,
        feedback: 'ممتاز',
      });

      expect(ratingUpdated).toBe(true);

      // Find by session
      model.findOne.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(updatedSession),
      } as any);

      const found = await repository.findBySession(
        mockMerchantId.toString(),
        mockSessionId,
      );

      expect(found).toEqual(updatedSession);
    });

    it('should handle concurrent operations safely', async () => {
      const operations = [
        repository.findByMerchantSessionChannel(
          mockMerchantId.toString(),
          mockSessionId,
          mockChannel,
        ),
        repository.findBySession(mockMerchantId.toString(), mockSessionId),
        repository.findById(mockMessageSession._id.toString()),
      ];

      model.findOne.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockMessageSession),
      } as any);

      model.findById.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockMessageSession),
      } as any);

      const results = await Promise.all(operations);

      expect(results).toHaveLength(3);
      expect(results[0]).toEqual(mockMessageSession);
      expect(results[1]).toEqual(mockMessageSession);
      expect(results[2]).toEqual(mockMessageSession);
    });
  });

  describe('Error handling', () => {
    it('should handle MongoDB connection errors', async () => {
      model.findOne.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('MongoNetworkError')),
      } as any);

      await expect(
        repository.findByMerchantSessionChannel(
          mockMerchantId.toString(),
          mockSessionId,
          mockChannel,
        ),
      ).rejects.toThrow('MongoNetworkError');
    });

    it('should handle validation errors', async () => {
      model.create.mockRejectedValue(new Error('ValidationError'));

      await expect(
        repository.createSessionWithMessages({
          merchantId: mockMerchantId.toString(),
          sessionId: mockSessionId,
          channel: mockChannel,
          messages: [],
        }),
      ).rejects.toThrow('ValidationError');
    });

    it('should handle timeout errors', async () => {
      model.findOne.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('Operation timed out')),
      } as any);

      await expect(
        repository.findByMerchantSessionChannel(
          mockMerchantId.toString(),
          mockSessionId,
          mockChannel,
        ),
      ).rejects.toThrow('Operation timed out');
    });

    it('should handle malformed query responses', async () => {
      model.findOne.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue('invalid_data'),
      } as any);

      const result = await repository.findByMerchantSessionChannel(
        mockMerchantId.toString(),
        mockSessionId,
        mockChannel,
      );

      expect(result).toBe('invalid_data');
    });

    it('should handle null model responses', async () => {
      model.findOne.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      const result = await repository.findByMerchantSessionChannel(
        mockMerchantId.toString(),
        mockSessionId,
        mockChannel,
      );

      expect(result).toBeNull();
    });
  });

  describe('Edge cases', () => {
    it('should handle empty string values in messages', async () => {
      const emptyMessage: MessageItem = {
        _id: new Types.ObjectId(),
        role: 'user',
        text: '',
        timestamp: new Date(),
      };

      const createdDoc = {
        ...mockMessageSession,
        _id: new Types.ObjectId(),
        messages: [emptyMessage],
      };
      model.create.mockResolvedValue([createdDoc] as any);
      model.findById.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({
          ...mockMessageSession,
          messages: [emptyMessage],
        }),
      } as any);

      const result = await repository.createSessionWithMessages({
        merchantId: mockMerchantId.toString(),
        sessionId: mockSessionId,
        channel: mockChannel,
        messages: [emptyMessage],
      });

      expect(result.messages[0].text).toBe('');
    });

    it('should handle special characters in messages', async () => {
      const specialMessage: MessageItem = {
        _id: new Types.ObjectId(),
        role: 'user',
        text: 'مرحبا! كيف حالك؟ 😊 هل يمكنك مساعدتي في شراء منتج؟',
        metadata: { emojis: ['😊'] },
        timestamp: new Date(),
        keywords: ['مرحبا', 'مساعدة', 'منتج'],
      };

      const createdDoc = {
        ...mockMessageSession,
        _id: new Types.ObjectId(),
        messages: [specialMessage],
      };
      model.create.mockResolvedValue([createdDoc] as any);
      model.findById.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({
          ...mockMessageSession,
          messages: [specialMessage],
        }),
      } as any);

      const result = await repository.createSessionWithMessages({
        merchantId: mockMerchantId.toString(),
        sessionId: mockSessionId,
        channel: mockChannel,
        messages: [specialMessage],
      });

      expect(result.messages[0].text).toContain('😊');
      expect(result.messages[0].metadata?.emojis).toEqual(['😊']);
      expect(result.messages[0].keywords).toContain('مرحبا');
    });

    it('should handle very large messages arrays', async () => {
      const largeMessages: MessageItem[] = Array(1000)
        .fill(null)
        .map((_, index) => ({
          _id: new Types.ObjectId(),
          role: index % 2 === 0 ? 'user' : 'bot',
          text: `رسالة رقم ${index + 1}`,
          timestamp: new Date(),
        }));

      const createdDoc = {
        ...mockMessageSession,
        _id: new Types.ObjectId(),
        messages: largeMessages,
      };
      model.create.mockResolvedValue([createdDoc] as any);
      model.findById.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({
          ...mockMessageSession,
          messages: largeMessages,
        }),
      } as any);

      const result = await repository.createSessionWithMessages({
        merchantId: mockMerchantId.toString(),
        sessionId: mockSessionId,
        channel: mockChannel,
        messages: largeMessages,
      });

      expect(result.messages).toHaveLength(1000);
    });

    it('should handle empty messages arrays', async () => {
      const createdDoc = {
        ...mockMessageSession,
        _id: new Types.ObjectId(),
        messages: [],
      };
      model.create.mockResolvedValue([createdDoc] as any);
      model.findById.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest
          .fn()
          .mockResolvedValue({ ...mockMessageSession, messages: [] }),
      } as any);

      const result = await repository.createSessionWithMessages({
        merchantId: mockMerchantId.toString(),
        sessionId: mockSessionId,
        channel: mockChannel,
        messages: [],
      });

      expect(result.messages).toEqual([]);
    });
  });

  describe('Performance considerations', () => {
    it('should handle multiple rapid operations efficiently', async () => {
      model.findOne.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockMessageSession),
      } as any);

      // Perform many operations rapidly
      const startTime = Date.now();

      for (let i = 0; i < 100; i++) {
        model.findOne.mockReturnValue({
          lean: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue(mockMessageSession),
        } as any);

        await repository.findByMerchantSessionChannel(
          mockMerchantId.toString(),
          `${mockSessionId}-${i}`,
          mockChannel,
        );
      }

      const endTime = Date.now();

      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(2000);
    });

    it('should handle large aggregation operations', async () => {
      const largeAggregationResult = Array(1000)
        .fill(null)
        .map((_, index) => ({
          _id: `رد ${index}`,
          count: Math.floor(Math.random() * 10) + 1,
          feedbacks: ['جيد', 'ممتاز', 'سيء'],
        }));

      model.aggregate.mockResolvedValue(largeAggregationResult as any);

      const startTime = Date.now();
      const result = await repository.aggregateFrequentBadBotReplies(
        mockMerchantId.toString(),
        1000,
      );
      const endTime = Date.now();

      expect(result).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });
});
