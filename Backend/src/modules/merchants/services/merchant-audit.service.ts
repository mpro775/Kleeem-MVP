import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  MerchantAuditLog,
  MerchantAuditLogDocument,
  MerchantAuditAction,
} from '../schemas/merchant-audit-log.schema';

export interface MerchantAuditEntry {
  _id: Types.ObjectId;
  merchantId: Types.ObjectId;
  action: MerchantAuditAction;
  actorId: Types.ObjectId;
  reason?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

@Injectable()
export class MerchantAuditService {
  constructor(
    @InjectModel(MerchantAuditLog.name)
    private readonly model: Model<MerchantAuditLogDocument>,
  ) {}

  async log(
    merchantId: string,
    action: MerchantAuditAction,
    actorId: string,
    opts?: { reason?: string; metadata?: Record<string, unknown> },
  ): Promise<MerchantAuditLogDocument> {
    const doc = new this.model({
      merchantId: new Types.ObjectId(merchantId),
      action,
      actorId: new Types.ObjectId(actorId),
      ...(opts?.reason && { reason: opts.reason }),
      ...(opts?.metadata && { metadata: opts.metadata }),
    });
    return doc.save();
  }

  async list(
    merchantId: string,
    limit = 50,
    page = 1,
  ): Promise<{ items: MerchantAuditEntry[]; total: number }> {
    const filter = { merchantId: new Types.ObjectId(merchantId) };
    const [items, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec() as Promise<MerchantAuditEntry[]>,
      this.model.countDocuments(filter).exec(),
    ]);
    return { items, total };
  }
}
