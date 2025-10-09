import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { Types } from 'mongoose';
import { HydratedDocument } from 'mongoose';

import { ChannelLean } from '../webhooks/repositories/channel.repository';

import {
  ChannelAdapter,
  ConnectResult,
  Status,
} from './adapters/channel-adapter';
import { TelegramAdapter } from './adapters/telegram.adapter';
import { WebchatAdapter } from './adapters/webchat.adapter';
import { WhatsAppCloudAdapter } from './adapters/whatsapp-cloud.adapter';
import { WhatsAppQrAdapter } from './adapters/whatsapp-qr.adapter';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';
import { ChannelsRepository } from './repositories/channels.repository';
import {
  ChannelProvider,
  ChannelStatus,
  Channel,
} from './schemas/channel.schema';

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
    const data: Partial<HydratedDocument<Channel>> = {
      merchantId: new Types.ObjectId(dto.merchantId),
      provider: dto.provider as unknown as ChannelProvider,
      isDefault: !!dto.isDefault,
      enabled: false,
      status: ChannelStatus.DISCONNECTED,
    };

    if (dto.accountLabel) {
      data.accountLabel = dto.accountLabel;
    }

    const doc = await this.repo.create(data);

    if (doc.isDefault) {
      await this.repo.unsetDefaults(
        doc.merchantId as unknown as Types.ObjectId,
        doc.provider,
        doc._id as unknown as Types.ObjectId,
      );
    }
    return doc;
  }

  async list(
    merchantId: string,
    provider?: ChannelProvider,
  ): Promise<ChannelLean[]> {
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

  async update(
    id: string,
    dto: UpdateChannelDto,
  ): Promise<HydratedDocument<Channel>> {
    const c = await this.getOrThrow(id);
    if (dto.accountLabel !== undefined) c.accountLabel = dto.accountLabel;
    if (dto.enabled !== undefined) c.enabled = dto.enabled;
    if (dto.widgetSettings !== undefined)
      c.widgetSettings = dto.widgetSettings as unknown as Record<
        string,
        unknown
      >;
    await c.save();
    return c;
  }

  async setDefault(id: string): Promise<HydratedDocument<Channel>> {
    const c = await this.getOrThrow(id);
    await this.repo.unsetDefaults(
      c.merchantId as unknown as Types.ObjectId,
      c.provider as unknown as ChannelProvider,
    );
    c.isDefault = true;
    await c.save();
    return c;
  }

  async remove(
    id: string,
    mode: 'disable' | 'disconnect' | 'wipe' = 'disconnect',
  ): Promise<{ deleted: boolean } | { ok: boolean }> {
    const c = await this.getOrThrow(id);
    await this.pickAdapter(c.provider as unknown as ChannelProvider).disconnect(
      c,
      mode,
    );
    if (mode === 'wipe') {
      await this.repo.deleteOneById(c._id);
      return { deleted: true };
    }
    return { ok: true };
  }

  async connect(
    id: string,
    payload: Record<string, unknown>,
  ): Promise<ConnectResult> {
    const c = await this.getOrThrow(id);
    return this.pickAdapter(c.provider as unknown as ChannelProvider).connect(
      c,
      payload,
    );
  }

  async refresh(id: string): Promise<{ ok: boolean }> {
    const c = await this.getOrThrow(id);
    await this.pickAdapter(c.provider as unknown as ChannelProvider).refresh(c);
    return { ok: true };
  }

  async status(id: string): Promise<Status> {
    const c = await this.getOrThrow(id);
    return this.pickAdapter(c.provider as unknown as ChannelProvider).getStatus(
      c,
    );
  }

  async send(id: string, to: string, text: string): Promise<{ ok: boolean }> {
    const c = await this.getOrThrow(id);
    await this.pickAdapter(
      c.provider as unknown as ChannelProvider,
    ).sendMessage(c, to, text);
    return { ok: true };
  }
}
