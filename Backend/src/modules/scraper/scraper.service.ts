// src/modules/products/scraper.service.ts
import { HttpService } from '@nestjs/axios';
import { InjectQueue } from '@nestjs/bull';
import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Queue } from 'bullmq';
import { firstValueFrom } from 'rxjs';

import type { AxiosResponse } from 'axios';

type MinimalResult = { price: number; isAvailable: boolean };
type FullResult = {
  platform: string;
  name: string;
  price: number;
  isAvailable: boolean;
  images: string[];
  description: string;
  category: string;
  lowQuantity: string;
  specsBlock: string[];
};

// استجابة extractor-service
interface ExtractorResponse {
  data: MinimalResult | FullResult;
}

@Injectable()
export class ScraperService {
  private readonly logger = new Logger(ScraperService.name);
  private readonly extractorUrl = 'http://extractor-service:8001';

  constructor(
    private readonly http: HttpService,
    @InjectQueue('scrape') private readonly scraperQueue: Queue,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async scheduleMinimalScrape(): Promise<void> {
    this.logger.debug('Enqueue minimal scrape');
    await this.scraperQueue.add('scrape', { mode: 'minimal' });
  }

  @Cron(CronExpression.EVERY_WEEK)
  async scheduleFullScrape(): Promise<void> {
    this.logger.debug('Enqueue weekly full scrape');
    await this.scraperQueue.add('scrape', { mode: 'full' });
  }

  /** يستدعي خدمة الاستخلاص العامة */
  private async callExtractor(
    rawUrl: string,
  ): Promise<MinimalResult | FullResult> {
    try {
      // نجعل axios يعرف أن الهيكل هو ExtractorResponse
      const resp: AxiosResponse<ExtractorResponse> = await firstValueFrom(
        this.http.get<ExtractorResponse>(`${this.extractorUrl}/extract/`, {
          params: { url: rawUrl },
        }),
      );
      return resp.data.data;
    } catch (err) {
      this.logger.error(
        `Extractor service failed for ${rawUrl}: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new InternalServerErrorException('Extractor failure');
    }
  }

  /**
   * نقطة الدخول لاستخلاص بيانات المنتج.
   * يستخدم دائماً micro-service الاستخلاص.
   */
  async scrapeProduct(rawUrl: string): Promise<MinimalResult | FullResult> {
    try {
      new URL(rawUrl);
    } catch {
      throw new BadRequestException('Invalid URL');
    }
    return this.callExtractor(rawUrl);
  }
}
