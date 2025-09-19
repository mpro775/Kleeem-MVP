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

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
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
import { Public } from '../../common/decorators/public.decorator';
import {
  ApiSuccessResponse,
  ApiCreatedResponse as CommonApiCreatedResponse,
} from '../../common';
import { MerchantChecklistService } from './merchant-checklist.service';
import { ChecklistGroup } from './types/merchant-checklist.service.types';
import { OnboardingBasicDto } from './dto/requests/onboarding-basic.dto';
import {
  ProductSource,
  UpdateProductSourceDto,
} from './dto/requests/update-product-source.dto';
import { CreateMerchantDto } from './dto/requests/create-merchant.dto';
import { UpdateMerchantDto } from './dto/requests/update-merchant.dto';
import { unlink } from 'fs/promises';
import { FileInterceptor } from '@nestjs/platform-express';
import { InjectModel, ParseObjectIdPipe } from '@nestjs/mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { NotificationsService } from '../notifications/notifications.service';
import { CatalogService } from '../catalog/catalog.service';
import { OutboxService } from '../../common/outbox/outbox.service';
import { CurrentUser, CurrentUserId, CurrentMerchantId } from '../../common';
import type { Role } from '../../common/interfaces/jwt-payload.interface';
import { TranslationService } from '../../common/services/translation.service';
const SLUG_RE = /^[a-z](?:[a-z0-9-]{1,48}[a-z0-9])$/;
class SoftDeleteDto {
  reason?: string;
}
function assertOwnerOrAdmin(
  merchantIdParam: string,
  jwtMerchantId: string | null,
  role: Role | string,
  translationService?: TranslationService,
) {
  if (role !== 'ADMIN' && merchantIdParam !== String(jwtMerchantId)) {
    const message =
      translationService?.translate('auth.errors.forbidden') ?? 'ممنوع';
    throw new HttpException(message, HttpStatus.FORBIDDEN);
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
    private readonly translationService: TranslationService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'i18n:products.operations.create.summary',
    description: 'i18n:products.operations.create.description',
  })
  @ApiBody({ type: CreateMerchantDto })
  @CommonApiCreatedResponse(
    CreateMerchantDto,
    'i18n:merchants.messages.created',
  )
  create(@Body() dto: CreateMerchantDto) {
    return this.svc.create(dto);
  }

  @Public()
  @Get('check-public-slug') // ← ضع هذا قبل أي ':id'
  async checkPublicSlug(@Query('slug') slug: string) {
    if (!slug || !SLUG_RE.test(slug)) {
      throw new BadRequestException('i18n:merchants.errors.invalidSlug');
    }
    const exists = await this.svc.existsByPublicSlug(slug);
    return { available: !exists };
  }
  @Put(':id/soft-delete')
  @ApiOperation({
    summary: 'i18n:merchants.operations.delete.summary',
    description: 'i18n:merchants.operations.delete.description',
  })
  @ApiParam({ name: 'id', description: 'معرف التاجر' })
  @ApiBody({ type: SoftDeleteDto, required: false })
  @ApiOkResponse({
    description: 'i18n:merchants.messages.softDeleted',
  })
  @ApiUnauthorizedResponse({
    description: 'i18n:auth.errors.unauthorized',
  })
  @ApiForbiddenResponse({
    description: 'i18n:auth.errors.forbidden',
  })
  async softDelete(
    @Param('id') id: string,
    @Body() body: SoftDeleteDto,
    @CurrentUser()
    user: { userId: string; role: Role; merchantId?: string | null },
  ) {
    return this.svc.softDelete(id, user, body?.reason);
  }

  @Put(':id/restore')
  @ApiOperation({
    summary: 'i18n:merchants.operations.restore.summary',
    description: 'i18n:merchants.operations.restore.description',
  })
  @ApiParam({ name: 'id', description: 'معرف التاجر' })
  @ApiOkResponse({
    description: 'i18n:merchants.messages.restored',
  })
  @ApiUnauthorizedResponse({
    description: 'i18n:auth.errors.unauthorized',
  })
  @ApiForbiddenResponse({
    description: 'i18n:auth.errors.forbidden',
  })
  async restore(
    @Param('id') id: string,
    @CurrentUser()
    user: { userId: string; role: Role; merchantId?: string | null },
  ) {
    return this.svc.restore(id, user);
  }
  @Post(':id/purge')
  @ApiOperation({
    summary: 'i18n:merchants.operations.permanentDelete.summary',
    description: 'i18n:merchants.operations.permanentDelete.description',
  })
  @ApiParam({ name: 'id', description: 'معرف التاجر' })
  @ApiBody({ type: ForceDeleteDto, required: false })
  @ApiOkResponse({
    description: 'i18n:merchants.messages.permanentlyDeleted',
  })
  @ApiNotFoundResponse({
    description: 'i18n:merchants.errors.notFound',
  })
  @ApiForbiddenResponse({
    description: 'i18n:auth.errors.forbidden',
  })
  @ApiUnauthorizedResponse({
    description: 'i18n:auth.errors.unauthorized',
  })
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
  @ApiOperation({
    summary: 'i18n:merchants.operations.list.summary',
    description: 'i18n:merchants.operations.list.description',
  })
  @ApiSuccessResponse(Array, 'i18n:merchants.operations.list.description')
  findAll() {
    return this.svc.findAll();
  }

  @Get(':id/checklist')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'i18n:merchants.operations.checklist.summary',
    description: 'i18n:merchants.operations.checklist.description',
  })
  @ApiOkResponse({
    description: 'i18n:merchants.operations.checklist.description',
  })
  @ApiForbiddenResponse({
    description: 'i18n:auth.errors.forbidden',
  })
  @ApiUnauthorizedResponse({
    description: 'i18n:auth.errors.unauthorized',
  })
  async getChecklist(
    @Param('id') merchantId: string,
    @CurrentMerchantId() jwtMerchantId: string | null,
    @CurrentUser() user: { role: Role },
  ): Promise<ChecklistGroup[]> {
    assertOwnerOrAdmin(
      merchantId,
      jwtMerchantId,
      user.role,
      this.translationService,
    );
    return this.checklist.getChecklist(merchantId);
  }

  @Get('prompt/advanced-template')
  async getAdvancedTemplate(@Param('id') id: string) {
    return this.svc.getAdvancedTemplateForEditor(id, {
      productName: 'منتج تجريبي',
    });
  }

  @Post(':id/logo')
  @ApiOperation({
    summary: 'i18n:merchants.operations.uploadLogo.summary',
    description: 'i18n:merchants.operations.uploadLogo.description',
  })
  @ApiParam({ name: 'id', description: 'معرف التاجر' })
  @UseInterceptors(FileInterceptor('file')) // ← يعتمد على MulterModule.register({ dest: './uploads' })
  async uploadLogo(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentMerchantId() jwtMerchantId: string | null,
    @CurrentUser() user: { role: Role },
  ) {
    assertOwnerOrAdmin(id, jwtMerchantId, user.role, this.translationService);

    if (!file)
      throw new BadRequestException('i18n:merchants.errors.noFileAttached');
    const allowed = ['image/png', 'image/jpeg', 'image/webp'];
    const maxBytes = 2 * 1024 * 1024;

    if (!allowed.includes(file.mimetype)) {
      try {
        await unlink(file.path);
      } catch {}
      throw new BadRequestException('i18n:merchants.errors.fileNotSupported');
    }
    if (file.size > maxBytes) {
      try {
        await unlink(file.path);
      } catch {}
      throw new BadRequestException('i18n:merchants.errors.fileTooLarge');
    }

    const url = await this.svc.uploadLogoToMinio(id, file);
    return { url };
  }
  @Put(':id')
  @ApiOperation({
    summary: 'i18n:merchants.operations.update.summary',
    description: 'i18n:merchants.operations.update.description',
  })
  @ApiParam({ name: 'id', description: 'معرف التاجر' })
  @ApiBody({ type: UpdateMerchantDto })
  @ApiOkResponse({
    description: 'i18n:merchants.messages.updated',
  })
  @ApiNotFoundResponse({
    description: 'i18n:merchants.errors.notFound',
  })
  @ApiForbiddenResponse({
    description: 'i18n:auth.errors.forbidden',
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateMerchantDto,
    @CurrentMerchantId() jwtMerchantId: string | null,
    @CurrentUser() user: { role: Role },
  ) {
    const merchant = await this.svc.findOne(id);
    if (!merchant)
      throw new NotFoundException('i18n:merchants.errors.notFound');

    assertOwnerOrAdmin(id, jwtMerchantId, user.role, this.translationService);

    // (اختياري) لوج محلي بدون req:
    this.logger.debug('DTO keys = %o', Object.keys(dto as any));
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'i18n:merchants.operations.delete.summary',
    description: 'i18n:merchants.operations.delete.description',
  })
  @ApiParam({ name: 'id', description: 'معرف التاجر' })
  @ApiOkResponse({
    description: 'i18n:merchants.messages.deleted',
  })
  @ApiNotFoundResponse({
    description: 'i18n:merchants.errors.notFound',
  })
  @ApiForbiddenResponse({
    description: 'i18n:auth.errors.forbidden',
  })
  @ApiUnauthorizedResponse({
    description: 'i18n:auth.errors.unauthorized',
  })
  async remove(
    @Param('id') id: string,
    @CurrentMerchantId() jwtMerchantId: string | null,
    @CurrentUser() user: { userId: string; role: Role },
  ) {
    assertOwnerOrAdmin(id, jwtMerchantId, user.role, this.translationService);
    // نفّذ الحذف الناعم بدل الصلب لأمان وتوافق
    return this.svc.softDelete(id, user, 'via DELETE /merchants/:id');
  }

  @Get(':id/subscription-status')
  @ApiOperation({
    summary: 'i18n:merchants.operations.verifySubscription.summary',
    description: 'i18n:merchants.operations.verifySubscription.description',
  })
  @ApiParam({ name: 'id', description: 'معرف التاجر' })
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
    assertOwnerOrAdmin(id, jwtMerchantId, user.role, this.translationService);
    return this.svc.isSubscriptionActive(id).then((active) => ({
      merchantId: id,
      subscriptionActive: active,
    }));
  }

  @Post(':id/checklist/:itemKey/skip')
  @ApiOperation({
    summary: 'i18n:merchants.operations.skipChecklistItem.summary',
    description: 'i18n:merchants.operations.skipChecklistItem.description',
  })
  @ApiParam({ name: 'id', description: 'معرف التاجر' })
  @ApiParam({ name: 'itemKey', description: 'معرف العنصر' })
  @ApiOkResponse({
    description: 'i18n:merchants.checklist.messages.itemSkipped',
  })
  @ApiNotFoundResponse({
    description: 'i18n:merchants.errors.notFound',
  })
  async skipChecklistItem(
    @Param('id') merchantId: string,
    @Param('itemKey') itemKey: string,
    @CurrentMerchantId() jwtMerchantId: string | null,
  ) {
    // تحقق أن المستخدم مالك المتجر
    if (jwtMerchantId !== merchantId) {
      throw new HttpException(
        'i18n:auth.errors.forbidden',
        HttpStatus.FORBIDDEN,
      );
    }

    // أضف الـ key إلى skippedChecklistItems إن لم يكن موجودًا
    const merchant = await this.svc.findOne(merchantId);
    if (!merchant)
      throw new NotFoundException('i18n:merchants.errors.notFound');

    const merchantDoc = merchant as any;
    if (!merchantDoc.skippedChecklistItems.includes(itemKey)) {
      merchantDoc.skippedChecklistItems.push(itemKey);
      await merchantDoc.save();
    }

    return {
      message: 'i18n:merchants.checklist.messages.itemSkipped',
      skippedChecklistItems: merchantDoc.skippedChecklistItems,
    };
  }

  @Patch(':id/onboarding/basic')
  @ApiOperation({ summary: 'حفظ معلومات onboarding الأساسية' })
  @ApiParam({ name: 'id', description: 'معرف التاجر' })
  @ApiBody({ type: OnboardingBasicDto })
  @ApiOkResponse({ description: 'تم حفظ معلومات onboarding بنجاح' })
  @ApiNotFoundResponse({
    description: 'i18n:merchants.errors.notFound',
  })
  saveBasic(@Param('id') id: string, @Body() dto: OnboardingBasicDto) {
    return this.svc.saveBasicInfo(id, dto);
  }

  @Post(':id/workflow/ensure')
  @ApiOperation({ summary: 'إنشاء أو تحديث workflow للتاجر' })
  @ApiParam({ name: 'id', description: 'معرف التاجر' })
  @ApiOkResponse({ description: 'تم إنشاء أو تحديث workflow بنجاح' })
  @ApiNotFoundResponse({
    description: 'i18n:merchants.errors.notFound',
  })
  async ensureWorkflow(@Param('id') id: string) {
    const wfId = await this.svc.ensureWorkflow(id);
    return { workflowId: wfId };
  }

  @Public()
  @Get(':id/ai/store-context')
  @ApiOperation({ summary: 'جلب سياق المتجر' })
  @ApiParam({ name: 'id', description: 'معرف التاجر' })
  @ApiOkResponse({ description: 'تم جلب سياق المتجر بنجاح' })
  @ApiNotFoundResponse({
    description: 'i18n:merchants.errors.notFound',
  })
  async aiStoreContext(@Param('id') id: string) {
    return this.svc.getStoreContext(id);
  }

  @ApiOperation({
    summary: 'تعيين مصدر المنتج (مع تأكيد كلمة المرور واختيار وضع المزامنة)',
  })
  @ApiParam({ name: 'id', description: 'معرف التاجر' })
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
    assertOwnerOrAdmin(
      merchantId,
      jwtMerchantId,
      user.role,
      this.translationService,
    );

    // اجلب المستخدم للتحقق من كلمة المرور
    const account = await this.userModel
      .findById(userId)
      .select('+password role email name')
      .exec();
    if (!account)
      throw new BadRequestException(
        this.translationService.translate('auth.errors.userNotFound'),
      );

    // نطلب كلمة المرور إذا كان المصدر ليس INTERNAL أو عند sync فوري
    if (dto.source !== ProductSource.INTERNAL || dto.syncMode === 'immediate') {
      if (!dto.confirmPassword)
        throw new BadRequestException('كلمة المرور مطلوبة للتأكيد');
      const ok = await bcrypt.compare(dto.confirmPassword, account.password);
      if (!ok)
        throw new BadRequestException(
          this.translationService.translate('auth.errors.invalidCredentials'),
        );
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
