import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiParam, 
  ApiBearerAuth 
} from '@nestjs/swagger';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('العملاء المحتملين')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('merchants/:merchantId/leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  @ApiOperation({ 
    summary: 'إنشاء عميل محتمل جديد',
    description: 'إنشاء سجل عميل محتمل جديد للتاجر' 
  })
  @ApiParam({ name: 'merchantId', description: 'معرف التاجر', type: String })
  @ApiResponse({ 
    status: 201, 
    description: 'تم إنشاء العميل المحتمل بنجاح' 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'بيانات الطلب غير صالحة' 
  })
  @ApiResponse({ 
    status: 401, 
    description: 'غير مصرح - يلزم تسجيل الدخول' 
  })
  @ApiResponse({ 
    status: 403, 
    description: 'غير مصرح - لا تملك الصلاحيات الكافية' 
  })
  createLead(
    @Param('merchantId') merchantId: string,
    @Body() dto: CreateLeadDto,
  ) {
    return this.leadsService.create(merchantId, dto);
  }

  @Get()
  @ApiOperation({ 
    summary: 'الحصول على العملاء المحتملين',
    description: 'استرجاع قائمة بجميع العملاء المحتملين للتاجر' 
  })
  @ApiParam({ name: 'merchantId', description: 'معرف التاجر', type: String })
  @ApiResponse({ 
    status: 200, 
    description: 'تم استرجاع العملاء المحتملين بنجاح' 
  })
  @ApiResponse({ 
    status: 401, 
    description: 'غير مصرح - يلزم تسجيل الدخول' 
  })
  @ApiResponse({ 
    status: 403, 
    description: 'غير مصرح - لا تملك الصلاحيات الكافية' 
  })
  getLeads(@Param('merchantId') merchantId: string) {
    return this.leadsService.findAllForMerchant(merchantId);
  }
}
