import { Types } from 'mongoose';

import { UsersService } from '../users.service';

describe('UsersService', () => {
  const makeRepo = () =>
    ({
      create: jest.fn((d) => ({ _id: new Types.ObjectId(), ...d })),
      findAll: jest.fn(() => [{ _id: new Types.ObjectId(), name: 'u' }] as any),
      findByIdLean: jest.fn(() => ({
        _id: new Types.ObjectId(),
        name: 'u',
      })),
      updateById: jest.fn(() => ({
        _id: new Types.ObjectId(),
        name: 'u2',
      })),
      softDeleteById: jest.fn(() => ({ _id: new Types.ObjectId() })),
      setFirstLoginFalse: jest.fn(() => ({ _id: new Types.ObjectId() })),
      getNotificationsPrefs: jest.fn(() => null),
      updateNotificationsPrefs: jest.fn((_id, dto) => dto),
      list: jest.fn((dto) => ({
        items: [],
        nextCursor: null,
        total: 0,
        dto,
      })),
    }) as any;

  const makeSvc = () => {
    const repo = makeRepo();
    const translationService = { translate: jest.fn() } as any;
    const svc = new UsersService(repo, translationService);
    return { svc, repo, translationService };
  };

  it('CRUD basics and prefs', async () => {
    const { svc, repo } = makeSvc();
    await svc.create({ name: 'x' } as any);
    expect(repo.create).toHaveBeenCalled();
    await svc.findAll();
    expect(repo.findAll).toHaveBeenCalled();
    await svc.findOne(new Types.ObjectId().toString());
    expect(repo.findByIdLean).toHaveBeenCalled();
    await svc.update(new Types.ObjectId().toString(), { name: 'y' } as any);
    expect(repo.updateById).toHaveBeenCalled();
    await svc.remove(new Types.ObjectId().toString());
    expect(repo.softDeleteById).toHaveBeenCalled();
  });

  it('get and update notification prefs', async () => {
    const { svc } = makeSvc();
    const prefs = await svc.getNotificationsPrefs(
      new Types.ObjectId().toString(),
    );
    expect(prefs.channels?.inApp).toBe(true);
    const updated = await svc.updateNotificationsPrefs(
      new Types.ObjectId().toString(),
      prefs,
    );
    expect(updated).toEqual(prefs);
  });

  it('pagination helpers', async () => {
    const { svc, repo } = makeSvc();
    await svc.getUsers({} as any);
    await svc.searchUsers('q', {} as any);
    await svc.getUsersByMerchant('m', {} as any);
    expect(repo.list).toHaveBeenCalledTimes(3);
  });
});
