import { WebhooksController } from '../webhooks.controller';

describe('WebhooksController', () => {
  const makeDeps = () => {
    const service = {
      verifyWebhookSubscription: jest
        .fn()
        .mockReturnValue({ status: 200, body: 'OK' }),
      processIncoming: jest.fn().mockResolvedValue({ ok: true }),
      handleBotReply: jest
        .fn()
        .mockResolvedValue({ sessionId: 's', status: 'ok' }),
      handleTestBotReply: jest
        .fn()
        .mockResolvedValue({ sessionId: 's', status: 'ok', test: true }),
      handleAgentReply: jest.fn().mockResolvedValue({ sessionId: 's' }),
    } as any;
    const channelsRepo = {
      findDefaultWaCloudWithVerify: jest.fn().mockResolvedValue({
        verifyTokenHash: '$2b$10$abcdefghijklmnopqrstuv',
      }),
    } as any;
    return { service, channelsRepo };
  };

  it('handleIncoming forwards to service', async () => {
    const { service, channelsRepo } = makeDeps();
    const ctrl = new WebhooksController(service, channelsRepo);
    const res = await ctrl.handleIncoming('m', { a: 1 }, {
      headers: {},
    } as any);
    expect(service.processIncoming).toHaveBeenCalled();
    expect(res).toMatchObject({ ok: true });
  });

  it('handleBotReply casts channel and returns response', async () => {
    const { service, channelsRepo } = makeDeps();
    const ctrl = new WebhooksController(service, channelsRepo);
    const out = await ctrl.handleBotReply('m', {
      channel: 'webchat',
      sessionId: 's',
      text: 't',
    } as any);
    expect(service.handleBotReply).toHaveBeenCalled();
    expect(out).toMatchObject({ status: 'ok' });
  });

  it('handleTestBotReply returns test response', async () => {
    const { service, channelsRepo } = makeDeps();
    const ctrl = new WebhooksController(service, channelsRepo);
    const out = await ctrl.handleTestBotReply('m', {
      sessionId: 's',
      text: 't',
      channel: 'webchat',
    } as any);
    expect(service.handleTestBotReply).toHaveBeenCalled();
    expect(out).toMatchObject({ test: true });
  });

  it('handleAgentReply delegates to service', async () => {
    const { service, channelsRepo } = makeDeps();
    const ctrl = new WebhooksController(service, channelsRepo);
    const out = await ctrl.handleAgentReply('m', {
      sessionId: 's',
      text: 'x',
    } as any);
    expect(service.handleAgentReply).toHaveBeenCalled();
    expect(out).toMatchObject({ sessionId: 's' });
  });
});
