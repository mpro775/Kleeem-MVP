import { Injectable, Inject } from '@nestjs/common';
import { MerchantsRepository } from '../repositories/merchants.repository';
import { CleanupCoordinatorService } from '../cleanup-coordinator.service';
import { MerchantCacheService } from './merchant-cache.service';

@Injectable()
export class MerchantDeletionService {
  constructor(
    @Inject('MerchantsRepository')
    private readonly repo: MerchantsRepository,
    private readonly cleanup: CleanupCoordinatorService,
    private readonly cacheSvc: MerchantCacheService,
  ) {}

  async remove(id: string) {
    const res = await this.repo.remove(id);
    await this.cacheSvc.invalidate(id);
    return res;
  }

  async softDelete(
    id: string,
    actor: { userId: string; role: string },
    reason?: string,
  ) {
    const res = await this.repo.softDelete(id, actor, reason);
    await this.cacheSvc.invalidate(id);
    return res;
  }

  async restore(id: string, actor: { userId: string; role: string }) {
    const res = await this.repo.restore(id, actor);
    await this.cacheSvc.invalidate(id);
    return res;
  }

  async purge(id: string, actor: { userId: string; role: string }) {
    await this.cleanup.purgeAll(id);
    const res = await this.repo.purge(id, actor);
    await this.cacheSvc.invalidate(id);
    return res;
  }
}
