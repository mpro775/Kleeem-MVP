// src/modules/users/users.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { Types } from 'mongoose';

import { UserNotFoundError } from '../../common/errors/business-errors';
import { TranslationService } from '../../common/services/translation.service';

import type { CreateUserDto } from './dto/create-user.dto';
import type { GetUsersDto } from './dto/get-users.dto';
import type { NotificationsPrefsDto } from './dto/notifications-prefs.dto';
import type { UpdateUserDto } from './dto/update-user.dto';
import type { UsersRepository } from './repositories/users.repository';
import type { UserDocument } from './schemas/user.schema';
import type { UserLean } from './types';
import type { PaginationResult } from '../../common/dto/pagination.dto';

/** util: تحويل آمن إلى ObjectId */
function toObjectId(id: string): Types.ObjectId {
  return new Types.ObjectId(id);
}

/** تفضيلات افتراضية لتجنّب القيم السحرية داخل المنطق */
function defaultPrefs(): NotificationsPrefsDto {
  return {
    channels: { inApp: true, email: true, telegram: false, whatsapp: false },
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
  };
}

@Injectable()
export class UsersService {
  constructor(
    @Inject('UsersRepository') private readonly repo: UsersRepository,
    private readonly translationService: TranslationService,
  ) {}

  // إنشاء يعيد وثيقة (ليس lean)
  async create(createDto: CreateUserDto): Promise<UserDocument> {
    return this.repo.create(createDto);
  }

  // قراءة متعددة: Lean
  async findAll(): Promise<UserLean[]> {
    return this.repo.findAll();
  }

  // قراءة مفردة: Lean
  async findOne(id: string): Promise<UserLean> {
    const _id = toObjectId(id);
    const user = await this.repo.findByIdLean(_id);
    if (!user) throw new UserNotFoundError(id);
    // user هنا Lean، ومُعرّفات قد تكون ObjectId أو string بحسب التنفيذ؛
    // نفترض أن الـ repo يعيد UserLean متّسقًا (كما أصلحناه سابقًا).
    return user;
  }

  // تحديث يعيد وثيقة (ليس lean)
  async update(id: string, updateDto: UpdateUserDto): Promise<UserDocument> {
    const _id = toObjectId(id);
    const updated = await this.repo.updateById(_id, updateDto);
    if (!updated) throw new UserNotFoundError(id);
    return updated;
  }

  // حذف ناعم: يُطابق Promise<void>
  async remove(id: string): Promise<void> {
    const _id = toObjectId(id);
    const user = await this.repo.softDeleteById(_id);
    if (!user) throw new UserNotFoundError(id);

    // رسالة ترجمة يمكن تمريرها إلى طبقة أعلى (Controller) إن لزم عبر حدث/إشعار.
    // هنا نحافظ على التوقيع Promise<void> كما هو.
    this.translationService.translate('users.messages.userDeleted');
  }

  async setFirstLoginFalse(userId: string): Promise<void> {
    const _id = toObjectId(userId);
    const updated = await this.repo.setFirstLoginFalse(_id);
    if (!updated) throw new UserNotFoundError(userId);
  }

  async getNotificationsPrefs(id: string): Promise<NotificationsPrefsDto> {
    const _id = toObjectId(id);
    const prefs = await this.repo.getNotificationsPrefs(_id);
    return prefs ?? defaultPrefs();
  }

  async updateNotificationsPrefs(
    id: string,
    dto: NotificationsPrefsDto,
  ): Promise<NotificationsPrefsDto> {
    const _id = toObjectId(id);
    const prefs = await this.repo.updateNotificationsPrefs(_id, dto);
    if (!prefs) throw new UserNotFoundError(id);
    return prefs;
  }

  // ===== Cursor Pagination =====
  async getUsers(dto: GetUsersDto): Promise<PaginationResult<UserLean>> {
    return this.repo.list(dto);
  }

  async searchUsers(
    query: string,
    dto: GetUsersDto,
  ): Promise<PaginationResult<UserLean>> {
    return this.repo.list({ ...dto, search: query });
  }

  async getUsersByMerchant(
    merchantId: string,
    dto: GetUsersDto,
  ): Promise<PaginationResult<UserLean>> {
    return this.repo.list({ ...dto, merchantId });
  }
}
