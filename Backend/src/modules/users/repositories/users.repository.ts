// src/modules/users/repositories/users.repository.ts
import type { PaginationResult } from '../../../common/dto/pagination.dto';
import type { CreateUserDto } from '../dto/create-user.dto';
import type { GetUsersDto } from '../dto/get-users.dto';
import type { NotificationsPrefsDto } from '../dto/notifications-prefs.dto';
import type { UpdateUserDto } from '../dto/update-user.dto';
import type { UserDocument, UserRole } from '../schemas/user.schema';
import type { UserLean } from '../types';
import type { Types } from 'mongoose';

/** معاملات قائمة المستخدمين للأدمن */
export interface ListAllAdminParams {
  limit: number;
  page: number;
  role?: UserRole;
  active?: boolean;
  /** تضمين المحذوفين (deletedAt != null) */
  includeDeleted?: boolean;
  /** بحث نصي في الاسم والبريد */
  search?: string;
  sortBy?: 'createdAt' | 'name' | 'email' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

/** نتيجة إحصائيات المستخدمين للأدمن */
export interface StatsAdminResult {
  total: number;
  activeCount: number;
  inactiveCount: number;
  byRole: Record<string, number>;
}

/** شكل مستخدم مختصر لقائمة الأدمن */
export type UserAdminLean = {
  _id: string;
  email: string;
  name: string;
  role: string;
  active?: boolean;
  emailVerified?: boolean;
  merchantId?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export interface UsersRepository {
  create(data: CreateUserDto): Promise<UserDocument>;

  // قراءات Lean
  findAll(): Promise<UserLean[]>;
  findByIdLean(id: Types.ObjectId): Promise<UserLean | null>;

  // تحديثات/حذف تُرجع وثائق
  updateById(
    id: Types.ObjectId,
    data: UpdateUserDto,
  ): Promise<UserDocument | null>;
  softDeleteById(id: Types.ObjectId): Promise<UserDocument | null>;
  setFirstLoginFalse(id: Types.ObjectId): Promise<UserDocument | null>;

  // التفضيلات
  getNotificationsPrefs(
    id: Types.ObjectId,
  ): Promise<NotificationsPrefsDto | null>;
  updateNotificationsPrefs(
    id: Types.ObjectId,
    dto: NotificationsPrefsDto,
  ): Promise<NotificationsPrefsDto | null>;

  // Cursor Pagination تُرجِع Lean
  list(dto: GetUsersDto): Promise<PaginationResult<UserLean>>;

  listAllAdmin(
    params: ListAllAdminParams,
  ): Promise<{ items: UserAdminLean[]; total: number }>;
  statsAdmin(): Promise<StatsAdminResult>;
  getTrendsAdmin(period: '7d' | '30d'): Promise<{ date: string; count: number }[]>;
  getTrendsByDateRange(from: string, to: string): Promise<{ date: string; count: number }[]>;
  updateAdmin(
    id: Types.ObjectId,
    dto: {
      role?: UserRole;
      active?: boolean;
      reason?: string;
      merchantId?: string | null;
    },
    actor?: { userId: string },
  ): Promise<UserDocument | null>;
}
