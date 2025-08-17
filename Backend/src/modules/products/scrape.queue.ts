// src/modules/products/scrape.queue.ts
import {
  Injectable,
  OnModuleInit,
  Logger,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { Queue, Worker, Job } from 'bullmq';
import { RedisConfig } from '../../config/redis.config';
import { ScraperService } from '../scraper/scraper.service';
import { ProductsService } from './products.service';
import { InjectQueue } from '@nestjs/bull';
import { Types } from 'mongoose';

type ScrapeMode = 'full' | 'minimal';

interface ScrapeJobData {
  productId: string;
  url: string;
  mode: ScrapeMode;
}

@Injectable()
export class ScrapeQueue implements OnModuleInit {
  private readonly logger = new Logger(ScrapeQueue.name);

  @InjectQueue('scrape')
  private queue: Queue<ScrapeJobData>;

  constructor(
    private readonly redisConfig: RedisConfig,
    private readonly scraperService: ScraperService,
    @Inject(forwardRef(() => ProductsService))
    private readonly productsService: ProductsService,
  ) {}

  onModuleInit() {
    // نضمن أن اسم الطابور موحّد مع InjectQueue
    this.queue = new Queue<ScrapeJobData>('scrape', {
      connection: this.redisConfig.connection,
    });

    new Worker<ScrapeJobData>(
      'scrape',
      async (job: Job<ScrapeJobData>) => {
        const { productId, url, mode } = job.data;
        try {
          // استدعاء scraperService بدون تمرير options
          const result = await this.scraperService.scrapeProduct(url);

          const now = new Date();
          if (mode === 'minimal') {
            // نأكد أن result يحتوي على price و isAvailable
            const { price, isAvailable } = result as {
              price: number;
              isAvailable: boolean;
            };
            await this.productsService.updateAfterScrape(productId, {
              price,
              isAvailable,
              lastFetchedAt: now,
              errorState: '',
            });
          } else {
            // full: نحدّث كل الحقول
            const {
              name,
              price,
              isAvailable,
              images,
              description,
              category,
              lowQuantity,
              specsBlock,
              platform,
            } = result as {
              name: string;
              price: number;
              isAvailable: boolean;
              images: string[];
              description: string;
              category: string;
              lowQuantity: string;
              specsBlock: string[];
              platform: string;
            };

            await this.productsService.updateAfterScrape(productId, {
              name,
              price,
              isAvailable,
              images,
              description,
              category: category ? new Types.ObjectId(category) : undefined,
              lowQuantity,
              specsBlock,
              platform,
              lastFetchedAt: now,
              lastFullScrapedAt: now,
              errorState: '',
            });
          }

          this.logger.log(`Scraped [${mode}] and updated product ${productId}`);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          await this.productsService.updateAfterScrape(productId, {
            errorState: message,
            lastFetchedAt: new Date(),
          });
          this.logger.error(
            `Failed to scrape (${mode}) product ${productId}: ${message}`,
          );
        }
      },
      {
        connection: this.redisConfig.connection,
        concurrency: parseInt(process.env.SCRAPER_CONCURRENCY ?? '5', 10),
      },
    );
  }

  /**
   * لإضافة مهمة إلى الطابور:
   * mode: 'full' عند الإضافة الأولى أو طلب صريح
   * mode: 'minimal' للتحديث الدوري
   */
  async addJob(data: ScrapeJobData) {
    await this.queue.add('scrape', data, {
      removeOnComplete: true,
      removeOnFail: false,
    });
  }
}
