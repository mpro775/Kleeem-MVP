import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { chromium, Browser } from 'playwright';
import { OutboxService } from 'src/common/outbox/outbox.service';

import { NotificationsService } from '../notifications/notifications.service';
import { VectorService } from '../vector/vector.service';

import { SOURCE_URL_REPOSITORY } from './tokens';

import type {
  SourceUrlRepository,
  SourceUrlEntity,
} from './repositories/source-url.repository';

// ======================== Constants (no magic numbers/strings) ========================
const MIN_ARABIC_CHARS = 3;
const MIN_CHUNK_LENGTH = 30;
const CHUNK_SIZE = 1_000;

const PLAYWRIGHT_NO_SANDBOX_ARG = '--no-sandbox' as const;
const NAV_TIMEOUT_MS = 45_000;
const NETWORK_IDLE_TIMEOUT_MS = 15_000;
const CRAWLER_UA = 'Mozilla/5.0 (compatible; KaleemBot/1.0)' as const;

const EXCHANGE_KNOWLEDGE = 'knowledge.index' as const;
const RK_URL_STARTED = 'url.started' as const;
const RK_URL_COMPLETED = 'url.completed' as const;
const RK_URL_FAILED = 'url.failed' as const;

const SOURCE_WEB = 'web' as const;
const TYPE_URL = 'url' as const;

// ======================== Types ========================
interface AddUrlsResult {
  success: boolean;
  count: number;
  message: string;
}

interface ProcessBatchNotificationData extends Record<string, unknown> {
  done: number;
  failed: number;
  total: number;
}

interface UrlsStatus {
  total: number;
  pending: number;
  completed: number;
  failed: number;
  urls: Array<{
    id: string;
    url: string;
    status: string;
    errorMessage?: string | null;
    textLength: number;
  }>;
}

interface DeleteResult {
  success: true;
  deleted: 1;
  url: string;
}

interface DeleteAllResult {
  success: true;
  deleted: number;
  urls: number;
}

// ======================== Helpers ========================
function isUsefulChunk(text: string): boolean {
  const arabicCount = (text.match(/[\u0600-\u06FF]/g) || []).length;
  return arabicCount >= MIN_ARABIC_CHARS;
}

function isError(x: unknown): x is Error {
  return typeof x === 'object' && x !== null && 'message' in x;
}

function splitIntoChunks(text: string, size = CHUNK_SIZE): string[] {
  if (!text) return [];
  const re = new RegExp(`.{1,${size}}`, 'gs');
  return text.match(re)?.map((s) => s.trim()) ?? [];
}

@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);

  constructor(
    @Inject(SOURCE_URL_REPOSITORY)
    private readonly sourceUrls: SourceUrlRepository,
    private readonly vectorService: VectorService,
    private readonly notifications: NotificationsService,
    private readonly outbox: OutboxService,
  ) {}

  // ======================== Public API ========================

  async addUrls(
    merchantId: string,
    urls: string[],
    requestedBy?: string,
  ): Promise<AddUrlsResult> {
    const unique = Array.from(
      new Set((urls ?? []).map((u) => (u || '').trim()).filter(Boolean)),
    );
    if (unique.length === 0) {
      return { success: false, count: 0, message: 'No URLs' };
    }

    const records = await this.sourceUrls.createMany(
      unique.map((url) => ({ merchantId, url, status: 'pending' })),
    );

    if (requestedBy) {
      await this.notifications.notifyUser(requestedBy, {
        type: 'knowledge.urls.queued',
        title: 'تمت جدولة روابط للمعرفة',
        body: `عدد الروابط: ${records.length}`,
        merchantId,
        severity: 'info',
        data: { count: records.length },
      });
    }

    // معالجة بالخلفية
    this.processUrlsInBackground(merchantId, records, requestedBy).catch(
      (error: unknown) => {
        const msg = isError(error) ? error.message : String(error);
        this.logger.error(`Background processing failed: ${msg}`);
      },
    );

    return {
      success: true,
      count: records.length,
      message: 'URLs queued for processing',
    };
  }

  async getUrlsStatus(merchantId: string): Promise<UrlsStatus> {
    const urls = await this.sourceUrls.findByMerchant(merchantId);
    return {
      total: urls.length,
      pending: urls.filter((u) => u.status === 'pending').length,
      completed: urls.filter((u) => u.status === 'completed').length,
      failed: urls.filter((u) => u.status === 'failed').length,
      urls: urls.map((u) => ({
        id: String(u._id),
        url: u.url,
        status: u.status,
        errorMessage: u.errorMessage,
        textLength: u.textExtracted?.length ?? 0,
      })),
    };
  }

  async extractTextFromUrl(url: string): Promise<{ text: string }> {
    const browser = await chromium.launch({
      args: [PLAYWRIGHT_NO_SANDBOX_ARG],
    });
    let page: Awaited<ReturnType<Browser['newPage']>> | null = null;

    try {
      page = await browser.newPage({ userAgent: CRAWLER_UA });
      page.setDefaultNavigationTimeout(NAV_TIMEOUT_MS);

      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: NAV_TIMEOUT_MS,
      });
      await page
        .waitForLoadState('networkidle', { timeout: NETWORK_IDLE_TIMEOUT_MS })
        .catch(() => undefined);

      const text = await page.evaluate(() => document.body?.innerText || '');
      return { text };
    } finally {
      try {
        if (page) await page.close({ runBeforeUnload: false });
      } catch {
        // ignore
      }
      await browser.close();
    }
  }

  async getUrls(
    merchantId: string,
  ): Promise<
    Array<
      Pick<
        SourceUrlEntity,
        '_id' | 'url' | 'status' | 'errorMessage' | 'createdAt'
      >
    >
  > {
    return this.sourceUrls.findListByMerchant(merchantId);
  }

  // ======================== Deletions ========================

  async deleteById(merchantId: string, id: string): Promise<DeleteResult> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('invalid id');
    }

    const rec = await this.sourceUrls.findByIdForMerchant(id, merchantId);
    if (!rec) throw new NotFoundException('record not found');

    await this.deleteVectorsByUrl(merchantId, rec.url);
    await this.sourceUrls.deleteByIdForMerchant(id, merchantId);

    return { success: true, deleted: 1, url: rec.url };
  }

  async deleteByUrl(merchantId: string, url: string): Promise<DeleteResult> {
    const rec = await this.sourceUrls.findByUrlForMerchant(url, merchantId);
    if (!rec) throw new NotFoundException('url not found');

    await this.deleteVectorsByUrl(merchantId, url);
    await this.sourceUrls.deleteByIdForMerchant(String(rec._id), merchantId);

    return { success: true, deleted: 1, url };
  }

  async deleteAll(merchantId: string): Promise<DeleteAllResult> {
    const urls = await this.sourceUrls.findByMerchant(merchantId);

    await this.vectorService.deleteWebKnowledgeByFilter({
      must: [
        { key: 'merchantId', match: { value: merchantId } },
        { key: 'source', match: { value: SOURCE_WEB } },
      ],
    });

    const deleted = await this.sourceUrls.deleteByMerchant(merchantId);
    return { success: true, deleted, urls: urls.length };
  }

  // ======================== Private: processing pipeline ========================

  private async processUrlsInBackground(
    merchantId: string,
    records: SourceUrlEntity[],
    requestedBy?: string,
  ): Promise<void> {
    let done = 0;
    let failed = 0;

    for (let index = 0; index < records.length; index += 1) {
      const rec = records[index];

      await this.enqueueOutbox(RK_URL_STARTED, merchantId, {
        merchantId,
        url: rec.url,
        index,
        total: records.length,
      });

      try {
        const processedChunks = await this.processSingleUrl(merchantId, rec);

        await this.sourceUrls.markCompleted(String(rec._id), '');
        done += 1;

        await this.notifyCompleted(
          requestedBy,
          merchantId,
          rec.url,
          processedChunks,
        );
        await this.enqueueOutbox(RK_URL_COMPLETED, merchantId, {
          merchantId,
          url: rec.url,
          processedChunks,
        });
      } catch (e: unknown) {
        const msg = isError(e) ? e.message : 'Unknown error';
        const stack = isError(e) ? e.stack : undefined;

        this.logger.error(`Failed to process ${rec.url}: ${msg}`, stack);
        await this.sourceUrls.markFailed(String(rec._id), msg);
        failed += 1;

        await this.notifyFailed(requestedBy, merchantId, rec.url, msg);
        await this.enqueueOutbox(RK_URL_FAILED, merchantId, {
          merchantId,
          url: rec.url,
          error: msg,
        });
      }
    }

    if (requestedBy) {
      const summary: ProcessBatchNotificationData = {
        done,
        failed,
        total: records.length,
      };
      await this.notifications.notifyUser(requestedBy, {
        type: 'embeddings.batch.completed',
        title: 'انتهت معالجة الروابط',
        body: `تمت: ${summary.done} — فشلت: ${summary.failed} — المجموع: ${summary.total}`,
        merchantId,
        severity: summary.failed ? 'warning' : 'success',
        data: summary,
      });
    }

    this.logger.log('Completed processing all URLs');
  }

  private async processSingleUrl(
    merchantId: string,
    rec: SourceUrlEntity,
  ): Promise<number> {
    const { text } = await this.extractTextFromUrl(rec.url);
    this.logger.log(`Extracted ${text.length} characters from ${rec.url}`);

    const chunks = splitIntoChunks(text, CHUNK_SIZE);
    this.logger.log(`Split into ${chunks.length} chunks`);

    let processedChunks = 0;

    for (let i = 0; i < chunks.length; i += 1) {
      const chunk = chunks[i];
      if (chunk.length < MIN_CHUNK_LENGTH) continue;
      if (!isUsefulChunk(chunk)) continue;

      const embedding = await this.vectorService.embedText(chunk);
      await this.vectorService.upsertWebKnowledge([
        {
          id: this.vectorService.generateWebKnowledgeId(
            merchantId,
            `${rec.url}#${i}`,
          ),
          vector: embedding,
          payload: {
            merchantId,
            url: rec.url,
            text: chunk,
            type: TYPE_URL,
            source: SOURCE_WEB,
          },
        },
      ]);

      processedChunks += 1;
    }

    return processedChunks;
  }

  private async deleteVectorsByUrl(
    merchantId: string,
    url: string,
  ): Promise<void> {
    await this.vectorService.deleteWebKnowledgeByFilter({
      must: [
        { key: 'merchantId', match: { value: merchantId } },
        { key: 'url', match: { value: url } },
        { key: 'source', match: { value: SOURCE_WEB } },
      ],
    });
  }

  private async notifyCompleted(
    requestedBy: string | undefined,
    merchantId: string,
    url: string,
    processedChunks: number,
  ): Promise<void> {
    if (!requestedBy) return;
    await this.notifications.notifyUser(requestedBy, {
      type: 'embeddings.completed',
      title: 'اكتملت فهرسة رابط معرفي',
      body: `تمت معالجة ${processedChunks} مقطع من: ${url}`,
      merchantId,
      severity: 'success',
      data: { url, processedChunks },
    });
  }

  private async notifyFailed(
    requestedBy: string | undefined,
    merchantId: string,
    url: string,
    errorMessage: string,
  ): Promise<void> {
    if (!requestedBy) return;
    await this.notifications.notifyUser(requestedBy, {
      type: 'embeddings.failed',
      title: 'فشل فهرسة رابط معرفي',
      body: url,
      merchantId,
      severity: 'error',
      data: { url, error: errorMessage },
    });
  }

  private async enqueueOutbox(
    routingKey:
      | typeof RK_URL_STARTED
      | typeof RK_URL_COMPLETED
      | typeof RK_URL_FAILED,
    aggregateId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await this.outbox
      .enqueueEvent({
        exchange: EXCHANGE_KNOWLEDGE,
        routingKey,
        eventType: `knowledge.${routingKey}`,
        aggregateType: 'knowledge',
        aggregateId,
        payload,
      })
      .catch(() => undefined);
  }
}
