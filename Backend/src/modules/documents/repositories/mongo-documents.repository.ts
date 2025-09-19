import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, HydratedDocument } from 'mongoose';
import {
  DocumentDocument,
  DocumentSchemaClass,
} from '../schemas/document.schema';
import { DocumentsRepository } from './documents.repository';

@Injectable()
export class MongoDocumentsRepository implements DocumentsRepository {
  constructor(
    @InjectModel(DocumentSchemaClass.name)
    private readonly docModel: Model<DocumentDocument>,
  ) {}

  private toId(v: string | Types.ObjectId) {
    return typeof v === 'string' ? new Types.ObjectId(v) : v;
  }

  async create(
    data: Partial<DocumentSchemaClass>,
  ): Promise<HydratedDocument<DocumentSchemaClass>> {
    const doc = new this.docModel(data as any);
    await doc.save();
    return doc as HydratedDocument<DocumentSchemaClass>;
  }

  async findByIdForMerchant(
    id: string | Types.ObjectId,
    merchantId: string | Types.ObjectId,
  ): Promise<HydratedDocument<DocumentSchemaClass> | null> {
    return this.docModel
      .findOne({ _id: this.toId(id), merchantId })
      .exec() as Promise<HydratedDocument<DocumentSchemaClass> | null>;
  }

  async listByMerchant(merchantId: string | Types.ObjectId) {
    return this.docModel
      .find({ merchantId })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  async deleteByIdForMerchant(
    id: string | Types.ObjectId,
    merchantId: string | Types.ObjectId,
  ) {
    await this.docModel.deleteOne({ _id: this.toId(id), merchantId }).exec();
  }
}
