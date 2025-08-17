// src/modules/kleem/botFaq/botFaq.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v5 as uuidv5 } from 'uuid';
import { BotFaq } from './schemas/botFaq.schema';
import { CreateBotFaqDto } from './dto/create-botFaq.dto';
import { UpdateBotFaqDto } from './dto/update-botFaq.dto';
import { BulkImportDto } from './dto/bulk-import.dto';
import { VectorService } from 'src/modules/vector/vector.service';
type BotFaqPayload = {
  faqId: string;
  question: string;
  answer: string;
  type: 'faq';
  source: 'manual' | 'auto' | 'imported';
  tags: string[];
  locale: 'ar' | 'en';
};

// إن حبيت بدون الاعتماد على PointStruct:
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
    @InjectModel(BotFaq.name) private botFaqModel: Model<BotFaq>,
    private readonly vectorService: VectorService,
  ) {}

  private pointId(faqId: string, botId = 'kleem') {
    return uuidv5(`${botId}:${faqId}`, BOT_FAQ_NAMESPACE);
  }

  private async embedAndUpsert(d: BotFaq) {
    const text = `${d.question}\n${d.answer}`;
    const embedding = await this.vectorService.embed(text);
    await this.vectorService.upsertBotFaqs([
      {
        id: this.pointId(d.id.toString()),
        vector: embedding,
        payload: {
          faqId: d.id,
          question: d.question,
          answer: d.answer,
          type: 'faq',
          source: d.source ?? 'manual',
          tags: d.tags ?? [],
          locale: d.locale ?? 'ar',
        },
      },
    ]);
  }

  async create(dto: CreateBotFaqDto, createdBy?: string) {
    const doc = new this.botFaqModel({
      ...dto,
      vectorStatus: 'pending',
      createdBy,
    });
    await doc.save(); // نحفظ أولاً

    try {
      const text = `${doc.question}\n${doc.answer}`;
      const emb = await this.vectorService.embed(text);
      await this.vectorService.upsertBotFaqs([
        {
          id: this.pointId(doc.id.toString()),
          vector: emb,
          payload: {
            faqId: doc.id,
            question: doc.question,
            answer: doc.answer,
            type: 'faq',
            source: doc.source ?? 'manual',
            tags: doc.tags ?? [],
            locale: doc.locale ?? 'ar',
          },
        },
      ]);

      doc.vectorStatus = 'ok';
      await doc.save(); // ← نحدّث نفس الوثيقة
      return doc.toObject();
    } catch (e) {
      doc.vectorStatus = 'failed';
      await doc.save();
      // اطبع تفاصيل أي خطأ في upsert
      console.error(
        '[BotFaq.create] upsert failed:',
        e?.response?.data ?? e?.message,
      );
      throw e; // أو BadRequestException('Embedding/Indexing failed')
    }
  }

  async findAll() {
    return this.botFaqModel
      .find({ status: 'active' })
      .sort({ updatedAt: -1 })
      .lean();
  }

  async semanticSearch(q: string, topK = 5) {
    return this.vectorService.searchBotFaqs(q, topK);
  }

  async update(id: string, dto: UpdateBotFaqDto) {
    const doc = await this.botFaqModel.findById(id);
    if (!doc) return null;

    Object.assign(doc, dto);
    // لو تغير سؤال/إجابة/وسوم/لغة أعد الفهرسة
    if (dto.question || dto.answer || dto.tags || dto.locale || dto.source) {
      doc.vectorStatus = 'pending';
      await doc.save();

      try {
        const text = `${doc.question}\n${doc.answer}`;
        const emb = await this.vectorService.embed(text);
        await this.vectorService.upsertBotFaqs([
          {
            id: this.pointId(doc.id.toString()),
            vector: emb,
            payload: {
              faqId: doc.id,
              question: doc.question,
              answer: doc.answer,
              type: 'faq',
              source: doc.source ?? 'manual',
              tags: doc.tags ?? [],
              locale: doc.locale ?? 'ar',
            },
          },
        ]);
        doc.vectorStatus = 'ok';
      } catch (e) {
        doc.vectorStatus = 'failed';
        console.error(
          '[BotFaq.update] upsert failed:',
          e?.response?.data ?? e?.message,
        );
      }
    }

    await doc.save();
    return doc.toObject();
  }

  async delete(id: string) {
    const deleted = await this.botFaqModel.findByIdAndUpdate(
      id,
      { status: 'deleted' },
      { new: true },
    );
    try {
      await this.vectorService.deleteBotFaqPoint(this.pointId(id.toString()));
    } catch (e) {
      console.log(e);
    }
    return deleted;
  }

  async bulkImport(body: BulkImportDto, createdBy?: string) {
    const docs = await this.botFaqModel.insertMany(
      body.items.map((x) => ({ ...x, vectorStatus: 'pending', createdBy })),
    );

    // حدّد نوع المصفوفة صراحةً
    const BATCH = 50;
    for (let i = 0; i < docs.length; i += BATCH) {
      const points: BotFaqPoint[] = [];

      const batch = docs.slice(i, i + BATCH);
      for (const d of batch) {
        const faqId = d.id?.toString?.() ?? d._id?.toString?.();
        const text = `${d.question}\n${d.answer}`;
        const emb = await this.vectorService.embed(text);

        points.push({
          id: this.pointId(faqId),
          vector: emb,
          payload: {
            faqId,
            question: d.question,
            answer: d.answer,
            type: 'faq',
            source: (d.source as any) ?? 'manual',
            tags: d.tags ?? [],
            locale: (d.locale as any) ?? 'ar',
          },
        });
      }

      await this.vectorService.upsertBotFaqs(points);
      await this.botFaqModel.updateMany(
        { _id: { $in: batch.map((b) => b._id) } },
        { $set: { vectorStatus: 'ok' } },
      );
    }

    return { inserted: docs.length };
  }

  async reindexAll() {
    const docs = await this.botFaqModel.find({ status: 'active' }).lean();

    // حدّد النوع
    const points: BotFaqPoint[] = [];

    for (const d of docs) {
      const faqId = (d as any)._id?.toString?.() ?? (d as any).id?.toString?.();
      const text = `${d.question}\n${d.answer}`;
      const emb = await this.vectorService.embed(text);

      points.push({
        id: this.pointId(faqId),
        vector: emb,
        payload: {
          faqId,
          question: d.question,
          answer: d.answer,
          type: 'faq',
          source: (d as any).source ?? 'manual',
          tags: (d as any).tags ?? [],
          locale: (d as any).locale ?? 'ar',
        },
      });
    }

    if (points.length) {
      await this.vectorService.upsertBotFaqs(points);
      await this.botFaqModel.updateMany(
        { _id: { $in: docs.map((x) => x._id) } },
        { $set: { vectorStatus: 'ok' } },
      );
    }
    return { count: docs.length };
  }
}
