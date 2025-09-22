import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { RabbitService } from 'src/infra/rabbit/rabbit.service';

import { RedisLockService } from '../../common/locks';
import { NotificationsService } from '../notifications/notifications.service';

import { CatalogService } from './catalog.service';

import type Redis from 'ioredis';

@Injectable()
export class CatalogConsumer implements OnModuleInit {
  private readonly logger = new Logger(CatalogConsumer.name);

  constructor(
    private readonly rabbit: RabbitService,
    private readonly catalog: CatalogService,
    private readonly notifications: NotificationsService,
    private readonly lock: RedisLockService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  async onModuleInit() {
    await this.rabbit.subscribe('catalog.sync', 'requested', async (msg) => {
      const { merchantId, requestedBy, source } = msg.payload || {};
      if (!merchantId) return;

      // (1) de-dup للرسالة
      const messageId =
        msg?.headers?.messageId || msg?.id || `${merchantId}:${Date.now()}`;
      const dedupeKey = `idem:catalog-sync:${merchantId}:${messageId}`;
      const isNew = await this.redis.set(dedupeKey, '1', 'EX', 600, 'NX');
      if (isNew !== 'OK') return; // رسالة مكررة → تجاهل

      // (2) قفل لكل تاجر
      const lockKey = `catalog-sync:${merchantId}`;
      const locked = await this.lock.tryLock(lockKey, 10 * 60_000);
      if (!locked) {
        // إرسال إشعار "مزامنة قيد التنفيذ"
        await this.notifications.notifyUser(requestedBy, {
          type: 'catalog.sync.already_running',
          title: 'مزامنة قيد التنفيذ',
          body: 'هناك مزامنة كتالوج نشطة حالياً.',
          merchantId,
          severity: 'info',
        });
        return;
      }

      try {
        await this.notifications.notifyUser(requestedBy, {
          type: 'catalog.sync.started',
          title: 'بدء مزامنة الكتالوج',
          body: `المصدر: ${source ?? 'current'}`,
          merchantId,
          severity: 'info',
        });

        const result = await this.catalog.syncForMerchant(merchantId);

        await this.notifications.notifyUser(requestedBy, {
          type: 'catalog.sync.completed',
          title: 'اكتمال مزامنة الكتالوج',
          body: `تم الاستيراد: ${result.imported} | التحديث: ${result.updated}`,
          merchantId,
          severity: 'success',
          data: result,
        });
      } catch (e: any) {
        this.logger.error(e?.message || e);
        await this.notifications.notifyUser(requestedBy, {
          type: 'catalog.sync.failed',
          title: 'فشل مزامنة الكتالوج',
          body: e?.message || 'حدث خطأ أثناء المزامنة',
          merchantId,
          severity: 'error',
        });
      } finally {
        await this.lock.unlock(lockKey);
      }
    });
  }
}
