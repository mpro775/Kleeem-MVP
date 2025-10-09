import { KnowledgeService } from '../knowledge.service';

jest.mock('playwright', () => ({
  chromium: {
    launch: jest.fn().mockResolvedValue({
      newPage: jest.fn().mockResolvedValue({
        setDefaultNavigationTimeout: jest.fn(),
        goto: jest.fn().mockResolvedValue(undefined),
        waitForLoadState: jest.fn().mockResolvedValue(undefined),
        evaluate: jest.fn().mockResolvedValue('Sample page text'),
        close: jest.fn().mockResolvedValue(undefined),
      }),
      close: jest.fn().mockResolvedValue(undefined),
    }),
  },
}));

describe('KnowledgeService (unit, focused)', () => {
  const makeDeps = () => {
    const sourceUrls = {
      createMany: jest
        .fn()
        .mockImplementation((arr: any[]) =>
          arr.map((x, i) => ({ _id: `${i}`, ...x })),
        ),
      findByMerchant: jest.fn().mockResolvedValue([]),
      findListByMerchant: jest.fn().mockResolvedValue([]),
      findByIdForMerchant: jest.fn(),
      findByUrlForMerchant: jest.fn(),
      deleteByIdForMerchant: jest.fn().mockResolvedValue(undefined),
      deleteByMerchant: jest.fn().mockResolvedValue(0),
      markCompleted: jest.fn().mockResolvedValue(undefined),
      markFailed: jest.fn().mockResolvedValue(undefined),
    } as any;

    const vectorService = {
      embedText: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
      upsertWebKnowledge: jest.fn().mockResolvedValue({ success: true }),
      deleteWebKnowledgeByFilter: jest.fn().mockResolvedValue(undefined),
      generateWebKnowledgeId: jest
        .fn()
        .mockImplementation((m: string, u: string) => `${m}:${u}`),
    } as any;

    const notifications = {
      notifyUser: jest.fn().mockResolvedValue(undefined),
    } as any;
    const outbox = {
      enqueueEvent: jest.fn().mockResolvedValue(undefined),
    } as any;
    return { sourceUrls, vectorService, notifications, outbox };
  };

  const makeService = () => {
    const deps = makeDeps();
    const svc = new KnowledgeService(
      deps.sourceUrls,
      deps.vectorService,
      deps.notifications,
      deps.outbox,
    );
    return { ...deps, svc };
  };

  test('addUrls enqueues unique URLs and notifies requester', async () => {
    const { svc, sourceUrls, notifications } = makeService();
    const spy = jest
      .spyOn(svc as any, 'processUrlsInBackground')
      .mockResolvedValue(undefined);

    const res = await svc.addUrls(
      'm1',
      [' https://a ', 'https://a', 'https://b'],
      'user1',
    );
    expect(res.success).toBe(true);
    expect(res.count).toBe(2);
    expect(sourceUrls.createMany).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('m1', expect.any(Array), 'user1');
    expect(notifications.notifyUser).toHaveBeenCalled();
  });

  test('getUrlsStatus aggregates counts correctly', async () => {
    const { svc, sourceUrls } = makeService();
    (sourceUrls.findByMerchant as jest.Mock).mockResolvedValue([
      { _id: '1', url: 'u1', status: 'pending', textExtracted: '' },
      { _id: '2', url: 'u2', status: 'completed', textExtracted: 'x' },
      { _id: '3', url: 'u3', status: 'failed', errorMessage: 'err' },
    ]);
    const out = await svc.getUrlsStatus('m');
    expect(out.total).toBe(3);
    expect(out.pending).toBe(1);
    expect(out.completed).toBe(1);
    expect(out.failed).toBe(1);
    expect(out.urls).toHaveLength(3);
  });

  test('deleteById deletes vectors and record', async () => {
    const { svc, sourceUrls, vectorService } = makeService();
    (sourceUrls.findByIdForMerchant as jest.Mock).mockResolvedValue({
      _id: '507f1f77bcf86cd799439011',
      url: 'http://x',
    });
    const out = await svc.deleteById('m1', '507f1f77bcf86cd799439011');
    expect(out.success).toBe(true);
    expect(vectorService.deleteWebKnowledgeByFilter).toHaveBeenCalled();
    expect(sourceUrls.deleteByIdForMerchant).toHaveBeenCalled();
  });

  test('deleteByUrl deletes vectors and record by url', async () => {
    const { svc, sourceUrls, vectorService } = makeService();
    (sourceUrls.findByUrlForMerchant as jest.Mock).mockResolvedValue({
      _id: 'id1',
      url: 'http://z',
    });
    const out = await svc.deleteByUrl('m2', 'http://z');
    expect(out.success).toBe(true);
    expect(vectorService.deleteWebKnowledgeByFilter).toHaveBeenCalled();
    expect(sourceUrls.deleteByIdForMerchant).toHaveBeenCalledWith('id1', 'm2');
  });

  test('deleteAll deletes vectors by merchant and records', async () => {
    const { svc, sourceUrls, vectorService } = makeService();
    (sourceUrls.findByMerchant as jest.Mock).mockResolvedValue([
      { _id: '1' },
      { _id: '2' },
    ]);
    (sourceUrls.deleteByMerchant as jest.Mock).mockResolvedValue(2);
    const out = await svc.deleteAll('m3');
    expect(out.success).toBe(true);
    expect(out.deleted).toBe(2);
    expect(out.urls).toBe(2);
    expect(vectorService.deleteWebKnowledgeByFilter).toHaveBeenCalled();
  });

  test('extractTextFromUrl uses chromium and returns text', async () => {
    const { svc } = makeService();
    const out = await svc.extractTextFromUrl('http://page');
    expect(out.text).toBe('Sample page text');
  });

  test('getUrls proxies to repository list method', async () => {
    const { svc, sourceUrls } = makeService();
    (sourceUrls.findListByMerchant as jest.Mock).mockResolvedValue([
      { _id: '1' },
    ]);
    const res = await svc.getUrls('merchant');
    expect(res).toEqual([{ _id: '1' }]);
    expect(sourceUrls.findListByMerchant).toHaveBeenCalledWith('merchant');
  });

  test('processUrlsInBackground handles success and failure paths', async () => {
    const { svc, sourceUrls, notifications } = makeService();
    const processSingleUrlSpy = jest
      .spyOn(svc as any, 'processSingleUrl')
      .mockResolvedValueOnce(2)
      .mockRejectedValueOnce(new Error('fail'));
    const notifyCompletedSpy = jest
      .spyOn(svc as any, 'notifyCompleted')
      .mockResolvedValue(undefined);
    const notifyFailedSpy = jest
      .spyOn(svc as any, 'notifyFailed')
      .mockResolvedValue(undefined);
    const enqueueSpy = jest
      .spyOn(svc as any, 'enqueueOutbox')
      .mockResolvedValue(undefined);

    const records = [
      { _id: '1', url: 'http://a' },
      { _id: '2', url: 'http://b' },
    ];

    await (svc as any).processUrlsInBackground('m1', records, 'user');

    expect(processSingleUrlSpy).toHaveBeenCalledTimes(2);
    expect(sourceUrls.markCompleted).toHaveBeenCalledTimes(1);
    expect(sourceUrls.markFailed).toHaveBeenCalledTimes(1);
    expect(notifyCompletedSpy).toHaveBeenCalledTimes(1);
    expect(notifyFailedSpy).toHaveBeenCalledTimes(1);
    expect(enqueueSpy).toHaveBeenCalledTimes(4); // started, completed, started, failed
    expect(notifications.notifyUser).toHaveBeenCalled();
  });

  test('notifyCompleted sends notification when requestedBy present', async () => {
    const { svc, notifications } = makeService();
    await (svc as any).notifyCompleted('user', 'm', 'http://x', 3);
    expect(notifications.notifyUser).toHaveBeenCalledWith(
      'user',
      expect.objectContaining({
        type: 'embeddings.completed',
      }),
    );
  });

  test('notifyCompleted skips when requester missing', async () => {
    const { svc, notifications } = makeService();
    await (svc as any).notifyCompleted(undefined, 'm', 'http://x', 1);
    expect(notifications.notifyUser).not.toHaveBeenCalled();
  });

  test('notifyFailed sends error notification when requestedBy present', async () => {
    const { svc, notifications } = makeService();
    await (svc as any).notifyFailed('user', 'm', 'http://y', 'boom');
    expect(notifications.notifyUser).toHaveBeenCalledWith(
      'user',
      expect.objectContaining({
        type: 'embeddings.failed',
        data: expect.objectContaining({ error: 'boom' }),
      }),
    );
  });

  test('notifyFailed skips when requester missing', async () => {
    const { svc, notifications } = makeService();
    await (svc as any).notifyFailed(undefined, 'm', 'http://z', 'err');
    expect(notifications.notifyUser).not.toHaveBeenCalled();
  });

  test('deleteVectorsByUrl delegates to vector service', async () => {
    const { svc, vectorService } = makeService();
    await (svc as any).deleteVectorsByUrl('m', 'http://z');
    expect(vectorService.deleteWebKnowledgeByFilter).toHaveBeenCalledWith({
      must: [
        { key: 'merchantId', match: { value: 'm' } },
        { key: 'url', match: { value: 'http://z' } },
        { key: 'source', match: { value: 'web' } },
      ],
    });
  });

  test('enqueueOutbox forwards event to outbox service', async () => {
    const { svc, outbox } = makeService();
    await (svc as any).enqueueOutbox('url.started', 'agg', { foo: 'bar' });
    expect(outbox.enqueueEvent).toHaveBeenCalledWith({
      exchange: 'knowledge.index',
      routingKey: 'url.started',
      eventType: 'knowledge.url.started',
      aggregateType: 'knowledge',
      aggregateId: 'agg',
      payload: { foo: 'bar' },
    });
  });

  test('processSingleUrl embeds useful chunks and upserts vectors', async () => {
    const { svc, vectorService } = makeService();
    const text = 'مرحبا بالعالم '.repeat(60); // contains arabic characters for usefulness
    jest.spyOn(svc, 'extractTextFromUrl').mockResolvedValueOnce({ text });

    const processed = await (svc as any).processSingleUrl('m1', {
      _id: '1',
      url: 'http://example.com',
    });

    expect(processed).toBeGreaterThanOrEqual(1);
    expect(vectorService.embedText).toHaveBeenCalled();
    expect(vectorService.upsertWebKnowledge).toHaveBeenCalled();
  });
});
