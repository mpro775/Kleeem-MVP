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
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { ConfirmPasswordDto } from 'src/common/dto/confirm-password.dto';
import {
  ApiSuccessResponse,
  ApiCreatedResponse as CommonApiCreatedResponse,
  CurrentUser,
  PaginationDto,
} from '../../common';
import { NotificationsPrefsDto } from './dto/notifications-prefs.dto';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

@ApiTags('المستخدمون')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  @Get()
  @ApiOperation({ summary: 'جلب جميع المستخدمين' })
  @ApiSuccessResponse(Array, 'تم إرجاع قائمة المستخدمين بنجاح')
  @ApiUnauthorizedResponse({
    description: 'غير مصرح: توكن JWT غير صالح أو مفقود',
  })
  @UseInterceptors(CacheInterceptor)
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @ApiParam({ name: 'id', type: 'string', description: 'معرّف المستخدم' })
  @ApiOperation({ summary: 'جلب مستخدم واحد حسب المعرّف' })
  @ApiSuccessResponse(CreateUserDto, 'تم إرجاع بيانات المستخدم بنجاح')
  @ApiNotFoundResponse({ description: 'المستخدم غير موجود' })
  @ApiUnauthorizedResponse({
    description: 'غير مصرح: توكن JWT غير صالح أو مفقود',
  })
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @ApiBody({
    type: CreateUserDto,
    description:
      'بيانات إنشاء المستخدم: البريد الإلكتروني، الاسم، الدور (اختياري)',
  })
  @CommonApiCreatedResponse(CreateUserDto, 'تم إنشاء المستخدم بنجاح')
  @ApiBadRequestResponse({
    description: 'طلب غير صالح: بيانات مفقودة أو تنسيق خاطئ',
  })
  @ApiUnauthorizedResponse({
    description: 'غير مصرح: توكن JWT غير صالح أو مفقود',
  })
  @UseGuards(JwtAuthGuard)
  create(@Body() createDto: CreateUserDto) {
    return this.usersService.create(createDto);
  }

  // تحديث ملف المستخدم (اسم/هاتف فقط)
  @Put(':id')
  @ApiOperation({ summary: 'تحديث بيانات مستخدم (الاسم/الهاتف فقط)' })
  updateProfile(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    // أي حقل email يأتي ضمنياً سيتم تجاهله
    return this.usersService.update(id, dto as any);
  }

  // إشعاراتي - جلب
  @Get(':id/notifications')
  @ApiOperation({ summary: 'جلب تفضيلات إشعارات المستخدم' })
  async getNotifications(@Param('id') id: string) {
    return this.usersService.getNotificationsPrefs(id);
  }

  // إشعاراتي - تحديث
  @Put(':id/notifications')
  @ApiOperation({ summary: 'تحديث تفضيلات إشعارات المستخدم' })
  updateNotifications(
    @Param('id') id: string,
    @Body() dto: NotificationsPrefsDto,
  ) {
    return this.usersService.updateNotificationsPrefs(id, dto);
  }

  // حذف الحساب بكلمة المرور (بديل آمن عن DELETE التقليدي)
  @Post(':id/delete')
  @ApiOperation({ summary: 'حذف حساب المستخدم بعد تأكيد كلمة المرور' })
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
      throw new BadRequestException('لا تملك صلاحية حذف هذا الحساب');
    }

    // من الذي نطابق كلمة مروره؟
    const target = await this.userModel.findById(id).select('+password');
    if (!target) throw new BadRequestException('مستخدم غير موجود');

    // لو أدمن → نتحقق من كلمة مرور الأدمن نفسه (actor)
    // لو حذف ذاتي → نتحقق من كلمة مرور نفس المستخدم الهدف
    const passwordOwnerId = isAdmin && !isSelf ? actorId : id;
    const passwordOwner = await this.userModel
      .findById(passwordOwnerId)
      .select('+password');
    if (!passwordOwner?.password) {
      // حساب SSO بدون كلمة مرور؟ اطلب OTP بدل ذلك
      throw new BadRequestException(
        'لا يمكن تأكيد كلمة المرور لهذا الحساب. استخدم التحقق عبر البريد/OTP.',
      );
    }

    const ok = await bcrypt.compare(
      body.confirmPassword,
      passwordOwner.password,
    );
    if (!ok) throw new BadRequestException('كلمة المرور غير صحيحة');

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
