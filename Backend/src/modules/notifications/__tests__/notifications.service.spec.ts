import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from '../notifications.service';
import { NOTIFICATION_REPOSITORY } from '../tokens';
import { NotificationRepository } from '../repositories/notification.repository';
import { UsersService } from '../../users/users.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Types } from 'mongoose';

describe('NotificationsService', () => {
  let service: NotificationsService;

  const repo: jest.Mocked<NotificationRepository> = {
    create: jest.fn(),
    listForUser: jest.fn(),
    markRead: jest.fn(),
    markAllRead: jest.fn(),
  };

  const users: Partial<jest.Mocked<UsersService>> = {
    getNotificationsPrefs: jest.fn(),
  };

  const events = { emit: jest.fn() } as unknown as EventEmitter2;

  beforeEach(async () => {
    jest.clearAllMocks();
    (users.getNotificationsPrefs as any).mockResolvedValue({
      channels: { inApp: true, email: false },
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: NOTIFICATION_REPOSITORY, useValue: repo },
        { provide: UsersService, useValue: users },
        { provide: EventEmitter2, useValue: events },
      ],
    }).compile();

    service = module.get(NotificationsService);
  });

  it('notifyUser should create and emit events', async () => {
    repo.create.mockResolvedValue({
      _id: new Types.ObjectId(),
      userId: new Types.ObjectId(),
      type: 'test',
      title: 'Hello',
      severity: 'info',
    } as any);

    await service.notifyUser('u1', {
      type: 'test',
      title: 'Hello',
      body: 'Body',
      merchantId: 'm1',
      data: { x: 1 },
    });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1', type: 'test' }),
    );
    expect(events.emit).toHaveBeenCalledWith('notify.user', expect.any(Object));
    expect(events.emit).toHaveBeenCalledWith(
      'notify.merchant',
      expect.any(Object),
    );
    expect(events.emit).toHaveBeenCalledWith(
      'admin:notification',
      expect.any(Object),
    );
  });

  it('listForUser should proxy to repo with pagination defaults', async () => {
    repo.listForUser.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
    });
    const res = await service.listForUser('u1', {});
    expect(repo.listForUser).toHaveBeenCalledWith('u1', {
      page: 1,
      limit: 20,
      unreadOnly: false,
    });
    expect(res.total).toBe(0);
  });

  it('markRead should call repo and return ok', async () => {
    await expect(
      service.markRead('u1', String(new Types.ObjectId())),
    ).resolves.toEqual({ ok: true });
    expect(repo.markRead).toHaveBeenCalled();
  });

  it('markAllRead should call repo and return ok', async () => {
    await expect(service.markAllRead('u1')).resolves.toEqual({ ok: true });
    expect(repo.markAllRead).toHaveBeenCalledWith('u1');
  });

  it('notifyUser respects inApp disabled', async () => {
    (users.getNotificationsPrefs as any).mockResolvedValueOnce({
      channels: { inApp: false, email: false },
    });
    repo.create.mockResolvedValue({
      _id: new Types.ObjectId(),
      userId: new Types.ObjectId(),
      type: 'x',
      title: 't',
      severity: 'info',
    } as any);

    await service.notifyUser('u2', { type: 'x', title: 't' });

    // still emits admin:notification, but not notify.user
    const calls = (events.emit as any).mock.calls.map((c: any[]) => c[0]);
    expect(calls.includes('notify.user')).toBe(false);
    expect(calls.includes('admin:notification')).toBe(true);
  });
});
