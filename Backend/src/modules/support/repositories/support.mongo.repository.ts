import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  SupportTicket,
  SupportTicketDocument,
} from '../schemas/support-ticket.schema';
import { SupportRepository, SupportTicketEntity } from './support.repository';

@Injectable()
export class SupportMongoRepository implements SupportRepository {
  constructor(
    @InjectModel(SupportTicket.name)
    private readonly model: Model<SupportTicketDocument>,
  ) {}

  async create(
    dto: Partial<SupportTicketEntity>,
  ): Promise<SupportTicketEntity> {
    const doc = await this.model.create(dto as any);
    return doc.toObject() as SupportTicketEntity;
  }

  async findById(id: string): Promise<SupportTicketEntity | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.model.findById(id).lean<SupportTicketEntity>().exec();
  }

  async updateById(
    id: string,
    patch: Partial<SupportTicketEntity>,
  ): Promise<SupportTicketEntity | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.model
      .findByIdAndUpdate(id, patch as any, { new: true })
      .lean<SupportTicketEntity>()
      .exec();
  }
}
