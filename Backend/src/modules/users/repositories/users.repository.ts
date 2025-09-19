import { Types } from 'mongoose';
import { PaginationResult } from '../../../common/dto/pagination.dto';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { NotificationsPrefsDto } from '../dto/notifications-prefs.dto';
import { GetUsersDto } from '../dto/get-users.dto';
import { UserDocument } from '../schemas/user.schema';

export interface UsersRepository {
  create(data: CreateUserDto): Promise<UserDocument>;
  findAll(): Promise<any[]>;
  findByIdLean(id: Types.ObjectId): Promise<any | null>;
  updateById(
    id: Types.ObjectId,
    data: UpdateUserDto,
  ): Promise<UserDocument | null>;
  softDeleteById(id: Types.ObjectId): Promise<UserDocument | null>;
  setFirstLoginFalse(id: Types.ObjectId): Promise<UserDocument | null>;

  getNotificationsPrefs(id: Types.ObjectId): Promise<any | null>;
  updateNotificationsPrefs(
    id: Types.ObjectId,
    dto: NotificationsPrefsDto,
  ): Promise<any | null>;

  list(dto: GetUsersDto): Promise<PaginationResult<any>>;
}
