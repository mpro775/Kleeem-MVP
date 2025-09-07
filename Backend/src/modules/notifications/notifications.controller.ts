import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
  Req,
  Post,
  Body,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';

@ApiTags('الإشعارات')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly svc: NotificationsService) {}

  @Get('me')
  @ApiOperation({ summary: 'قائمة إشعاراتي' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'unreadOnly', required: false })
  async myList(@Req() req: any, @Query() q: any) {
    const userId = req.user?.userId;
    const page = Math.max(1, parseInt(q.page ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(q.limit ?? '20', 10)));
    const unreadOnly = String(q.unreadOnly ?? 'false') === 'true';
    return this.svc.listForUser(userId, { page, limit, unreadOnly });
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'وضع إشعار كمقروء' })
  async readOne(@Req() req: any, @Param('id') id: string) {
    return this.svc.markRead(req.user?.userId, id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'وضع كل إشعاراتي كمقروءة' })
  async readAll(@Req() req: any) {
    return this.svc.markAllRead(req.user?.userId);
  }

  @Post('test')
  @ApiOperation({ summary: 'إرسال إشعار تجريبي لي' })
  async test(@Req() req: any, @Body() body: { title?: string; body?: string }) {
    return this.svc.notifyUser(req.user?.userId, {
      type: 'test',
      title: body?.title ?? 'إشعار تجريبي',
      body: body?.body ?? 'تم إرسال هذا الإشعار للتجربة',
    });
  }
}
