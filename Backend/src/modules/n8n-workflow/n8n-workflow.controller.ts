import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  HttpStatus,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { N8nWorkflowService } from './n8n-workflow.service';
import { WorkflowDefinition } from './types';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { RollbackDto } from './dto/rollback.dto';
import { SetActiveDto } from './dto/set-active.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { InjectModel } from '@nestjs/mongoose';
import {
  Merchant,
  MerchantDocument,
} from '../merchants/schemas/merchant.schema';
import { Model } from 'mongoose';
import { EnsureMyWorkflowDto } from './dto/ensure-my-workflow.dto';

@ApiTags('إدارة سير العمل - N8N')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('n8n/workflows')
export class N8nWorkflowController {
  constructor(
    private readonly service: N8nWorkflowService,
    @InjectModel(Merchant.name)
    private readonly merchantModel: Model<MerchantDocument>,
  ) {}

  @Post(':merchantId')
  @Roles('ADMIN', 'MEMBER')
  @ApiOperation({
    summary: 'إنشاء سير عمل جديد للتاجر',
    description: 'ينشئ سير عمل جديد للتاجر المحدد',
  })
  @ApiParam({
    name: 'merchantId',
    description: 'معرف التاجر',
    example: '60d0fe4f5311236168a109ca',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'تم إنشاء سير العمل بنجاح',
    type: Object,
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'غير مصرح' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'غير مصرح لهذه الصلاحية',
  })
  async createForMerchant(
    @Param('merchantId') merchantId: string,
  ): Promise<{ workflowId: string }> {
    console.log('🔗 Using n8n.baseURL=', process.env.N8N_BASE_URL);
    console.log('🔑 Using N8N_API_KEY=', process.env.N8N_API_KEY);

    console.log('👣 ENTER createForMerchant for merchantId=', merchantId);
    const wfId = await this.service.createForMerchant(merchantId);
    console.log('👣 EXIT createForMerchant, got wfId=', wfId);
    return { workflowId: wfId };
  }

  @Get(':workflowId')
  @Roles('ADMIN', 'MEMBER')
  @ApiOperation({
    summary: 'الحصول على تفاصيل سير العمل',
    description: 'استرجاع تفاصيل سير عمل محدد',
  })
  @ApiParam({
    name: 'workflowId',
    description: 'معرف سير العمل',
    example: 'wf_1234567890',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'تم استرجاع سير العمل بنجاح',
    type: Object,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'لم يتم العثور على سير العمل',
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'غير مصرح' })
  async get(
    @Param('workflowId') workflowId: string,
  ): Promise<WorkflowDefinition> {
    return await this.service.get(workflowId);
  }

  @Patch(':workflowId')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'تحديث سير العمل',
    description: 'تحديث سير عمل محدد',
  })
  @ApiParam({
    name: 'workflowId',
    description: 'معرف سير العمل',
    example: 'wf_1234567890',
  })
  @ApiBody({ type: UpdateWorkflowDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'تم تحديث سير العمل بنجاح',
    type: Object,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'لم يتم العثور على سير العمل',
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'غير مصرح' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'غير مصرح لهذه الصلاحية',
  })
  async update(
    @Param('workflowId') workflowId: string,
    @Body() body: UpdateWorkflowDto,
  ): Promise<{ message: string }> {
    // استعمل Partial<WorkflowDefinition> مباشرة
    await this.service.update(
      workflowId,
      (json) => ({
        ...json,
        ...body.jsonPatch,
      }),
      'admin',
    );
    return { message: 'Workflow updated and history recorded' };
  }

  @Post(':workflowId/rollback')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'التراجع عن تغييرات سير العمل',
    description: 'التراجع إلى إصدار سابق من سير العمل',
  })
  @ApiParam({
    name: 'workflowId',
    description: 'معرف سير العمل',
    example: 'wf_1234567890',
  })
  @ApiBody({ type: RollbackDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'تم التراجع بنجاح',
    type: Object,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'لم يتم العثور على سير العمل أو الإصدار المحدد',
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'غير مصرح' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'غير مصرح لهذه الصلاحية',
  })
  async rollback(
    @Param('workflowId') workflowId: string,
    @Body() dto: RollbackDto,
  ): Promise<{ message: string }> {
    await this.service.rollback(workflowId, dto.version, 'admin');
    return { message: `Rolled back to version ${dto.version}` };
  }

  @Post(':workflowId/clone/:targetMerchantId')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'نسخ سير عمل',
    description: 'نسخ سير عمل من تاجر إلى آخر',
  })
  @ApiParam({
    name: 'workflowId',
    description: 'معرف سير العمل المصدر',
    example: 'wf_1234567890',
  })
  @ApiParam({
    name: 'targetMerchantId',
    description: 'معرف التاجر الهدف',
    example: '60d0fe4f5311236168a109cb',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'تم نسخ سير العمل بنجاح',
    type: Object,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'لم يتم العثور على سير العمل أو التاجر الهدف',
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'غير مصرح' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'غير مصرح لهذه الصلاحية',
  })
  async clone(
    @Param('workflowId') sourceId: string,
    @Param('targetMerchantId') targetMerchantId: string,
  ): Promise<{ message: string; newWorkflowId: string }> {
    const newId = await this.service.cloneToMerchant(
      sourceId,
      targetMerchantId,
      'admin',
    );
    return { message: 'Cloned successfully', newWorkflowId: newId };
  }

  @Patch(':workflowId/active')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'تفعيل/تعطيل سير العمل',
    description: 'تغيير حالة تفعيل سير العمل',
  })
  @ApiParam({
    name: 'workflowId',
    description: 'معرف سير العمل',
    example: 'wf_1234567890',
  })
  @ApiBody({ type: SetActiveDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'تم تغيير حالة سير العمل بنجاح',
    type: Object,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'لم يتم العثور على سير العمل',
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'غير مصرح' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'غير مصرح لهذه الصلاحية',
  })
  async setActive(
    @Param('workflowId') workflowId: string,
    @Body() dto: SetActiveDto,
  ): Promise<{ message: string }> {
    await this.service.setActive(workflowId, dto.active);
    return { message: `Workflow ${dto.active ? 'activated' : 'deactivated'}` };
  }

  @Post('me/ensure')
  @ApiOperation({
    summary: 'تأكيد/إعادة إنشاء ورِك-فلو n8n للتاجر الحالي',
    description:
      'يتحقق من وجود الورك-فلو في n8n، ويُعيد إنشاؤه ويفعّله عند الحاجة.',
  })
  @ApiBody({ type: EnsureMyWorkflowDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'تم التأكيد/الإنشاء',
    type: Object,
  })
  async ensureMine(
    @Req() req: any,
    @Body() dto: EnsureMyWorkflowDto,
  ): Promise<{ workflowId: string; recreated: boolean; activated: boolean }> {
    const userId = req.user?.userId;
    const merchantId = req.user?.merchantId; // يأتي من الـ JWT payload عندكم
    if (!userId) throw new BadRequestException('Unauthorized');
    if (!merchantId)
      throw new BadRequestException('لا يوجد Merchant مرتبط بحسابك');

    // اجلب الـ workflowId الحالي (إن وجد)
    const m = await this.merchantModel
      .findById(merchantId)
      .select('workflowId')
      .lean<{ _id: string; workflowId?: string }>()
      .exec();

    let wfId = m?.workflowId ? String(m.workflowId) : '';
    let recreated = false;

    // لو طلب forceRecreate أو ما عنده workflowId → أنشئ جديد
    if (dto?.forceRecreate || !wfId) {
      wfId = await this.service.createForMerchant(String(merchantId));
      recreated = true;
    } else {
      // عنده wfId: نتأكد أنه موجود في n8n
      try {
        await this.service.get(wfId);
      } catch (e: any) {
        if (e?.status === 404 || e?.response?.status === 404) {
          // مفقود في n8n → أعد الإنشاء
          wfId = await this.service.createForMerchant(String(merchantId));
          recreated = true;
        } else {
          throw e; // أخطاء أخرى رجّعها كما هي
        }
      }
    }

    // التفعيل (افتراضيًا true)
    const shouldActivate = dto?.activate !== false;
    let activated = false;
    if (shouldActivate) {
      try {
        await this.service.setActive(wfId, true);
        activated = true;
      } catch {
        activated = false; // لا تُفشل الطلب بسبب التفعيل
      }
    }

    return { workflowId: wfId, recreated, activated };
  }
}
