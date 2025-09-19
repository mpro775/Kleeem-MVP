import { Injectable, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UsersRepository } from './users.repository';
import { User, UserDocument } from '../schemas/user.schema';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { NotificationsPrefsDto } from '../dto/notifications-prefs.dto';
import { GetUsersDto } from '../dto/get-users.dto';
import { PaginationService } from '../../../common/services/pagination.service';
import { PaginationResult } from '../../../common/dto/pagination.dto';

@Injectable()
export class MongoUsersRepository implements UsersRepository {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly pagination: PaginationService,
  ) {}

  create(data: CreateUserDto) {
    const user = new this.userModel(data);
    return user.save();
  }

  findAll() {
    return this.userModel.find().lean().exec();
  }

  findByIdLean(id: Types.ObjectId) {
    return this.userModel.findById(id).lean().exec();
  }

  updateById(id: Types.ObjectId, data: UpdateUserDto) {
    return this.userModel.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  softDeleteById(id: Types.ObjectId) {
    return this.userModel
      .findByIdAndUpdate(
        id,
        { deletedAt: new Date(), active: false },
        { new: true },
      )
      .exec();
  }

  setFirstLoginFalse(id: Types.ObjectId) {
    return this.userModel
      .findByIdAndUpdate(id, { firstLogin: false }, { new: true })
      .exec();
  }

  async getNotificationsPrefs(id: Types.ObjectId) {
    const user = await this.userModel
      .findById(id)
      .select('notificationsPrefs')
      .lean();
    return user?.notificationsPrefs ?? null;
  }

  async updateNotificationsPrefs(
    id: Types.ObjectId,
    dto: NotificationsPrefsDto,
  ) {
    const user = await this.userModel
      .findByIdAndUpdate(
        id,
        { notificationsPrefs: dto },
        { new: true, projection: { notificationsPrefs: 1 } },
      )
      .lean();
    return user?.notificationsPrefs ?? null;
  }

  async list(dto: GetUsersDto): Promise<PaginationResult<any>> {
    const filter: any = {};

    if (dto.search) filter.$text = { $search: dto.search };
    if (dto.role) filter.role = dto.role;
    if (dto.merchantId) filter.merchantId = new Types.ObjectId(dto.merchantId);
    if (dto.active !== undefined) filter.active = dto.active;
    if (dto.emailVerified !== undefined)
      filter.emailVerified = dto.emailVerified;

    const sortField = dto.sortBy || 'createdAt';
    const sortOrder = dto.sortOrder === 'asc' ? 1 : -1;

    const result = await this.pagination.paginate(
      this.userModel as any,
      dto,
      filter,
      {
        sortField,
        sortOrder,
        select: '-password -__v',
        lean: true,
      },
    );

    const items = result.items.map((u: any) => ({
      ...u,
      _id: u._id?.toString?.() ?? String(u._id),
      merchantId:
        u.merchantId?.toString?.() ??
        (u.merchantId ? String(u.merchantId) : undefined),
    }));

    return { ...result, items };
  }
}
