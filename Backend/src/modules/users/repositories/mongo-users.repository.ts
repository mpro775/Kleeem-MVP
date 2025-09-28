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
import type { UsersRepository } from './users.repository';
import type { FilterQuery, QueryOptions } from 'mongoose';

/** ثوابت لتجنّب الأرقام/النصوص السحرية */
const SELECT_SAFE = '-password -__v' as const;
const SORT_ASC = 1 as const;
const SORT_DESC = -1 as const;

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
}
