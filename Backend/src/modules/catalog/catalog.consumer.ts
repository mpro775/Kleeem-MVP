import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RabbitService } from 'src/infra/rabbit/rabbit.service';
import { CatalogService } from './catalog.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CatalogConsumer implements OnModuleInit {
  private readonly logger = new Logger(CatalogConsumer.name);

  constructor(
    private readonly rabbit: RabbitService,
    private readonly catalog: CatalogService,
    private readonly notifications: NotificationsService,
  ) {}

  async onModuleInit() {
    await this.rabbit.subscribe('catalog.sync', 'requested', async (msg) => {
      const { merchantId, requestedBy, source } = msg.payload || {};
      if (!merchantId) return;

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
      }
    });
  }
}
