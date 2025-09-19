import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
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
import { ConfirmPasswordDto } from 'src/common/dto/confirm-password.dto';
import {
  ApiSuccessResponse,
  ApiCreatedResponse as CommonApiCreatedResponse,
  CurrentUser,
} from '../../common';
import { NotificationsPrefsDto } from './dto/notifications-prefs.dto';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { TranslationService } from '../../common/services/translation.service';

@ApiTags('المستخدمون')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly translationService: TranslationService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'i18n:users.operations.list.summary',
    description: 'i18n:users.operations.list.description',
  })
  @ApiSuccessResponse(Array, 'i18n:users.messages.listSuccess')
  @ApiUnauthorizedResponse({
    description: 'i18n:auth.errors.unauthorized',
  })
  @UseInterceptors(CacheInterceptor)
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @ApiParam({ name: 'id', type: 'string', description: 'معرف المستخدم' })
  @ApiOperation({
    summary: 'i18n:users.operations.get.summary',
    description: 'i18n:users.operations.get.description',
  })
  @ApiSuccessResponse(CreateUserDto, 'i18n:users.messages.getSuccess')
  @ApiNotFoundResponse({ description: 'i18n:users.errors.userNotFound' })
  @ApiUnauthorizedResponse({
    description: 'i18n:auth.errors.unauthorized',
  })
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @ApiBody({
    type: CreateUserDto,
    description: 'i18n:users.operations.create.bodyDescription',
  })
  @CommonApiCreatedResponse(CreateUserDto, 'i18n:users.messages.userCreated')
  @ApiBadRequestResponse({
    description: 'i18n:users.errors.invalidData',
  })
  @ApiUnauthorizedResponse({
    description: 'i18n:auth.errors.unauthorized',
  })
  @UseGuards(JwtAuthGuard)
  create(@Body() createDto: CreateUserDto) {
    return this.usersService.create(createDto);
  }

  // تحديث ملف المستخدم (اسم/هاتف فقط)
  @Put(':id')
  @ApiOperation({
    summary: 'i18n:users.operations.update.summary',
    description: 'i18n:users.operations.update.description',
  })
  updateProfile(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    // أي حقل email يأتي ضمنياً سيتم تجاهله
    return this.usersService.update(id, dto as any);
  }

  // إشعاراتي - جلب
  @Get(':id/notifications')
  @ApiOperation({
    summary: 'i18n:users.operations.getNotifications.summary',
    description: 'i18n:users.operations.getNotifications.description',
  })
  async getNotifications(@Param('id') id: string) {
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
  ) {
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
    @Body() body: ConfirmPasswordDto, // { confirmPassword: string }
    @Req() req: any,
  ) {
    const actorId = req.user?.userId;
    const actorRole = req.user?.role;

    // الصلاحيات
    const isSelf = actorId === id;
    const isAdmin = actorRole === 'ADMIN';
    if (!isSelf && !isAdmin) {
      throw new BadRequestException(
        'i18n:users.errors.insufficientPermissions',
      );
    }

    // من الذي نطابق كلمة مروره؟
    const target = await this.userModel.findById(id).select('+password');
    if (!target)
      throw new BadRequestException('i18n:users.errors.userNotFound');

    // لو أدمن → نتحقق من كلمة مرور الأدمن نفسه (actor)
    // لو حذف ذاتي → نتحقق من كلمة مرور نفس المستخدم الهدف
    const passwordOwnerId = isAdmin && !isSelf ? actorId : id;
    const passwordOwner = await this.userModel
      .findById(passwordOwnerId)
      .select('+password');
    if (!passwordOwner?.password) {
      // حساب SSO بدون كلمة مرور؟ اطلب OTP بدل ذلك
      throw new BadRequestException('i18n:users.errors.invalidCredentials');
    }

    const ok = await bcrypt.compare(
      body.confirmPassword,
      passwordOwner.password,
    );
    if (!ok)
      throw new BadRequestException('i18n:auth.errors.invalidCredentials');

    // 🔒 بدّلها بحذف ناعم (مقترح بالأسفل)
    return this.usersService.remove(id);
  }
}

/**
 * النواقص:
 * - إضافة أمثلة JSON في ApiOkResponse وApiCreatedResponse باستخدام schema.example.
 * - يمكن إضافة ApiForbiddenResponse لحالات صلاحيات خاصة.
 * - توصيف دقيق لحقول DTOs (مثل طول النص وتنسيق البريد الإلكتروني).
 */
