import { Test, type TestingModule } from '@nestjs/testing';

import { MerchantDeletionService } from '../merchant-deletion.service';

const repo = {
  remove: jest.fn(),
  softDelete: jest.fn(),
  restore: jest.fn(),
  purge: jest.fn(),
};
const cleanup = { purgeAll: jest.fn() };
const cache = { invalidate: jest.fn() };

describe('MerchantDeletionService', () => {
  let svc: MerchantDeletionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MerchantDeletionService,
        { provide: 'MerchantsRepository', useValue: repo },
        { provide: 'CleanupCoordinatorService', useValue: cleanup },
        { provide: 'MerchantCacheService', useValue: cache },
      ],
    }).compile();
    svc = module.get(MerchantDeletionService);
    jest.resetAllMocks();
  });

  it('remove -> invalidates cache', async () => {
    repo.remove.mockResolvedValue({ deleted: true });

    const result = await svc.remove('m1');

    expect(repo.remove).toHaveBeenCalledWith('m1');
    expect(cache.invalidate).toHaveBeenCalledWith('m1');
    expect(result).toEqual({ deleted: true });
  });

  it('softDelete -> invalidates cache', async () => {
    const actor = { userId: 'u1', role: 'ADMIN' };
    repo.softDelete.mockResolvedValue({ softDeleted: true });

    const result = await svc.softDelete('m1', actor, 'Test reason');

    expect(repo.softDelete).toHaveBeenCalledWith('m1', actor, 'Test reason');
    expect(cache.invalidate).toHaveBeenCalledWith('m1');
    expect(result).toEqual({ softDeleted: true });
  });

  it('softDelete -> works without reason', async () => {
    const actor = { userId: 'u1', role: 'MERCHANT' };
    repo.softDelete.mockResolvedValue({ softDeleted: true });

    await svc.softDelete('m1', actor);

    expect(repo.softDelete).toHaveBeenCalledWith('m1', actor, undefined);
    expect(cache.invalidate).toHaveBeenCalledWith('m1');
  });

  it('restore -> invalidates cache', async () => {
    const actor = { userId: 'u1', role: 'ADMIN' };
    repo.restore.mockResolvedValue({ restored: true });

    const result = await svc.restore('m1', actor);

    expect(repo.restore).toHaveBeenCalledWith('m1', actor);
    expect(cache.invalidate).toHaveBeenCalledWith('m1');
    expect(result).toEqual({ restored: true });
  });

  it('purge -> cleanup + repo + invalidate', async () => {
    const actor = { userId: 'u1', role: 'ADMIN' };
    cleanup.purgeAll.mockResolvedValue(undefined);
    repo.purge.mockResolvedValue({ purged: true });

    const result = await svc.purge('m1', actor);

    expect(cleanup.purgeAll).toHaveBeenCalledWith('m1');
    expect(repo.purge).toHaveBeenCalledWith('m1', actor);
    expect(cache.invalidate).toHaveBeenCalledWith('m1');
    expect(result).toEqual({ purged: true });
  });

  it('purge -> handles cleanup failure gracefully', async () => {
    const actor = { userId: 'u1', role: 'ADMIN' };
    cleanup.purgeAll.mockRejectedValue(new Error('cleanup failed'));
    repo.purge.mockResolvedValue({ purged: true });

    await expect(svc.purge('m1', actor)).rejects.toThrow('cleanup failed');
  });
});
