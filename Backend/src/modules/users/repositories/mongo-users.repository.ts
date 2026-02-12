// src/modules/users/repositories/mongo-users.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { PaginationService } from '../../../common/services/pagination.service';
import { GetUsersDto, SortOrder } from '../dto/get-users.dto'; // ← SortOrder كقيمة
import { User } from '../schemas/user.schema';

import type { PaginationResult } from '../../../common/dto/pagination.dto';
import type { CreateUserDto } from '../dto/create-user.dto';
import type { NotificationsPrefsDto } from '../dto/notifications-prefs.dto';
import type { UpdateUserDto } from '../dto/update-user.dto';
import type { UserDocument } from '../schemas/user.schema';
import type { UserLean } from '../types';
import type {
  UsersRepository,
  ListAllAdminParams,
  StatsAdminResult,
  UserAdminLean,
} from './users.repository';
import type { FilterQuery, QueryOptions } from 'mongoose';

/** ثوابت لتجنّب الأرقام/النصوص السحرية */
const SELECT_SAFE = '-password -__v' as const;
const SORT_ASC = 1 as const;
const SORT_DESC = -1 as const;
const END_OF_DAY_HOUR = 23;
const END_OF_DAY_MINUTE = 59;
const END_OF_DAY_SECOND = 59;
const END_OF_DAY_MILLISECOND = 999;

/** أشكال النتائج من .lean() قبل التطبيع */
type RawLeanUser = Omit<User, 'password' | 'merchantId'> & {
  _id: Types.ObjectId | string;
  merchantId?: Types.ObjectId | string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

/** تحويل آمن إلى ObjectId */
function toObjectId(id: string | Types.ObjectId): Types.ObjectId {
  return id instanceof Types.ObjectId ? id : new Types.ObjectId(id);
}

/** تحويل ObjectId/string إلى string آمن */
function toIdString(value: unknown): string {
  const v = value as { toString?: () => string };
  return v?.toString?.() ?? String(value);
}

/** يطبع RawLeanUser إلى UserAdminLean لقائمة الأدمن */
function rawToAdminLean(u: RawLeanUser): UserAdminLean {
  const merchantIdStr = u.merchantId ? toIdString(u.merchantId) : undefined;
  return {
    _id: toIdString(u._id),
    email: u.email,
    name: u.name,
    role: u.role,
    ...(typeof u.active === 'boolean' && { active: u.active }),
    ...(typeof u.emailVerified === 'boolean' && {
      emailVerified: u.emailVerified,
    }),
    ...(merchantIdStr !== undefined && { merchantId: merchantIdStr }),
    ...(u.createdAt !== undefined && { createdAt: u.createdAt }),
    ...(u.updatedAt !== undefined && { updatedAt: u.updatedAt }),
  };
}

/** يطبع UserLean من RawLeanUser بتسلسل المعرفات */
function normalizeLean(u: RawLeanUser): UserLean {
  const result = {
    email: u.email,
    firstLogin: u.firstLogin,
    name: u.name,
    role: u.role,
    active: u.active,
    emailVerified: u.emailVerified,
    notificationsPrefs: u.notificationsPrefs,
    _id: (u._id as { toString?: () => string })?.toString?.() ?? String(u._id),
    merchantId: u.merchantId
      ? ((u.merchantId as { toString?: () => string })?.toString?.() ??
        String(u.merchantId))
      : undefined,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };

  return result as UserLean;
}

@Injectable()
export class MongoUsersRepository implements UsersRepository {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly pagination: PaginationService,
  ) {}

  create(data: CreateUserDto): Promise<UserDocument> {
    const user = new this.userModel(data);
    return user.save();
  }

  async findAll(): Promise<UserLean[]> {
    const docs = (await this.userModel
      .find()
      .select(SELECT_SAFE)
      .lean()
      .exec()) as RawLeanUser[];
    return docs.map(normalizeLean);
  }

  async findByIdLean(id: Types.ObjectId): Promise<UserLean | null> {
    const doc = (await this.userModel
      .findById(id)
      .select(SELECT_SAFE)
      .lean()
      .exec()) as RawLeanUser | null;
    return doc ? normalizeLean(doc) : null;
  }

  updateById(
    id: Types.ObjectId,
    data: UpdateUserDto,
  ): Promise<UserDocument | null> {
    const opts: QueryOptions<User> = { new: true };
    return this.userModel.findByIdAndUpdate(id, data, opts).exec();
  }

  softDeleteById(id: Types.ObjectId): Promise<UserDocument | null> {
    return this.userModel
      .findByIdAndUpdate(
        id,
        { deletedAt: new Date(), active: false },
        { new: true },
      )
      .exec();
  }

  setFirstLoginFalse(id: Types.ObjectId): Promise<UserDocument | null> {
    return this.userModel
      .findByIdAndUpdate(id, { firstLogin: false }, { new: true })
      .exec();
  }

  async getNotificationsPrefs(
    id: Types.ObjectId,
  ): Promise<NotificationsPrefsDto | null> {
    const user = (await this.userModel
      .findById(id)
      .select('notificationsPrefs')
      .lean()
      .exec()) as { notificationsPrefs?: NotificationsPrefsDto } | null;

    return user?.notificationsPrefs ?? null;
  }

  async updateNotificationsPrefs(
    id: Types.ObjectId,
    dto: NotificationsPrefsDto,
  ): Promise<NotificationsPrefsDto | null> {
    const user = (await this.userModel
      .findByIdAndUpdate(
        id,
        { notificationsPrefs: dto },
        { new: true, projection: { notificationsPrefs: 1 } },
      )
      .lean()
      .exec()) as { notificationsPrefs?: NotificationsPrefsDto } | null;

    return user?.notificationsPrefs ?? null;
  }

  /** قائمة المستخدِمين مع دعم الفرز/البحث والـ cursor pagination */
  async list(dto: GetUsersDto): Promise<PaginationResult<UserLean>> {
    const filter: FilterQuery<User> = {};

    if (dto.search) filter.$text = { $search: dto.search };
    if (dto.role) filter.role = dto.role;
    if (dto.merchantId) filter.merchantId = toObjectId(dto.merchantId);
    if (dto.active !== undefined) filter.active = dto.active;
    if (dto.emailVerified !== undefined)
      filter.emailVerified = dto.emailVerified;

    const sortField = dto.sortBy || 'createdAt';
    const sortOrder: 1 | -1 =
      dto.sortOrder === SortOrder.ASC ? SORT_ASC : SORT_DESC;

    // ملاحظة: نترك paginate بدون Generics (بعض التطبيقات تعرفها بـ T واحد فقط)
    // @ts-expect-error: Mongoose typing issue with lean queries
    const raw = (await this.pagination.paginate(this.userModel, dto, filter, {
      sortField,
      sortOrder,
      select: SELECT_SAFE,
      lean: true,
    })) as unknown as PaginationResult<RawLeanUser>;

    const items = raw.items.map(normalizeLean);
    return { ...raw, items };
  }

  async listAllAdmin(
    params: ListAllAdminParams,
  ): Promise<{ items: UserAdminLean[]; total: number }> {
    const {
      limit,
      page,
      role,
      active,
      includeDeleted,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params;
    const filter: FilterQuery<User> = {};
    if (!includeDeleted) {
      filter.$or = [{ deletedAt: { $exists: false } }, { deletedAt: null }];
    }
    if (role) filter.role = role;
    if (typeof active === 'boolean') filter.active = active;
    if (search && search.trim()) {
      filter.$text = { $search: search.trim() };
    }

    const sortDir = sortOrder === 'asc' ? 1 : -1;
    const sortField =
      sortBy === 'name'
        ? 'name'
        : sortBy === 'email'
          ? 'email'
          : sortBy === 'updatedAt'
            ? 'updatedAt'
            : 'createdAt';

    const [docs, total] = await Promise.all([
      this.userModel
        .find(filter)
        .select(SELECT_SAFE)
        .sort({ [sortField]: sortDir } as Record<string, 1 | -1>)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec() as Promise<RawLeanUser[]>,
      this.userModel.countDocuments(filter).exec(),
    ]);

    const items: UserAdminLean[] = docs.map(rawToAdminLean);

    return { items, total };
  }

  async statsAdmin(): Promise<StatsAdminResult> {
    const baseMatch: FilterQuery<User> = {
      $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
    };

    const [total, activeCount, byRoleAgg] = await Promise.all([
      this.userModel.countDocuments(baseMatch).exec(),
      this.userModel.countDocuments({ ...baseMatch, active: true }).exec(),
      this.userModel
        .aggregate<{
          _id: string;
          count: number;
        }>([
          { $match: baseMatch },
          { $group: { _id: '$role', count: { $sum: 1 } } },
        ])
        .exec(),
    ]);

    const byRole: Record<string, number> = {};
    byRoleAgg.forEach((r) => {
      byRole[String(r._id)] = r.count;
    });

    return {
      total,
      activeCount,
      inactiveCount: total - activeCount,
      byRole,
    };
  }

  async updateAdmin(
    id: Types.ObjectId,
    dto: {
      role?: User['role'];
      active?: boolean;
      reason?: string;
      merchantId?: string | null;
    },
    actor?: { userId: string },
  ): Promise<UserDocument | null> {
    const updateData: Record<string, unknown> = {};
    if (dto.role !== undefined) updateData.role = dto.role;
    if (dto.merchantId !== undefined) {
      updateData.merchantId =
        dto.merchantId != null && dto.merchantId !== ''
          ? new Types.ObjectId(dto.merchantId)
          : null;
    }
    if (typeof dto.active === 'boolean') {
      updateData.active = dto.active;
      if (dto.active === false && dto.reason) {
        updateData.deactivationReason = dto.reason.trim();
        updateData.deactivatedAt = new Date();
        if (actor?.userId) {
          updateData.deactivatedBy = new Types.ObjectId(actor.userId);
        }
      } else if (dto.active === true) {
        updateData.deactivationReason = null;
        updateData.deactivatedAt = null;
        updateData.deactivatedBy = null;
      }
    }
    if (Object.keys(updateData).length === 0) {
      return this.userModel.findById(id).exec();
    }
    return this.userModel
      .findByIdAndUpdate(id, { $set: updateData }, { new: true })
      .exec();
  }

  async getTrendsAdmin(
    period: '7d' | '30d',
  ): Promise<{ date: string; count: number }[]> {
    const days = period === '7d' ? 7 : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const baseMatch: FilterQuery<User> = {
      $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
      createdAt: { $gte: startDate },
    };

    const result = await this.userModel
      .aggregate<{ date: string; count: number }>([
        { $match: baseMatch },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $project: { date: '$_id', count: 1, _id: 0 } },
      ])
      .exec();

    return result;
  }

  async getTrendsByDateRange(
    from: string,
    to: string,
  ): Promise<{ date: string; count: number }[]> {
    const startDate = new Date(from);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(to);
    endDate.setHours(
      END_OF_DAY_HOUR,
      END_OF_DAY_MINUTE,
      END_OF_DAY_SECOND,
      END_OF_DAY_MILLISECOND,
    );
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return [];
    }

    const baseMatch: FilterQuery<User> = {
      $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
      createdAt: { $gte: startDate, $lte: endDate },
    };

    const result = await this.userModel
      .aggregate<{ date: string; count: number }>([
        { $match: baseMatch },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $project: { date: '$_id', count: 1, _id: 0 } },
      ])
      .exec();

    return result;
  }
}
