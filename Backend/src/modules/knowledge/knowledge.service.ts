// src/modules/knowledge/knowledge.service.ts
import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { chromium } from 'playwright';
import { VectorService } from '../vector/vector.service';
import { SourceUrl } from './schemas/source-url.schema';
import { OutboxService } from 'src/common/outbox/outbox.service';
import { NotificationsService } from '../notifications/notifications.service';

function isUsefulChunk(text: string): boolean {
  const arabicCount = (text.match(/[\u0600-\u06FF]/g) || []).length;
  return arabicCount >= 3;
}

@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);
  constructor(
    @InjectModel(SourceUrl.name)
    private readonly sourceUrlModel: Model<SourceUrl>,
    private readonly vectorService: VectorService,
    private readonly notifications: NotificationsService,   // ⬅️ جديد
    private readonly outbox: OutboxService,                 // ⬅️ جديد 
  ) {}

  async addUrls(merchantId: string, urls: string[], requestedBy?: string) {
    const unique = Array.from(new Set((urls ?? []).map(u => (u || '').trim()).filter(Boolean)));
    if (!unique.length) return { success: false, count: 0, message: 'No URLs' };

    const records = await this.sourceUrlModel.insertMany(
      unique.map((url) => ({ merchantId, url, status: 'pending' })),
      { ordered: false },
    );

    // إشعار “تمت جدولة الروابط”
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

    this.processUrlsInBackground(merchantId, records, requestedBy).catch((error) => {
      this.logger.error(`Background processing failed: ${error.message}`);
    });

    return { success: true, count: records.length, message: 'URLs queued for processing' };
  }
  private async processUrlsInBackground(merchantId: string, records: any[], requestedBy?: string) {
    let done = 0, failed = 0;

    for (let index = 0; index < records.length; index++) {
      const rec = records[index];
      this.logger.log(`Processing URL ${index + 1}/${records.length}: ${rec.url}`);

      // Outbox: started
      await this.outbox.enqueueEvent({
        exchange: 'knowledge.index',
        routingKey: 'url.started',
        eventType: 'knowledge.url.started',
        aggregateType: 'knowledge',
        aggregateId: merchantId,
        payload: { merchantId, url: rec.url, index, total: records.length },
      }).catch(() => {});

      try {
        const { text } = await this.extractTextFromUrl(rec.url);
        this.logger.log(`Extracted ${text.length} characters from ${rec.url}`);

        const chunks = (text.match(/.{1,1000}/gs) ?? []).map(s => s.trim());
        this.logger.log(`Split into ${chunks.length} chunks`);

        let processedChunks = 0;
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          if (chunk.length < 30) continue;
          if (!isUsefulChunk(chunk)) continue;

          const embedding = await this.vectorService.embed(chunk);
          await this.vectorService.upsertWebKnowledge([{
            id: this.vectorService.generateWebKnowledgeId(merchantId, `${rec.url}#${i}`),
            vector: embedding,
            payload: { merchantId, url: rec.url, text: chunk, type: 'url', source: 'web' },
          }]);
          processedChunks++;
        }

        await this.sourceUrlModel.updateOne(
          { _id: rec._id },
          { status: 'completed', textExtracted: text },
        );
        done++;

        // إشعار “اكتملت فهرسة رابط”
        if (requestedBy) {
          await this.notifications.notifyUser(requestedBy, {
            type: 'embeddings.completed',
            title: 'اكتملت فهرسة رابط معرفي',
            body: `تمت معالجة ${processedChunks} مقطع من: ${rec.url}`,
            merchantId,
            severity: 'success',
            data: { url: rec.url, processedChunks },
          });
        }

        // Outbox: completed
        await this.outbox.enqueueEvent({
          exchange: 'knowledge.index',
          routingKey: 'url.completed',
          eventType: 'knowledge.url.completed',
          aggregateType: 'knowledge',
          aggregateId: merchantId,
          payload: { merchantId, url: rec.url, processedChunks },
        }).catch(() => {});

      } catch (e: any) {
        this.logger.error(`Failed to process ${rec.url}: ${e.message}`, e.stack);
        await this.sourceUrlModel.updateOne(
          { _id: rec._id },
          { status: 'failed', errorMessage: e.message },
        );
        failed++;

        // إشعار فشل
        if (requestedBy) {
          await this.notifications.notifyUser(requestedBy, {
            type: 'embeddings.failed',
            title: 'فشل فهرسة رابط معرفي',
            body: rec.url,
            merchantId,
            severity: 'error',
            data: { url: rec.url, error: e.message },
          });
        }

        // Outbox: failed
        await this.outbox.enqueueEvent({
          exchange: 'knowledge.index',
          routingKey: 'url.failed',
          eventType: 'knowledge.url.failed',
          aggregateType: 'knowledge',
          aggregateId: merchantId,
          payload: { merchantId, url: rec.url, error: e.message },
        }).catch(() => {});
      }
    }

    // إشعار ملخّص الدفعة
    if (requestedBy) {
      await this.notifications.notifyUser(requestedBy, {
        type: 'embeddings.batch.completed',
        title: 'انتهت معالجة الروابط',
        body: `تمت: ${done} — فشلت: ${failed} — المجموع: ${records.length}`,
        merchantId,
        severity: failed ? 'warning' : 'success',
        data: { done, failed, total: records.length },
      });
    }

    this.logger.log(`Completed processing all URLs`);
    return { success: true, count: records.length, done, failed };
  }

  async getUrlsStatus(merchantId: string) {
    const urls = await this.sourceUrlModel.find({ merchantId });
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
        textLength: u.textExtracted?.length || 0,
      })),
    };
  }

  // ⬇️ تحسينات بسيطة للمتصفح (no-sandbox + timeout)
  async extractTextFromUrl(url: string): Promise<{ text: string }> {
    const browser = await chromium.launch({ args: ['--no-sandbox'] });
    const page = await browser.newPage({ userAgent: 'Mozilla/5.0 (compatible; KaleemBot/1.0)' });
    try {
      page.setDefaultNavigationTimeout(45_000);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
      // انتظر networkidle قليلاً إن أمكن
      await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
      const text = await page.evaluate(() => document.body?.innerText || '');
      return { text };
    } finally {
      await browser.close();
    }
  }

  async getUrls(merchantId: string) {
    return this.sourceUrlModel
      .find({ merchantId })
      .select({ _id: 1, url: 1, status: 1, errorMessage: 1, createdAt: 1 })
      .lean();
  }


  // ===========================
  //        دوال الحذف
  // ===========================

  /** حذف بسجل Mongo _id (مع حذف متجهاته من Qdrant) */
  async deleteById(merchantId: string, id: string) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('invalid id');

    const rec = await this.sourceUrlModel.findOne({ _id: id, merchantId });
    if (!rec) throw new NotFoundException('record not found');

    await this.deleteVectorsByUrl(merchantId, rec.url);
    await this.sourceUrlModel.deleteOne({ _id: rec._id });

    return { success: true, deleted: 1, url: rec.url };
  }

  /** حذف برابط URL صريح */
  async deleteByUrl(merchantId: string, url: string) {
    const rec = await this.sourceUrlModel.findOne({ merchantId, url });
    if (!rec) throw new NotFoundException('url not found');

    await this.deleteVectorsByUrl(merchantId, url);
    await this.sourceUrlModel.deleteOne({ _id: rec._id });

    return { success: true, deleted: 1, url };
  }

  /** حذف كل روابط هذا التاجر + كل متجهاتها */
  async deleteAll(merchantId: string) {
    const urls = await this.sourceUrlModel.find({ merchantId }).lean();

    // حذف كل نقاط هذا التاجر من web_knowledge
    await this.vectorService.deleteWebKnowledgeByFilter({
      must: [
        { key: 'merchantId', match: { value: merchantId } },
        { key: 'source', match: { value: 'web' } },
      ],
    });

    const { deletedCount } = await this.sourceUrlModel.deleteMany({ merchantId });
    return { success: true, deleted: deletedCount ?? 0, urls: urls.length };
  }

  /** أداة مساعدة: حذف كل نقاط رابط واحد */
  private async deleteVectorsByUrl(merchantId: string, url: string) {
    await this.vectorService.deleteWebKnowledgeByFilter({
      must: [
        { key: 'merchantId', match: { value: merchantId } },
        { key: 'url', match: { value: url } },
        { key: 'source', match: { value: 'web' } },
      ],
    });
  }
}
