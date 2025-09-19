import { Injectable, Inject } from '@nestjs/common';
import { Types } from 'mongoose';
import { UsersRepository } from './repositories/users.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { NotificationsPrefsDto } from './dto/notifications-prefs.dto';
import { GetUsersDto } from './dto/get-users.dto';
import { PaginationResult } from '../../common/dto/pagination.dto';
import { UserNotFoundError } from '../../common/errors/business-errors';
import { TranslationService } from '../../common/services/translation.service';

@Injectable()
export class UsersService {
  constructor(
    @Inject('UsersRepository')
    private readonly repo: UsersRepository,
    private readonly translationService: TranslationService,
  ) {}

  async create(createDto: CreateUserDto) {
    return this.repo.create(createDto);
  }

  async findAll() {
    return this.repo.findAll();
  }

  async findOne(id: string): Promise<CreateUserDto> {
    const _id = new Types.ObjectId(id);
    const user = await this.repo.findByIdLean(_id);
    if (!user) throw new UserNotFoundError(id);

    // خرّج DTO موحّد (للواجهات التي تتوقع CreateUserDto)
    const dto: CreateUserDto = {
      id: _id.toHexString(),
      email: user.email,
      name: user.name,
      merchantId: user.merchantId?.toString?.() ?? null,
      firstLogin: user.firstLogin,
      role: user.role,
      phone: user.phone,
    };
    return dto;
  }

  async update(id: string, updateDto: UpdateUserDto) {
    const _id = new Types.ObjectId(id);
    const updated = await this.repo.updateById(_id, updateDto);
    if (!updated) throw new UserNotFoundError(id);
    return updated;
  }

  async remove(id: string) {
    const _id = new Types.ObjectId(id);
    const user = await this.repo.softDeleteById(_id);
    if (!user) throw new UserNotFoundError(id);
    // TODO: جدولة حذف صلب بعد 30 يوم + تنظيف الجلسات/الرموز
    return {
      message: this.translationService.translate('users.messages.userDeleted'),
    };
  }

  async setFirstLoginFalse(userId: string): Promise<void> {
    const _id = new Types.ObjectId(userId);
    const updated = await this.repo.setFirstLoginFalse(_id);
    if (!updated) throw new UserNotFoundError(userId);
  }

  private defaultPrefs() {
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

  async getNotificationsPrefs(id: string) {
    const _id = new Types.ObjectId(id);
    const prefs = await this.repo.getNotificationsPrefs(_id);
    if (!prefs) return this.defaultPrefs();
    return prefs;
  }

  async updateNotificationsPrefs(id: string, dto: NotificationsPrefsDto) {
    const _id = new Types.ObjectId(id);
    const prefs = await this.repo.updateNotificationsPrefs(_id, dto);
    if (!prefs) throw new UserNotFoundError(id);
    return prefs;
  }

  // ===== Cursor Pagination =====
  async getUsers(dto: GetUsersDto): Promise<PaginationResult<any>> {
    return this.repo.list(dto);
  }

  async searchUsers(
    query: string,
    dto: GetUsersDto,
  ): Promise<PaginationResult<any>> {
    return this.repo.list({ ...dto, search: query });
  }

  async getUsersByMerchant(
    merchantId: string,
    dto: GetUsersDto,
  ): Promise<PaginationResult<any>> {
    return this.repo.list({ ...dto, merchantId });
  }
}
