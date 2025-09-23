import { Injectable, Logger, Inject } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { Types } from 'mongoose';

import { ChannelsRepository } from './repositories/channels.repository';
import { ChannelProvider } from './schemas/channel.schema';
import { decryptSecret } from './utils/secrets.util';

@Injectable()
export class WhatsappCloudService {
  private readonly logger = new Logger(WhatsappCloudService.name);
  private base = (
    process.env.FB_GRAPH_BASE || 'https://graph.facebook.com/v19.0'
  ).replace(/\/+$/, '');

  constructor(
    @Inject('ChannelsRepository') private readonly repo: ChannelsRepository,
  ) {}

  async detectTransport(merchantId: string): Promise<'api' | 'qr'> {
    const cloud = await this.getDefaultCloudChannel(merchantId);
    const cloudReady = !!(
      cloud?.enabled &&
      cloud?.accessTokenEnc &&
      cloud?.phoneNumberId
    );
    if (!cloudReady) return 'qr';
    // TODO: من الجلسات إن وجدت
    return 'api';
  }

  private async getDefaultCloudChannel(merchantId: string) {
    return this.repo.findDefault(
      new Types.ObjectId(merchantId),
      ChannelProvider.WHATSAPP_CLOUD,
    );
  }

  private async creds(merchantId: string) {
    const c = await this.getDefaultCloudChannel(merchantId);
    const tokenEnc = c?.accessTokenEnc;
    const phoneNumberId = c?.phoneNumberId;
    if (!tokenEnc || !phoneNumberId)
      throw new Error('WhatsApp Cloud API not configured');
    const token = decryptSecret(tokenEnc);
    return { token, phoneNumberId };
  }

  async sendText(merchantId: string, to: string, text: string): Promise<void> {
    const { token, phoneNumberId } = await this.creds(merchantId);
    try {
      await axios.post(
        `${this.base}/${phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: text },
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
    } catch (err: unknown) {
      const axiosErr = err as AxiosError;
      this.logger.error(
        `WA Cloud sendText failed: ${axiosErr?.response?.status} ${
          axiosErr?.response?.data
            ? JSON.stringify(axiosErr.response.data)
            : axiosErr?.message
        }`,
      );
      throw err;
    }
  }

  async sendTemplate(
    merchantId: string,
    to: string,
    name: string,
    lang = 'ar',
  ): Promise<void> {
    const { token, phoneNumberId } = await this.creds(merchantId);
    await axios.post(
      `${this.base}/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: { name, language: { code: lang } },
      },
      { headers: { Authorization: `Bearer ${token}` } },
    );
  }

  async getMediaUrl(
    merchantId: string,
    mediaId: string,
  ): Promise<string | undefined> {
    const { token } = await this.creds(merchantId);
    const r = await axios.get<{ url?: string }>(`${this.base}/${mediaId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return r.data?.url;
  }
}
