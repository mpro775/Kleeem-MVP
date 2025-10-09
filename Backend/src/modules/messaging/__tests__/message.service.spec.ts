import { Types } from 'mongoose';

import { MessageService } from '../message.service';

describe('MessageService', () => {
  const makeDeps = () => {
    const repo = {
      findByMerchantSessionChannel: jest.fn().mockResolvedValue(null),
      appendMessagesById: jest.fn(),
      createSessionWithMessages: jest
        .fn()
        .mockResolvedValue({ _id: new Types.ObjectId() }),
      findByWidgetSlugAndSession: jest.fn().mockResolvedValue(null),
      updateMessageRating: jest.fn().mockResolvedValue(true),
      getMessageTextById: jest.fn().mockResolvedValue('bad bot reply'),
      findBySession: jest.fn().mockResolvedValue(null),
      findById: jest.fn().mockResolvedValue({ _id: new Types.ObjectId() }),
      setHandover: jest.fn().mockResolvedValue(undefined),
      updateById: jest
        .fn()
        .mockResolvedValue({ _id: new Types.ObjectId(), a: 1 }),
      deleteById: jest.fn().mockResolvedValue(true),
      aggregateFrequentBadBotReplies: jest.fn().mockResolvedValue([]),
      findAll: jest.fn().mockResolvedValue({ data: [], total: 0 }),
    } as any;
    const chatGateway = { sendMessageToSession: jest.fn() } as any;
    const geminiService = {
      generateAndSaveInstructionFromBadReply: jest
        .fn()
        .mockResolvedValue(undefined),
    } as any;
    return { repo, chatGateway, geminiService };
  };

  const makeSvc = () => {
    const { repo, chatGateway, geminiService } = makeDeps();
    const svc = new MessageService(repo, chatGateway, geminiService);
    return { svc, repo, chatGateway, geminiService };
  };

  it('createOrAppend maps messages and emits to gateway', async () => {
    const { svc, repo, chatGateway } = makeSvc();
    const dto = {
      merchantId: 'm',
      sessionId: 's',
      channel: 'webchat',
      messages: [{ role: 'user', text: 'hello' }],
    } as any;
    await svc.createOrAppend(dto);
    expect(repo.createSessionWithMessages).toHaveBeenCalled();
    expect(chatGateway.sendMessageToSession).toHaveBeenCalled();
  });

  it('rateMessage triggers instruction for bad rating', async () => {
    const { svc, geminiService } = makeSvc();
    await svc.rateMessage('s', 'm', 'u', 0, 'bad', 'merchant');
    expect(
      geminiService.generateAndSaveInstructionFromBadReply,
    ).toHaveBeenCalled();
  });

  it('find/update/remove/use listing', async () => {
    const { svc, repo } = makeSvc();
    await svc.findBySession('s', 'm');
    await svc.findById(new Types.ObjectId().toString());
    await svc.setHandover('s', true, 'm');
    await svc.update('id', { a: 1 } as any);
    await svc.remove('id');
    await svc.getFrequentBadBotReplies('m', 5);
    await svc.findAll({ limit: 10, page: 1 });
    expect(repo.findAll).toHaveBeenCalled();
  });
});
