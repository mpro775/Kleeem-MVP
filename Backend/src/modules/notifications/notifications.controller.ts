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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

import { NotificationsService } from './notifications.service';
import {
  Notification,
  NotificationDocument,
} from './schemas/notification.schema';

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
  async myList(
    @Req() req: { user?: { userId: string } },
    @Query() q: { page?: string; limit?: string; unreadOnly?: string },
  ): Promise<{
    items: Notification[];
    total: number;
    page: number;
    limit: number;
  }> {
    const userId = req.user?.userId ?? '';
    const page = Math.max(1, parseInt(q.page ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(q.limit ?? '20', 10)));
    const unreadOnly = String(q.unreadOnly ?? 'false') === 'true';
    return this.svc.listForUser(userId, { page, limit, unreadOnly });
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'وضع إشعار كمقروء' })
  async readOne(
    @Req() req: { user?: { userId: string } },
    @Param('id') id: string,
  ): Promise<{ ok: boolean }> {
    return this.svc.markRead(req.user?.userId ?? '', id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'وضع كل إشعاراتي كمقروءة' })
  async readAll(
    @Req() req: { user?: { userId: string } },
  ): Promise<{ ok: boolean }> {
    return this.svc.markAllRead(req.user?.userId ?? '');
  }

  @Post('test')
  @ApiOperation({ summary: 'إرسال إشعار تجريبي لي' })
  async test(
    @Req() req: { user?: { userId: string } },
    @Body() body: { title?: string; body?: string },
  ): Promise<NotificationDocument> {
    return this.svc.notifyUser(req.user?.userId ?? '', {
      type: 'test',
      title: body?.title ?? 'إشعار تجريبي',
      body: body?.body ?? 'تم إرسال هذا الإشعار للتجربة',
    });
  }
}
