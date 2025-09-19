import { Inject, Injectable } from '@nestjs/common';
import { v5 as uuidv5 } from 'uuid';
import { BotFaq } from './schemas/botFaq.schema';
import { CreateBotFaqDto } from './dto/create-botFaq.dto';
import { UpdateBotFaqDto } from './dto/update-botFaq.dto';
import { BulkImportDto } from './dto/bulk-import.dto';
import { VectorService } from '../../vector/vector.service';
import { BOT_FAQ_REPOSITORY } from './tokens';
import { BotFaqRepository } from './repositories/bot-faq.repository';

type BotFaqPayload = {
  faqId: string;
  question: string;
  answer: string;
  type: 'faq';
  source: 'manual' | 'auto' | 'imported';
  tags: string[];
  locale: 'ar' | 'en';
};
type BotFaqPoint = {
  id: string;
  vector: number[];
  payload: BotFaqPayload;
};

const BOT_FAQ_NAMESPACE =
  process.env.BOT_FAQ_NAMESPACE || '6fa459ea-ee8a-3ca4-894e-db77e160355e';

@Injectable()
export class BotFaqService {
  constructor(
    @Inject(BOT_FAQ_REPOSITORY)
    private readonly repo: BotFaqRepository,
    private readonly vectorService: VectorService,
  ) {}

  private pointId(faqId: string, botId = 'kleem') {
    return uuidv5(`${botId}:${faqId}`, BOT_FAQ_NAMESPACE);
  }

  private async embedAndUpsert(
    doc: Pick<BotFaq, 'question' | 'answer' | 'source' | 'tags' | 'locale'> & {
      id: string;
    },
  ) {
    const text = `${doc.question}\n${doc.answer}`;
    const embedding = await this.vectorService.embedText(text);
    await this.vectorService.upsertBotFaqs([
      {
        id: this.pointId(String(doc.id)),
        vector: embedding,
        payload: {
          faqId: String(doc.id),
          question: doc.question,
          answer: doc.answer,
          type: 'faq',
          source: (doc.source as any) ?? 'manual',
          tags: (doc.tags as any) ?? [],
          locale: (doc.locale as any) ?? 'ar',
        },
      },
    ]);
  }

  async create(dto: CreateBotFaqDto, createdBy?: string) {
    const created = await this.repo.create({
      ...(dto as any),
      vectorStatus: 'pending',
      createdBy,
    });
    try {
      await this.embedAndUpsert({
        id: String((created as any)._id ?? (created as any).id),
        question: (created as any).question,
        answer: (created as any).answer,
        source: (created as any).source,
        tags: (created as any).tags,
        locale: (created as any).locale,
      });
      const updated = await this.repo.updateById(String((created as any)._id), {
        vectorStatus: 'ok',
      } as any);
      return updated ?? created;
    } catch (e: any) {
      await this.repo.updateById(String((created as any)._id), {
        vectorStatus: 'failed',
      } as any);
      // طباعة مختصرة للخطأ (بدون رمي تفاصيل حساسة)
      // eslint-disable-next-line no-console
      console.error(
        '[BotFaq.create] upsert failed:',
        e?.response?.data ?? e?.message,
      );
      throw e;
    }
  }

  async findAll() {
    return this.repo.findAllActiveSorted();
  }

  async semanticSearch(q: string, topK = 5) {
    return this.vectorService.searchBotFaqs(q, topK);
  }

  async update(id: string, dto: UpdateBotFaqDto) {
    const existing = await this.repo.findById(id);
    if (!existing) return null;

    const willReindex =
      'question' in dto ||
      'answer' in dto ||
      'tags' in dto ||
      'locale' in dto ||
      'source' in dto;

    let doc = await this.repo.updateById(id, {
      ...(dto as any),
      ...(willReindex ? { vectorStatus: 'pending' } : {}),
    });

    if (willReindex) {
      try {
        await this.embedAndUpsert({
          id: String(id),
          question: (doc as any)?.question ?? (existing as any).question,
          answer: (doc as any)?.answer ?? (existing as any).answer,
          source: (doc as any)?.source ?? (existing as any).source,
          tags: (doc as any)?.tags ?? (existing as any).tags,
          locale: (doc as any)?.locale ?? (existing as any).locale,
        });
        doc = await this.repo.updateById(id, { vectorStatus: 'ok' } as any);
      } catch (e: any) {
        await this.repo.updateById(id, { vectorStatus: 'failed' } as any);
        // eslint-disable-next-line no-console
        console.error(
          '[BotFaq.update] upsert failed:',
          e?.response?.data ?? e?.message,
        );
      }
    }

    return doc;
  }

  async delete(id: string) {
    const deleted = await this.repo.softDelete(id);
    try {
      await this.vectorService.deleteBotFaqPoint(this.pointId(String(id)));
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log(e);
    }
    return deleted;
  }

  async bulkImport(body: BulkImportDto, createdBy?: string) {
    const docs = await this.repo.insertMany(
      body.items.map((x) => ({
        ...(x as any),
        vectorStatus: 'pending',
        createdBy,
      })),
    );

    const BATCH = 50;
    for (let i = 0; i < docs.length; i += BATCH) {
      const points: BotFaqPoint[] = [];
      const batch = docs.slice(i, i + BATCH);

      for (const d of batch) {
        const faqId = String((d as any)._id ?? (d as any).id);
        const text = `${(d as any).question}\n${(d as any).answer}`;
        const emb = await this.vectorService.embedText(text);

        points.push({
          id: this.pointId(faqId),
          vector: emb,
          payload: {
            faqId,
            question: (d as any).question,
            answer: (d as any).answer,
            type: 'faq',
            source: ((d as any).source as any) ?? 'manual',
            tags: (d as any).tags ?? [],
            locale: ((d as any).locale as any) ?? 'ar',
          },
        });
      }

      await this.vectorService.upsertBotFaqs(points);
      await this.repo.updateManyByIds(
        batch.map((b: any) => String(b._id ?? b.id)),
        { vectorStatus: 'ok' } as any,
      );
    }

    return { inserted: docs.length };
  }

  async reindexAll() {
    const docs = await this.repo.findAllActiveLean();

    const points: BotFaqPoint[] = [];
    for (const d of docs as any[]) {
      const faqId = String(d._id ?? d.id);
      const text = `${d.question}\n${d.answer}`;
      const emb = await this.vectorService.embedText(text);

      points.push({
        id: this.pointId(faqId),
        vector: emb,
        payload: {
          faqId,
          question: d.question,
          answer: d.answer,
          type: 'faq',
          source: d.source ?? 'manual',
          tags: d.tags ?? [],
          locale: d.locale ?? 'ar',
        },
      });
    }

    if (points.length) {
      await this.vectorService.upsertBotFaqs(points);
      await this.repo.updateManyByIds(
        (docs as any[]).map((x) => String(x._id ?? x.id)),
        { vectorStatus: 'ok' } as any,
      );
    }
    return { count: docs.length };
  }
}
