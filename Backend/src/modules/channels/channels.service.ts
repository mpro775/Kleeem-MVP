import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { Types } from 'mongoose';
import { ChannelAdapter } from './adapters/channel-adapter';
import { TelegramAdapter } from './adapters/telegram.adapter';
import { WhatsAppCloudAdapter } from './adapters/whatsapp-cloud.adapter';
import { WhatsAppQrAdapter } from './adapters/whatsapp-qr.adapter';
import { WebchatAdapter } from './adapters/webchat.adapter';
import {
  ChannelProvider,
  ChannelStatus,
  Channel,
  ChannelDocument,
} from './schemas/channel.schema';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';
import { ChannelsRepository } from './repositories/channels.repository';
import { HydratedDocument } from 'mongoose';

@Injectable()
export class ChannelsService {
  constructor(
    @Inject('ChannelsRepository') private readonly repo: ChannelsRepository,
    private readonly tg: TelegramAdapter,
    private readonly waCloud: WhatsAppCloudAdapter,
    private readonly waQr: WhatsAppQrAdapter,
    private readonly webchat: WebchatAdapter,
  ) {}

  private pickAdapter(provider: ChannelProvider): ChannelAdapter {
    switch (provider) {
      case ChannelProvider.TELEGRAM:
        return this.tg;
      case ChannelProvider.WHATSAPP_CLOUD:
        return this.waCloud;
      case ChannelProvider.WHATSAPP_QR:
        return this.waQr;
      case ChannelProvider.WEBCHAT:
        return this.webchat;
      default:
        throw new Error(`No adapter for ${provider}`);
    }
  }

  async create(dto: CreateChannelDto): Promise<HydratedDocument<Channel>> {
    const doc = await this.repo.create({
      merchantId: new Types.ObjectId(dto.merchantId) as any,
      provider: dto.provider as unknown as ChannelProvider,
      accountLabel: dto.accountLabel,
      isDefault: !!dto.isDefault,
      enabled: false,
      status: ChannelStatus.DISCONNECTED,
    });

    if (doc.isDefault) {
      await this.repo.unsetDefaults(
        doc.merchantId as any,
        doc.provider,
        doc._id as any,
      );
    }
    return doc;
  }

  async list(merchantId: string, provider?: ChannelProvider) {
    return this.repo.listByMerchant(new Types.ObjectId(merchantId), provider);
  }

  private async getOrThrow(id: string): Promise<HydratedDocument<Channel>> {
    const c = await this.repo.findById(id);
    if (!c) throw new NotFoundException('Channel not found');
    return c;
  }

  async get(id: string): Promise<HydratedDocument<Channel>> {
    return this.getOrThrow(id);
  }

  async update(id: string, dto: UpdateChannelDto) {
    const c = await this.getOrThrow(id);
    if (dto.accountLabel !== undefined) c.accountLabel = dto.accountLabel;
    if (dto.enabled !== undefined) c.enabled = dto.enabled;
    if (dto.widgetSettings !== undefined)
      c.widgetSettings = dto.widgetSettings as any;
    await c.save();
    return c;
  }

  async setDefault(id: string) {
    const c = await this.getOrThrow(id);
    await this.repo.unsetDefaults(c.merchantId as any, c.provider);
    c.isDefault = true;
    await c.save();
    return c;
  }

  async remove(
    id: string,
    mode: 'disable' | 'disconnect' | 'wipe' = 'disconnect',
  ) {
    const c = await this.getOrThrow(id);
    await this.pickAdapter(c.provider as any).disconnect(c, mode);
    if (mode === 'wipe') {
      await this.repo.deleteOneById(c._id);
      return { deleted: true };
    }
    return { ok: true };
  }

  async connect(id: string, payload: any) {
    const c = await this.getOrThrow(id);
    return this.pickAdapter(c.provider as any).connect(c, payload);
  }

  async refresh(id: string) {
    const c = await this.getOrThrow(id);
    await this.pickAdapter(c.provider as any).refresh(c);
    return { ok: true };
  }

  async status(id: string) {
    const c = await this.getOrThrow(id);
    return this.pickAdapter(c.provider as any).getStatus(c);
  }

  async send(id: string, to: string, text: string) {
    const c = await this.getOrThrow(id);
    await this.pickAdapter(c.provider as any).sendMessage(c, to, text);
    return { ok: true };
  }
}
