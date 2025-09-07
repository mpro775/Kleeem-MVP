// src/modules/users/users.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { UserNotFoundError } from '../../common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { NotificationsPrefsDto } from './dto/notifications-prefs.dto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async create(createDto: CreateUserDto) {
    const user = new this.userModel(createDto);
    return await user.save();
  }

  async findAll() {
    return await this.userModel.find().exec();
  }

  async findOne(id: string): Promise<CreateUserDto> {
    const user = await this.userModel.findById(id).lean();
    if (!user) throw new UserNotFoundError(id);

    // امكانيّة 1: استخدام toHexString() على ObjectId
    const objectId = user._id as Types.ObjectId;

    const dto: CreateUserDto = {
      id: objectId.toHexString(),
      email: user.email,
      name: user.name,
      merchantId: user.merchantId?.toString() ?? null,
      firstLogin: user.firstLogin,
      role: user.role,
      phone: user.phone, // إذا أضفت phone في DTO
    };

    return dto;
  }

  async update(id: string, updateDto: UpdateUserDto) {
    const user = await this.userModel.findByIdAndUpdate(id, updateDto, {
      new: true,
    });
    if (!user) throw new UserNotFoundError(id);
    return user;
  }

  async remove(id: string) {
    const user = await this.userModel.findByIdAndUpdate(
      id,
      { deletedAt: new Date(), active: false },
      { new: true },
    );
    if (!user) throw new UserNotFoundError(id);

    // TODO: جدولة حذف صلب بعد 30 يوم (job/queue) + حذف RefreshTokens/جلسات
    return { message: 'User deactivated (soft deleted)' };
  }

  async setFirstLoginFalse(userId: string): Promise<void> {
    const updated = await this.userModel.findByIdAndUpdate(
      userId,
      { firstLogin: false },
      { new: true },
    );
    if (!updated) {
      throw new UserNotFoundError(userId);
    }
  }
  async getNotificationsPrefs(id: string) {
    const user = await this.userModel.findById(id).lean();
    if (!user) throw new NotFoundException('User not found');
    return (
      user.notificationsPrefs ?? {
        channels: {
          inApp: true,
          email: true,
          telegram: false,
          whatsapp: false,
        },
        topics: {
          syncFailed: true,
          syncCompleted: true,
          webhookFailed: true,
          embeddingsCompleted: true,
          missingResponsesDigest: 'daily',
        },
        quietHours: {
          enabled: false,
          start: '22:00',
          end: '08:00',
          timezone: 'Asia/Aden',
        },
      }
    );
  }

  async updateNotificationsPrefs(id: string, dto: NotificationsPrefsDto) {
    const user = await this.userModel
      .findByIdAndUpdate(
        id,
        { notificationsPrefs: dto },
        { new: true, projection: { notificationsPrefs: 1 } },
      )
      .lean();
    if (!user) throw new NotFoundException('User not found');
    return user.notificationsPrefs;
  }
}
