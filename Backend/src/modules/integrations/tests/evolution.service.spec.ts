import axios from 'axios';

import { EvolutionService } from '../evolution.service';

// mock axios.create to inject our fake client
jest.mock('axios', () => {
  return { create: jest.fn() };
});

describe('EvolutionService', () => {
  const httpMock = {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (axios.create as jest.Mock).mockReturnValue(httpMock);
  });

  it('ensureFreshInstance deletes if exists and starts session', async () => {
    // getStatus -> exists
    (httpMock.get as any).mockResolvedValueOnce({
      data: { instance: { instanceName: 'inst' } },
    });
    (httpMock.delete as any).mockResolvedValueOnce({ data: { status: 'OK' } });
    (httpMock.post as any).mockResolvedValueOnce({
      data: { qrcode: { base64: 'QR==' }, instance: { instanceId: 'iid' } },
    });

    const svc = new EvolutionService();
    const out = await svc.ensureFreshInstance('inst');
    expect(httpMock.delete).toHaveBeenCalled();
    expect(out.qr).toBe('QR==');
    expect(out.token).toBeTruthy();
  });

  it('ensureFreshInstance skips delete on 404 and starts session', async () => {
    (httpMock.get as any).mockRejectedValueOnce({ response: { status: 404 } });
    (httpMock.post as any).mockResolvedValueOnce({
      data: { qrcode: { base64: 'QR2==' }, instance: { instanceId: 'iid2' } },
    });

    const svc = new EvolutionService();
    const out = await svc.ensureFreshInstance('inst2');
    expect(httpMock.delete).not.toHaveBeenCalled();
    expect(out.qr).toBe('QR2==');
  });

  it('setWebhook posts correct payload', async () => {
    (httpMock.post as any).mockResolvedValueOnce({ data: { ok: true } });
    const svc = new EvolutionService();
    const res = await svc.setWebhook(
      'inst',
      'https://hook',
      ['A', 'B'],
      true,
      true,
    );
    expect(httpMock.post).toHaveBeenCalledWith('/webhook/set/inst', {
      url: 'https://hook',
      events: ['A', 'B'],
      webhook_by_events: true,
      webhook_base64: true,
    });
    expect(res).toEqual({ ok: true });
  });

  it('sendMessage posts to API', async () => {
    (httpMock.post as any).mockResolvedValueOnce({ data: { msg: 'ok' } });
    const svc = new EvolutionService();
    const res = await svc.sendMessage('inst', '777', 'hi');
    expect(httpMock.post).toHaveBeenCalledWith('/message/sendText', {
      instanceName: 'inst',
      to: '777',
      message: 'hi',
    });
    expect(res).toEqual({ msg: 'ok' });
  });
});
