// src/modules/orders/orders.controller.ts
import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import {
  ApiSuccessResponse,
  ApiCreatedResponse as CommonApiCreatedResponse,
} from 'src/common/decorators/api-response.decorator';
import { CurrentMerchantId } from 'src/common/decorators/current-user.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TranslationService } from 'src/common/services/translation.service';

import { CreateOrderDto } from './dto/create-order.dto';
import { ListOrdersDto } from './dto/get-orders.dto';
import { OrdersService } from './orders.service';
import { Order } from './schemas/order.schema';

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
  async create(@Body() dto: CreateOrderDto, @Req() req: any): Promise<Order> {
    // استخراج customerId من JWT إذا كان متوفراً
    const customerId = req.customer?.customerId;
    return this.ordersService.create(dto, customerId);
  }

  // جلب طلبات التاجر مع ترقيم الصفحات والفلترة
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
  @ApiResponse({
    status: 403,
    description: 'No merchant context (JWT)',
  })
  async findAll(
    @CurrentMerchantId() merchantId: string | null,
    @Query() dto: ListOrdersDto,
  ): Promise<{ orders: Order[]; total: number; page: number; limit: number }> {
    if (!merchantId) {
      throw new ForbiddenException('analytics.responses.error.noMerchant');
    }
    const result = await this.ordersService.listOrdersForMerchant(
      merchantId,
      dto,
    );
    return {
      orders: result.items,
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  @Public()
  @Get('mine/:merchantId/:sessionId')
  async findMineBySession(
    @Param('merchantId') merchantId: string,
    @Param('sessionId') sessionId: string,
  ): Promise<Order[]> {
    return this.ordersService.findMine(merchantId, sessionId);
  }
  @Public()
  @Get('mine/:merchantId/:sessionId')
  async findMine(
    @Param('merchantId') merchantId: string,
    @Param('sessionId') sessionId: string,
  ): Promise<Order[]> {
    return this.ordersService.findMine(merchantId, sessionId);
  }
  // جلب طلب محدد بالتفصيل
  // عند تمرير sessionId أو phone: نتحقق من ملكية الطلب قبل الإرجاع (403 إذا لا يطابق)
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
    status: 403,
    description: 'Order does not belong to the provided session/phone',
  })
  @ApiResponse({
    status: 404,
    description: 'orders.responses.error.notFound',
  })
  async findOne(
    @Param('id') id: string,
    @Query('sessionId') sessionId?: string,
    @Query('phone') phone?: string,
  ): Promise<Order | null> {
    const order = await this.ordersService.findOne(id);
    if (!order) return null;
    const owns = await this.ordersService.assertOwnership(order, {
      sessionId,
      phone,
    });
    if (!owns) {
      throw new ForbiddenException('Order access denied');
    }
    return order;
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
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ): Promise<Order | null> {
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
  ): Promise<Order[]> {
    // ابحث عن كل الطلبات لهذا العميل بناءً على رقم الجوال (أو حتى sessionId إذا متاح)
    return this.ordersService.findByCustomer(merchantId, phone);
  }
}
