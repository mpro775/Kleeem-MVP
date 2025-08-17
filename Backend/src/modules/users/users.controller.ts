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

@ApiTags('المستخدمون')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'جلب جميع المستخدمين' })
  @ApiOkResponse({
    description: 'تم إرجاع قائمة المستخدمين بنجاح',
    type: CreateUserDto,
    isArray: true,
  })
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
  @ApiOkResponse({
    description: 'تم إرجاع بيانات المستخدم بنجاح',
    type: CreateUserDto,
  })
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
  @ApiCreatedResponse({
    description: 'تم إنشاء المستخدم بنجاح',
    type: CreateUserDto,
  })
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

  @Put(':id')
  @ApiParam({ name: 'id', type: 'string', description: 'معرّف المستخدم' })
  @ApiBody({
    type: UpdateUserDto,
    description: 'الحقول المراد تحديثها: البريد الإلكتروني، الاسم، الدور',
  })
  @ApiOperation({ summary: 'تحديث بيانات مستخدم' })
  @ApiOkResponse({
    description: 'تم تحديث بيانات المستخدم بنجاح',
    type: CreateUserDto,
  })
  @ApiNotFoundResponse({ description: 'المستخدم غير موجود' })
  @ApiUnauthorizedResponse({
    description: 'غير مصرح: توكن JWT غير صالح أو مفقود',
  })
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() updateDto: UpdateUserDto) {
    return this.usersService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiParam({ name: 'id', type: 'string', description: 'معرّف المستخدم' })
  @ApiOperation({ summary: 'حذف مستخدم' })
  @ApiOkResponse({ description: 'تم حذف المستخدم بنجاح' })
  @ApiNotFoundResponse({ description: 'المستخدم غير موجود' })
  @ApiUnauthorizedResponse({
    description: 'غير مصرح: توكن JWT غير صالح أو مفقود',
  })
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}

/**
 * النواقص:
 * - إضافة أمثلة JSON في ApiOkResponse وApiCreatedResponse باستخدام schema.example.
 * - يمكن إضافة ApiForbiddenResponse لحالات صلاحيات خاصة.
 * - توصيف دقيق لحقول DTOs (مثل طول النص وتنسيق البريد الإلكتروني).
 */
