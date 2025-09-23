// src/modules/users/users.controller.ts
import { CacheInterceptor } from '@nestjs/cache-manager';
import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import * as bcrypt from 'bcrypt';
import { Types } from 'mongoose';

import {
  ApiSuccessResponse,
  ApiCreatedResponse as CommonApiCreatedResponse,
} from '../../common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TranslationService } from '../../common/services/translation.service';

import { CreateUserDto } from './dto/create-user.dto';
import { NotificationsPrefsDto } from './dto/notifications-prefs.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserRole } from './schemas/user.schema';
import { UsersService } from './users.service';

import type { UserDocument } from './schemas/user.schema';
import type { UserLean } from './types';
import type { Model } from 'mongoose';
import type { RequestWithUser } from 'src/common/interfaces/request-with-user.interface';

/** ثوابت لتجنب النصوص السحرية في الرسائل */
const I18N_UNAUTHORIZED = 'i18n:auth.errors.unauthorized' as const;
const I18N_USER_NOT_FOUND = 'i18n:users.errors.userNotFound' as const;
const I18N_INVALID_CREDENTIALS = 'i18n:auth.errors.invalidCredentials' as const;
const I18N_INSUFFICIENT_PERMS =
  'i18n:users.errors.insufficientPermissions' as const;

@ApiTags('المستخدمون')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly translationService: TranslationService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'i18n:users.operations.list.summary',
    description: 'i18n:users.operations.list.description',
  })
  @ApiSuccessResponse(Array, 'i18n:users.messages.listSuccess')
  @ApiUnauthorizedResponse({ description: I18N_UNAUTHORIZED })
  @UseInterceptors(CacheInterceptor)
  findAll(): Promise<UserLean[]> {
    return this.usersService.findAll();
  }

  @Get(':id')
  @ApiParam({ name: 'id', type: 'string', description: 'معرف المستخدم' })
  @ApiOperation({
    summary: 'i18n:users.operations.get.summary',
    description: 'i18n:users.operations.get.description',
  })
  @ApiSuccessResponse(CreateUserDto, 'i18n:users.messages.getSuccess')
  @ApiNotFoundResponse({ description: I18N_USER_NOT_FOUND })
  @ApiUnauthorizedResponse({ description: I18N_UNAUTHORIZED })
  findOne(@Param('id') id: string): Promise<UserLean> {
    return this.usersService.findOne(id);
  }

  @Post()
  @ApiBody({
    type: CreateUserDto,
    description: 'i18n:users.operations.create.bodyDescription',
  })
  @CommonApiCreatedResponse(CreateUserDto, 'i18n:users.messages.userCreated')
  @ApiBadRequestResponse({ description: 'i18n:users.errors.invalidData' })
  @ApiUnauthorizedResponse({ description: I18N_UNAUTHORIZED })
  create(@Body() createDto: CreateUserDto): Promise<UserDocument> {
    return this.usersService.create(createDto);
  }

  // تحديث ملف المستخدم (اسم/هاتف فقط)
  @Put(':id')
  @ApiOperation({
    summary: 'i18n:users.operations.update.summary',
    description: 'i18n:users.operations.update.description',
  })
  updateProfile(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<UserDocument> {
    // أي حقل email يأتي ضمنياً سيتم تجاهله
    return this.usersService.update(id, dto);
  }

  // إشعاراتي - جلب
  @Get(':id/notifications')
  @ApiOperation({
    summary: 'i18n:users.operations.getNotifications.summary',
    description: 'i18n:users.operations.getNotifications.description',
  })
  async getNotifications(
    @Param('id') id: string,
  ): Promise<NotificationsPrefsDto> {
    return this.usersService.getNotificationsPrefs(id);
  }

  // إشعاراتي - تحديث
  @Put(':id/notifications')
  @ApiOperation({
    summary: 'i18n:users.operations.updateNotifications.summary',
    description: 'i18n:users.operations.updateNotifications.description',
  })
  updateNotifications(
    @Param('id') id: string,
    @Body() dto: NotificationsPrefsDto,
  ): Promise<NotificationsPrefsDto> {
    return this.usersService.updateNotificationsPrefs(id, dto);
  }

  // حذف الحساب بكلمة المرور (بديل آمن عن DELETE التقليدي)
  @Post(':id/delete')
  @ApiOperation({
    summary: 'i18n:users.operations.delete.summary',
    description: 'i18n:users.operations.delete.description',
  })
  async deleteWithPassword(
    @Param('id') id: string,
    @Body() body: { confirmPassword: string },
    @Req() req: RequestWithUser,
  ): Promise<void> {
    const actorId = req.user?.userId;
    const actorRole = req.user?.role;

    // الصلاحيات
    const isSelf = actorId === id;
    const isAdmin = actorRole === UserRole.ADMIN;
    if (!isSelf && !isAdmin) {
      throw new BadRequestException(I18N_INSUFFICIENT_PERMS);
    }

    // من الذي نطابق كلمة مروره؟
    const target = await this.userModel
      .findById(toObjectId(id))
      .select('+password')
      .exec();
    if (!target) throw new BadRequestException(I18N_USER_NOT_FOUND);

    // لو أدمن → نتحقق من كلمة مرور الأدمن نفسه (actor)
    // لو حذف ذاتي → نتحقق من كلمة مرور نفس المستخدم الهدف
    const passwordOwnerId = isAdmin && !isSelf ? actorId : id;
    const passwordOwner = passwordOwnerId
      ? await this.userModel
          .findById(toObjectId(passwordOwnerId))
          .select('+password')
          .exec()
      : null;

    if (!passwordOwner?.password) {
      // حساب SSO بدون كلمة مرور؟ اطلب OTP بدل ذلك
      throw new BadRequestException(I18N_INVALID_CREDENTIALS);
    }

    const ok = await bcrypt.compare(
      body.confirmPassword,
      passwordOwner.password,
    );
    if (!ok) throw new BadRequestException(I18N_INVALID_CREDENTIALS);

    // حذف ناعم/فعلي بحسب تنفيذ الخدمة
    return this.usersService.remove(id);
  }
}

/** util محلي */
function toObjectId(id: string): Types.ObjectId {
  return new Types.ObjectId(id);
}
