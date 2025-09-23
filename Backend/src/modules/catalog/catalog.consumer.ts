import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { RabbitService } from 'src/infra/rabbit/rabbit.service';

import { ONE_MINUTE_MS } from '../../common/constants/common';
import { RedisLockService } from '../../common/locks';
import { NotificationsService } from '../notifications/notifications.service';

import { CatalogService } from './catalog.service';

import type Redis from 'ioredis';

interface RabbitMessage {
  payload?: {
    merchantId?: string;
    requestedBy?: string;
    source?: string;
  };
  headers?: { messageId?: string };
  id?: string;
}

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

  async onModuleInit(): Promise<void> {
    await this.rabbit.subscribe('catalog.sync', 'requested', (msg) =>
      this.handleCatalogSyncMessage(msg as RabbitMessage | null),
    );
  }

  private async handleCatalogSyncMessage(
    msg: RabbitMessage | null,
  ): Promise<void> {
    if (!msg) return;
    const { merchantId, requestedBy, source } = msg.payload || {};
    if (!merchantId) return;

    if (!(await this.isNewMessage(msg, merchantId))) return;

    const lockKey = `catalog-sync:${merchantId}`;
    const locked = await this.lock.tryLock(lockKey, 10 * ONE_MINUTE_MS);
    if (!locked) {
      await this.notifySyncAlreadyRunning(requestedBy!, merchantId);
      return;
    }

    try {
      await this.performCatalogSync(requestedBy!, merchantId, source);
    } finally {
      await this.lock.unlock(lockKey);
    }
  }

  private async isNewMessage(
    msg: RabbitMessage,
    merchantId: string,
  ): Promise<boolean> {
    const messageId =
      msg?.headers?.messageId || msg?.id || `${merchantId}:${Date.now()}`;
    const dedupeKey = `idem:catalog-sync:${merchantId}:${messageId}`;
    const isNew = await this.redis.set(
      dedupeKey,
      '1',
      'EX',
      ONE_MINUTE_MS,
      'NX',
    );
    return isNew === 'OK';
  }

  private async notifySyncAlreadyRunning(
    requestedBy: string,
    merchantId: string,
  ): Promise<void> {
    await this.notifications.notifyUser(requestedBy, {
      type: 'catalog.sync.already_running',
      title: 'مزامنة قيد التنفيذ',
      body: 'هناك مزامنة كتالوج نشطة حالياً.',
      merchantId,
      severity: 'info',
    });
  }

  private async performCatalogSync(
    requestedBy: string,
    merchantId: string,
    source?: string,
  ): Promise<void> {
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
    } catch (e: unknown) {
      this.logger.error((e as Error)?.message || e);
      await this.notifications.notifyUser(requestedBy, {
        type: 'catalog.sync.failed',
        title: 'فشل مزامنة الكتالوج',
        body: (e as Error)?.message || 'حدث خطأ أثناء المزامنة',
        merchantId,
        severity: 'error',
      });
    }
  }
}
