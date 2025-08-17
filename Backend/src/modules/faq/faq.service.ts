// src/modules/faq/faq.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Faq } from './schemas/faq.schema';
import { VectorService } from '../vector/vector.service';

@Injectable()
export class FaqService {
  constructor(
    @InjectModel(Faq.name) private faqModel: Model<Faq>,
    private vectorService: VectorService,
  ) {}

  async createMany(
    merchantId: string,
    faqs: { question: string; answer: string }[],
  ) {
    const created = await this.faqModel.insertMany(
      faqs.map((faq) => ({
        merchantId,
        question: faq.question,
        answer: faq.answer,
      })),
    );

    // توليد embeddings وحفظها في Qdrant
    for (const faq of created as any[]) {
      const text = `${faq.question}\n${faq.answer}`;
      const embedding = await this.vectorService.embed(text);
      await this.vectorService.upsertFaqs([
        {
          id: this.vectorService.generateFaqId(faq._id.toString()),
          vector: embedding,
          payload: {
            merchantId,
            faqId: faq._id,
            question: faq.question,
            answer: faq.answer,
            type: 'faq',
            source: 'manual',
          },
        },
      ]);
    }

    return created;
  }

  async list(merchantId: string) {
    return this.faqModel.find({ merchantId, status: 'active' }).lean();
  }

  async delete(merchantId: string, faqId: string) {
    return this.faqModel.updateOne(
      { _id: faqId, merchantId },
      { status: 'deleted' },
    );
  }
}
