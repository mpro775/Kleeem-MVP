// src/modules/merchants/merchants.controller.ts

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
  HttpException,
  HttpStatus,
  BadRequestException,
  HttpCode,
  Req,
  NotFoundException,
  UseInterceptors,
  UploadedFile,
  Query,
  Logger,
} from '@nestjs/common';
import { MerchantsService } from './merchants.service';
import { CreateMerchantDto } from './dto/create-merchant.dto';
import { UpdateMerchantDto } from './dto/update-merchant.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RequestWithUser } from '../../common/interfaces/request-with-user.interface';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import {
  ApiSuccessResponse,
  ApiCreatedResponse as CommonApiCreatedResponse,
} from '../../common';
import {
  ChecklistGroup,
  MerchantChecklistService,
} from './merchant-checklist.service';
import { OnboardingBasicDto } from './dto/onboarding-basic.dto';
import {
  ProductSource,
  UpdateProductSourceDto,
} from './dto/update-product-source.dto';
import { unlink } from 'fs/promises';
import { FileInterceptor } from '@nestjs/platform-express';
import { InjectModel, ParseObjectIdPipe } from '@nestjs/mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { NotificationsService } from '../notifications/notifications.service';
import { CatalogService } from '../catalog/catalog.service';
import { OutboxService } from 'src/common/outbox/outbox.service';
import { CurrentUser, CurrentUserId, CurrentMerchantId } from '../../common';
import type { Role } from '../../common/interfaces/jwt-payload.interface';
const SLUG_RE = /^[a-z](?:[a-z0-9-]{1,48}[a-z0-9])$/;
class SoftDeleteDto {
  reason?: string;
}
function assertOwnerOrAdmin(
  merchantIdParam: string,
  jwtMerchantId: string | null,
  role: Role | string,
) {
  if (role !== 'ADMIN' && merchantIdParam !== String(jwtMerchantId)) {
    throw new HttpException('ممنوع', HttpStatus.FORBIDDEN);
  }
}
class ForceDeleteDto {
  confirm?: string;
} // لو حابب إضافة تأكيد نصي مثل "DELETE"
@ApiTags('التجار')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('merchants')
export class MerchantsController {
  private readonly logger = new Logger(MerchantsController.name);
  constructor(
    private readonly svc: MerchantsService,
    private readonly checklist: MerchantChecklistService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly notifications: NotificationsService,
    private readonly catalog: CatalogService,
    private readonly outbox: OutboxService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'إنشاء تاجر جديد مع الإعدادات الأولية' })
  @ApiBody({ type: CreateMerchantDto })
  @CommonApiCreatedResponse(CreateMerchantDto, 'تم إنشاء التاجر بنجاح')
  create(@Body() dto: CreateMerchantDto) {
    return this.svc.create(dto);
  }

  @Public()
  @Get('check-public-slug') // ← ضع هذا قبل أي ':id'
  async checkPublicSlug(@Query('slug') slug: string) {
    if (!slug || !SLUG_RE.test(slug)) {
      throw new BadRequestException('سلاج غير صالح');
    }
    const exists = await this.svc.existsByPublicSlug(slug);
    return { available: !exists };
  }
  @Put(':id/soft-delete')
  @ApiOperation({ summary: 'حذف ناعم للتاجر (تعطيل + تمييز بالحذف)' })
  @ApiParam({ name: 'id', description: 'معرف التاجر' })
  @ApiBody({ type: SoftDeleteDto, required: false })
  @ApiOkResponse({ description: 'تم التعطيل والحذف الناعم' })
  @ApiUnauthorizedResponse({ description: 'التوثيق مطلوب' })
  @ApiForbiddenResponse({ description: 'غير مخوّل' })
  async softDelete(
    @Param('id') id: string,
    @Body() body: SoftDeleteDto,
    @CurrentUser()
    user: { userId: string; role: Role; merchantId?: string | null },
  ) {
    return this.svc.softDelete(id, user, body?.reason);
  }

  @Put(':id/restore')
  @ApiOperation({ summary: 'استرجاع التاجر بعد الحذف الناعم' })
  @ApiParam({ name: 'id', description: 'معرف التاجر' })
  @ApiOkResponse({ description: 'تم الاسترجاع' })
  @ApiUnauthorizedResponse({ description: 'التوثيق مطلوب' })
  @ApiForbiddenResponse({ description: 'غير مخوّل' })
  async restore(
    @Param('id') id: string,
    @CurrentUser()
    user: { userId: string; role: Role; merchantId?: string | null },
  ) {
    return this.svc.restore(id, user);
  }
  @Post(':id/purge')
  @ApiOperation({ summary: 'حذف إجباري + تنظيف كامل (للمشرف فقط)' })
  @ApiParam({ name: 'id', description: 'معرف التاجر' })
  @ApiBody({ type: ForceDeleteDto, required: false })
  @ApiOkResponse({ description: 'تم الحذف النهائي والتنظيف الكامل' })
  @ApiNotFoundResponse({ description: 'التاجر غير موجود' })
  @ApiForbiddenResponse({ description: 'غير مخوّل' })
  @ApiUnauthorizedResponse({ description: 'التوثيق مطلوب' })
  async purge(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string; role: Role },
  ) {
    // (اختياري) التحقق من confirm === "DELETE" في الـ body
    return this.svc.purge(id, user);
  }
  @Public()
  @Get(':id') // ← سيصل إليها فقط قيم ObjectId بعد ترتيب الراوتات
  findOne(@Param('id', ParseObjectIdPipe) id: string) {
    return this.svc.findOne(id);
  }
  @Get()
  @ApiOperation({ summary: 'جلب جميع التجار' })
  @ApiSuccessResponse(Array, 'قائمة التجار')
  findAll() {
    return this.svc.findAll();
  }

  @Get(':id/checklist')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'جلب قائمة العناصر في قائمة التحقق' })
  @ApiOkResponse({ description: 'قائمة العناصر في قائمة التحقق' })
  @ApiForbiddenResponse({ description: 'غير مخوّل' })
  @ApiUnauthorizedResponse({ description: 'التوثيق مطلوب' })
  async getChecklist(
    @Param('id') merchantId: string,
    @CurrentMerchantId() jwtMerchantId: string | null,
    @CurrentUser() user: { role: Role },
  ): Promise<ChecklistGroup[]> {
    assertOwnerOrAdmin(merchantId, jwtMerchantId, user.role);
    return this.checklist.getChecklist(merchantId);
  }

  @Get('prompt/advanced-template')
  async getAdvancedTemplate(@Param('id') id: string) {
    return this.svc.getAdvancedTemplateForEditor(id, {
      productName: 'منتج تجريبي',
    });
  }

  @Post(':id/logo')
  @ApiOperation({ summary: 'رفع شعار التاجر كملف (MinIO + حذف مؤقت)' })
  @ApiParam({ name: 'id', description: 'معرّف التاجر' })
  @UseInterceptors(FileInterceptor('file')) // ← يعتمد على MulterModule.register({ dest: './uploads' })
  async uploadLogo(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentMerchantId() jwtMerchantId: string | null,
    @CurrentUser() user: { role: Role },
  ) {
    assertOwnerOrAdmin(id, jwtMerchantId, user.role);

    if (!file) throw new BadRequestException('لم يتم إرفاق ملف');
    const allowed = ['image/png', 'image/jpeg', 'image/webp'];
    const maxBytes = 2 * 1024 * 1024;

    if (!allowed.includes(file.mimetype)) {
      try {
        await unlink(file.path);
      } catch {}
      throw new BadRequestException('صيغة الصورة غير مدعومة (PNG/JPG/WEBP)');
    }
    if (file.size > maxBytes) {
      try {
        await unlink(file.path);
      } catch {}
      throw new BadRequestException('الحجم الأقصى 2MB');
    }

    const url = await this.svc.uploadLogoToMinio(id, file);
    return { url };
  }
  @Put(':id')
  @ApiOperation({ summary: 'تحديث بيانات التاجر بالكامل' })
  @ApiParam({ name: 'id', description: 'معرّف التاجر' })
  @ApiBody({ type: UpdateMerchantDto })
  @ApiOkResponse({ description: 'تم التحديث بنجاح' })
  @ApiNotFoundResponse({ description: 'التاجر غير موجود' })
  @ApiForbiddenResponse({ description: 'غير مخوّل' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateMerchantDto,
    @CurrentMerchantId() jwtMerchantId: string | null,
    @CurrentUser() user: { role: Role },
  ) {
    const merchant = await this.svc.findOne(id);
    if (!merchant) throw new NotFoundException('التاجر غير موجود');

    assertOwnerOrAdmin(id, jwtMerchantId, user.role);

    // (اختياري) لوج محلي بدون req:
    this.logger.debug('DTO keys = %o', Object.keys(dto as any));
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'حذف التاجر' })
  @ApiParam({ name: 'id', description: 'معرّف التاجر' })
  @ApiOkResponse({ description: 'تم الحذف بنجاح' })
  @ApiNotFoundResponse({ description: 'التاجر غير موجود' })
  @ApiForbiddenResponse({ description: 'غير مخوّل' })
  @ApiUnauthorizedResponse({ description: 'التوثيق مطلوب' })
  async remove(
    @Param('id') id: string,
    @CurrentMerchantId() jwtMerchantId: string | null,
    @CurrentUser() user: { userId: string; role: Role },
  ) {
    assertOwnerOrAdmin(id, jwtMerchantId, user.role);
    // نفّذ الحذف الناعم بدل الصلب لأمان وتوافق
    return this.svc.softDelete(id, user, 'via DELETE /merchants/:id');
  }

  @Get(':id/subscription-status')
  @ApiOperation({ summary: 'التحقق من صلاحية الاشتراك الحالي' })
  @ApiParam({ name: 'id', description: 'معرّف التاجر' })
  @ApiOkResponse({
    schema: {
      example: { merchantId: '...', subscriptionActive: true },
    },
  })
  @ApiUnauthorizedResponse()
  @ApiNotFoundResponse()
  checkSubscription(
    @Param('id') id: string,
    @CurrentMerchantId() jwtMerchantId: string | null,
    @CurrentUser() user: { role: Role },
  ) {
    assertOwnerOrAdmin(id, jwtMerchantId, user.role);
    return this.svc.isSubscriptionActive(id).then((active) => ({
      merchantId: id,
      subscriptionActive: active,
    }));
  }

  @Post(':id/checklist/:itemKey/skip')
  @ApiOperation({ summary: 'تخطي عنصر في قائمة التحقق' })
  @ApiParam({ name: 'id', description: 'معرّف التاجر' })
  @ApiParam({ name: 'itemKey', description: 'معرّف العنصر' })
  @ApiOkResponse({ description: 'تم تخطي العنصر بنجاح' })
  @ApiNotFoundResponse({ description: 'التاجر غير موجود' })
  async skipChecklistItem(
    @Param('id') merchantId: string,
    @Param('itemKey') itemKey: string,
    @CurrentMerchantId() jwtMerchantId: string | null,
  ) {
    // تحقق أن المستخدم مالك المتجر
    if (jwtMerchantId !== merchantId) {
      throw new HttpException('ممنوع', HttpStatus.FORBIDDEN);
    }

    // أضف الـ key إلى skippedChecklistItems إن لم يكن موجودًا
    const merchant = await this.svc.findOne(merchantId);
    if (!merchant) throw new NotFoundException('التاجر غير موجود');

    if (!merchant.skippedChecklistItems.includes(itemKey)) {
      merchant.skippedChecklistItems.push(itemKey);
      await merchant.save();
    }

    return {
      message: 'تم التخطي',
      skippedChecklistItems: merchant.skippedChecklistItems,
    };
  }

  @Patch(':id/onboarding/basic')
  @ApiOperation({ summary: 'حفظ معلومات onboarding الأساسية' })
  @ApiParam({ name: 'id', description: 'معرّف التاجر' })
  @ApiBody({ type: OnboardingBasicDto })
  @ApiOkResponse({ description: 'تم حفظ معلومات onboarding بنجاح' })
  @ApiNotFoundResponse({ description: 'التاجر غير موجود' })
  saveBasic(@Param('id') id: string, @Body() dto: OnboardingBasicDto) {
    return this.svc.saveBasicInfo(id, dto);
  }

  @Post(':id/workflow/ensure')
  @ApiOperation({ summary: 'إنشاء أو تحديث workflow للتاجر' })
  @ApiParam({ name: 'id', description: 'معرّف التاجر' })
  @ApiOkResponse({ description: 'تم إنشاء أو تحديث workflow بنجاح' })
  @ApiNotFoundResponse({ description: 'التاجر غير موجود' })
  async ensureWorkflow(@Param('id') id: string) {
    const wfId = await this.svc.ensureWorkflow(id);
    return { workflowId: wfId };
  }

  @Public()
  @Get(':id/ai/store-context')
  @ApiOperation({ summary: 'جلب سياق المتجر' })
  @ApiParam({ name: 'id', description: 'معرّف التاجر' })
  @ApiOkResponse({ description: 'تم جلب سياق المتجر بنجاح' })
  @ApiNotFoundResponse({ description: 'التاجر غير موجود' })
  async aiStoreContext(@Param('id') id: string) {
    return this.svc.getStoreContext(id);
  }

  @ApiOperation({
    summary: 'تعيين مصدر المنتج (مع تأكيد كلمة المرور واختيار وضع المزامنة)',
  })
  @ApiParam({ name: 'id', description: 'معرّف التاجر' })
  @ApiBody({ type: UpdateProductSourceDto })
  @ApiOkResponse({ description: 'تم التبديل وربما بدأت المزامنة' })
  @Patch(':id/product-source')
  async setSource(
    @Param('id') merchantId: string,
    @Body() dto: UpdateProductSourceDto,
    @CurrentMerchantId() jwtMerchantId: string | null,
    @CurrentUserId() userId: string, // ✅ كان مفقود
    @CurrentUser() user: { role: Role }, // لدور ADMIN
  ) {
    assertOwnerOrAdmin(merchantId, jwtMerchantId, user.role);

    // اجلب المستخدم للتحقق من كلمة المرور
    const account = await this.userModel
      .findById(userId)
      .select('+password role email name')
      .exec();
    if (!account) throw new BadRequestException('User not found');

    // نطلب كلمة المرور إذا كان المصدر ليس INTERNAL أو عند sync فوري
    if (dto.source !== ProductSource.INTERNAL || dto.syncMode === 'immediate') {
      if (!dto.confirmPassword)
        throw new BadRequestException('كلمة المرور مطلوبة للتأكيد');
      const ok = await bcrypt.compare(dto.confirmPassword, account.password);
      if (!ok) throw new BadRequestException('كلمة المرور غير صحيحة');
    }

    // 1) بدّل المصدر
    const merchant = await this.svc.setProductSource(merchantId, dto.source);

    // 2) أشعار
    await this.notifications.notifyUser(userId, {
      type: 'productSource.changed',
      title: 'تم تغيير مصدر المنتجات',
      body: `المصدر الحالي: ${dto.source}`,
      merchantId,
      severity: 'info',
      data: { source: dto.source },
    });

    // 3) المزامنة حسب الوضع
    const mode = dto.syncMode ?? 'background';
    if (mode === 'immediate') {
      try {
        await this.notifications.notifyUser(userId, {
          type: 'catalog.sync.started',
          title: 'بدء مزامنة الكتالوج',
          body: 'بدأت عملية المزامنة الآن.',
          merchantId,
          severity: 'info',
        });
        const result = await this.catalog.syncForMerchant(merchantId);
        await this.notifications.notifyUser(userId, {
          type: 'catalog.sync.completed',
          title: 'اكتمال مزامنة الكتالوج',
          body: `تم الاستيراد: ${result.imported} | التحديث: ${result.updated}`,
          merchantId,
          severity: 'success',
          data: result,
        });
        return { merchant, sync: { mode, ...result } };
      } catch (e: any) {
        await this.notifications.notifyUser(userId, {
          type: 'catalog.sync.failed',
          title: 'فشل مزامنة الكتالوج',
          body: e?.message || 'حدث خطأ أثناء المزامنة',
          merchantId,
          severity: 'error',
        });
        throw e;
      }
    }

    if (mode === 'background') {
      await this.outbox
        .enqueueEvent({
          aggregateType: 'catalog',
          aggregateId: merchantId,
          eventType: 'catalog.sync.requested',
          payload: { merchantId, requestedBy: userId, source: dto.source },
          exchange: 'catalog.sync',
          routingKey: 'requested',
        })
        .catch(() => {});
      await this.notifications.notifyUser(userId, {
        type: 'catalog.sync.queued',
        title: 'تم جدولة مزامنة الكتالوج',
        body: 'ستبدأ المزامنة في الخلفية.',
        merchantId,
        severity: 'info',
      });
      return { merchant, sync: { mode: 'background', queued: true } };
    }

    return { merchant, sync: { mode: 'none' } };
  }
}
