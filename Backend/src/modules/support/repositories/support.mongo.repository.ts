import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  SupportTicket,
  SupportTicketDocument,
} from '../schemas/support-ticket.schema';

import {
  SupportRepository,
  SupportTicketEntity,
  ListAllAdminParams,
  TicketReplyItem,
} from './support.repository';

import type { FilterQuery } from 'mongoose';

@Injectable()
export class SupportMongoRepository implements SupportRepository {
  constructor(
    @InjectModel(SupportTicket.name)
    private readonly model: Model<SupportTicketDocument>,
  ) {}

  async create(
    dto: Partial<SupportTicketEntity>,
  ): Promise<SupportTicketEntity> {
    const doc = await this.model.create(dto as Record<string, unknown>);
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
      .findByIdAndUpdate(id, patch as Record<string, unknown>, { new: true })
      .lean<SupportTicketEntity>()
      .exec();
  }

  async addReply(
    id: string,
    reply: TicketReplyItem,
  ): Promise<SupportTicketEntity | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.model
      .findByIdAndUpdate(id, { $push: { replies: reply } }, { new: true })
      .lean<SupportTicketEntity>()
      .exec();
  }

  async statsAdmin(): Promise<{
    byStatus: Record<string, number>;
    total: number;
    avgResolutionHours?: number;
  }> {
    const [byStatusAgg, total, resolvedDocs] = await Promise.all([
      this.model
        .aggregate<{
          _id: string;
          count: number;
        }>([{ $group: { _id: '$status', count: { $sum: 1 } } }])
        .exec(),
      this.model.countDocuments().exec(),
      this.model
        .find({ status: 'resolved' })
        .select('createdAt updatedAt')
        .lean()
        .exec(),
    ]);

    const byStatus: Record<string, number> = {};
    byStatusAgg.forEach((s) => {
      byStatus[String(s._id)] = s.count;
    });

    let avgResolutionHours: number | undefined;
    if (resolvedDocs.length > 0) {
      const hours = resolvedDocs
        .map((d: { createdAt?: Date; updatedAt?: Date }) => {
          const created = d.createdAt ? new Date(d.createdAt).getTime() : 0;
          const updated = d.updatedAt
            ? new Date(d.updatedAt).getTime()
            : created;
          return (updated - created) / (1000 * 60 * 60);
        })
        .filter((h) => h >= 0);
      avgResolutionHours =
        hours.length > 0
          ? Math.round((hours.reduce((a, b) => a + b, 0) / hours.length) * 10) /
            10
          : undefined;
    }

    return { byStatus, total, avgResolutionHours };
  }

  async listAllAdmin(
    params: ListAllAdminParams,
  ): Promise<{ items: SupportTicketEntity[]; total: number }> {
    const {
      limit,
      page,
      status,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params;
    const filter: FilterQuery<SupportTicketDocument> = {};
    if (status) filter.status = status;
    if (search && search.trim()) {
      filter.$text = { $search: search.trim() };
    }

    const sortDir = sortOrder === 'asc' ? 1 : -1;
    const sortField =
      sortBy === 'status'
        ? 'status'
        : sortBy === 'ticketNumber'
          ? 'ticketNumber'
          : sortBy === 'updatedAt'
            ? 'updatedAt'
            : 'createdAt';

    const [items, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ [sortField]: sortDir } as Record<string, 1 | -1>)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean<SupportTicketEntity[]>()
        .exec(),
      this.model.countDocuments(filter).exec(),
    ]);

    return { items, total };
  }
}
