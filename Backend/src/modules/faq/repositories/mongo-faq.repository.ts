import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Faq } from '../schemas/faq.schema';
import { FaqRepository } from './faq.repository';

@Injectable()
export class MongoFaqRepository implements FaqRepository {
  constructor(@InjectModel(Faq.name) private readonly faqModel: Model<Faq>) {}

  private toId(v: string | Types.ObjectId) {
    return typeof v === 'string' ? new Types.ObjectId(v) : v;
  }

  async insertManyPending(
    merchantId: string | Types.ObjectId,
    rows: Array<{ question: string; answer: string }>,
  ) {
    const docs = rows.map((r) => ({
      merchantId: this.toId(merchantId),
      question: r.question,
      answer: r.answer,
      status: 'pending' as const,
    }));
    const created = await this.faqModel.insertMany(docs);
    return created.map((d) => (d.toObject ? d.toObject() : d)) as any;
  }

  async findByIdForMerchant(
    id: string | Types.ObjectId,
    merchantId: string | Types.ObjectId,
  ) {
    return this.faqModel
      .findOne({ _id: this.toId(id), merchantId: this.toId(merchantId) })
      .exec() as any;
  }

  async updateFieldsById(id: string | Types.ObjectId, set: Partial<Faq>) {
    await this.faqModel.updateOne({ _id: this.toId(id) }, { $set: set }).exec();
  }

  async listByMerchant(
    merchantId: string | Types.ObjectId,
    includeDeleted = false,
  ) {
    const filter: any = { merchantId: this.toId(merchantId) };
    if (!includeDeleted) filter.status = { $ne: 'deleted' };
    return this.faqModel
      .find(filter)
      .select({
        question: 1,
        answer: 1,
        status: 1,
        errorMessage: 1,
        createdAt: 1,
      })
      .sort({ createdAt: -1 })
      .lean()
      .exec() as any;
  }

  async getStatusCounts(merchantId: string | Types.ObjectId) {
    const mId = this.toId(merchantId);
    const rows = await this.faqModel.aggregate([
      { $match: { merchantId: mId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const map: Record<string, number> = {};
    for (const r of rows) map[String(r._id)] = r.count;

    const total = rows.reduce((s, r) => s + (r.count || 0), 0);

    return {
      total,
      pending: map['pending'] || 0,
      completed: map['completed'] || 0,
      failed: map['failed'] || 0,
      deleted: map['deleted'] || 0,
    };
  }

  async softDeleteById(
    merchantId: string | Types.ObjectId,
    id: string | Types.ObjectId,
  ) {
    const res = await this.faqModel
      .updateOne(
        { _id: this.toId(id), merchantId: this.toId(merchantId) },
        { $set: { status: 'deleted' } },
      )
      .exec();
    return (res.matchedCount ?? res.modifiedCount) > 0;
  }

  async hardDeleteById(
    merchantId: string | Types.ObjectId,
    id: string | Types.ObjectId,
  ) {
    const res = await this.faqModel
      .deleteOne({ _id: this.toId(id), merchantId: this.toId(merchantId) })
      .exec();
    return (res.deletedCount ?? 0) > 0;
  }

  async softDeleteAll(merchantId: string | Types.ObjectId) {
    const res = await this.faqModel
      .updateMany(
        { merchantId: this.toId(merchantId), status: { $ne: 'deleted' } },
        { $set: { status: 'deleted' } },
      )
      .exec();
    return res.modifiedCount ?? 0;
  }

  async hardDeleteAll(merchantId: string | Types.ObjectId) {
    const res = await this.faqModel
      .deleteMany({ merchantId: this.toId(merchantId) })
      .exec();
    return res.deletedCount ?? 0;
  }
}
