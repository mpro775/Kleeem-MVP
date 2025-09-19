import { Test, TestingModule } from '@nestjs/testing';
import { MessageService } from '../message.service';
import { MESSAGE_SESSION_REPOSITORY } from '../tokens';
import {
  MessageRepository,
  MessageSessionEntity,
} from '../repositories/message.repository';
import { ChatGateway } from '../../chat/chat.gateway';
import { GeminiService } from '../../ai/gemini.service';
import { Types } from 'mongoose';

describe('MessageService', () => {
  let service: MessageService;

  const repo: jest.Mocked<MessageRepository> = {
    findByMerchantSessionChannel: jest.fn(),
    createSessionWithMessages: jest.fn(),
    appendMessagesById: jest.fn(),
    findByWidgetSlugAndSession: jest.fn(),
    updateMessageRating: jest.fn(),
    getMessageTextById: jest.fn(),
    findBySession: jest.fn(),
    findById: jest.fn(),
    setHandover: jest.fn(),
    updateById: jest.fn(),
    deleteById: jest.fn(),
    aggregateFrequentBadBotReplies: jest.fn(),
    findAll: jest.fn(),
  };

  const gateway = { sendMessageToSession: jest.fn() } as unknown as ChatGateway;
  const gemini = {
    generateAndSaveInstructionFromBadReply: jest.fn(),
  } as unknown as GeminiService;

  const baseSession = (): MessageSessionEntity =>
    ({
      _id: new Types.ObjectId(),
      merchantId: new Types.ObjectId('64d2b7f7c0a3a1a1a1a1a1a1'),
      sessionId: 'S1',
      channel: 'webchat',
      messages: [],
    }) as any;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageService,
        { provide: MESSAGE_SESSION_REPOSITORY, useValue: repo },
        { provide: ChatGateway, useValue: gateway },
        { provide: GeminiService, useValue: gemini },
      ],
    }).compile();

    service = module.get(MessageService);
  });

  it('createOrAppend should create new session when not exists and emit last message', async () => {
    repo.findByMerchantSessionChannel.mockResolvedValue(null);
    const created = baseSession();
    created.messages = [
      {
        _id: new Types.ObjectId(),
        role: 'user',
        text: 'hi',
        timestamp: new Date(),
      } as any,
    ];
    repo.createSessionWithMessages.mockResolvedValue(created);

    await service.createOrAppend({
      merchantId: String(created.merchantId),
      sessionId: 'S1',
      channel: 'webchat',
      messages: [{ role: 'customer', text: 'hi' }],
    });

    expect(repo.createSessionWithMessages).toHaveBeenCalled();
    expect(gateway.sendMessageToSession).toHaveBeenCalledWith(
      'S1',
      expect.objectContaining({ text: 'hi' }),
    );
  });

  it('createOrAppend should append when exists and emit last message', async () => {
    const existing = baseSession();
    repo.findByMerchantSessionChannel.mockResolvedValue(existing);
    const updated = {
      ...existing,
      messages: [
        {
          _id: new Types.ObjectId(),
          role: 'bot',
          text: 'pong',
          timestamp: new Date(),
        } as any,
      ],
    } as any;
    repo.appendMessagesById.mockResolvedValue(updated);

    await service.createOrAppend({
      merchantId: String(existing.merchantId),
      sessionId: 'S1',
      channel: 'webchat',
      messages: [{ role: 'bot', text: 'pong' }],
    });

    expect(repo.appendMessagesById).toHaveBeenCalled();
    expect(gateway.sendMessageToSession).toHaveBeenCalledWith(
      'S1',
      expect.objectContaining({ text: 'pong' }),
    );
  });

  it('rateMessage should call gemini when rating is 0', async () => {
    repo.updateMessageRating.mockResolvedValue(true);
    repo.getMessageTextById.mockResolvedValue('bad reply text');

    await service.rateMessage(
      'S1',
      String(new Types.ObjectId()),
      String(new Types.ObjectId()),
      0,
      'not good',
      'm1',
    );

    expect(repo.updateMessageRating).toHaveBeenCalled();
    expect(gemini.generateAndSaveInstructionFromBadReply).toHaveBeenCalledWith(
      'bad reply text',
      'm1',
    );
  });

  it('rateMessage should not call gemini when rating is 1', async () => {
    repo.updateMessageRating.mockResolvedValue(true);
    await service.rateMessage(
      'S1',
      String(new Types.ObjectId()),
      String(new Types.ObjectId()),
      1,
    );
    expect(
      gemini.generateAndSaveInstructionFromBadReply,
    ).not.toHaveBeenCalled();
  });

  it('findById should throw when not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(
      service.findById(String(new Types.ObjectId())),
    ).rejects.toThrow('not found');
  });

  it('remove should return deleted flag', async () => {
    repo.deleteById.mockResolvedValue(true);
    const res = await service.remove(String(new Types.ObjectId()));
    expect(res.deleted).toBe(true);
  });

  it('getFrequentBadBotReplies should delegate to repo', async () => {
    repo.aggregateFrequentBadBotReplies.mockResolvedValue([
      { text: 'x', count: 2, feedbacks: [] },
    ]);
    const out = await service.getFrequentBadBotReplies('m1', 5);
    expect(repo.aggregateFrequentBadBotReplies).toHaveBeenCalledWith('m1', 5);
    expect(out[0].text).toBe('x');
  });

  it('findAll should delegate to repo', async () => {
    repo.findAll.mockResolvedValue({ data: [baseSession()], total: 1 });
    const out = await service.findAll({ limit: 10, page: 1 });
    expect(out.total).toBe(1);
  });
});
