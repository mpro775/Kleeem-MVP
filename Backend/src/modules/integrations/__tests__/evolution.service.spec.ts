import axios from 'axios';

import { EvolutionService } from '../evolution.service';

jest.mock('axios', () => {
  const create = jest.fn();
  return { __esModule: true, default: { create }, create };
});

jest.mock('uuid', () => ({ v4: jest.fn(() => 'uuid-token') }));

const createMock = axios.create.bind(axios) as jest.MockedFunction<
  typeof axios.create
>;

describe('EvolutionService', () => {
  const deleteMock = jest.fn();
  const postMock = jest.fn();
  const getMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    createMock.mockReturnValue({
      delete: deleteMock,
      post: postMock,
      get: getMock,
    } as any);
    process.env.EVOLUTION_API_URL = 'http://evolution:8080';
    process.env.EVOLUTION_API_KEY = 'secret';
  });

  const makeService = () => new EvolutionService();

  it('ensures fresh instance by deleting existing one', async () => {
    getMock.mockResolvedValueOnce({ data: { status: 'CONNECTED' } });
    deleteMock.mockResolvedValueOnce({ data: { status: 'DELETED' } });
    postMock.mockResolvedValueOnce({
      data: {
        qrcode: { base64: 'qr-data' },
        instance: { instanceId: 'inst-1' },
      },
    });

    const service = makeService();
    const res = await service.ensureFreshInstance('my-instance');

    expect(getMock).toHaveBeenCalledWith('/instance/fetchInstances', {
      params: { instanceName: 'my-instance' },
    });
    expect(deleteMock).toHaveBeenCalledWith('/instance/delete/my-instance');
    expect(postMock).toHaveBeenCalledWith('/instance/create', {
      instanceName: 'my-instance',
      token: 'uuid-token',
      qrcode: true,
    });
    expect(res).toEqual({ qr: 'qr-data', token: 'uuid-token' });
  });

  it('skips delete when status returns 404', async () => {
    getMock.mockRejectedValueOnce({ response: { status: 404 } });
    postMock.mockResolvedValueOnce({
      data: {
        qrcode: { base64: 'qr' },
        instance: { instanceId: 'inst' },
      },
    });

    const service = makeService();
    const res = await service.ensureFreshInstance('instance');

    expect(deleteMock).not.toHaveBeenCalled();
    expect(postMock).toHaveBeenCalled();
    expect(res.token).toBe('uuid-token');
  });

  it('deleteInstance returns fallback when 404', async () => {
    deleteMock.mockRejectedValueOnce({
      response: { status: 404, data: { error: 'not found' } },
      message: 'not found',
    });

    const service = makeService();
    const res = await service.deleteInstance('missing');
    expect(res).toEqual({
      status: 'NOT_FOUND',
      error: true,
      response: { message: 'Instance not found' },
    });
  });

  it('startSession returns qr, token, instanceId', async () => {
    postMock.mockResolvedValueOnce({
      data: {
        qrcode: { base64: 'encoded' },
        instance: { instanceId: 'abc' },
      },
    });
    const service = makeService();
    const response = await service.startSession('inst', 'token');
    expect(response).toEqual({
      qr: 'encoded',
      token: 'token',
      instanceId: 'abc',
    });
  });

  it('getStatus throws when no data returned', async () => {
    getMock.mockResolvedValueOnce({ data: undefined });
    const service = makeService();
    await expect(service.getStatus('inst')).rejects.toBeDefined();
  });

  it('sendMessage forwards payload to API', async () => {
    postMock.mockResolvedValueOnce({ data: { ok: true } });
    const service = makeService();
    const res = await service.sendMessage('inst', '123', 'hello');
    expect(postMock).toHaveBeenCalledWith('/message/sendText', {
      instanceName: 'inst',
      to: '123',
      message: 'hello',
    });
    expect(res).toEqual({ ok: true });
  });

  it('setWebhook posts configuration', async () => {
    postMock.mockResolvedValueOnce({ data: { status: 'ok' } });
    const service = makeService();
    const res = await service.setWebhook('inst', 'http://webhook');
    expect(postMock).toHaveBeenCalledWith('/webhook/set/inst', {
      url: 'http://webhook',
      events: ['MESSAGES_UPSERT'],
      webhook_by_events: true,
      webhook_base64: true,
    });
    expect(res).toEqual({ status: 'ok' });
  });

  it('updateWebhook delegates to setWebhook with overrides', async () => {
    postMock.mockResolvedValueOnce({ data: { status: 'updated' } });
    const service = makeService();
    const res = await service.updateWebhook(
      'inst',
      'http://hook',
      ['EVENT'],
      false,
      false,
    );
    expect(postMock).toHaveBeenCalledWith('/webhook/set/inst', {
      url: 'http://hook',
      events: ['EVENT'],
      webhook_by_events: false,
      webhook_base64: false,
    });
    expect(res).toEqual({ status: 'updated' });
  });
});
