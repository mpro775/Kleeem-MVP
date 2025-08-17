// src/modules/knowledge/knowledge.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { chromium } from 'playwright';

import { VectorService } from '../vector/vector.service';
import { SourceUrl } from './schemas/source-url.schema';
function isUsefulChunk(text: string): boolean {
  const arabicCount = (text.match(/[\u0600-\u06FF]/g) || []).length;
  return arabicCount >= 3; // تقليل الحد الأدنى
}
@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);
  constructor(
    @InjectModel(SourceUrl.name)
    private readonly sourceUrlModel: Model<SourceUrl>,
    private readonly vectorService: VectorService,
  ) {}

  async addUrls(merchantId: string, urls: string[]) {
    // حفظ الروابط فقط وإرجاع الرد فورًا
    const records = await this.sourceUrlModel.insertMany(
      urls.map((url) => ({
        merchantId,
        url,
        status: 'pending',
      })),
    );

    // معالجة الروابط في الخلفية
    this.processUrlsInBackground(merchantId, records).catch((error) => {
      this.logger.error(`Background processing failed: ${error.message}`);
    });

    return {
      success: true,
      count: records.length,
      message: 'URLs queued for processing',
    };
  }

  private async processUrlsInBackground(merchantId: string, records: any[]) {
    // نفس الكود السابق للمعالجة

    // 2. معالجة كل رابط
    for (let index = 0; index < records.length; index++) {
      const rec = records[index];
      this.logger.log(
        `Processing URL ${index + 1}/${records.length}: ${rec.url}`,
      );
      const { text } = await this.extractTextFromUrl(rec.url);

      this.logger.debug(
        `Extracted text (${text.length} chars): ${text.substring(0, 100)}...`,
      );

      try {
        const { text } = await this.extractTextFromUrl(rec.url);
        this.logger.log(`Extracted ${text.length} characters from ${rec.url}`);

        const chunks = text.match(/.{1,1000}/gs) ?? [];
        this.logger.log(`Split into ${chunks.length} chunks`);

        let processedChunks = 0;
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i].trim();
          if (chunk.length < 30) {
            this.logger.log(
              `Skipping chunk ${i}: too short (${chunk.length} chars)`,
            );
            continue;
          }
          if (!isUsefulChunk(chunk)) {
            this.logger.log(`Skipping chunk ${i}: not useful`);
            continue;
          }

          this.logger.log(`Embedding chunk ${i}...`);
          const embedding = await this.vectorService.embed(chunk);

          await this.vectorService.upsertWebKnowledge([
            {
              id: this.vectorService.generateWebKnowledgeId(
                merchantId, // صحيح
                `${rec.url}#${i}`, // صحيح
              ),
              vector: embedding,
              payload: {
                merchantId,
                url: rec.url,
                text: chunk,
                type: 'url',
                source: 'web',
              },
            },
          ]);
          processedChunks++;
        }

        this.logger.log(`Processed ${processedChunks} chunks for ${rec.url}`);

        await this.sourceUrlModel.updateOne(
          { _id: rec._id },
          { status: 'completed', textExtracted: text },
        );
      } catch (e: any) {
        this.logger.error(
          `Failed to process ${rec.url}: ${e.message}`,
          e.stack,
        );
        await this.sourceUrlModel.updateOne(
          { _id: rec._id },
          { status: 'failed', errorMessage: e.message },
        );
      }
    }

    this.logger.log(`Completed processing all URLs`);
    return { success: true, count: records.length };
  }
  catch(error: any) {
    this.logger.error(`Fatal error in addUrls: ${error.message}`, error.stack);
    throw error;
  }
  async getUrlsStatus(merchantId: string) {
    const urls = await this.sourceUrlModel.find({ merchantId });

    return {
      total: urls.length,
      pending: urls.filter((u) => u.status === 'pending').length,
      completed: urls.filter((u) => u.status === 'completed').length,
      failed: urls.filter((u) => u.status === 'failed').length,
      urls: urls.map((u) => ({
        url: u.url,
        status: u.status,
        errorMessage: u.errorMessage,
        textLength: u.textExtracted?.length || 0,
      })),
    };
  }
  async getUrls(merchantId: string) {
    return this.sourceUrlModel.find({ merchantId }).lean();
  }
  async extractTextFromUrl(url: string): Promise<{ text: string }> {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });
    const text = await page.evaluate(() => document.body.innerText);
    await browser.close();
    return { text };
  }
}
