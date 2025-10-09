import { NotificationsController } from '../notifications.controller';

describe('NotificationsController', () => {
  const makeService = () => ({
    listForUser: jest
      .fn()
      .mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 }),
    markRead: jest.fn().mockResolvedValue({ ok: true }),
    markAllRead: jest.fn().mockResolvedValue({ ok: true }),
    notifyUser: jest.fn().mockResolvedValue({ _id: '1' }),
  });

  const makeController = () => {
    const svc = makeService() as any;
    const ctrl = new NotificationsController(svc);
    return { ctrl, svc };
  };

  it('parses list query and calls service', async () => {
    const { ctrl, svc } = makeController();
    const req = { user: { userId: 'u1' } } as any;
    const res = await ctrl.myList(req, {
      page: '2',
      limit: '10',
      unreadOnly: 'true',
    } as any);
    expect(svc.listForUser).toHaveBeenCalledWith('u1', {
      page: 2,
      limit: 10,
      unreadOnly: true,
    });
    expect(res).toMatchObject({ items: [], total: 0 });
  });

  it('marks one and all as read', async () => {
    const { ctrl, svc } = makeController();
    const req = { user: { userId: 'u2' } } as any;
    await ctrl.readOne(req, 'n1');
    expect(svc.markRead).toHaveBeenCalledWith('u2', 'n1');
    await ctrl.readAll(req);
    expect(svc.markAllRead).toHaveBeenCalledWith('u2');
  });

  it('sends test notification', async () => {
    const { ctrl, svc } = makeController();
    const req = { user: { userId: 'u3' } } as any;
    await ctrl.test(req, { title: 'T', body: 'B' });
    expect(svc.notifyUser).toHaveBeenCalledWith(
      'u3',
      expect.objectContaining({ type: 'test' }),
    );
  });
});
