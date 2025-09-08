import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CacheService } from './cache.service';

/**
 * خدمة تسخين الكاش للصفحات الشائعة
 */
@Injectable()
export class CacheWarmerService {
  private readonly logger = new Logger(CacheWarmerService.name);
  private isWarming = false;

  constructor(private readonly cacheService: CacheService) {}

  /**
   * تسخين الكاش كل 15 دقيقة
   */
  @Cron('*/15 * * * *', {
    name: 'cache-warmer',
    timeZone: 'Asia/Riyadh',
  })
  async warmCache(): Promise<void> {
    if (this.isWarming) {
      this.logger.debug('Cache warming already in progress, skipping...');
      return;
    }

    this.isWarming = true;
    const startTime = Date.now();

    try {
      this.logger.log('Starting cache warming process...');

      // تسخين البيانات الأساسية
      await Promise.all([
        this.warmTopMerchants(),
        this.warmActiveProducts(),
        this.warmPopularCategories(),
        this.warmActivePlans(),
      ]);

      const duration = Date.now() - startTime;
      this.logger.log(`Cache warming completed in ${duration}ms`);
    } catch (error) {
      this.logger.error('Cache warming failed:', error);
    } finally {
      this.isWarming = false;
    }
  }

  /**
   * تسخين بيانات أهم التجار
   */
  private async warmTopMerchants(): Promise<void> {
    try {
      // هذا مثال - يجب استبداله بالاستعلام الفعلي
      const topMerchantIds = await this.getTopMerchantIds(20);

      const warmPromises = topMerchantIds.map(async (merchantId) => {
        const cacheKey = CacheService.createKey(
          'v1',
          'merchant',
          'profile',
          merchantId,
        );

        // تسخين الكاش لمدة 30 دقيقة
        await this.cacheService.getOrSet(cacheKey, 1800, async () => {
          // هنا يجب استدعاء الخدمة الفعلية
          return this.getMerchantProfile(merchantId);
        });
      });

      await Promise.all(warmPromises);
      this.logger.debug(
        `Warmed cache for ${topMerchantIds.length} top merchants`,
      );
    } catch (error) {
      this.logger.error('Failed to warm top merchants cache:', error);
    }
  }

  /**
   * تسخين المنتجات النشطة
   */
  private async warmActiveProducts(): Promise<void> {
    try {
      const topMerchantIds = await this.getTopMerchantIds(10);

      const warmPromises = topMerchantIds.map(async (merchantId) => {
        // تسخين الصفحة الأولى من المنتجات
        const cacheKey = CacheService.createKey(
          'v1',
          'products',
          'list',
          merchantId,
          'active',
          '20',
          '0',
        );

        await this.cacheService.getOrSet(cacheKey, 300, async () => {
          // هنا يجب استدعاء ProductsService الفعلي
          return this.getActiveProducts(merchantId);
        });

        // تسخين المنتجات الأكثر مبيعاً
        const popularKey = CacheService.createKey(
          'v1',
          'products',
          'popular',
          merchantId,
        );
        await this.cacheService.getOrSet(popularKey, 600, async () => {
          return this.getPopularProducts(merchantId);
        });
      });

      await Promise.all(warmPromises);
      this.logger.debug(
        `Warmed products cache for ${topMerchantIds.length} merchants`,
      );
    } catch (error) {
      this.logger.error('Failed to warm products cache:', error);
    }
  }

  /**
   * تسخين الفئات الشائعة
   */
  private async warmPopularCategories(): Promise<void> {
    try {
      const topMerchantIds = await this.getTopMerchantIds(15);

      const warmPromises = topMerchantIds.map(async (merchantId) => {
        const cacheKey = CacheService.createKey(
          'v1',
          'categories',
          'list',
          merchantId,
        );

        await this.cacheService.getOrSet(cacheKey, 900, async () => {
          // هنا يجب استدعاء CategoriesService الفعلي
          return this.getMerchantCategories(merchantId);
        });
      });

      await Promise.all(warmPromises);
      this.logger.debug(
        `Warmed categories cache for ${topMerchantIds.length} merchants`,
      );
    } catch (error) {
      this.logger.error('Failed to warm categories cache:', error);
    }
  }

  /**
   * تسخين الخطط النشطة
   */
  private async warmActivePlans(): Promise<void> {
    try {
      const cacheKey = CacheService.createKey('v1', 'plans', 'active');

      await this.cacheService.getOrSet(cacheKey, 3600, async () => {
        // هنا يجب استدعاء PlansService الفعلي
        return this.getActivePlans();
      });

      this.logger.debug('Warmed active plans cache');
    } catch (error) {
      this.logger.error('Failed to warm plans cache:', error);
    }
  }

  /**
   * تسخين يدوي للكاش
   */
  async manualWarm(type?: string): Promise<void> {
    this.logger.log(
      `Manual cache warming started${type ? ` for ${type}` : ''}`,
    );

    try {
      switch (type) {
        case 'merchants':
          await this.warmTopMerchants();
          break;
        case 'products':
          await this.warmActiveProducts();
          break;
        case 'categories':
          await this.warmPopularCategories();
          break;
        case 'plans':
          await this.warmActivePlans();
          break;
        default:
          await this.warmCache();
      }
    } catch (error) {
      this.logger.error(`Manual cache warming failed for ${type}:`, error);
      throw error;
    }
  }

  /**
   * الحصول على معرفات أهم التجار
   * TODO: استبدال بالاستعلام الفعلي من قاعدة البيانات
   */
  private async getTopMerchantIds(limit: number): Promise<string[]> {
    // مثال مؤقت - يجب استبداله بالاستعلام الفعلي
    return Array.from(
      { length: Math.min(limit, 5) },
      (_, i) => `merchant_${i + 1}`,
    );
  }

  /**
   * الحصول على بيانات التاجر
   * TODO: ربط بـ MerchantsService الفعلي
   */
  private async getMerchantProfile(merchantId: string): Promise<any> {
    // مثال مؤقت
    return {
      id: merchantId,
      name: `Merchant ${merchantId}`,
      status: 'active',
      cachedAt: new Date(),
    };
  }

  /**
   * الحصول على المنتجات النشطة
   * TODO: ربط بـ ProductsService الفعلي
   */
  private async getActiveProducts(merchantId: string): Promise<any> {
    // مثال مؤقت
    return {
      items: [],
      meta: { total: 0, hasMore: false },
      merchantId,
      cachedAt: new Date(),
    };
  }

  /**
   * الحصول على المنتجات الشائعة
   * TODO: ربط بـ ProductsService الفعلي
   */
  private async getPopularProducts(merchantId: string): Promise<any> {
    // مثال مؤقت
    return {
      items: [],
      merchantId,
      cachedAt: new Date(),
    };
  }

  /**
   * الحصول على فئات التاجر
   * TODO: ربط بـ CategoriesService الفعلي
   */
  private async getMerchantCategories(merchantId: string): Promise<any> {
    // مثال مؤقت
    return {
      categories: [],
      merchantId,
      cachedAt: new Date(),
    };
  }

  /**
   * الحصول على الخطط النشطة
   * TODO: ربط بـ PlansService الفعلي
   */
  private async getActivePlans(): Promise<any> {
    // مثال مؤقت
    return {
      plans: [],
      cachedAt: new Date(),
    };
  }
}
