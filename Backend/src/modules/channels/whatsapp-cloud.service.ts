import { Injectable, Logger, Inject } from '@nestjs/common';
import axios from 'axios';
import { decryptSecret } from './utils/secrets.util';
import { ChannelsRepository } from './repositories/channels.repository';
import { Types } from 'mongoose';
import { ChannelProvider } from './schemas/channel.schema';

@Injectable()
export class WhatsappCloudService {
  private readonly logger = new Logger(WhatsappCloudService.name);
  private base = (
    process.env.FB_GRAPH_BASE || 'https://graph.facebook.com/v19.0'
  ).replace(/\/+$/, '');

  constructor(
    @Inject('ChannelsRepository') private readonly repo: ChannelsRepository,
  ) {}

  async detectTransport(
    merchantId: string,
    sessionId: string,
  ): Promise<'api' | 'qr'> {
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

  async sendText(merchantId: string, to: string, text: string) {
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
    } catch (err: any) {
      this.logger.error(
        `WA Cloud sendText failed: ${err?.response?.status} ${
          err?.response?.data ? JSON.stringify(err.response.data) : err?.message
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
  ) {
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

  async getMediaUrl(merchantId: string, mediaId: string) {
    const { token } = await this.creds(merchantId);
    const r = await axios.get(`${this.base}/${mediaId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return r.data?.url as string | undefined;
  }
}
