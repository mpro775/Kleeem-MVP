import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { CacheWarmer } from './warmers/cache-warmer.interface';

@Injectable()
export class CacheWarmerOrchestrator {
  private readonly logger = new Logger(CacheWarmerOrchestrator.name);
  private isWarming = false;

  constructor(
    private readonly warmers: CacheWarmer[], // استخدم Provider multi: true (توضح بالأسفل)
  ) {}

  /** يشغّل كل الـ warmers كل 15 دقيقة */
  @Cron('*/15 * * * *', { name: 'cache-warmer', timeZone: 'Asia/Riyadh' })
  async warmAll(): Promise<void> {
    if (this.isWarming) {
      this.logger.debug('Cache warming already in progress, skipping...');
      return;
    }

    this.isWarming = true;
    const start = Date.now();
    try {
      this.logger.log('Starting cache warming process...');
      await Promise.all(this.warmers.map((w) => w.warm()));
      this.logger.log(`Cache warming completed in ${Date.now() - start}ms`);
    } catch (err) {
      this.logger.error('Cache warming failed', err as Error);
    } finally {
      this.isWarming = false;
    }
  }

  /** تشغيل يدوي حسب الاسم أو الكل */
  async manualWarm(type?: string): Promise<void> {
    const name = type?.toLowerCase();
    const targets = name
      ? this.warmers.filter((w) => w.name === name)
      : this.warmers;

    if (name && targets.length === 0) {
      this.logger.warn(`No warmer found for type "${name}"`);
      return;
    }

    this.logger.log(
      `Manual cache warming started${name ? ` for ${name}` : ''}`,
    );
    const start = Date.now();
    try {
      await Promise.all(targets.map((w) => w.warm()));
      this.logger.log(`Manual warming done in ${Date.now() - start}ms`);
    } catch (err) {
      this.logger.error(
        `Manual warming failed${name ? ` for ${name}` : ''}`,
        err as Error,
      );
      throw err;
    }
  }
}
