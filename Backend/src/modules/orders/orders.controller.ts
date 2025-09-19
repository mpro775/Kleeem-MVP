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
  ApiBody,
} from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  ApiSuccessResponse,
  ApiCreatedResponse as CommonApiCreatedResponse,
} from '../../common';
import { TranslationService } from '../../common/services/translation.service';

/**
 * وحدة تحكم الطلبات
 * تتعامل مع عمليات إنشاء واسترجاع الطلبات
 */
@ApiTags('orders')
@Controller('orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly translationService: TranslationService,
  ) {}
  @Public()
  @Post()
  @ApiOperation({
    summary: 'orders.operations.create.summary',
    description: 'orders.operations.create.description',
  })
  @CommonApiCreatedResponse(CreateOrderDto, 'orders.responses.success.created')
  @ApiResponse({
    status: 400,
    description: 'orders.responses.error.badRequest',
  })
  @ApiResponse({
    status: 401,
    description: 'orders.responses.error.unauthorized',
  })
  @ApiBody({
    type: CreateOrderDto,
    description: 'orders.operations.create.description',
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
    summary: 'orders.operations.findAll.summary',
    description: 'orders.operations.findAll.description',
  })
  @ApiSuccessResponse(Array, 'orders.responses.success.found')
  @ApiResponse({
    status: 401,
    description: 'orders.responses.error.unauthorized',
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
    summary: 'orders.operations.findOne.summary',
    description: 'orders.operations.findOne.description',
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'orders.fields.merchantId',
    example: '60d21b4667d0d8992e610c85',
  })
  @ApiResponse({
    status: 200,
    description: 'orders.responses.success.found',
  })
  @ApiResponse({
    status: 404,
    description: 'orders.responses.error.notFound',
  })
  async findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  // تعديل حالة الطلب (مثال: pending/paid/canceled)
  @Patch(':id/status')
  @ApiOperation({
    summary: 'orders.operations.updateStatus.summary',
    description: 'orders.operations.updateStatus.description',
  })
  @ApiResponse({
    status: 200,
    description: 'orders.responses.success.updated',
  })
  @ApiResponse({
    status: 404,
    description: 'orders.responses.error.notFound',
  })
  async updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.ordersService.updateStatus(id, status);
  }
  @Public()
  @Get('by-customer/:merchantId/:phone')
  @ApiOperation({
    summary: 'orders.operations.findByCustomer.summary',
    description: 'orders.operations.findByCustomer.description',
  })
  @ApiResponse({
    status: 200,
    description: 'orders.responses.success.found',
  })
  async findByCustomer(
    @Param('merchantId') merchantId: string,
    @Param('phone') phone: string,
  ) {
    // ابحث عن كل الطلبات لهذا العميل بناءً على رقم الجوال (أو حتى sessionId إذا متاح)
    return this.ordersService.findByCustomer(merchantId, phone);
  }
}
