// src/modules/orders/orders.controller.ts
import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth, 
  ApiParam, 
  ApiBody 
} from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { 
  ApiSuccessResponse, 
  ApiCreatedResponse as CommonApiCreatedResponse, 

} from '../../common';

/**
 * وحدة تحكم الطلبات
 * تتعامل مع عمليات إنشاء واسترجاع الطلبات
 */
@ApiTags('الطلبات')
@Controller('orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}
  @Public()
  @Post()
  @ApiOperation({
    summary: 'إنشاء طلب جديد',
    description: 'ينشئ سجل طلب جديد في النظام مع البيانات المقدمة',
  })
  @CommonApiCreatedResponse(CreateOrderDto, 'تم إنشاء الطلب بنجاح')
  @ApiResponse({
    status: 400,
    description: 'بيانات الطلب غير صالحة',
  })
  @ApiResponse({
    status: 401,
    description: 'غير مصرح - يلزم تسجيل الدخول',
  })
  @ApiBody({
    type: CreateOrderDto,
    description: 'بيانات الطلب المطلوب إنشاؤها',
    examples: {
      basic: {
        summary: 'إنشاء طلب أساسي',
        value: {
          merchantId: 'merchant-123',
          sessionId: 'session-456',
          customer: {
            name: 'محمد أحمد',
            phone: '+966501234567',
            email: 'customer@example.com',
          },
          items: [
            {
              productId: 'prod-789',
              quantity: 2,
              price: 100,
              name: 'منتج مميز',
            },
          ],
        },
      },
    },
  })
  async create(@Body() dto: CreateOrderDto) {
    return this.ordersService.create(dto);
  }

  // جلب جميع الطلبات
  @Get()
  @ApiOperation({
    summary: 'استرجاع جميع الطلبات',
    description: 'يعيد قائمة بجميع الطلبات مع تفاصيلها',
  })
  @ApiSuccessResponse(Array, 'تم استرجاع الطلبات بنجاح')
  @ApiResponse({
    status: 401,
    description: 'غير مصرح - يلزم تسجيل الدخول',
  })
  async findAll() {
    return this.ordersService.findAll();
  }

  @Public()
@Get('mine/:merchantId/:sessionId')
async findMine(
  @Param('merchantId') merchantId: string,
  @Param('sessionId') sessionId: string,
) {
  return this.ordersService.findMine(merchantId, sessionId);
}
  // جلب طلب محدد بالتفصيل
  @Public()
  @Get(':id')
  @ApiOperation({
    summary: 'استرجاع تفاصيل طلب محدد',
    description: 'يعيد تفاصيل طلب معين بناءً على المعرف المحدد',
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'معرف الطلب المطلوب استرجاعه',
    example: '60d21b4667d0d8992e610c85',
  })
  @ApiResponse({
    status: 200,
    description: 'تم العثور على الطلب',
  })
  @ApiResponse({
    status: 404,
    description: 'الطلب غير موجود',
  })
  async findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  // تعديل حالة الطلب (مثال: pending/paid/canceled)
  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.ordersService.updateStatus(id, status);
  }
  @Public()
  @Get('by-customer/:merchantId/:phone')
  async findByCustomer(
    @Param('merchantId') merchantId: string,
    @Param('phone') phone: string,
  ) {
    // ابحث عن كل الطلبات لهذا العميل بناءً على رقم الجوال (أو حتى sessionId إذا متاح)
    return this.ordersService.findByCustomer(merchantId, phone);
  }
}
