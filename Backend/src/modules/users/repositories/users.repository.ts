// src/modules/users/repositories/users.repository.ts
import type { PaginationResult } from '../../../common/dto/pagination.dto';
import type { CreateUserDto } from '../dto/create-user.dto';
import type { GetUsersDto } from '../dto/get-users.dto';
import type { NotificationsPrefsDto } from '../dto/notifications-prefs.dto';
import type { UpdateUserDto } from '../dto/update-user.dto';
import type { UserDocument } from '../schemas/user.schema';
import type { UserLean } from '../types';
import type { Types } from 'mongoose';

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
}
