import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  AdminAuditLog,
  AdminAuditLogDocument,
} from '../schemas/admin-audit-log.schema';

const ADMIN_AUDIT_DEFAULT_LIMIT = 50;
const ADMIN_AUDIT_MAX_LIMIT = 100;

export interface AdminAuditEntry {
  _id: Types.ObjectId;
  actorId: Types.ObjectId;
  action: string;
  resource?: string;
  resourceId?: string;
  method: string;
  path: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface ListAdminAuditParams {
  actorId?: string;
  resource?: string;
  from?: string;
  to?: string;
  limit?: number;
  page?: number;
}

@Injectable()
export class AdminAuditService {
  constructor(
    @InjectModel(AdminAuditLog.name)
    private readonly model: Model<AdminAuditLogDocument>,
  ) {}

  async log(opts: {
    actorId: string;
    action: string;
    method: string;
    path: string;
    resource?: string;
    resourceId?: string;
    metadata?: Record<string, unknown>;
    ip?: string;
    userAgent?: string;
  }): Promise<AdminAuditLogDocument> {
    const doc = new this.model({
      actorId: new Types.ObjectId(opts.actorId),
      action: opts.action,
      method: opts.method,
      path: opts.path,
      ...(opts.resource && { resource: opts.resource }),
      ...(opts.resourceId && { resourceId: opts.resourceId }),
      ...(opts.metadata && { metadata: opts.metadata }),
      ...(opts.ip && { ip: opts.ip }),
      ...(opts.userAgent && { userAgent: opts.userAgent }),
    });
    return doc.save();
  }

  async list(params: ListAdminAuditParams): Promise<{
    items: AdminAuditEntry[];
    total: number;
  }> {
    const filter: Record<string, unknown> = {};
    if (params.actorId) filter.actorId = new Types.ObjectId(params.actorId);
    if (params.resource) filter.resource = params.resource;
    if (params.from || params.to) {
      filter.createdAt = {};
      if (params.from)
        (filter.createdAt as Record<string, Date>).$gte = new Date(params.from);
      if (params.to)
        (filter.createdAt as Record<string, Date>).$lte = new Date(params.to);
    }

    const limit = Math.min(
      params.limit ?? ADMIN_AUDIT_DEFAULT_LIMIT,
      ADMIN_AUDIT_MAX_LIMIT,
    );
    const page = params.page ?? 1;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec() as unknown as Promise<AdminAuditEntry[]>,
      this.model.countDocuments(filter).exec(),
    ]);
    return { items, total };
  }
}
