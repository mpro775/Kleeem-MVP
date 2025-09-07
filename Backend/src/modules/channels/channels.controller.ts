import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ChannelsService } from './channels.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';
import { ConnectActionDto } from './dto/connect-action.dto';
import { SendMessageDto } from './dto/send-message.dto';

@ApiTags('القنوات')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class ChannelsController {
  constructor(private readonly svc: ChannelsService) {}

  @Post('merchants/:merchantId/channels')
  @ApiOperation({ summary: 'إنشاء قناة جديدة لتاجر' })
  create(
    @Param('merchantId') merchantId: string,
    @Body() dto: Omit<CreateChannelDto, 'merchantId'>,
  ) {
    return this.svc.create({ ...dto, merchantId });
  }

  @Get('merchants/:merchantId/channels')
  @ApiOperation({ summary: 'قائمة القنوات لتاجر' })
  @ApiQuery({ name: 'provider', required: false })
  list(
    @Param('merchantId') merchantId: string,
    @Query('provider') provider?: any,
  ) {
    return this.svc.list(merchantId, provider);
  }

  @Get('channels/:id')
  @ApiOperation({ summary: 'جلب قناة واحدة' })
  get(@Param('id') id: string) {
    return this.svc.get(id);
  }

  @Patch('channels/:id')
  @ApiOperation({ summary: 'تحديث قناة' })
  update(@Param('id') id: string, @Body() dto: UpdateChannelDto) {
    return this.svc.update(id, dto);
  }

  @Post('channels/:id/actions/connect')
  @ApiOperation({ summary: 'Connect (حسب المزود يعيد QR/redirect/webhook)' })
  @ApiBody({ type: ConnectActionDto })
  connect(@Param('id') id: string, @Body() body: ConnectActionDto) {
    return this.svc.connect(id, body);
  }

  @Post('channels/:id/actions/refresh')
  @ApiOperation({ summary: 'تجديد صلاحية/توكن' })
  refresh(@Param('id') id: string) {
    return this.svc.refresh(id);
  }

  @Post('channels/:id/actions/set-default')
  @ApiOperation({ summary: 'تعيين كقناة افتراضية لهذا المزود' })
  setDefault(@Param('id') id: string) {
    return this.svc.setDefault(id);
  }

  @Delete('channels/:id')
  @ApiOperation({ summary: 'فصل/حذف قناة' })
  @ApiQuery({
    name: 'mode',
    required: false,
    enum: ['disable', 'disconnect', 'wipe'],
    description: 'الافتراضي disconnect',
  })
  remove(
    @Param('id') id: string,
    @Query(
      'mode',
      new ParseEnumPipe(['disable', 'disconnect', 'wipe'] as any, {
        optional: true,
      }),
    )
    mode?: 'disable' | 'disconnect' | 'wipe',
  ) {
    return this.svc.remove(id, mode ?? 'disconnect');
  }

  @Get('channels/:id/status')
  @ApiOperation({ summary: 'حالة القناة' })
  status(@Param('id') id: string) {
    return this.svc.status(id);
  }

  @Post('channels/:id/send')
  @ApiOperation({ summary: 'إرسال رسالة (اختباري)' })
  send(@Param('id') id: string, @Body() body: SendMessageDto) {
    return this.svc.send(id, body.to, body.text);
  }
}
