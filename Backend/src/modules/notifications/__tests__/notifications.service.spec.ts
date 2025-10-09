import { Types } from 'mongoose';

import { NotificationsService } from '../notifications.service';

import type { EventEmitter2 } from '@nestjs/event-emitter';

describe('NotificationsService', () => {
  const makeModel = () => {
    const created: any[] = [];
    return {
      create: jest.fn((doc) => {
        const _id = new Types.ObjectId();
        const saved = { _id, ...doc };
        created.push(saved);
        return saved;
      }),
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue([{ id: 'n1' }]),
            }),
          }),
        }),
      }),
      countDocuments: jest.fn().mockResolvedValue(1),
      updateOne: jest.fn().mockResolvedValue({ acknowledged: true }),
      updateMany: jest.fn().mockResolvedValue({ acknowledged: true }),
      _created: created,
    } as any;
  };

  const makeUsers = () =>
    ({
      getNotificationsPrefs: jest
        .fn()
        .mockResolvedValue({ channels: { inApp: true } }),
    }) as any;

  const makeEvents = () => ({ emit: jest.fn() }) as unknown as EventEmitter2;

  const makeService = () => {
    const notifModel = makeModel();
    const users = makeUsers();
    const events = makeEvents();
    const svc = new NotificationsService(notifModel, users, events);
    return { svc, notifModel, users, events };
  };

  it('creates notification and emits events', async () => {
    const { svc, notifModel, events } = makeService();
    const doc = await svc.notifyUser('507f1f77bcf86cd799439011', {
      type: 'test',
      title: 'Hello',
      body: 'World',
      data: { a: 1 },
      merchantId: '507f1f77bcf86cd799439012',
      severity: 'success',
    });
    expect(doc._id).toBeDefined();
    expect(notifModel.create).toHaveBeenCalled();
    // emits user + merchant + admin events
    expect(
      (events.emit as any).mock.calls.some(
        (c: any[]) => c[0] === 'notify.user',
      ),
    ).toBe(true);
    expect(
      (events.emit as any).mock.calls.some(
        (c: any[]) => c[0] === 'notify.merchant',
      ),
    ).toBe(true);
    expect(
      (events.emit as any).mock.calls.some(
        (c: any[]) => c[0] === 'admin:notification',
      ),
    ).toBe(true);
  });

  it('lists notifications with pagination and unread filter', async () => {
    const { svc, notifModel } = makeService();
    const res = await svc.listForUser('507f1f77bcf86cd799439011', {
      page: 2,
      limit: 10,
      unreadOnly: true,
    });
    expect(notifModel.find).toHaveBeenCalled();
    expect(res.page).toBe(2);
    expect(res.limit).toBe(10);
    expect(res.total).toBe(1);
    expect(res.items).toBeInstanceOf(Array);
  });

  it('marks notification read and all read', async () => {
    const { svc, notifModel } = makeService();
    await svc.markRead('507f1f77bcf86cd799439011', '507f1f77bcf86cd799439013');
    expect(notifModel.updateOne).toHaveBeenCalled();
    await svc.markAllRead('507f1f77bcf86cd799439011');
    expect(notifModel.updateMany).toHaveBeenCalled();
  });
});
