import { Inject, Injectable } from '@nestjs/common';
import { BotFaqSearchItem } from 'src/modules/vector/utils/types';
import { v5 as uuidv5 } from 'uuid';

import { VectorService } from '../../vector/vector.service';

import { BulkImportDto } from './dto/bulk-import.dto';
import { CreateBotFaqDto } from './dto/create-botFaq.dto';
import { UpdateBotFaqDto } from './dto/update-botFaq.dto';
import {
  BotFaqLean,
  BotFaqRepository,
} from './repositories/bot-faq.repository';
import { BotFaq } from './schemas/botFaq.schema';
import { BOT_FAQ_REPOSITORY } from './tokens';

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
          source: (doc.source as unknown as string) ?? 'manual',
          tags: (doc.tags as unknown as string[]) ?? [],
          locale: (doc.locale as unknown as string) ?? 'ar',
        },
      },
    ]);
  }

  async create(dto: CreateBotFaqDto, createdBy?: string): Promise<BotFaqLean> {
    const createData: Partial<BotFaq> = {
      ...(dto as unknown as Partial<BotFaq>),
      vectorStatus: 'pending',
    };

    if (createdBy) {
      createData.createdBy = createdBy;
    }

    const created = await this.repo.create(createData);
    try {
      const faqData = created as unknown as BotFaqLean;
      await this.embedAndUpsert({
        id: String(faqData._id ?? faqData.id),
        question: faqData.question,
        answer: faqData.answer,
        source: faqData.source ?? 'manual',
        tags: faqData.tags ?? [],
        locale: faqData.locale ?? 'ar',
      });
      const updated = await this.repo.updateById(
        String((created as unknown as BotFaqLean)._id),
        {
          vectorStatus: 'ok',
        } as unknown as Partial<BotFaq>,
      );
      return updated ?? created;
    } catch (e: unknown) {
      await this.repo.updateById(
        String((created as unknown as BotFaqLean)._id),
        {
          vectorStatus: 'failed',
        } as unknown as Partial<BotFaq>,
      );
      // طباعة مختصرة للخطأ (بدون رمي تفاصيل حساسة)

      throw e;
    }
  }

  async findAll(): Promise<BotFaqLean[]> {
    return this.repo.findAllActiveSorted();
  }

  async semanticSearch(q: string, topK = 5): Promise<BotFaqSearchItem[]> {
    return this.vectorService.searchBotFaqs(q, topK);
  }

  private shouldReindex(dto: UpdateBotFaqDto): boolean {
    return (
      'question' in dto ||
      'answer' in dto ||
      'tags' in dto ||
      'locale' in dto ||
      'source' in dto
    );
  }

  private getFaqData(doc: BotFaqLean | null, existing: BotFaqLean) {
    const { question, answer, source, tags, locale } = { ...existing, ...doc };
    return {
      question,
      answer,
      source: source ?? 'manual',
      tags: tags ?? [],
      locale: locale ?? 'ar',
    };
  }

  private async performReindex(
    id: string,
    doc: BotFaqLean | null,
    existing: BotFaqLean,
  ): Promise<void> {
    const data = this.getFaqData(doc, existing);
    await this.embedAndUpsert({
      id: String(id),
      ...data,
    });
  }

  private async reindexFaq(
    id: string,
    doc: BotFaqLean | null,
    existing: BotFaqLean,
  ): Promise<void> {
    try {
      await this.performReindex(id, doc, existing);
      await this.repo.updateById(id, {
        vectorStatus: 'ok',
      } as unknown as Partial<BotFaq>);
    } catch (e: unknown) {
      await this.repo.updateById(id, {
        vectorStatus: 'failed',
      } as unknown as Partial<BotFaq>);
      throw e;
    }
  }

  async update(id: string, dto: UpdateBotFaqDto): Promise<BotFaqLean | null> {
    const existing = await this.repo.findById(id);
    if (!existing) return null;

    const willReindex = this.shouldReindex(dto);

    let doc = await this.repo.updateById(id, {
      ...(dto as unknown as Partial<BotFaq>),
      ...(willReindex ? { vectorStatus: 'pending' } : {}),
    });

    if (willReindex) {
      await this.reindexFaq(id, doc, existing);
      doc = await this.repo.updateById(id, {
        vectorStatus: 'ok',
      } as unknown as Partial<BotFaq>);
    }

    return doc;
  }

  async delete(id: string): Promise<BotFaqLean | null> {
    const deleted = await this.repo.softDelete(id);
    try {
      await this.vectorService.deleteBotFaqPoint(this.pointId(String(id)));
    } catch (e: unknown) {
      // eslint-disable-next-line no-console
      console.log(e);
    }
    return deleted;
  }

  async bulkImport(
    body: BulkImportDto,
    createdBy?: string,
  ): Promise<{ inserted: number }> {
    const docs = await this.repo.insertMany(
      body.items.map((x) => {
        const item: Partial<BotFaq> = {
          ...(x as unknown as Partial<BotFaq>),
          vectorStatus: 'pending',
        };
        if (createdBy) {
          item.createdBy = createdBy;
        }
        return item;
      }),
    );

    const BATCH = 50;
    for (let i = 0; i < docs.length; i += BATCH) {
      const points: BotFaqPoint[] = [];
      const batch = docs.slice(i, i + BATCH);

      for (const d of batch) {
        const faqId = String(
          (d as unknown as BotFaqLean)._id ?? (d as unknown as BotFaqLean).id,
        );
        const text = `${(d as unknown as BotFaqLean).question}\n${(d as unknown as BotFaqLean).answer}`;
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

      await this.vectorService.upsertBotFaqs(points);
      await this.repo.updateManyByIds(
        batch.map((b) => String(b._id ?? b.id)),
        { vectorStatus: 'ok' } as unknown as Partial<BotFaq>,
      );
    }

    return { inserted: docs.length };
  }

  async reindexAll(): Promise<{ count: number }> {
    const docs = await this.repo.findAllActiveLean();

    const points: BotFaqPoint[] = [];
    for (const d of docs as unknown as BotFaqLean[]) {
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
        (docs as unknown as BotFaqLean[]).map((x) => String(x._id ?? x.id)),
        { vectorStatus: 'ok' } as unknown as Partial<BotFaq>,
      );
    }
    return { count: docs.length };
  }
}
