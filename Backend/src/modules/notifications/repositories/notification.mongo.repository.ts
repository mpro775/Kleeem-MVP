import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import {
  Notification,
  NotificationDocument,
} from '../schemas/notification.schema';
import {
  NotificationCreateInput,
  NotificationEntity,
  NotificationRepository,
} from './notification.repository';

@Injectable()
export class NotificationMongoRepository implements NotificationRepository {
  constructor(
    @InjectModel(Notification.name)
    private readonly model: Model<NotificationDocument>,
  ) {}

  async create(input: NotificationCreateInput): Promise<NotificationEntity> {
    const doc = await this.model.create({
      userId: new Types.ObjectId(input.userId),
      merchantId: input.merchantId
        ? new Types.ObjectId(input.merchantId)
        : undefined,
      type: input.type,
      title: input.title,
      body: input.body,
      data: input.data,
      severity: input.severity ?? 'info',
    } as any);
    return doc.toObject() as NotificationEntity;
  }

  async listForUser(
    userId: string,
    opts: { page: number; limit: number; unreadOnly?: boolean },
  ): Promise<{
    items: NotificationEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
    const skip = (page - 1) * limit;

    const q: FilterQuery<NotificationDocument> = {
      userId: new Types.ObjectId(userId),
      ...(opts.unreadOnly ? { read: false } : {}),
    };

    const [items, total] = await Promise.all([
      this.model
        .find(q)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean<NotificationEntity[]>(),
      this.model.countDocuments(q),
    ]);

    return { items, total, page, limit };
  }

  async markRead(userId: string, notifId: string): Promise<void> {
    await this.model.updateOne(
      { _id: new Types.ObjectId(notifId), userId: new Types.ObjectId(userId) },
      { $set: { read: true, readAt: new Date() } },
    );
  }

  async markAllRead(userId: string): Promise<void> {
    await this.model.updateMany(
      { userId: new Types.ObjectId(userId), read: false },
      { $set: { read: true, readAt: new Date() } },
    );
  }
}
